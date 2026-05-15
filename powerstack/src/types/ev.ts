// ─── EV Charger Design Types ─────────────────────────────────────────────────

export type ChargingStandard = 'NACS' | 'CCS1' | 'CCS2' | 'CHADEMO' | 'J1772_AC' | 'GB_T';
export type PowerLevel = 'L1' | 'L2_7kW' | 'L2_11kW' | 'L2_22kW' | 'DCFC_50kW' | 'DCFC_150kW' | 'DCFC_350kW' | 'HPC_500kW';
export type VehicleArch = '400V' | '800V';
export type ConverterTopology = 'LLC' | 'CLLC_BIDIR' | 'PSFB' | 'DAB';
export type SwitchTech = 'Si_IGBT' | 'SiC_MOSFET' | 'GaN_HEMT';
export type CoolingMethod = 'forced_air' | 'liquid_glycol' | 'liquid_direct';

// ─── Step 1: Charging Standard & Architecture ────────────────────────────────

export interface EVStandardConfig {
  standard: ChargingStandard;
  powerLevel: PowerLevel;
  vehicleArch: VehicleArch;
  bidirectional: boolean;
  simultaneousPorts: number;
  acInputVoltage: number;       // V L-L (e.g. 480 for US 3-phase)
  acInputPhases: 1 | 3;
  acFrequency: number;          // Hz
}

export interface EVStandardResult {
  maxOutputPower_kW: number;
  outputVoltageRange: [number, number];   // V min/max
  maxOutputCurrent_A: number;
  dcBusVoltage_V: number;                 // intermediate DC bus
  connectorPinout: string;
  protocolNote: string;
  switchTechRequired: SwitchTech;
  isolationRequired: boolean;
  approxEfficiency: number;               // 0–1
  weightEstimate_kg: number;
  standards: string[];
  arch800vNotes: string[];
}

// ─── Step 2: AC Input & PFC ──────────────────────────────────────────────────

export interface PFCConfig {
  topology: 'boost_pfc' | 'bridgeless_totem_pole' | 'vienna_3ph';
  targetDCBus_V: number;
  powerFactor: number;
  switchFrequency_kHz: number;
  acInputVoltage: number;
  acInputPhases: 1 | 3;
  acFrequency: number;
  totalPower_kW: number;
}

export interface PFCResult {
  dcBusVoltage_V: number;
  boostInductance_uH: number;
  switchCurrentPeak_A: number;
  inputCurrentTHD_pct: number;
  inputCurrentRms_A: number;
  pfcSwitchSuggestion: string;
  bridgeOrSwitchLoss_W: number;
  filterCapacitance_uF: number;
  filterCapVoltageRating_V: number;
  efficiency_pct: number;
  topology: string;
}

// ─── Step 3: DC-DC Converter ─────────────────────────────────────────────────

export interface DCDCConfig {
  topology: ConverterTopology;
  switchTech: SwitchTech;
  primaryVoltage_V: number;     // DC bus
  outputVoltageNom_V: number;   // battery nominal voltage
  outputVoltageMin_V: number;
  outputVoltageMax_V: number;
  outputPower_kW: number;
  switchFrequency_kHz: number;
  vehicleArch: VehicleArch;
}

export interface DCDCResult {
  turnsRatio: number;
  resonantFrequency_kHz: number;
  resonantInductance_uH: number;
  resonantCapacitance_nF: number;
  magnetisingInductance_uH: number;
  qualityFactor: number;
  primarySwitchVoltage_V: number;
  primarySwitchCurrent_A: number;
  secondarySwitchVoltage_V: number;
  secondarySwitchCurrent_A: number;
  primarySwitchSuggestion: string;
  secondarySwitchSuggestion: string;
  transformerTurnsNote: string;
  estimatedEfficiency_pct: number;
  frequencyRange_kHz: [number, number];
  designNotes: string[];
}

// ─── Step 4: Thermal & Safety ────────────────────────────────────────────────

export interface EVThermalConfig {
  totalLoss_W: number;
  coolingMethod: CoolingMethod;
  ambientTemp_C: number;
  targetJunctionTemp_C: number;
}

export interface EVThermalResult {
  coolantFlowRate: number;      // L/min (liquid) or CFM (air)
  coolantFlowUnit: string;
  heatsinkRth_CperW: number;
  caseTemp_C: number;
  coolingPower_W: number;
  thermalMargin_C: number;
  enclosureIP: string;
  safetyStandards: string[];
  groundFaultNote: string;
}

// ─── Step 5: EV Charger Report ───────────────────────────────────────────────

export interface EVReport {
  feasible: boolean;
  feasibilityScore: number;
  overallEfficiency_pct: number;
  totalPowerLoss_kW: number;
  co2Saved_kgPerYear: string;
  costEstimate_USD: number;
  bomHighlights: { item: string; spec: string; cost: number }[];
  risks: { severity: 'low'|'medium'|'high'; text: string }[];
  complianceList: string[];
  arch800vAdvantages: string[];
  generatedAt: string;
}

// ─── Full EV App State ────────────────────────────────────────────────────────

export interface EVAppState {
  activeTab: 'standard' | 'pfc' | 'dcdc' | 'thermal' | 'report';
  standardConfig: EVStandardConfig;
  standardResult: EVStandardResult | null;
  pfcConfig: PFCConfig;
  pfcResult: PFCResult | null;
  dcdcConfig: DCDCConfig;
  dcdcResult: DCDCResult | null;
  thermalConfig: EVThermalConfig;
  thermalResult: EVThermalResult | null;
  report: EVReport | null;
}
