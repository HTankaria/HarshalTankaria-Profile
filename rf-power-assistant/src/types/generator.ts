// ─── RF Generator Internal Design Types ─────────────────────────────────────

export type PAClass = 'A' | 'B' | 'AB' | 'D' | 'E' | 'F_inv';
export type TransistorType = 'LDMOS' | 'GaN_HEMT' | 'GaAs_pHEMT' | 'SiC_MOSFET';
export type PFCTopology = 'none' | 'boost_pfc' | 'bridgeless_pfc' | 'vienna_3ph';
export type CouplerTopology = 'transformer' | 'coupled_line' | 'bridge_coupler';
export type ArcDetectMethod = 'reflected_ratio' | 'voltage_collapse' | 'dI_dt' | 'combined';
export type PulseModMethod = 'gate_bias' | 'driver_enable' | 'dc_bus_switch' | 'envelope_amp';
export type FreqCtrlMethod = 'fixed_crystal' | 'vcxo_adj' | 'pll_synthesiser';

// ─── DC Power Supply ──────────────────────────────────────────────────────────

export interface DCSupplyConfig {
  acInputVoltage: number;          // V rms (L-L for 3-ph)
  acInputPhases: 1 | 3;
  acFrequency: number;             // Hz
  pfcTopology: PFCTopology;
  targetDCBusVoltage: number;      // V (desired, 0 = auto)
  holdupCycles: number;            // AC cycles of holdup
  totalRFPower: number;            // W (RF output + overhead)
  overheadPower: number;           // W (fans, control, pre-amp)
}

export interface DCSupplyResult {
  rectifierType: string;
  dcBusVoltage: number;            // V
  inputCurrentRms: number;         // A
  inputPowerFactor: number;        // 0–1
  bulkCapacitance_uF: number;      // µF
  holdupTime_ms: number;           // ms
  rippleVoltage_pk: number;        // V (pk–pk)
  rippleCurrent_rms: number;       // A rms
  supplyEfficiency: number;        // 0–1
  totalInputPower: number;         // W drawn from wall
  peakRectifierCurrent: number;    // A
  recommendedFuse: string;
  capacitorVoltageRating: number;  // V
  pfcInductance_uH: number;        // µH (if PFC)
}

// ─── RF Power Amplifier ───────────────────────────────────────────────────────

export interface RFAmpConfig {
  paClass: PAClass;
  transistorType: TransistorType;
  drainVoltage: number;            // V (Vdd)
  rfOutputPower: number;           // W (total)
  frequency: number;               // Hz
  numParallelDevices: number;      // devices in push-pull per stage
  numStages: number;               // driver + final stages
  targetGain_dB: number;           // dB total
}

export interface RFAmpResult {
  optimalLoadR_per_device: number; // Ω (Ropt per transistor)
  drainEfficiency: number;         // 0–1 (theoretical)
  realEfficiency: number;          // 0–1 (practical)
  powerAddedEfficiency: number;    // 0–1
  dcCurrentTotal: number;          // A (total from supply)
  peakVoltage_Vds: number;         // V (peak drain voltage)
  peakCurrent_Id: number;          // A (peak drain current)
  classEshuntC_pF: number;         // pF (Class E shunt cap)
  classEseriesL_nH: number;        // nH (Class E series resonant L)
  inputPower_W: number;            // W (drive/exciter power)
  stagePower_W: number[];          // W per stage
  internalMatchNetworkL_nH: number;  // nH (PA→50Ω series L)
  internalMatchNetworkC_pF: number;  // pF (PA→50Ω shunt C)
  harmonicLevel_2f_dBc: number;    // dBc
  harmonicLevel_3f_dBc: number;    // dBc
  transistorPartSuggestion: string;
  vdsMaxRating: number;            // V (required device rating)
  idMaxRating: number;             // A
  powerDissipation: number;        // W (heat in transistors)
}

// ─── Pulsing Control ─────────────────────────────────────────────────────────

export interface PulsingConfig {
  enabled: boolean;
  pulseFrequency_Hz: number;
  dutyCycle: number;               // 0–1
  modulationMethod: PulseModMethod;
  desiredRiseTime_us: number;      // µs target
  desiredFallTime_us: number;      // µs target
  rfPower_W: number;
  dcBusVoltage: number;            // V (from supply design)
  bulkCapacitance_uF: number;      // µF (from supply design)
  matchingNetworkQ: number;        // from matching design
  stallPower_W: number;            // W during "off" phase (0 = full off)
  frequency_Hz: number;            // RF frequency (for bandwidth calc)
}

