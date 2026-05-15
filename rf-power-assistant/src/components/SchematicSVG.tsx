import React from 'react';
import type { MatchingComponent } from '../types/index';

function Inductor({ x, y, horizontal = true }: { x: number; y: number; horizontal?: boolean }) {
  // 3 arcs
  const arcs = [0, 1, 2].map(i => {
    const cx = horizontal ? x + 8 + i * 16 : x;
    const cy = horizontal ? y : y + 8 + i * 16;
    return horizontal
      ? `M ${cx - 8} ${y} A 8 8 0 0 1 ${cx + 8} ${y}`
      : `M ${x} ${cy - 8} A 8 8 0 0 0 ${x} ${cy + 8}`;
  });
  return <path d={arcs.join(' ')} fill="none" stroke="#10b981" strokeWidth="1.5" />;
}

function Capacitor({ x, y, horizontal = true }: { x: number; y: number; horizontal?: boolean }) {
  if (horizontal) {
    return (
      <>
        <line x1={x - 2} y1={y - 12} x2={x - 2} y2={y + 12} stroke="#60a5fa" strokeWidth="2" />
        <line x1={x + 2} y1={y - 12} x2={x + 2} y2={y + 12} stroke="#60a5fa" strokeWidth="2" />
      </>
    );
  }
  return (
    <>
      <line x1={x - 12} y1={y - 2} x2={x + 12} y2={y - 2} stroke="#60a5fa" strokeWidth="2" />
      <line x1={x - 12} y1={y + 2} x2={x + 12} y2={y + 2} stroke="#60a5fa" strokeWidth="2" />
    </>
  );
}

interface Props { components: MatchingComponent[]; }

export default function SchematicSVG({ components }: Props) {
  const series = components.filter(c => c.placement === 'series');
  const shunt  = components.filter(c => c.placement === 'shunt');

  return (
    <svg viewBox="0 0 420 140" className="w-full" style={{ maxHeight: 140 }}>
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#475569" />
        </marker>
      </defs>
      {/* Source */}
      <circle cx="30" cy="70" r="20" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
      <text x="30" y="70" textAnchor="middle" dominantBaseline="middle" fill="#94a3b8" fontSize="9">RF SRC</text>
      <text x="30" y="99" textAnchor="middle" fill="#64748b" fontSize="7">50Ω</text>
      <line x1="50" y1="70" x2="70" y2="70" stroke="#475569" strokeWidth="1.5" />

      {/* Series components */}
      {series.map((c, i) => {
        const x = 70 + i * 80;
        return (
          <g key={c.label}>
            <line x1={x} y1="70" x2={x + 20} y2="70" stroke="#334155" strokeWidth="1.5" />
            {c.type === 'L'
              ? <Inductor x={x + 28} y={70} />
              : <Capacitor x={x + 32} y={70} />}
            <line x1={x + 56} y1="70" x2={x + 80} y2="70" stroke="#334155" strokeWidth="1.5" />
            <text x={x + 40} y={58} textAnchor="middle" fill="#94a3b8" fontSize="8">{c.label}</text>
            <text x={x + 40} y={104} textAnchor="middle" fill="#64748b" fontSize="7">{c.value.toFixed(1)}{c.unit}</text>
          </g>
        );
      })}

      {/* Shunt components */}
      {shunt.map((c, i) => {
        const x = 130 + i * 80;
        return (
          <g key={c.label}>
            <line x1={x} y1="70" x2={x} y2="95" stroke="#334155" strokeWidth="1.5" />
            {c.type === 'L'
              ? <Inductor x={x} y={103} horizontal={false} />
              : <Capacitor x={x} y={107} horizontal={false} />}
            <line x1={x} y1="120" x2={x} y2="130" stroke="#334155" strokeWidth="1.5" />
            <line x1={x - 15} y1="130" x2={x + 15} y2="130" stroke="#475569" strokeWidth="1.5" />
            <text x={x + 10} y={88} fill="#94a3b8" fontSize="8">{c.label}</text>
            <text x={x + 10} y={98} fill="#64748b" fontSize="7">{c.value.toFixed(1)}{c.unit}</text>
          </g>
        );
      })}

      {/* Load */}
      <line x1="330" y1="70" x2="370" y2="70" stroke="#475569" strokeWidth="1.5" />
      <rect x="370" y="55" width="40" height="30" rx="5" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
      <text x="390" y="72" textAnchor="middle" dominantBaseline="middle" fill="#94a3b8" fontSize="8">PLASMA</text>
      <text x="390" y="100" textAnchor="middle" fill="#64748b" fontSize="7">ZL</text>
    </svg>
  );
}
