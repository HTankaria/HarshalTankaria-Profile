import type { ImpedanceState } from '../types';
import { STATE_COLORS } from './aito';

// ─── C1/C2 matchbox topology ──────────────────────────────────────────────────
// Generator (50Ω) ─── [node A] ─── C2 (series) ─── Plasma (ZL)
//                         │
//                        C1 (shunt to GND)

export function c1c2Gamma(
  state: ImpedanceState,
  C1_pF: number, C2_pF: number,
  Z0: number, freq: number,
): number {
  const omega = 2 * Math.PI * freq;
  const C1 = C1_pF * 1e-12;
  const C2 = C2_pF * 1e-12;
  const { resistance: R, reactance: X } = state;

  // Series C2 toward plasma: subtracts from load reactance
  const XC2 = C2 > 1e-15 ? -1 / (omega * C2) : -1e9;
  const RA = R, XA = X + XC2;

  // Admittance at node A
  const dA = RA * RA + XA * XA;
  const GA = RA / dA;
  const BA = -XA / dA;

  // Add shunt C1
  const G_in = GA;
  const B_in = BA + omega * C1;

  // Input impedance
  const d_in = G_in * G_in + B_in * B_in;
  const R_in = G_in / d_in;
  const X_in = -B_in / d_in;

  // |Γ|
  const numR = R_in - Z0, numI = X_in;
  const denR = R_in + Z0, denI = X_in;
  return Math.sqrt((numR * numR + numI * numI) / (denR * denR + denI * denI));
}

// ─── Full map computation ─────────────────────────────────────────────────────

export interface MapResult {
  N: number;
  c1Values: number[];   // pF (Y axis — shunt at generator)
  c2Values: number[];   // pF (X axis — series toward plasma)
  scoreGrid: Float32Array;    // [i*N + j] = AITO score at c1[i], c2[j]
  worstGrid: Float32Array;    // worst-case |Γ| across states
  optC1: number; optC2: number; optScore: number;
  perStateOptima: Array<{
    label: string; color: string;
    C1: number; C2: number; gamma: number;
  }>;
  spreadC1: number;  // pF — range of per-state C1 optima
  spreadC2: number;  // pF — range of per-state C2 optima
}

export function computeTuningMap(
  states: ImpedanceState[], Z0: number, freq: number,
  C1max: number, C2max: number, N = 60,
): MapResult {
  const c1Values = Array.from({ length: N }, (_, i) => (i / (N - 1)) * C1max);
  const c2Values = Array.from({ length: N }, (_, j) => (j / (N - 1)) * C2max);
  const totalP = states.reduce((s, st) => s + st.probability, 0) || 1;

  const scoreGrid = new Float32Array(N * N);
  const worstGrid = new Float32Array(N * N);
  let optScore = -1, optC1 = C1max / 2, optC2 = C2max / 2;

  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const C1 = c1Values[i], C2 = c2Values[j];
      let weightedG = 0, worstG = 0;
      for (const st of states) {
        const g = c1c2Gamma(st, C1, C2, Z0, freq);
        weightedG += st.probability * g;
        if (g > worstG) worstG = g;
      }
      weightedG /= totalP;
      const score = 1 - weightedG;
      scoreGrid[i * N + j] = score;
      worstGrid[i * N + j] = worstG;
      if (score > optScore) { optScore = score; optC1 = C1; optC2 = C2; }
    }
  }

  // Per-state optima
  const perStateOptima = states.map((st, idx) => {
    let best = 1, bestC1 = optC1, bestC2 = optC2;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const g = c1c2Gamma(st, c1Values[i], c2Values[j], Z0, freq);
        if (g < best) { best = g; bestC1 = c1Values[i]; bestC2 = c2Values[j]; }
      }
    }
    return { label: st.label, color: STATE_COLORS[idx % STATE_COLORS.length], C1: bestC1, C2: bestC2, gamma: best };
  });

  const c1s = perStateOptima.map(p => p.C1);
  const c2s = perStateOptima.map(p => p.C2);
  const spreadC1 = Math.max(...c1s) - Math.min(...c1s);
  const spreadC2 = Math.max(...c2s) - Math.min(...c2s);

  return { N, c1Values, c2Values, scoreGrid, worstGrid, optC1, optC2, optScore, perStateOptima, spreadC1, spreadC2 };
}

// ─── Motor position helper ────────────────────────────────────────────────────
// Typical split-stator variable capacitor: C(θ) ≈ C_min + (C_max−C_min)·sin²(θ)
// θ in degrees [0, 180]

export function pFtoAngle(C_pF: number, C_max_pF: number): number {
  const ratio = Math.max(0, Math.min(1, C_pF / C_max_pF));
  return Math.round(Math.asin(Math.sqrt(ratio)) * (180 / Math.PI));
}

// ─── Score → RGB ──────────────────────────────────────────────────────────────

export function scoreToRgb(score: number): [number, number, number] {
  // red (0) → amber (0.4) → green (1.0)
  const s = Math.max(0, Math.min(1, score));
  if (s < 0.4) {
    const t = s / 0.4;
    return [180 + Math.round(20 * t), Math.round(60 * t), 20];
  }
  const t = (s - 0.4) / 0.6;
  return [Math.round(200 * (1 - t)), Math.round(60 + 140 * t), 20 + Math.round(80 * t)];
}
