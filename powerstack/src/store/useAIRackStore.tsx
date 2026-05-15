import React, { createContext, useContext, useState } from 'react';
import type { AIRackAppState, RackConfig, BusConfig, DCDCStagesConfig, ThermalConfig } from '../types/aiRack';
import { calcRackConfig, calcBus, calcDCDCStages, calcRackThermal, calcAIRackReport } from '../calculations/aiRackCalc';

const DEFAULT_STATE: AIRackAppState = {
  activeTab: 'rack_config',
  rackConfig: {
    rackStandard: 'OCP_V3',
    gpuModel: 'H100_SXM5',
    gpusPerRack: 8,
    cpuNodesPerRack: 2,
    cpuTdpPerNode_W: 350,
    networkSwitch_W: 600,
    customGpuTdp_W: 700,
    busVoltage_V: 48,
    redundancyMode: 'N+1',
    holdupTime_ms: 10,
  },
  rackResult: null,
  busConfig: {
    busVoltage_V: 48,
    totalPower_kW: 100,
    busLength_m: 1.2,
    conductorMaterial: 'copper',
    psusInParallel: 12,
    psuTopology: 'LLC_PFC',
    acInputVoltage_V: 480,
    holdupTime_ms: 10,
  },
  busResult: null,
  dcdcConfig: {
    primaryBusVoltage_V: 48,
    totalLoadPower_kW: 100,
    gpuVoltage_V: 1.8,
    cpuVoltage_V: 12,
    conversionPath: '2stage_12V',
    switchFrequency_kHz: 500,
    vrmPhases: 8,
    gpuCount: 8,
    gpuTdp_W: 700,
  },
  dcdcResult: null,
  thermalConfig: {
    coolingArch: 'direct_liquid',
    totalHeatLoad_kW: 100,
    inletTemp_C: 18,
    targetExitTemp_C: 35,
    rackHeight_U: 48,
    gpuCount: 8,
    gpuTdp_W: 700,
  },
  thermalResult: null,
  report: null,
};

interface AIRackStore {
  state: AIRackAppState;
  setActiveTab: (t: AIRackAppState['activeTab']) => void;
  updateRackConfig: (c: Partial<RackConfig>) => void;
  runRackConfig: () => void;
  updateBusConfig: (c: Partial<BusConfig>) => void;
  runBusCalc: () => void;
  updateDCDCConfig: (c: Partial<DCDCStagesConfig>) => void;
  runDCDCCalc: () => void;
  updateThermalConfig: (c: Partial<ThermalConfig>) => void;
  runThermalCalc: () => void;
  generateReport: () => void;
}

const Ctx = createContext<AIRackStore | null>(null);

export function AIRackStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AIRackAppState>(DEFAULT_STATE);

  const update = (patch: Partial<AIRackAppState>) => setState(s => ({ ...s, ...patch }));

  const store: AIRackStore = {
    state,
    setActiveTab: t => update({ activeTab: t }),
    updateRackConfig: c => update({ rackConfig: { ...state.rackConfig, ...c } }),
    runRackConfig: () => {
      const r = calcRackConfig(state.rackConfig);
      update({
        rackResult: r,
        activeTab: 'bus48v',
        busConfig: {
          ...state.busConfig,
          busVoltage_V: state.rackConfig.busVoltage_V,
          totalPower_kW: r.peakPower_kW,
          psusInParallel: r.psusRequired,
          holdupTime_ms: state.rackConfig.holdupTime_ms,
        },
      });
    },
    updateBusConfig: c => update({ busConfig: { ...state.busConfig, ...c } }),
    runBusCalc: () => {
      const r = calcBus(state.busConfig);
      update({
        busResult: r,
        activeTab: 'dcdc_stages',
        dcdcConfig: {
          ...state.dcdcConfig,
          primaryBusVoltage_V: state.busConfig.busVoltage_V,
          totalLoadPower_kW: state.busConfig.totalPower_kW,
          gpuCount: state.rackConfig.gpusPerRack,
          gpuTdp_W: state.rackResult?.gpuTdp_W ?? 700,
        },
      });
    },
    updateDCDCConfig: c => update({ dcdcConfig: { ...state.dcdcConfig, ...c } }),
    runDCDCCalc: () => {
      const r = calcDCDCStages(state.dcdcConfig);
      update({
        dcdcResult: r,
        activeTab: 'thermal',
        thermalConfig: {
          ...state.thermalConfig,
          totalHeatLoad_kW: state.dcdcConfig.totalLoadPower_kW + r.totalConversionLoss_kW,
          gpuCount: state.dcdcConfig.gpuCount,
          gpuTdp_W: state.dcdcConfig.gpuTdp_W,
        },
      });
    },
    updateThermalConfig: c => update({ thermalConfig: { ...state.thermalConfig, ...c } }),
    runThermalCalc: () => {
      const r = calcRackThermal(state.thermalConfig);
      update({ thermalResult: r, activeTab: 'report' });
    },
    generateReport: () => {
      const IT = state.rackResult?.totalITPower_kW ?? 100;
      const wall = state.thermalResult?.totalFacilityPower_kW ?? IT * 1.3;
      const pue = state.thermalResult?.pue ?? 1.3;
      const eff = state.dcdcResult?.overallEfficiency_pct ?? 85;
      const r = calcAIRackReport(IT, wall, pue, eff, state.rackConfig.gpuModel, state.rackConfig.busVoltage_V.toString());
      update({ report: r });
    },
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useAIRack(): AIRackStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAIRack must be inside AIRackStoreProvider');
  return ctx;
}
