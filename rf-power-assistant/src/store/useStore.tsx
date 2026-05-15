import React, { createContext, useContext, useState } from 'react';
import type { AppState, SystemConfig, TransmissionLineConfig } from '../types/index';
import {
  estimatePlasmaStates, aitoWeightedImpedance, aitoScore,
  designLNetwork, designPiNetwork, designTNetwork,
  analyseTransmissionLine, designHarmonicFilter,
  analyseThermal, generateFeasibilityReport,
} from '../calculations/rfCalc';

const DEFAULT_STATE: AppState = {
  activeStep: 1,
  mode: 'system',
  systemConfig: {
    toolType: 'CCP',
    frequency_Hz: 13.56e6,
    rfPower_W: 1000,
    sourceImpedance_R: 50,
    chamberPressure_mTorr: 20,
    chamberDiameter_mm: 300,
    electrodeGap_mm: 25,
    matchingTopology: 'L_lowpass',
  },
  plasmaStates: [],
  matchingResult: null,
  txLineConfig: {
    lineType: 'coax_50',
    length_m: 1.0,
  },
  txLineResult: null,
  filterResult: null,
  thermalResult: null,
  report: null,
};

interface Store {
  state: AppState;
  setStep: (s: AppState['activeStep']) => void;
  setMode: (m: AppState['mode']) => void;
  updateSystemConfig: (c: Partial<SystemConfig>) => void;
  autoEstimatePlasma: () => void;
  runMatchingDesign: () => void;
  updateTxLineConfig: (c: Partial<TransmissionLineConfig>) => void;
  runTxLineAnalysis: () => void;
  runHarmonicFilter: () => void;
  runThermalAnalysis: () => void;
  generateReport: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const update = (patch: Partial<AppState>) => setState(s => ({ ...s, ...patch }));

  const store: Store = {
    state,
    setStep: s => update({ activeStep: s }),
    setMode: m => update({ mode: m }),
    updateSystemConfig: c => update({ systemConfig: { ...state.systemConfig, ...c } }),
    autoEstimatePlasma: () => {
      const states = estimatePlasmaStates(state.systemConfig);
      update({ plasmaStates: states, activeStep: 2 });
    },
    runMatchingDesign: () => {
      const cfg = state.systemConfig;
      const states = state.plasmaStates.length ? state.plasmaStates : estimatePlasmaStates(cfg);
      const ZL = aitoWeightedImpedance(states, cfg.frequency_Hz);
      let result;
      if (cfg.matchingTopology === 'L_lowpass' || cfg.matchingTopology === 'L_highpass') {
        result = designLNetwork(cfg.sourceImpedance_R, ZL, cfg.frequency_Hz, cfg.matchingTopology);
      } else if (cfg.matchingTopology === 'Pi') {
        result = designPiNetwork(cfg.sourceImpedance_R, ZL, cfg.frequency_Hz);
      } else {
        result = designTNetwork(cfg.sourceImpedance_R, ZL, cfg.frequency_Hz);
      }
      result.aitoScore = aitoScore(states, result, cfg.frequency_Hz);
      update({ matchingResult: result, plasmaStates: states, activeStep: 3 });
    },
    updateTxLineConfig: c => update({ txLineConfig: { ...state.txLineConfig, ...c } }),
    runTxLineAnalysis: () => {
      const states = state.plasmaStates.length ? state.plasmaStates : estimatePlasmaStates(state.systemConfig);
      const ZL = aitoWeightedImpedance(states, state.systemConfig.frequency_Hz);
      const result = analyseTransmissionLine(state.txLineConfig, ZL, state.systemConfig.frequency_Hz, state.systemConfig.rfPower_W);
      update({ txLineResult: result, activeStep: 4 });
    },
    runHarmonicFilter: () => {
      const result = designHarmonicFilter(state.systemConfig.frequency_Hz, state.systemConfig.rfPower_W, state.systemConfig.sourceImpedance_R);
      update({ filterResult: result, activeStep: 5 });
    },
    runThermalAnalysis: () => {
      const matchComps = state.matchingResult?.components ?? [];
      const filterResult = state.filterResult ?? designHarmonicFilter(state.systemConfig.frequency_Hz, state.systemConfig.rfPower_W);
      const result = analyseThermal(matchComps, filterResult.components, state.systemConfig.rfPower_W, 25, state.systemConfig.frequency_Hz);
      update({ thermalResult: result, activeStep: 6 });
    },
    generateReport: () => {
      const states = state.plasmaStates.length ? state.plasmaStates : estimatePlasmaStates(state.systemConfig);
      const matchResult = state.matchingResult;
      if (!matchResult) return;
      const filterResult = state.filterResult ?? designHarmonicFilter(state.systemConfig.frequency_Hz, state.systemConfig.rfPower_W);
      const thermalResult = state.thermalResult ?? analyseThermal(matchResult.components, filterResult.components, state.systemConfig.rfPower_W, 25, state.systemConfig.frequency_Hz);
      const report = generateFeasibilityReport(state.systemConfig, states, matchResult, filterResult, thermalResult, state.systemConfig.frequency_Hz);
      update({ report, activeStep: 7 });
    },
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore must be inside StoreProvider');
  return ctx;
}
