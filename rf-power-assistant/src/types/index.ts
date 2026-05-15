// ─── Enumerations ────────────────────────────────────────────────────────────

export type ToolType =
  | 'CCP_ETCH'
  | 'ICP_ETCH'
  | 'DUAL_FREQ_CCP'
  | 'PECVD'
  | 'PVD_SPUTTER'
  | 'HDP_CVD'
  | 'ION_IMPLANT'
  | 'CUSTOM';

export type MatchingTopology = 'L_LOWPASS' | 'L_HIGHPASS' | 'PI' | 'T' | 'CUSTOM';

export type CableType = 'LMR400' | 'LMR600' | 'RG8' | 'RG213' | 'HELIAX_1_2' | 'CUSTOM';

export type FilterTopology = 'BUTTERWORTH_LP' | 'CHEBYSHEV_LP' | 'ELLIPTIC_LP' | 'NOTCH';

// ─── Core RF Impedance ───────────────────────────────────────────────────────

export interface Complex {
  r: number;
  i: number;
}

// ─── System Configuration (Step 1) ──────────────────────────────────────────

export interface SystemConfig {
  toolType: ToolType;
  primaryFrequency: number;        // Hz
  secondaryFrequency: number;      // Hz (0 = not used)
  primaryPower: number;            // W
  secondaryPower: number;          // W
  dutyCycle: number;               // 0–1
  sourceImpedance: number;         // Ω (50 standard)
  chamberDiameter: number;         // mm
  electrodeGap: number;            // mm (CCP)
  operatingPressure: number;       // mTorr
  procesGas: string;
  ambientTemp: number;             // °C
}

// ─── Plasma Load Characterization (Step 2) ──────────────────────────────────

export interface PlasmaState {
  label: string;
  resistance: number;   // Ω
  reactance: number;    // Ω (negative = capacitive)
  probability: number;  // 0–1  (weight in AITO optimisation)
}

export interface PlasmaLoad {
  estimationMethod: 'auto' | 'manual';
  states: PlasmaState[];           // ignition, steady-state, process-drift, etc.
  shuntCapacitance: number;        // pF
  seriesResistance: number;        // Ω  (bulk plasma)
  sheathCapacitance: number;       // pF
  strayInductance: number;         // nH (cables/electrodes)
  // Derived (read-only, computed)
  effectiveR: number;
  effectiveX: number;
}

// ─── Matching Network Design (Step 3) ────────────────────────────────────────

export interface MatchingComponent {
  id: string;
  type: 'L' | 'C' | 'R';
  placement: 'series' | 'shunt';
  value: number;          // H or F
  reactance: number;      // Ω at operating frequency
  voltageRating: number;  // V (peak)
  currentRating: number;  // A (rms)
  powerDissipation: number; // W
  componentQ: number;
  partSuggestion: string;
}

export interface MatchingNetworkResult {
  topology: MatchingTopology;
  designQ: number;
  components: MatchingComponent[];
  inputVSWR: number;
  bandwidth3dB: number;    // Hz
  efficiency: number;      // 0–1
  insertionLoss: number;   // dB
  aitoScore: number;       // 0–100 (AITO™ multi-state score)
  worstCaseVSWR: number;   // across all plasma states
}

// ─── Transmission Line (Step 4) ─────────────────────────────────────────────

export interface TransmissionLineConfig {
  cableType: CableType;
  customZ0: number;            // Ω
  customVF: number;            // velocity factor 0–1
  customAttendB100ft: number;  // dB/100ft at freq
  length: number;              // m
}

export interface TransmissionLineResult {
  characteristicImpedance: number;
  velocityFactor: number;
  electricalLength: number;    // degrees
  attenuation: number;         // dB total
  inputVSWR: number;
  reflectedPower: number;      // W
  peakVoltage: number;         // V
  peakCurrent: number;         // A
  powerHandling: number;       // W (rated max)
  inputImpedance: Complex;     // after transformation through cable
}

// ─── Harmonic Filter (Step 5) ────────────────────────────────────────────────

export interface HarmonicFilterResult {
  topology: FilterTopology;
  order: number;
  cornerFrequency: number;    // Hz
  attenuation2f: number;      // dB at 2nd harmonic
  attenuation3f: number;      // dB at 3rd harmonic
  attenuation5f: number;      // dB at 5th harmonic
  insertionLoss: number;      // dB at fundamental
  components: MatchingComponent[];
  requiredAttenuation: number; // dB (from FCC/SEMI standard)
  compliant: boolean;
}

// ─── Thermal Analysis (Step 6) ───────────────────────────────────────────────

export interface ThermalComponent {
  name: string;
  powerDissipation: number;    // W
  thermalResistance: number;   // °C/W
  ambientTemp: number;         // °C
  operatingTemp: number;       // °C
  maxRatedTemp: number;        // °C
  margin: number;              // °C
  status: 'ok' | 'warning' | 'critical';
}

export interface ThermalResult {
  totalDissipation: number;    // W
  coolingMethod: 'natural' | 'forced_air' | 'liquid';
  components: ThermalComponent[];
  hotspotTemp: number;         // °C
  systemEfficiency: number;    // 0–1 (overall RF delivery chain)
}

// ─── Feasibility Report (Step 7) ─────────────────────────────────────────────

export interface RiskItem {
  category: 'electrical' | 'thermal' | 'mechanical' | 'regulatory' | 'process';
  severity: 'low' | 'medium' | 'high';
  description: string;
  mitigation: string;
}

export interface BOMItem {
  qty: number;
  partDescription: string;
  value: string;
  specification: string;
  estimatedCost: number; // USD
}

export interface PatentabilityNote {
  aspect: string;
  novelty: string;
  priorArtDifferentiator: string;
}

export interface FeasibilityReport {
  feasible: boolean;
  feasibilityScore: number;   // 0–100
  overallEfficiency: number;  // 0–1
  totalPowerDelivered: number; // W
  risks: RiskItem[];
  recommendations: string[];
  bomList: BOMItem[];
  patentabilityNotes: PatentabilityNote[];
  aitoSummary: string;
  generatedAt: string;        // ISO timestamp
}

// ─── Global App State ─────────────────────────────────────────────────────────

export interface AppState {
  currentStep: number;
  completedSteps: Set<number>;
  systemConfig: SystemConfig;
  plasmaLoad: PlasmaLoad;
  matchingTopology: MatchingTopology;
  matchingResult: MatchingNetworkResult | null;
  transmissionLineConfig: TransmissionLineConfig;
  transmissionLineResult: TransmissionLineResult | null;
  harmonicFilterResult: HarmonicFilterResult | null;
  thermalResult: ThermalResult | null;
  feasibilityReport: FeasibilityReport | null;
}