export interface PulsingResult {
  pulsePeriod_us: number;
  onTime_us: number;
  offTime_us: number;
  achievableRiseTime_us: number;   // µs (10–90%)
  achievableFallTime_us: number;
  plasmaResponseDelay_us: number;  // µs (estimated plasma response)
  overshoot_pct: number;           // % of peak
  peakPower_W: number;             // W (instantaneous)
  avgPower_W: number;              // W
  voltageDropDuringPulse_pct: number; // % Vdc sag
  gatingComponentSuggestion: string;
  gateResistor_Ohm: number;        // Ω (for gate_bias method)
  isolationCapacitor_pF: number;   // pF
  minStablePulseWidth_us: number;  // µs
  modulationNotes: string[];
}

// ─── Arc Detection ────────────────────────────────────────────────────────────

export interface ArcDetectConfig {
  detectionMethod: ArcDetectMethod;
  vswr_threshold: number;          // e.g. 3.0
  rfPower_W: number;
  frequency_Hz: number;
  couplingFactor_dB: number;       // from coupler design
  protectionLevel: 'basic' | 'enhanced' | 'process_safe';
  maxRecoveriesPerSec: number;
  consecutiveFaultThreshold: number;
}

export interface ArcDetectResult {
  reflectionCoeffThreshold: number;  // |Γ|
  reflectedPowerThreshold_W: number; // W
  couplerForwardVoltage_V: number;   // V at coupler port at full power
  comparatorThreshold_V: number;     // V (set point for comparator)
  responseChain: { stage: string; delay_ns: number }[];
  totalDetectionTime_us: number;     // µs (coupler to PA shutdown)
  recommendedBlankingTime_us: number;// µs
  recommendedRecoveryDelay_us: number;
  powerRampRate_kWpms: number;
  hardFaultHoldoff_ms: number;
  comparatorIC: string;              // suggested IC
  detectorDiode: string;             // suggested diode
  filterCapacitor_pF: number;        // pF (RF filter on detector)
  arcEnergyPerEvent_uJ: number;      // µJ (energy delivered to arc)
  protectionNotes: string[];
}

// ─── Directional Coupler ─────────────────────────────────────────────────────

export interface CouplerConfig {
  topology: CouplerTopology;
  frequency_Hz: number;
  rfPower_W: number;
  systemImpedance: number;           // Ω (50)
  couplingFactor_dB: number;         // dB (e.g. -20)
  targetDirectivity_dB: number;      // dB (e.g. 30)
}

export interface CouplerResult {
  couplingFactor_dB: number;
  directivity_dB: number;
  insertionLoss_dB: number;
  forwardPortPower_W: number;        // W at coupled port at full power
  forwardPortVoltage_Vrms: number;   // V rms
  powerRating_W: number;
  bandwidth_pct: number;
  // Transformer coupler
  primaryTurns: number;
  secondaryTurns: number;
  corePartSuggestion: string;
  terminationResistor_Ohm: number;
  // Stripline coupler
  coupledLength_mm: number;
  evenModeZ_Ohm: number;
  oddModeZ_Ohm: number;
  gapWidth_mm: number;
  lineWidth_mm: number;
  substrateNote: string;
  // General
  diodeDetectorSuggestion: string;
  videoFilterSuggestion: string;
}

// ─── Generator Control System ─────────────────────────────────────────────────

export interface ControlConfig {
  freqControlMethod: FreqCtrlMethod;
  frequency_Hz: number;
  powerControlBandwidth_Hz: number;  // closed-loop bandwidth
  targetAccuracy_pct: number;        // % steady-state accuracy
}

export interface ControlResult {
  pllReferenceFreq_MHz: number;
  pllDividerN: number;
  vcoTuningRange_MHz: number;
  pllLockTime_us: number;
  phaseNoise_dBcAt1kHz: number;
  loopFilterBandwidth_kHz: number;
  powerLoopPidGains: { kp: number; ki: number; kd: number };
  settlingTime_ms: number;
  steadyStateError_pct: number;
  adcBits: number;
  dacBits: number;
  microcontrollerSuggestion: string;
  interlocks: string[];
}

// ─── Full Generator State ─────────────────────────────────────────────────────

export interface GeneratorAppState {
  activeTab: 'dc_supply' | 'rf_amp' | 'pulsing' | 'arc_detect' | 'coupler' | 'control' | 'report';
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
