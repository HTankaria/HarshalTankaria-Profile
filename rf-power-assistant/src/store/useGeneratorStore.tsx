import React, { createContext, useContext, useState } from 'react';
import type { GeneratorAppState, DCSupplyConfig, RFAmpConfig, PulsingConfig, ArcDetectConfig, CouplerConfig, ControlConfig } from '../types/generator';
import {
  designDCSupply, designRFAmplifier, designPulsing,
  designArcDetection, designDirectionalCoupler, designControl,
} from '../calculations/generatorCalc';

const DEFAULT: GeneratorAppState = {
  activeTab: 'dc_supply',
  dcConfig: {
    acInputVoltage_V: 480,
    acInputPhases: 3,
    outputPower_W: 3000,
    outputVoltage_V: 300,
    pfcTopology: 'bridgeless_totem_pole',
    holdupTime_ms: 20,
    switchFrequency_kHz: 100,
  },
  dcResult: null,
  ampConfig: {
    paClass: 'CLASS_E',
    transistorType: 'GaN_HEMT',
    frequency_Hz: 13.56e6,
    outputPower_W: 3000,
    supplyVoltage_V: 300,
    stages: 2,
  },
  ampResult: null,
  pulsingConfig: {
    modulationMethod: 'gate_bias',
    pulseFrequency_Hz: 10000,
    dutyCycle_pct: 50,
    riseTime_us: 1,
    frequency_Hz: 13.56e6,
    outputPower_W: 3000,
    supplyVoltage_V: 300,
    bulkCapacitance_uF: 4700,
  },
  pulsingResult: null,
  arcConfig: {
    method: 'reflected_power',
    threshold_pct: 10,
    frequency_Hz: 13.56e6,
    outputPower_W: 3000,
  },
  arcResult: null,
  couplerConfig: {
    topology: 'transformer',
    frequency_Hz: 13.56e6,
    power_W: 3000,
    couplingFactor_dB: 20,
    sourceImpedance_ohm: 50,
  },
  couplerResult: null,
  controlConfig: {
    frequencyControl: 'integer_N_PLL',
    referenceFreq_MHz: 1,
    targetFreq_MHz: 13.56,
    loopBandwidth_kHz: 10,
    pidKp: 0.5,
    pidKi: 10,
    pidKd: 0.001,
  },
  controlResult: null,
};

interface GenStore {
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

const Ctx = createContext<GenStore | null>(null);

export function GeneratorStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GeneratorAppState>(DEFAULT);
  const update = (patch: Partial<GeneratorAppState>) => setState(s => ({ ...s, ...patch }));

  const store: GenStore = {
    state,
    setTab: t => update({ activeTab: t }),
    updateDCConfig: c => update({ dcConfig: { ...state.dcConfig, ...c } }),
    runDCDesign: () => {
      const r = designDCSupply(state.dcConfig);
      update({ dcResult: r, activeTab: 'rf_amp',
        ampConfig: { ...state.ampConfig, supplyVoltage_V: r.dcBusVoltage_V, outputPower_W: state.dcConfig.outputPower_W }
      });
    },
    updateAmpConfig: c => update({ ampConfig: { ...state.ampConfig, ...c } }),
    runAmpDesign: () => {
      const r = designRFAmplifier(state.ampConfig);
      update({ ampResult: r, activeTab: 'pulsing',
        pulsingConfig: { ...state.pulsingConfig, outputPower_W: state.ampConfig.outputPower_W, supplyVoltage_V: state.ampConfig.supplyVoltage_V, frequency_Hz: state.ampConfig.frequency_Hz }
      });
    },
    updatePulsingConfig: c => update({ pulsingConfig: { ...state.pulsingConfig, ...c } }),
    runPulsingDesign: () => {
      const r = designPulsing(state.pulsingConfig);
      update({ pulsingResult: r, activeTab: 'arc_detect',
        arcConfig: { ...state.arcConfig, frequency_Hz: state.ampConfig.frequency_Hz, outputPower_W: state.ampConfig.outputPower_W }
      });
    },
    updateArcConfig: c => update({ arcConfig: { ...state.arcConfig, ...c } }),
    runArcDesign: () => {
      const r = designArcDetection(state.arcConfig);
      update({ arcResult: r, activeTab: 'coupler',
        couplerConfig: { ...state.couplerConfig, frequency_Hz: state.ampConfig.frequency_Hz, power_W: state.ampConfig.outputPower_W }
      });
    },
    updateCouplerConfig: c => update({ couplerConfig: { ...state.couplerConfig, ...c } }),
    runCouplerDesign: () => {
      const r = designDirectionalCoupler(state.couplerConfig);
      update({ couplerResult: r, activeTab: 'control',
        controlConfig: { ...state.controlConfig, targetFreq_MHz: state.ampConfig.frequency_Hz / 1e6 }
      });
    },
    updateControlConfig: c => update({ controlConfig: { ...state.controlConfig, ...c } }),
    runControlDesign: () => {
      const r = designControl(state.controlConfig);
      update({ controlResult: r, activeTab: 'gen_report' });
    },
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useGenerator(): GenStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useGenerator must be inside GeneratorStoreProvider');
  return ctx;
}
