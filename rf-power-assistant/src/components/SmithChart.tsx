import React from 'react';
import type { PlasmaState } from '../types';

interface Props {
  states: PlasmaState[];
  centroidR: number;
  centroidX: number;
  Z0?: number;
  className?: string;
}

function toSmithXY(R: number, X: number, Z0 = 50): [number, number] {
  // Normalise
  const r = R / Z0, x = X / Z0;
  // Reflection coefficient
  const denom = (r + 1) ** 2 + x ** 2;
  const gRe = ((r * r + x * x - 1)) / denom;
  const gIm = (2 * x) / denom;
  return [gRe, gIm];
}

function smithToSVG(gRe: number, gIm: number, cx = 130, cy = 130, r = 120): [number, number] {
  return [cx + gRe * r, cy - gIm * r];
}

const STATE_COLORS = ['#f59e0b', '#34d399', '#f87171', '#a78bfa'];

export function SmithChart({ states, centroidR, centroidX, Z0 = 50, className = '' }: Props) {
  const cx = 130, cy = 130, r = 120;

  // Grid circles for constant-R and constant-X
  const rValues = [0, 0.2, 0.5, 1, 2, 5];
  const xValues = [0.2, 0.5, 1, 2, 5];

  return (
    <svg viewBox="0 0 260 260" className={`rounded-xl bg-slate-950 border border-slate-700 ${className}`}>
      {/* Outer circle */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#334155" strokeWidth="1" />

      {/* Constant-R circles */}
      {rValues.map(rv => {
        const cr = r / (1 + rv);
        const cxr = cx + r - cr;
        return (
          <circle key={rv} cx={cxr} cy={cy} r={cr}
            fill="none" stroke="#1e3a5f" strokeWidth="0.5" strokeDasharray={rv === 1 ? '' : '2,3'} />
        );
      })}

      {/* Constant-X arcs (upper half only, mirrored) */}
      {xValues.flatMap(xv => {
        const arc = (sign: number) => {
          const rad = r / Math.abs(xv);
          const yc  = cy - sign * (r + rad);
          return (
            <circle key={`${xv}_${sign}`} cx={cx + r} cy={yc} r={rad}
              fill="none" stroke="#1e3a5f" strokeWidth="0.5" strokeDasharray="2,3"
              clipPath={`url(#smith-clip)`} />
          );
        };
        return [arc(1), arc(-1)];
      })}

      <defs>
        <clipPath id="smith-clip">
          <circle cx={cx} cy={cy} r={r + 1} />
        </clipPath>
      </defs>

      {/* Axes */}
      <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke="#334155" strokeWidth="0.8" />

      {/* Axis labels */}
      <text x={cx - r - 4} y={cy + 4} fill="#475569" fontSize="8" textAnchor="end">−1</text>
      <text x={cx + r + 4} y={cy + 4} fill="#475569" fontSize="8">+1</text>
      <text x={cx} y={cy - r - 6} fill="#475569" fontSize="8" textAnchor="middle">+j</text>
      <text x={cx} y={cy + r + 12} fill="#475569" fontSize="8" textAnchor="middle">−j</text>
      <text x={cx + 3} y={cy - 3} fill="#475569" fontSize="8">0</text>
      <text x={cx + r - 8} y={cy - 3} fill="#475569" fontSize="8">∞</text>

      {/* Plasma state points */}
      {states.map((s, i) => {
        const [gRe, gIm] = toSmithXY(s.resistance, s.reactance, Z0);
        const [sx, sy] = smithToSVG(gRe, gIm, cx, cy, r);
        const inChart = gRe * gRe + gIm * gIm <= 1.0;
        if (!inChart) return null;
        return (
          <g key={i}>
            <circle cx={sx} cy={sy} r={4 + s.probability * 6}
              fill={STATE_COLORS[i % STATE_COLORS.length]} fillOpacity="0.25"
              stroke={STATE_COLORS[i % STATE_COLORS.length]} strokeWidth="1.5" />
            <text x={sx + 6} y={sy - 4} fill={STATE_COLORS[i % STATE_COLORS.length]} fontSize="7">
              {s.label.split(' ')[0]}
            </text>
          </g>
        );
      })}

      {/* Centroid (AITO™ design point) */}
      {(() => {
        const [gRe, gIm] = toSmithXY(centroidR, centroidX, Z0);
        const [sx, sy] = smithToSVG(gRe, gIm, cx, cy, r);
        const inChart = gRe * gRe + gIm * gIm <= 1.0;
        if (!inChart) return null;
        return (
          <g>
            <circle cx={sx} cy={sy} r="6" fill="#3b82f6" fillOpacity="0.3"
              stroke="#3b82f6" strokeWidth="2" />
            <line x1={sx - 6} y1={sy} x2={sx + 6} y2={sy} stroke="#3b82f6" strokeWidth="1.5" />
            <line x1={sx} y1={sy - 6} x2={sx} y2={sy + 6} stroke="#3b82f6" strokeWidth="1.5" />
            <text x={sx + 8} y={sy + 3} fill="#60a5fa" fontSize="8" fontWeight="bold">AITO™</text>
          </g>
        );
      })()}

      {/* Title */}
      <text x="130" y="14" fill="#64748b" fontSize="9" textAnchor="middle">Smith Chart (Z₀ = {Z0} Ω)</text>
    </svg>
  );
}
