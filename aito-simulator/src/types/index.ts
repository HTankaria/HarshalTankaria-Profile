export interface ImpedanceState {
  id: string;
  label: string;
  resistance: number;
  reactance: number;
  probability: number;
}

export interface Recipe {
  id: string;
  name: string;
  toolType: string;
  frequency: number;
  power: number;
  notes: string;
  states: ImpedanceState[];
}

export interface LNetwork {
  C_shunt: number;
  L_series: number;
  Q: number;
  designR: number;
  designX: number;
}

export interface StateResult {
  state: ImpedanceState;
  gamma: number;
  vswr: number;
  returnLoss: number;
}

export interface AITOResult {
  centroidR: number;
  centroidX: number;
  sigmaR: number;
  sigmaX: number;
  qOpt: number;
  score: number;
  network: LNetwork;
  stateResults: StateResult[];
  ssNetwork: LNetwork;
  ssStateResults: StateResult[];
}
