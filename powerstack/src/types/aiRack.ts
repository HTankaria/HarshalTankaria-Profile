// ─── AI / GPU Rack Power Design Types ────────────────────────────────────────

export type GPUModel = 'H100_SXM5' | 'H200_SXM' | 'B100_SXM' | 'B200_SXM' | 'A100_SXM4' | 'MI300X' | 'CUSTOM';
export type RackStandard = 'OCP_V3' | 'OCP_V2' | 'EIA_42U' | 'OCP_21INC';
export type PSUTopology = 'LLC_PFC' | 'PSFB_PFC' | 'CLLC_BIDIR';
export type DCDCStage = '48V_to_12V' | '48V_to_6V' | '48V_direct_VRM' | '12V_to_1V';
export type CoolingArch = 'forced_air' | 'direct_liquid' | 'rear_door_hx' | 'immersion';

// ─── Step 1: Rack Configuration ───────────────────────────────────────────────

export interface RackConfig {
  rackStandard: RackStandard;
  gpuModel: GPUModel;
  gpusPerRack: number;
  cpuNodesPerRack: number;
  cpuTdpPerNode_W: number;
  networkSwitch_W: number;
  customGpuTdp_W: number;
  busVoltage_V: number;         // 48V standard, or 380V future DC
  redundancyMode: 'N+1' | 'N+N' | '2N';
  holdupTime_ms: number;
}

export interface RackConfigResult {
  gpuTdp_W: number;
  totalGpuPower_kW: number;
  totalCpuPower_kW: number;
  overheadPower_kW: number;   // networking, fans, management
  totalITPower_kW: number;
  peakPower_kW: number;
  psusRequired: number;
  psuRating_kW: number;
  gpuModel_name: string;
  rackU_height: number;
  powerDensity_kWperU: number;
}

// ─── Step 2: 48V OCP Bus Design ──────────────────────────────────────────────

export interface BusConfig {
  busVoltage_V: number;
  totalPower_kW: number;
  busLength_m: number;
  conductorMaterial: 'copper' | 'aluminum';
  psusInParallel: number;
  psuTopology: PSUTopology;
  acInputVoltage_V: number;
  holdupTime_ms: number;
}

export interface BusResult {
  totalBusCurrent_A: number;
  busBarCrossSection_mm2: number;
  busBarDimensions: string;
  busBarResistance_uOhm: number;
  busBarVoltageDrop_mV: number;
  busBarPowerLoss_W: number;
  bulkCapacitance_mF: number;
  currentPerPSU_A: number;
  psuEfficiency: number;
  totalACInputPower_kW: number;
  acInputCurrent_A: number;
  psPartSuggestion: string;
  busBoltTorque_Nm: number;
  connectionNote: string;
}

// ─── Step 3: DC-DC Converter Stages ──────────────────────────────────────────

export interface DCDCStagesConfig {
  primaryBusVoltage_V: number;
  totalLoadPower_kW: number;
  gpuVoltage_V: number;         // e.g. 12V PCIe or 1.8V direct
  cpuVoltage_V: number;         // typically 12V → VRM → 1.0V
  conversionPath: '2stage_12V' | 'direct_48V_VRM' | 'hybrid';
  switchFrequency_kHz: number;
  vrmPhases: number;
  gpuCount: number;
  gpuTdp_W: number;
}

export interface StageResult {
  name: string;
  inputVoltage_V: number;
  outputVoltage_V: number;
  outputCurrent_A: number;
  efficiency_pct: number;
  topology: string;
  switchCurrentPeak_A: number;
  inductancePerPhase_nH: number;
  outputCapacitance_uF: number;
  powerLoss_W: number;
  switchSuggestion: string;
}

export interface DCDCStagesResult {
  stages: StageResult[];
  overallEfficiency_pct: number;
  totalConversionLoss_kW: number;
  powerAtGPURail_kW: number;
  vrmRipple_mV: number;
  loadTransientResponse_us: number;
  designNotes: string[];
}

// ─── Step 4: Thermal Design ───────────────────────────────────────────────────

export interface ThermalConfig {
  coolingArch: CoolingArch;
  totalHeatLoad_kW: number;
  inletTemp_C: number;
  targetExitTemp_C: number;
  rackHeight_U: number;
  gpuCount: number;
  gpuTdp_W: number;
}

export interface ThermalResult {
  // Air
  airflowRequired_CFM: number;
  airflowRequired_m3s: number;
  fanPower_W: number;
  // Liquid
  coolantFlowRate_Lpm: number;
  coolantInletPressure_kPa: number;
  // Common
  pue: number;
  totalFacilityPower_kW: number;
  coolingPower_kW: number;
  hotSpotTemp_C: number;
  thermalResistanceJA: number;
  coolingMethod_desc: string;
  perServerFlowRate: string;
  manifoldPressureDrop_kPa: number;
  co2PerYear_tonnes: number;
  costPerYear_USD: number;
  recommendedCDU: string;
}

// ─── Step 5: AI Rack Report ───────────────────────────────────────────────────

export interface AIRackReport {
  feasible: boolean;
  feasibilityScore: number;
  totalITPower_kW: number;
  wallPower_kW: number;
  pue: number;
  overallChainEfficiency_pct: number;
  annualEnergyCost_USD: number;
  annualCO2_tonnes: number;
  risks: { severity: 'low'|'medium'|'high'; text: string }[];
  bomHighlights: { item: string; spec: string; estCost: number }[];
  ocp_compliance: boolean;
  designNotes: string[];
  generatedAt: string;
}

// ─── Full AI Rack App State ────────────────────────────────────────────────────

export interface AIRackAppState {
  activeTab: 'rack_config' | 'bus48v' | 'dcdc_stages' | 'thermal' | 'report';
  rackConfig: RackConfig;
  rackResult: RackConfigResult | null;
  busConfig: BusConfig;
  busResult: BusResult | null;
  dcdcConfig: DCDCStagesConfig;
  dcdcResult: DCDCStagesResult | null;
  thermalConfig: ThermalConfig;
  thermalResult: ThermalResult | null;
  report: AIRackReport | null;
}
