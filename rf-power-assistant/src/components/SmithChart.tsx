import React from 'react';
import type { PlasmaState, Complex } from '../types/index';
import { reflectionCoeff } from '../calculations/rfCalc';

function toSmithXY(Z: Complex, Z0 = 50): { x: number; y: number } {
  const r = Z.re / Z0;
  const x = Z.im / Z0;
  const denom = (1 + r) * (1 + r) + x * x;
  const gRe = ((r * r + x * x) - 1) / denom;
  const gIm = (2 * x) / denom;
  // SVG: centre (200,200), radius 180
  return { x: 200 + gRe * 180, y: 200 - gIm * 180 };
}

function circleR(r: number): string {
  // constant-R circle: centre ((r/(r+1)), 0), radius 1/(r+1)
  const cx = 200 + (r / (r + 1)) * 180;
  const rad = (1 / (r + 1)) * 180;
  return `M ${cx + rad} 200 A ${rad} ${rad} 0 1 0 ${cx - rad} 200 A ${rad} ${rad} 0 1 0 ${cx + rad} 200`;
}

interface Props {
  states: PlasmaState[];
  centroid?: Complex;
  Z0?: number;
}

export default function SmithChart({ states, centroid, Z0 = 50 }: Props) {
  const rValues = [0.2, 0.5, 1, 2, 5];
  return (
    <svg viewBox="0 0 400 400" className="w-full max-w-sm mx-auto">
      <defs>
        <clipPath id="smith-clip">
          <circle cx="200" cy="200" r="180" />
        </clipPath>
      </defs>
      {/* Background */}
      <circle cx="200" cy="200" r="180" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
      <g clipPath="url(#smith-clip)">
        {/* Constant-R circles */}
        {rValues.map(r => (
          <path key={r} d={circleR(r)} fill="none" stroke="#1e3a5f" strokeWidth="0.8" />
        ))}
        {/* Axes */}
        <line x1="20" y1="200" x2="380" y2="200" stroke="#334155" strokeWidth="1" />
        <line x1="380" y1="200" x2="380" y2="200" stroke="#334155" strokeWidth="1" />
        {/* R labels */}
        {rValues.map(r => {
          const cx = 200 + (r / (r + 1)) * 180 * 2 - 180;
          return <text key={r} x={cx} y="208" textAnchor="middle" fill="#475569" fontSize="8">{r}</text>;
        })}
        {/* Plasma state dots */}
        {states.map(s => {
          const ZL: Complex = { re: s.R_plasma, im: -1 / (2 * Math.PI * 13.56e6 * s.C_plasma) };
          const pt = toSmithXY(ZL, Z0);
          const radius = 4 + s.probability * 14;
          const opacity = 0.4 + s.probability * 0.6;
          return (
            <g key={s.id}>
              <circle cx={pt.x} cy={pt.y} r={radius} fill="#10b981" opacity={opacity * 0.3} />
              <circle cx={pt.x} cy={pt.y} r={4} fill="#10b981" opacity={opacity} />
              <text x={pt.x + 6} y={pt.y - 5} fill="#6ee7b7" fontSize="7">{s.label}</text>
            </g>
          );
        })}
        {/* AITO™ centroid crosshair */}
        {centroid && (() => {
          const pt = toSmithXY(centroid, Z0);
          return (
            <g>
              <line x1={pt.x - 10} y1={pt.y} x2={pt.x + 10} y2={pt.y} stroke="#f59e0b" strokeWidth="1.5" />
              <line x1={pt.x} y1={pt.y - 10} x2={pt.x} y2={pt.y + 10} stroke="#f59e0b" strokeWidth="1.5" />
              <circle cx={pt.x} cy={pt.y} r="3" fill="#f59e0b" />
              <text x={pt.x + 5} y={pt.y - 7} fill="#fbbf24" fontSize="7">AITO™</text>
            </g>
          );
        })()}
      </g>
      {/* Outer ring label */}
      <text x="200" y="16" textAnchor="middle" fill="#475569" fontSize="9">Smith Chart — Plasma Impedance States</text>
    </svg>
  );
}
