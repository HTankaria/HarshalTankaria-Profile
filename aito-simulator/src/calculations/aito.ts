import type { ImpedanceState, LNetwork, AITOResult, StateResult } from '../types';

// ─── Core math helpers ────────────────────────────────────────────────────────

function complexDiv(ar: number, ai: number, br: number, bi: number) {
  const d = br * br + bi * bi;
  return { r: (ar * br + ai * bi) / d, i: (ai * br - ar * bi) / d };
}

// Reflection coefficient Γ = (Z - Z0) / (Z + Z0)
export function zToGamma(R: number, X: number, Z0: number) {
  return complexDiv(R - Z0, X, R + Z0, X);
}

// |Γ| from R + jX
export function gammaMag(R: number, X: number, Z0: number) {
  const g = zToGamma(R, X, Z0);
  return Math.sqrt(g.r * g.r + g.i * g.i);
}

// ─── AITO centroid ────────────────────────────────────────────────────────────

export function weightedCentroid(states: ImpedanceState[]) {
  const totalP = states.reduce((s, st) => s + st.probability, 0) || 1;
  return {
    R: states.reduce((s, st) => s + st.resistance * st.probability, 0) / totalP,
    X: states.reduce((s, st) => s + st.reactance * st.probability, 0) / totalP,
  };
}

export function sigmas(states: ImpedanceState[]) {
  const { R: Rbar, X: Xbar } = weightedCentroid(states);
  const totalP = states.reduce((s, st) => s + st.probability, 0) || 1;
  const sR = Math.sqrt(states.reduce((s, st) => s + st.probability * (st.resistance - Rbar) ** 2, 0) / totalP);
  const sX = Math.sqrt(states.reduce((s, st) => s + st.probability * (st.reactance - Xbar) ** 2, 0) / totalP);
  return { sigmaR: sR, sigmaX: sX };
}

// ─── L-network synthesis  (shunt-C load side, series-L source side) ───────────
// Works when centroidR < Z0 (plasma always satisfies this at 50Ω)

export function synthesisLNetwork(targetR: number, _targetX: number, Z0: number, freq: number): LNetwork {
  const safeR = Math.max(targetR, 0.5);
  const Q = Math.sqrt(Math.max(Z0 / safeR - 1, 0.01));
  const omega = 2 * Math.PI * freq;
  const B_shunt = Q / safeR;
  const X_series = Z0 / Q;
  return {
    C_shunt: B_shunt / omega,
    L_series: X_series / omega,
    Q,
    designR: targetR,
    designX: _targetX,
  };
}

// ─── Network response at an arbitrary load ────────────────────────────────────

export function networkResponseAt(state: ImpedanceState, net: LNetwork, Z0: number, freq: number): StateResult {
  const omega = 2 * Math.PI * freq;
  const { resistance: R, reactance: X } = state;

  // 1. Admittance of load
  const d0 = R * R + X * X;
  const GL = R / d0, BL = -X / d0;

  // 2. Add shunt C
  const G1 = GL, B1 = BL + omega * net.C_shunt;

  // 3. Convert back to impedance
  const d1 = G1 * G1 + B1 * B1;
  const R1 = G1 / d1, X1 = -B1 / d1;

  // 4. Add series L
  const R2 = R1, X2 = X1 + omega * net.L_series;

  const gamma = gammaMag(R2, X2, Z0);
  const vswr = gamma >= 0.9999 ? 999 : (1 + gamma) / (1 - gamma);
  const returnLoss = gamma > 1e-6 ? -20 * Math.log10(gamma) : 60;
  return { state, gamma, vswr, returnLoss };
}

// ─── Trajectory: parametric points through the L-network ─────────────────────

