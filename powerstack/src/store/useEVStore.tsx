import React, { createContext, useContext, useState } from 'react';
import type { EVAppState, EVStandardConfig, PFCConfig, DCDCConfig, EVThermalConfig } from '../types/ev';
import { calcEVStandard, calcPFC, calcDCDC, calcEVThermal, calcEVReport } from '../calculations/evCalc';

const DEFAULT_STATE: EVAppState = {
  activeTab: 'standard',
  standardConfig: {
    standard: 'NACS',
    powerLevel: 'DCFC_150kW',
    vehicleArch: '800V',
    bidirectional: false,
    simultaneousPorts: 1,
    acInputVoltage: 480,
    acInputPhases: 3,
    acFrequency: 60,
  },
  standardResult: null,
  pfcConfig: {
    topology: 'bridgeless_totem_pole',
    targetDCBus_V: 800,
    powerFactor: 0.99,
    switchFrequency_kHz: 100,
    acInputVoltage: 480,
    acInputPhases: 3,
    acFrequency: 60,
    totalPower_kW: 150,
  },
  pfcResult: null,
  dcdcConfig: {
    topology: 'LLC',
    switchTech: 'SiC_MOSFET',
    primaryVoltage_V: 800,
    outputVoltageNom_V: 800,
    outputVoltageMin_V: 400,
    outputVoltageMax_V: 1000,
    outputPower_kW: 150,
    switchFrequency_kHz: 100,
    vehicleArch: '800V',
  },
  dcdcResult: null,
  thermalConfig: {
    totalLoss_W: 4500,
    coolingMethod: 'liquid_glycol',
    ambientTemp_C: 40,
    targetJunctionTemp_C: 125,
  },
  thermalResult: null,
  report: null,
};

interface EVStore {
  state: EVAppState;
  setActiveTab: (tab: EVAppState['activeTab']) => void;
  updateStandardConfig: (c: Partial<EVStandardConfig>) => void;
  runStandardCalc: () => void;
  updatePFCConfig: (c: Partial<PFCConfig>) => void;
  runPFCCalc: () => void;
  updateDCDCConfig: (c: Partial<DCDCConfig>) => void;
  runDCDCCalc: () => void;
  updateThermalConfig: (c: Partial<EVThermalConfig>) => void;
  runThermalCalc: () => void;
  generateReport: () => void;
}

const Ctx = createContext<EVStore | null>(null);

export function EVStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<EVAppState>(DEFAULT_STATE);

  const update = (patch: Partial<EVAppState>) => setState(s => ({ ...s, ...patch }));

  const store: EVStore = {
    state,
    setActiveTab: tab => update({ activeTab: tab }),
    updateStandardConfig: c => update({ standardConfig: { ...state.standardConfig, ...c } }),
    runStandardCalc: () => {
      const r = calcEVStandard(state.standardConfig);
      const pfcPatch: Partial<PFCConfig> = {
        acInputVoltage: state.standardConfig.acInputVoltage,
        acInputPhases: state.standardConfig.acInputPhases,
        acFrequency: state.standardConfig.acFrequency,
        targetDCBus_V: r.dcBusVoltage_V,
        totalPower_kW: r.maxOutputPower_kW,
      };
      update({
        standardResult: r,
        activeTab: 'pfc',
        pfcConfig: { ...state.pfcConfig, ...pfcPatch },
      });
    },
    updatePFCConfig: c => update({ pfcConfig: { ...state.pfcConfig, ...c } }),
    runPFCCalc: () => {
      const r = calcPFC(state.pfcConfig);
      update({
        pfcResult: r,
        activeTab: 'dcdc',
        dcdcConfig: {
          ...state.dcdcConfig,
          primaryVoltage_V: r.dcBusVoltage_V,
          vehicleArch: state.standardConfig.vehicleArch,
          outputVoltageNom_V: state.standardConfig.vehicleArch === '800V' ? 800 : 400,
        },
      });
    },
    updateDCDCConfig: c => update({ dcdcConfig: { ...state.dcdcConfig, ...c } }),
    runDCDCCalc: () => {
      const r = calcDCDC(state.dcdcConfig);
      const lossW = state.dcdcConfig.outputPower_kW * 1000 * (1 - r.estimatedEfficiency_pct / 100)
        + (state.pfcResult ? state.pfcResult.bridgeOrSwitchLoss_W : 0);
      update({
        dcdcResult: r,
        activeTab: 'thermal',
        thermalConfig: { ...state.thermalConfig, totalLoss_W: Math.round(lossW) },
      });
    },
    updateThermalConfig: c => update({ thermalConfig: { ...state.thermalConfig, ...c } }),
    runThermalCalc: () => {
      const r = calcEVThermal(state.thermalConfig);
      update({ thermalResult: r, activeTab: 'report' });
    },
    generateReport: () => {
      const pfcEff = state.pfcResult?.efficiency_pct ?? 95;
      const dcdcEff = state.dcdcResult?.estimatedEfficiency_pct ?? 97;
      const power_kW = state.standardResult?.maxOutputPower_kW ?? 150;
      const loss_kW = state.thermalConfig.totalLoss_W / 1000;
      const r = calcEVReport(pfcEff, dcdcEff, power_kW, loss_kW, state.standardConfig.vehicleArch);
      update({ report: r });
    },
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useEV(): EVStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useEV must be inside EVStoreProvider');
  return ctx;
}
