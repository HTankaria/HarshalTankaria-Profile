import type { ImpedanceState } from '../types';
import { STATE_COLORS } from './aito';

// ─── Correct 4-element plasma matchbox topology ───────────────────────────────
//
//  Generator (Z0) ─── L2 (fixed, gen-side) ─── C2 (variable, series) ─── [node A] ─── L1 (fixed, load-side) ─── Plasma
//                                                                               │
//                                                                              C1 (variable, shunt to GND)
//
// Impedance seen from generator, computed from plasma outward:
//   Step 1: Series L1 (load-side fixed)   → Z1 = R + j(X + ωL1)
//   Step 2: Shunt C1 at node A            → Y2 = 1/Z1 + jωC1  →  Z2 = 1/Y2
//   Step 3: Series C2 (variable)          → Z3 = Z2 + j(-1/ωC2)
//   Step 4: Series L2 (gen-side fixed)    → Z4 = Z3 + jωL2
//   Γ = (Z4 − Z0) / (Z4 + Z0)

export function c1c2Gamma(
  state: ImpedanceState,
  C1_pF: number, C2_pF: number,
  L1_uH: number, L2_uH: number,
  Z0: number, freq: number,
): number {
  const omega = 2 * Math.PI * freq;
  const C1 = C1_pF * 1e-12;
  const C2 = C2_pF * 1e-12;
  const L1 = L1_uH * 1e-6;
  const L2 = L2_uH * 1e-6;
  const { resistance: R, reactance: X } = state;

  // Step 1: Series L1 (load side)
  const R1 = R, X1 = X + omega * L1;

  // Step 2: Shunt C1 at node A
  const d1 = R1 * R1 + X1 * X1;
  const G1 = R1 / d1, B1 = -X1 / d1;
  const B2 = B1 + omega * C1;
  const d2 = G1 * G1 + B2 * B2;
  const R2 = G1 / d2, X2 = -B2 / d2;

  // Step 3: Series C2 (variable)
  const XC2 = C2 > 1e-15 ? -1 / (omega * C2) : -1e9;
  const R3 = R2, X3 = X2 + XC2;

  // Step 4: Series L2 (generator side)
  const R4 = R3, X4 = X3 + omega * L2;

  const nR = R4 - Z0, nI = X4;
  const dR = R4 + Z0, dI = X4;
  return Math.sqrt((nR * nR + nI * nI) / (dR * dR + dI * dI));
}

// ─── Map computation ──────────────────────────────────────────────────────────
// Metric: probability-weighted mean reflected POWER = Σ pᵢ|Γᵢ|²
// Score = 1 − weighted_mean_|Γ|²  (higher = better)

export interface MapResult {
  N: number;
  c1Values: number[];
  c2Values: number[];
  scoreGrid: Float32Array;
  worstGrid: Float32Array;
  optC1: number; optC2: number; optScore: number;
  perStateOptima: Array<{
    label: string; color: string;
    C1: number; C2: number; gamma: number;
  }>;
  spreadC1: number;
  spreadC2: number;
  L1_uH: number;
  L2_uH: number;
}

export function computeTuningMap(
  states: ImpedanceState[], Z0: number, freq: number,
  C1max: number, C2max: number, L1_uH: number, L2_uH: number, N = 70,
): MapResult {
  const c1Values = Array.from({ length: N }, (_, i) => (i / (N - 1)) * C1max);
  const c2Values = Array.from({ length: N }, (_, j) => (j / (N - 1)) * C2max);
  const totalP   = states.reduce((s, st) => s + st.probability, 0) || 1;

  const scoreGrid = new Float32Array(N * N);
  const worstGrid = new Float32Array(N * N);
  let optScore = -1, optC1 = C1max / 2, optC2 = C2max / 2;

  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const C1 = c1Values[i], C2 = c2Values[j];
      let wPow = 0, worstG = 0;
      for (const st of states) {
        const g = c1c2Gamma(st, C1, C2, L1_uH, L2_uH, Z0, freq);
        wPow += st.probability * g * g;
        if (g > worstG) worstG = g;
      }
      wPow /= totalP;
      const score = 1 - wPow;
      scoreGrid[i * N + j] = score;
      worstGrid[i * N + j] = worstG;
      if (score > optScore) { optScore = score; optC1 = C1; optC2 = C2; }
    }
  }

  const perStateOptima = states.map((st, idx) => {
    let best = 1, bestC1 = optC1, bestC2 = optC2;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const g = c1c2Gamma(st, c1Values[i], c2Values[j], L1_uH, L2_uH, Z0, freq);
        if (g < best) { best = g; bestC1 = c1Values[i]; bestC2 = c2Values[j]; }
      }
    }
    return { label: st.label, color: STATE_COLORS[idx % STATE_COLORS.length], C1: bestC1, C2: bestC2, gamma: best };
  });

  const c1s = perStateOptima.map(p => p.C1);
  const c2s = perStateOptima.map(p => p.C2);

  return {
    N, c1Values, c2Values, scoreGrid, worstGrid,
    optC1, optC2, optScore,
    perStateOptima,
    spreadC1: Math.max(...c1s) - Math.min(...c1s),
    spreadC2: Math.max(...c2s) - Math.min(...c2s),
    L1_uH, L2_uH,
  };
}

// ─── Motor position ───────────────────────────────────────────────────────────
// Split-stator variable capacitor: C(θ) = C_max · sin²(θ),  θ ∈ [0°, 90°]

export function pFtoAngle(C_pF: number, C_max_pF: number): number {
  const ratio = Math.max(0, Math.min(1, C_pF / C_max_pF));
  return Math.round(Math.asin(Math.sqrt(ratio)) * (180 / Math.PI));
}

// ─── Score → RGB ──────────────────────────────────────────────────────────────

export function scoreToRgb(score: number): [number, number, number] {
  const s = Math.max(0, Math.min(1, score));
  if (s < 0.4) {
    const t = s / 0.4;
    return [180 + Math.round(20 * t), Math.round(60 * t), 20];
  }
  const t = (s - 0.4) / 0.6;
  return [Math.round(200 * (1 - t)), Math.round(60 + 140 * t), 20 + Math.round(80 * t)];
}
