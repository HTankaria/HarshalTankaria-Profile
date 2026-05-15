// ─── RF Power Design Assistant Types ─────────────────────────────────────────

export type ToolType = 'CCP' | 'ICP' | 'PECVD' | 'PVD' | 'ALD' | 'ECR' | 'CUSTOM';
export type MatchingTopology = 'L_lowpass' | 'L_highpass' | 'Pi' | 'T';
export type FrequencyBand = '400kHz' | '2MHz' | '13.56MHz' | '27MHz' | '40MHz' | '60MHz';

export interface Complex {
  re: number;
  im: number;
}

export interface PlasmaState {
  id: string;
  label: string;
  R_plasma: number;    // Ω
  C_plasma: number;    // F
  L_stray: number;     // H
  probability: number; // 0–1
}

export interface SystemConfig {
  toolType: ToolType;
  frequency_Hz: number;
  rfPower_W: number;
  sourceImpedance_R: number;   // Ω (usually 50)
  chamberPressure_mTorr: number;
  chamberDiameter_mm: number;
  electrodeGap_mm: number;
  matchingTopology: MatchingTopology;
  customPlasmaR?: number;
  customPlasmaC?: number;
}

export interface MatchingComponent {
  type: 'L' | 'C' | 'R';
  label: string;
  value: number;
  unit: string;
  placement: 'series' | 'shunt';
  currentRMS_A: number;
  voltageRMS_V: number;
  powerLoss_W: number;
}

export interface MatchingNetworkResult {
  topology: MatchingTopology;
  components: MatchingComponent[];
  Zin: Complex;
  gamma: Complex;
  vswr: number;
  returnLoss_dB: number;
  mismatchLoss_dB: number;
  networkEfficiency_pct: number;
  aitoScore: number;
  designNotes: string[];
}

export interface TransmissionLineConfig {
  lineType: 'coax_50' | 'coax_75' | 'stripline' | 'custom';
  length_m: number;
  customZ0?: number;
  lossFactor_dBper100m?: number;
}

export interface TransmissionLineResult {
  Z0: number;
  betaL_deg: number;
  Zin: Complex;
  vswr: number;
  returnLoss_dB: number;
  attenuation_dB: number;
  powerLoss_W: number;
  phaseShift_deg: number;
  notes: string[];
}

export interface HarmonicFilterResult {
  order: number;
  cutoffFreq_MHz: number;
  components: { label: string; value: number; unit: string; type: 'L' | 'C' }[];
  attenuation2f_dB: number;
  attenuation3f_dB: number;
  insertionLoss_dB: number;
  notes: string[];
}

export interface ThermalResult {
  matchNetworkTemp_C: number;
  filterTemp_C: number;
  ambientTemp_C: number;
  totalPowerLoss_W: number;
  heatsinkRequired: boolean;
  heatsinkRth: number;
  coolingRecommendation: string;
  skinDepth_um: number;
  rfCurrentDensity_Amm2: number;
  notes: string[];
}

export interface BOMItem {
  component: string;
  value: string;
  rating: string;
  partSuggestion: string;
  estimatedCost: number;
}

export interface RiskItem {
  severity: 'low' | 'medium' | 'high';
  category: string;
  description: string;
  mitigation: string;
}

export interface FeasibilityReport {
  feasible: boolean;
  feasibilityScore: number;        // 0–100
  aitoScore: number;
  overallEfficiency_pct: number;
  powerToPlasma_W: number;
  bom: BOMItem[];
  risks: RiskItem[];
  patentabilityNotes: string[];
  designNotes: string[];
  complianceNotes: string[];
  generatedAt: string;
}

export interface AppState {
  activeStep: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  mode: 'system' | 'generator';
  systemConfig: SystemConfig;
  plasmaStates: PlasmaState[];
  matchingResult: MatchingNetworkResult | null;
  txLineConfig: TransmissionLineConfig;
  txLineResult: TransmissionLineResult | null;
  filterResult: HarmonicFilterResult | null;
  thermalResult: ThermalResult | null;
  report: FeasibilityReport | null;
}
