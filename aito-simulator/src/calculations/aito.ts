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

// ─── L-network synthesis (shunt-C load side, series-L source side) ────────────
// Full synthesis accounting for load reactance X.
// For plasma loads (highly capacitive, R << Z0) this topology is valid.

export function synthesisLNetwork(targetR: number, targetX: number, Z0: number, freq: number): LNetwork {
  const omega = 2 * Math.PI * freq;
  const safeR = Math.max(targetR, 0.1);

  // Admittance of load: G + jB
  const denom = safeR * safeR + targetX * targetX;
  const G = safeR / denom;
  const B_load = -targetX / denom;  // note: capacitive X<0 → B_load > 0

  // Solve for shunt susceptance B1 = B_load + ωC such that:
  // G / (G² + B1²) = Z0  →  B1² = G(1/Z0 − G)
  const disc = G * (1 / Z0 - G);

  let B1: number;
  if (disc >= 0) {
    // Two solutions; pick the one closer to cancelling existing B_load
    const sqrtDisc = Math.sqrt(disc);
    const sol1 = sqrtDisc, sol2 = -sqrtDisc;
    B1 = Math.abs(sol1 - B_load) < Math.abs(sol2 - B_load) ? sol1 : sol2;
  } else {
    // G > 1/Z0: load conductance too large; fall back to simple Q match
    const Q = Math.sqrt(Math.max(Z0 / safeR - 1, 0.01));
    B1 = Q / safeR - B_load;
  }

  const ωC = B1 - B_load;           // what the shunt cap must supply (can be negative → use shunt L)
  const C_shunt = Math.max(ωC / omega, 1e-15);  // clamp to physical value

  // Series inductor cancels remaining imaginary part at junction
  const G2 = G, B1_actual = B_load + C_shunt * omega;
  const d2 = G2 * G2 + B1_actual * B1_actual;
  const X_junction = -B1_actual / d2;  // Im(Z) after shunt element
  const X_series = -X_junction;        // series L must cancel it
  const L_series = Math.max(X_series / omega, 1e-15);

  const Q = Math.sqrt(Math.max(Z0 / safeR - 1, 0.01));
  return { C_shunt, L_series, Q, designR: targetR, designX: targetX };
}

// ─── Numerical optimiser: grid-search (C, L) to maximise AITO score ───────────

export function optimizeNetwork(
  states: ImpedanceState[], Z0: number, freq: number,
): { network: LNetwork; score: number } {
  if (states.length === 0) return { network: synthesisLNetwork(8, -80, Z0, freq), score: 0 };

  const totalP = states.reduce((s, st) => s + st.probability, 0) || 1;

  function evalScore(C: number, L: number): number {
    const net: LNetwork = { C_shunt: C, L_series: L, Q: 0, designR: 0, designX: 0 };
    const wg = states.reduce((s, st) =>
      s + st.probability * networkResponseAt(st, net, Z0, freq).gamma, 0) / totalP;
    return 1 - wg;
  }

  // Coarse log-scale grid
  const N = 80;
  const Cmin = 1e-12, Cmax = 200e-9;
  const Lmin = 1e-9,  Lmax = 100e-6;

  let bestScore = -1, bestC = 100e-12, bestL = 200e-9;

  for (let i = 0; i < N; i++) {
    const C = Cmin * Math.pow(Cmax / Cmin, i / (N - 1));
    for (let j = 0; j < N; j++) {
      const L = Lmin * Math.pow(Lmax / Lmin, j / (N - 1));
      const s = evalScore(C, L);
      if (s > bestScore) { bestScore = s; bestC = C; bestL = L; }
    }
  }

  // Fine grid around best point (±2 octaves)
  const M = 50;
  const Clo = bestC / 4, Chi = bestC * 4;
  const Llo = bestL / 4, Lhi = bestL * 4;

  for (let i = 0; i < M; i++) {
    const C = Clo * Math.pow(Chi / Clo, i / (M - 1));
    for (let j = 0; j < M; j++) {
      const L = Llo * Math.pow(Lhi / Llo, j / (M - 1));
      const s = evalScore(C, L);
      if (s > bestScore) { bestScore = s; bestC = C; bestL = L; }
    }
  }

  const omega = 2 * Math.PI * freq;
  const Q = omega * bestL / Z0;
  const network: LNetwork = {
    C_shunt: bestC, L_series: bestL, Q,
    designR: Z0 / (Q * Q + 1),
    designX: -1 / (omega * bestC),
  };
  return { network, score: bestScore };
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
