import React from 'react';
import type { MatchingNetworkResult } from '../types';

interface Props { result: MatchingNetworkResult; className?: string }

export function SchematicSVG({ result, className = '' }: Props) {
  const comps = result.components;
  const w = 520, h = 130;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={`w-full rounded-lg bg-slate-950 border border-slate-700 ${className}`}
      style={{ fontFamily: 'JetBrains Mono, monospace' }}
    >
      {/* Input port */}
      <text x="10" y="65" fill="#94a3b8" fontSize="10" dominantBaseline="middle">Gen</text>
      <line x1="35" y1="64" x2="70" y2="64" stroke="#60a5fa" strokeWidth="1.5" />
      <text x="12" y="75" fill="#60a5fa" fontSize="8">50 Ω</text>

      {/* Render components */}
      {comps.map((comp, idx) => {
        const x = 70 + idx * 115;
        const next = 70 + (idx + 1) * 115;
        const midX = x + 57;

        if (comp.placement === 'series') {
          return (
            <g key={comp.id}>
              <line x1={x} y1="64" x2={x + 15} y2="64" stroke="#60a5fa" strokeWidth="1.5" />
              {comp.type === 'L' ? (
                // Inductor (coil)
                <>
                  {[0,1,2,3].map(n => (
                    <path key={n}
                      d={`M ${x+15+n*12} 64 a 6 6 0 0 1 12 0`}
                      fill="none" stroke="#a78bfa" strokeWidth="1.5" />
                  ))}
                  <text x={x+33} y="80" fill="#a78bfa" fontSize="9" textAnchor="middle">
                    {comp.id}
                  </text>
                </>
              ) : (
                // Capacitor (plates)
                <>
                  <line x1={x+15} y1="64" x2={x+33} y2="64" stroke="#60a5fa" strokeWidth="1.5" />
                  <line x1={x+33} y1="52" x2={x+33} y2="76" stroke="#f59e0b" strokeWidth="2" />
                  <line x1={x+38} y1="52" x2={x+38} y2="76" stroke="#f59e0b" strokeWidth="2" />
                  <line x1={x+38} y1="64" x2={x+55} y2="64" stroke="#60a5fa" strokeWidth="1.5" />
                  <text x={x+36} y="82" fill="#f59e0b" fontSize="9" textAnchor="middle">
                    {comp.id}
                  </text>
                </>
              )}
              <line x1={x+55} y1="64" x2={next} y2="64" stroke="#60a5fa" strokeWidth="1.5" />
            </g>
          );
        } else {
          // Shunt element
          return (
            <g key={comp.id}>
              <line x1={x} y1="64" x2={next} y2="64" stroke="#60a5fa" strokeWidth="1.5" />
              <line x1={midX} y1="64" x2={midX} y2="80" stroke="#60a5fa" strokeWidth="1.5" />
              {comp.type === 'C' ? (
                <>
                  <line x1={midX - 12} y1="82" x2={midX + 12} y2="82" stroke="#f59e0b" strokeWidth="2" />
                  <line x1={midX - 12} y1="87" x2={midX + 12} y2="87" stroke="#f59e0b" strokeWidth="2" />
                  <line x1={midX} y1="87" x2={midX} y2="100" stroke="#60a5fa" strokeWidth="1.5" />
                  <text x={midX} y="110" fill="#f59e0b" fontSize="9" textAnchor="middle">{comp.id}</text>
                </>
              ) : (
                <>
                  {[0,1].map(n => (
                    <path key={n}
                      d={`M ${midX} ${80+n*10} a 5 5 0 0 0 0 10`}
                      fill="none" stroke="#a78bfa" strokeWidth="1.5" />
                  ))}
                  <line x1={midX} y1="100" x2={midX} y2="108" stroke="#60a5fa" strokeWidth="1.5" />
                  <text x={midX} y="115" fill="#a78bfa" fontSize="9" textAnchor="middle">{comp.id}</text>
                </>
              )}
              <line x1={midX} y1="108" x2={midX} y2="118" stroke="#475569" strokeWidth="1.5" />
              <line x1={midX - 8} y1="118" x2={midX + 8} y2="118" stroke="#475569" strokeWidth="1.5" />
              <line x1={midX - 5} y1="121" x2={midX + 5} y2="121" stroke="#475569" strokeWidth="1" />
              <line x1={midX - 2} y1="124" x2={midX + 2} y2="124" stroke="#475569" strokeWidth="0.5" />
            </g>
          );
        }
      })}

      {/* Output port */}
      <line x1={70 + comps.length * 115} y1="64" x2={70 + comps.length * 115 + 35} y2="64" stroke="#60a5fa" strokeWidth="1.5" />
      <text x={70 + comps.length * 115 + 40} y="65" fill="#94a3b8" fontSize="10" dominantBaseline="middle">Load</text>
      <text x={70 + comps.length * 115 + 38} y="75" fill="#60a5fa" fontSize="8">Plasma</text>

      {/* Legend */}
      <rect x="10" y="8" width="8" height="6" fill="none" stroke="#a78bfa" strokeWidth="1.5" />
      <text x="22" y="14" fill="#a78bfa" fontSize="8">Inductor</text>
      <rect x="70" y="8" width="8" height="6" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
      <text x="82" y="14" fill="#f59e0b" fontSize="8">Capacitor</text>
    </svg>
  );
}
