import type { ImpedanceState } from '../types';
import { STATE_COLORS } from './aito';

// ─── Standard plasma matchbox topology ───────────────────────────────────────
//
//  Generator (50Ω) ── [node A] ── L_fixed (series) ── C2 (series) ── Plasma
//                         │
//                        C1 (shunt to GND)
//
// C1: variable shunt at generator side
// L:  fixed series inductor (essential for resonating capacitive plasma)
// C2: variable series toward plasma
//
// Without L, a two-capacitor network cannot resonate out a capacitive plasma
// load (X < 0). L provides the inductive reactance that cancels plasma X.

export function c1c2Gamma(
  state: ImpedanceState,
  C1_pF: number, C2_pF: number,
  L_uH: number,
  Z0: number, freq: number,
): number {
  const omega = 2 * Math.PI * freq;
  const C1 = C1_pF * 1e-12;
  const C2 = C2_pF * 1e-12;
  const L  = L_uH * 1e-6;
  const { resistance: R, reactance: X } = state;

  // Step 1 — series C2 (between plasma and L junction)
  const XC2 = C2 > 1e-15 ? -1 / (omega * C2) : -1e9;
  const R1 = R, X1 = X + XC2;

  // Step 2 — series L (between C2 and shunt node)
  const R2 = R1, X2 = X1 + omega * L;

  // Step 3 — shunt C1 at node A
  const d2  = R2 * R2 + X2 * X2;
  const G2  = R2 / d2;
  const B2  = -X2 / d2;
  const Gin = G2;
  const Bin = B2 + omega * C1;

  // Step 4 — input impedance
  const din  = Gin * Gin + Bin * Bin;
  const Rin  = Gin / din;
  const Xin  = -Bin / din;

  // |Γ|
  const nR = Rin - Z0, nI = Xin;
  const dR = Rin + Z0, dI = Xin;
  return Math.sqrt((nR * nR + nI * nI) / (dR * dR + dI * dI));
}

// ─── Map computation ──────────────────────────────────────────────────────────
// Metric: probability-weighted mean reflected POWER = Σ pᵢ|Γᵢ|²
// (not |Γ|, because reflected power is what causes arc trips and heating)
// Score = 1 − weighted_mean_|Γ|²  (higher = better)

export interface MapResult {
  N: number;
  c1Values: number[];
  c2Values: number[];
  scoreGrid: Float32Array;   // [i*N+j] = score at c1[i], c2[j]
  worstGrid: Float32Array;   // worst-case |Γ| (for arc-trip threshold)
  optC1: number; optC2: number; optScore: number;
  perStateOptima: Array<{
    label: string; color: string;
    C1: number; C2: number; gamma: number;
  }>;
  spreadC1: number;
  spreadC2: number;
  L_uH: number;
}

export function computeTuningMap(
  states: ImpedanceState[], Z0: number, freq: number,
  C1max: number, C2max: number, L_uH: number, N = 70,
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
        const g  = c1c2Gamma(st, C1, C2, L_uH, Z0, freq);
        wPow    += st.probability * g * g;          // reflected power
        if (g > worstG) worstG = g;
      }
      wPow /= totalP;
      const score = 1 - wPow;
      scoreGrid[i * N + j] = score;
      worstGrid[i * N + j] = worstG;
      if (score > optScore) { optScore = score; optC1 = C1; optC2 = C2; }
    }
  }

  // Per-state best positions (individual perfect-match points)
  const perStateOptima = states.map((st, idx) => {
    let best = 1, bestC1 = optC1, bestC2 = optC2;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const g = c1c2Gamma(st, c1Values[i], c2Values[j], L_uH, Z0, freq);
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
    L_uH,
  };
}

// ─── Motor position ───────────────────────────────────────────────────────────
// Split-stator variable capacitor law: C(θ) = C_max · sin²(θ),  θ ∈ [0°, 90°]

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
