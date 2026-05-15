import React, { createContext, useContext, useState, useCallback } from 'react';
import type {
  AppState, SystemConfig, PlasmaLoad, MatchingTopology,
  TransmissionLineConfig, MatchingNetworkResult, TransmissionLineResult,
  HarmonicFilterResult, ThermalResult, FeasibilityReport,
} from '../types';
import {
  estimatePlasmaStates, aitoWeightedImpedance, aitoScore,
  designLNetwork, designPiNetwork, designTNetwork,
  analyseTransmissionLine, designHarmonicFilter,
  analyseThermal, generateFeasibilityReport,
} from '../calculations/rfCalc';

const DEFAULT_SYS_CONFIG: SystemConfig = {
  toolType: 'CCP_ETCH',
  primaryFrequency: 13.56e6,
  secondaryFrequency: 0,
  primaryPower: 1000,
  secondaryPower: 0,
  dutyCycle: 1.0,
  sourceImpedance: 50,
  chamberDiameter: 300,
  electrodeGap: 30,
  operatingPressure: 20,
  procesGas: 'CF4/O2',
  ambientTemp: 25,
};

const DEFAULT_TX_CONFIG: TransmissionLineConfig = {
  cableType: 'LMR400',
  customZ0: 50,
  customVF: 0.85,
  customAttendB100ft: 1.3,
  length: 1.5,
};

const DEFAULT_STATE: AppState = {
  currentStep: 1,
  completedSteps: new Set<number>(),
  systemConfig: DEFAULT_SYS_CONFIG,
  plasmaLoad: {
    estimationMethod: 'auto',
    states: [],
    shuntCapacitance: 100,
    seriesResistance: 3,
    sheathCapacitance: 80,
    strayInductance: 40,
    effectiveR: 3,
    effectiveX: -120,
  },
  matchingTopology: 'L_LOWPASS',
  matchingResult: null,
  transmissionLineConfig: DEFAULT_TX_CONFIG,
  transmissionLineResult: null,
  harmonicFilterResult: null,
  thermalResult: null,
  feasibilityReport: null,
};

interface StoreContextType {
  state: AppState;
  setStep: (step: number) => void;
  updateSystemConfig: (cfg: Partial<SystemConfig>) => void;
  updatePlasmaLoad: (load: Partial<PlasmaLoad>) => void;
  autoEstimatePlasma: () => void;
  setMatchingTopology: (t: MatchingTopology) => void;
  runMatchingDesign: (Q?: number) => void;
  updateTxLineConfig: (cfg: Partial<TransmissionLineConfig>) => void;
  runTxLineAnalysis: () => void;
  runHarmonicFilter: () => void;
  runThermalAnalysis: () => void;
  generateReport: () => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);

  const setStep = useCallback((step: number) => {
    setState(s => ({
      ...s,
      currentStep: step,
      completedSteps: new Set([...s.completedSteps, s.currentStep]),
    }));
  }, []);

  const updateSystemConfig = useCallback((cfg: Partial<SystemConfig>) => {
    setState(s => ({ ...s, systemConfig: { ...s.systemConfig, ...cfg } }));
  }, []);

  const updatePlasmaLoad = useCallback((load: Partial<PlasmaLoad>) => {
    setState(s => ({ ...s, plasmaLoad: { ...s.plasmaLoad, ...load } }));
  }, []);

  const autoEstimatePlasma = useCallback(() => {
    setState(s => {
      const states = estimatePlasmaStates(s.systemConfig);
      const { R, X } = aitoWeightedImpedance(states);
      return {
        ...s,
        plasmaLoad: {
          ...s.plasmaLoad,
          states,
          effectiveR: R,
          effectiveX: X,
          estimationMethod: 'auto',
        },
      };
    });
  }, []);

  const setMatchingTopology = useCallback((t: MatchingTopology) => {
    setState(s => ({ ...s, matchingTopology: t }));
  }, []);

  const runMatchingDesign = useCallback((Q = 5) => {
    setState(s => {
      const { systemConfig: cfg, plasmaLoad, matchingTopology } = s;
      const Rs = cfg.sourceImpedance;
      const RL = plasmaLoad.effectiveR;
      const XL = plasmaLoad.effectiveX;
      const f  = cfg.primaryFrequency;

      let result: MatchingNetworkResult;
      switch (matchingTopology) {
        case 'L_HIGHPASS': result = designLNetwork(Rs, RL, XL, f, 'highpass'); break;
        case 'PI':         result = designPiNetwork(Rs, RL, XL, f, Q); break;
        case 'T':          result = designTNetwork(Rs, RL, XL, f, Q); break;
        default:           result = designLNetwork(Rs, RL, XL, f, 'lowpass');
      }

      // AITO™: compute multi-state VSWR score
      result.aitoScore = aitoScore(plasmaLoad.states.length > 0 ? plasmaLoad.states : [
        { label: 'Steady-state', resistance: RL, reactance: XL, probability: 1 },
      ], result);
      result.worstCaseVSWR = plasmaLoad.states.length > 0
        ? Math.max(...plasmaLoad.states.map(st => {
            const g = Math.sqrt((st.resistance - Rs) ** 2 + st.reactance ** 2) /
                      Math.sqrt((st.resistance + Rs) ** 2 + st.reactance ** 2);
            return (1 + g) / (1 - g + 1e-6);
          }))
        : 1.02;

      return { ...s, matchingResult: result };
    });
  }, []);

  const updateTxLineConfig = useCallback((cfg: Partial<TransmissionLineConfig>) => {
    setState(s => ({ ...s, transmissionLineConfig: { ...s.transmissionLineConfig, ...cfg } }));
  }, []);

  const runTxLineAnalysis = useCallback(() => {
    setState(s => {
      const { transmissionLineConfig, plasmaLoad, systemConfig } = s;
      const ZL = { r: plasmaLoad.effectiveR, i: plasmaLoad.effectiveX };
      const result = analyseTransmissionLine(transmissionLineConfig, ZL, systemConfig.primaryFrequency, systemConfig.primaryPower);
      return { ...s, transmissionLineResult: result };
    });
  }, []);

  const runHarmonicFilter = useCallback(() => {
    setState(s => {
      const result = designHarmonicFilter(s.systemConfig.primaryFrequency, s.systemConfig.primaryPower, s.systemConfig.sourceImpedance);
      return { ...s, harmonicFilterResult: result };
    });
  }, []);

  const runThermalAnalysis = useCallback(() => {
    setState(s => {
      const mComps = s.matchingResult?.components ?? [];
      const fComps = s.harmonicFilterResult?.components ?? [];
      const result = analyseThermal(mComps, fComps, s.systemConfig.primaryPower, s.systemConfig.ambientTemp, s.systemConfig.primaryFrequency);
      return { ...s, thermalResult: result };
    });
  }, []);

  const generateReport = useCallback(() => {
    setState(s => {
      if (!s.matchingResult || !s.transmissionLineResult || !s.harmonicFilterResult || !s.thermalResult) return s;
      const report = generateFeasibilityReport(
        s.systemConfig, s.plasmaLoad,
        s.matchingResult, s.transmissionLineResult,
        s.harmonicFilterResult, s.thermalResult,
      );
      return { ...s, feasibilityReport: report };
    });
  }, []);

  return (
    <StoreContext.Provider value={{
      state, setStep, updateSystemConfig, updatePlasmaLoad,
      autoEstimatePlasma, setMatchingTopology, runMatchingDesign,
      updateTxLineConfig, runTxLineAnalysis, runHarmonicFilter,
      runThermalAnalysis, generateReport,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextType {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