export function trajectoryPoints(
  state: ImpedanceState,
  net: LNetwork,
  Z0: number,
  freq: number,
  nPts = 60,
): Array<{ re: number; im: number }> {
  const omega = 2 * Math.PI * freq;
  const { resistance: R, reactance: X } = state;
  const pts: Array<{ re: number; im: number }> = [];

  const d0 = R * R + X * X;
  const GL = R / d0, BL = -X / d0;
  const B_full = omega * net.C_shunt;
  const X_full = omega * net.L_series;

  // Phase 1: sweep shunt C from 0 → full
  for (let k = 0; k <= nPts; k++) {
    const t = k / nPts;
    const G = GL, B = BL + t * B_full;
    const d = G * G + B * B;
    const Rz = G / d, Xz = -B / d;
    const g = zToGamma(Rz, Xz, Z0);
    pts.push({ re: g.r, im: g.i });
  }

  // Intermediate Z after shunt C
  const G1 = GL, B1 = BL + B_full;
  const d1 = G1 * G1 + B1 * B1;
  const R1 = G1 / d1, X1 = -B1 / d1;

  // Phase 2: sweep series L from 0 → full
  for (let k = 1; k <= nPts; k++) {
    const t = k / nPts;
    const Rz = R1, Xz = X1 + t * X_full;
    const g = zToGamma(Rz, Xz, Z0);
    pts.push({ re: g.r, im: g.i });
  }

  return pts;
}

// ─── Full AITO computation ────────────────────────────────────────────────────

export function computeAITO(
  states: ImpedanceState[],
  Z0 = 50,
  freq = 13.56e6,
): AITOResult {
  if (states.length === 0) {
    const net = synthesisLNetwork(8, -80, Z0, freq);
    return {
      centroidR: 8, centroidX: -80, sigmaR: 0, sigmaX: 0, qOpt: 5, score: 0,
      network: net, stateResults: [], ssNetwork: net, ssStateResults: [],
    };
  }

  const { R: centroidR, X: centroidX } = weightedCentroid(states);
  const { sigmaR, sigmaX } = sigmas(states);
  const qOpt = sigmaR > 0.1 ? centroidR / sigmaR : centroidR / 1;

  const network = synthesisLNetwork(centroidR, centroidX, Z0, freq);
  const stateResults = states.map(s => networkResponseAt(s, network, Z0, freq));

  // Steady-state-only design (highest probability state)
  const ssState = states.reduce((a, b) => b.probability > a.probability ? b : a);
  const ssNetwork = synthesisLNetwork(ssState.resistance, ssState.reactance, Z0, freq);
  const ssStateResults = states.map(s => networkResponseAt(s, ssNetwork, Z0, freq));

  const totalP = states.reduce((s, st) => s + st.probability, 0) || 1;
  const score = 1 - stateResults.reduce((s, r, i) => s + states[i].probability * r.gamma, 0) / totalP;

  return { centroidR, centroidX, sigmaR, sigmaX, qOpt, score, network, stateResults, ssNetwork, ssStateResults };
}

// ─── Default CCP etch states ──────────────────────────────────────────────────

export const DEFAULT_STATES: ImpedanceState[] = [
  { id: '1', label: 'Pre-ignition',   resistance: 2,  reactance: -150, probability: 0.05 },
  { id: '2', label: 'Steady-state',   resistance: 8,  reactance: -80,  probability: 0.75 },
  { id: '3', label: 'Process drift',  resistance: 12, reactance: -60,  probability: 0.15 },
  { id: '4', label: 'Near-extinction',resistance: 3,  reactance: -120, probability: 0.05 },
];

export const STATE_COLORS = ['#f59e0b', '#34d399', '#60a5fa', '#f87171', '#a78bfa', '#fb923c', '#e879f9'];

export function fmtF(v: number) {
  if (v >= 1e9) return `${(v / 1e9).toFixed(3)} GHz`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(3)} MHz`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)} kHz`;
  return `${v.toFixed(0)} Hz`;
}

export function fmtC(v: number) {
  if (v < 1e-9) return `${(v * 1e12).toFixed(1)} pF`;
  return `${(v * 1e9).toFixed(2)} nF`;
}

export function fmtL(v: number) {
  if (v < 1e-6) return `${(v * 1e9).toFixed(1)} nH`;
  return `${(v * 1e6).toFixed(2)} µH`;
}
