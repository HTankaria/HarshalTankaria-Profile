export type PAClass = 'CLASS_A' | 'CLASS_AB' | 'CLASS_B' | 'CLASS_E' | 'CLASS_D' | 'CLASS_F_INV';
export type TransistorType = 'LDMOS' | 'GaN_HEMT' | 'Si_BJT' | 'SiC_JFET';
export type PFCTopology = 'boost_pfc' | 'bridgeless_totem_pole' | 'vienna_3ph';
export type CouplerTopology = 'transformer' | 'coupled_line';
export type ArcDetectMethod = 'reflected_power' | 'voltage_dip' | 'current_spike';
export type PulseModMethod = 'gate_bias' | 'driver_enable' | 'dc_bus_switch' | 'envelope_amp';
export type FreqCtrlMethod = 'integer_N_PLL' | 'DDS' | 'fixed_crystal';

export interface DCSupplyConfig {
  acInputVoltage_V: number;
  acInputPhases: 1 | 3;
  outputPower_W: number;
  outputVoltage_V: number;
  pfcTopology: PFCTopology;
  holdupTime_ms: number;
  switchFrequency_kHz: number;
}

export interface DCSupplyResult {
  dcBusVoltage_V: number;
  bulkCapacitance_uF: number;
  pfcInductance_uH: number;
  inputCurrentRMS_A: number;
  switchCurrentPeak_A: number;
  efficiency_pct: number;
  fuseRating_A: number;
  rippleVoltage_V: number;
  pfcSwitchSuggestion: string;
  notes: string[];
}

export interface RFAmpConfig {
  paClass: PAClass;
  transistorType: TransistorType;
  frequency_Hz: number;
  outputPower_W: number;
  supplyVoltage_V: number;
  stages: number;
}

export interface RFAmpResult {
  drainEfficiency_pct: number;
  pac_efficiency_pct: number;
  inputPower_W: number;
  dcCurrent_A: number;
  vdsPeak_V: number;
  idPeak_A: number;
  Ropt_ohm: number;
  Cshunt_pF: number;
  Lseries_nH: number;
  outputMatchQ: number;
  harmonicLevels: { h: number; dBc: number }[];
  transistorSuggestion: string;
  classNotes: string[];
}

export interface PulsingConfig {
  modulationMethod: PulseModMethod;
  pulseFrequency_Hz: number;
  dutyCycle_pct: number;
  riseTime_us: number;
  frequency_Hz: number;
  outputPower_W: number;
  supplyVoltage_V: number;
  bulkCapacitance_uF: number;
}

export interface PulsingResult {
  actualRiseTime_us: number;
  actualFallTime_us: number;
  peakPower_W: number;
  avgPower_W: number;
  droop_V: number;
  switchSuggestion: string;
  driverSuggestion: string;
  notes: string[];
}

export interface ArcDetectConfig {
  method: ArcDetectMethod;
  threshold_pct: number;
  frequency_Hz: number;
  outputPower_W: number;
}

export interface ArcDetectResult {
  detectionLatency_us: number;
  latencyChain: { stage: string; delay_ns: number }[];
  thresholdLevel_dBm: number;
  detectorSuggestion: string;
  arcEnergy_uJ: number;
  recoveryTime_ms: number;
  notes: string[];
}

export interface CouplerConfig {
  topology: CouplerTopology;
  frequency_Hz: number;
  power_W: number;
  couplingFactor_dB: number;
  sourceImpedance_ohm: number;
}

export interface CouplerResult {
  couplingFactor_dB: number;
  directivity_dB: number;
  insertionLoss_dB: number;
  forwardPower_W: number;
  reflectedPower_W: number;
  topologyDetails: string;
  partSuggestion: string;
  notes: string[];
}

export interface ControlConfig {
  frequencyControl: FreqCtrlMethod;
  referenceFreq_MHz: number;
  targetFreq_MHz: number;
  loopBandwidth_kHz: number;
  pidKp: number;
  pidKi: number;
  pidKd: number;
}

export interface ControlResult {
  pllDividerN: number;
  lockTime_us: number;
  phaseNoise_dBcHz: number;
  frequencyResolution_Hz: number;
  pidBandwidth_Hz: number;
  mcuSuggestion: string;
  interlocks: string[];
  notes: string[];
}

export interface GeneratorAppState {
  activeTab: 'dc_supply' | 'rf_amp' | 'pulsing' | 'arc_detect' | 'coupler' | 'control' | 'gen_report';
  dcConfig: DCSupplyConfig;
  dcResult: DCSupplyResult | null;
  ampConfig: RFAmpConfig;
  ampResult: RFAmpResult | null;
  pulsingConfig: PulsingConfig;
  pulsingResult: PulsingResult | null;
  arcConfig: ArcDetectConfig;
  arcResult: ArcDetectResult | null;
  couplerConfig: CouplerConfig;
  couplerResult: CouplerResult | null;
  controlConfig: ControlConfig;
  controlResult: ControlResult | null;
}
