import React, { createContext, useContext, useState, useCallback } from 'react';
import type { GeneratorAppState, DCSupplyConfig, RFAmpConfig, PulsingConfig,
              ArcDetectConfig, CouplerConfig, ControlConfig } from '../types/generator';
import { designDCSupply, designRFAmplifier, designPulsing,
         designArcDetection, designDirectionalCoupler, designControl
} from '../calculations/generatorCalc';

const DEFAULT: GeneratorAppState = {
  activeTab: 'dc_supply',
  dcConfig: {
    acInputVoltage: 208, acInputPhases: 3, acFrequency: 60,
    pfcTopology: 'boost_pfc', targetDCBusVoltage: 0,
    holdupCycles: 2, totalRFPower: 1000, overheadPower: 150,
  },
  dcResult: null,
  ampConfig: {
    paClass: 'E', transistorType: 'LDMOS',
    drainVoltage: 50, rfOutputPower: 1000, frequency: 13.56e6,
    numParallelDevices: 2, numStages: 2, targetGain_dB: 40,
  },
  ampResult: null,
  pulsingConfig: {
    enabled: true, pulseFrequency_Hz: 10000, dutyCycle: 0.5,
    modulationMethod: 'gate_bias', desiredRiseTime_us: 5,
    desiredFallTime_us: 5, rfPower_W: 1000, dcBusVoltage: 400,
    bulkCapacitance_uF: 2000, matchingNetworkQ: 5,
    stallPower_W: 0, frequency_Hz: 13.56e6,
  } as PulsingConfig & { frequency_Hz: number },
  pulsingResult: null,
  arcConfig: {
    detectionMethod: 'reflected_ratio', vswr_threshold: 3.0,
    rfPower_W: 1000, frequency_Hz: 13.56e6, couplingFactor_dB: -20,
    protectionLevel: 'enhanced', maxRecoveriesPerSec: 20,
    consecutiveFaultThreshold: 5,
  },
  arcResult: null,
  couplerConfig: {
    topology: 'transformer', frequency_Hz: 13.56e6,
    rfPower_W: 1000, systemImpedance: 50,
    couplingFactor_dB: -20, targetDirectivity_dB: 35,
  },
  couplerResult: null,
  controlConfig: {
    freqControlMethod: 'fixed_crystal', frequency_Hz: 13.56e6,
    powerControlBandwidth_Hz: 1000, targetAccuracy_pct: 0.5,
  },
  controlResult: null,
};

interface Ctx {
  state: GeneratorAppState;
  setTab: (t: GeneratorAppState['activeTab']) => void;
  updateDCConfig: (c: Partial<DCSupplyConfig>) => void;
  runDCDesign: () => void;
  updateAmpConfig: (c: Partial<RFAmpConfig>) => void;
  runAmpDesign: () => void;
  updatePulsingConfig: (c: Partial<PulsingConfig>) => void;
  runPulsingDesign: () => void;
  updateArcConfig: (c: Partial<ArcDetectConfig>) => void;
  runArcDesign: () => void;
  updateCouplerConfig: (c: Partial<CouplerConfig>) => void;
  runCouplerDesign: () => void;
  updateControlConfig: (c: Partial<ControlConfig>) => void;
  runControlDesign: () => void;
}

const GenCtx = createContext<Ctx | null>(null);

export function GeneratorStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GeneratorAppState>(DEFAULT);

  const setTab = useCallback((t: GeneratorAppState['activeTab']) =>
    setState(s => ({ ...s, activeTab: t })), []);

  const updateDCConfig = useCallback((c: Partial<DCSupplyConfig>) =>
    setState(s => ({ ...s, dcConfig: { ...s.dcConfig, ...c } })), []);

  const runDCDesign = useCallback(() =>
    setState(s => ({ ...s, dcResult: designDCSupply(s.dcConfig) })), []);

  const updateAmpConfig = useCallback((c: Partial<RFAmpConfig>) =>
    setState(s => ({ ...s, ampConfig: { ...s.ampConfig, ...c } })), []);

  const runAmpDesign = useCallback(() =>
    setState(s => ({ ...s, ampResult: designRFAmplifier(s.ampConfig) })), []);

  const updatePulsingConfig = useCallback((c: Partial<PulsingConfig>) =>
    setState(s => ({ ...s, pulsingConfig: { ...s.pulsingConfig, ...c } })), []);

  const runPulsingDesign = useCallback(() =>
    setState(s => ({ ...s, pulsingResult: designPulsing(s.pulsingConfig) })), []);

  const updateArcConfig = useCallback((c: Partial<ArcDetectConfig>) =>
    setState(s => ({ ...s, arcConfig: { ...s.arcConfig, ...c } })), []);

  const runArcDesign = useCallback(() =>
    setState(s => ({ ...s, arcResult: designArcDetection(s.arcConfig) })), []);

  const updateCouplerConfig = useCallback((c: Partial<CouplerConfig>) =>
    setState(s => ({ ...s, couplerConfig: { ...s.couplerConfig, ...c } })), []);

  const runCouplerDesign = useCallback(() =>
    setState(s => ({ ...s, couplerResult: designDirectionalCoupler(s.couplerConfig) })), []);

  const updateControlConfig = useCallback((c: Partial<ControlConfig>) =>
    setState(s => ({ ...s, controlConfig: { ...s.controlConfig, ...c } })), []);

  const runControlDesign = useCallback(() =>
    setState(s => ({ ...s, controlResult: designControl(s.controlConfig) })), []);

  return (
    <GenCtx.Provider value={{
      state, setTab,
      updateDCConfig, runDCDesign,
      updateAmpConfig, runAmpDesign,
      updatePulsingConfig, runPulsingDesign,
      updateArcConfig, runArcDesign,
      updateCouplerConfig, runCouplerDesign,
      updateControlConfig, runControlDesign,
    }}>
      {children}
    </GenCtx.Provider>
  );
}

export function useGenerator(): Ctx {
  const ctx = useContext(GenCtx);
  if (!ctx) throw new Error('useGenerator must be inside GeneratorStoreProvider');
  return ctx;
}
