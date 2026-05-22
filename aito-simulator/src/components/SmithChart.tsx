import React from 'react';
import { zToGamma, trajectoryPoints } from '../calculations/aito';
import type { ImpedanceState, LNetwork } from '../types';
import { STATE_COLORS } from '../calculations/aito';

interface Props {
  states: ImpedanceState[];
  centroidR?: number;
  centroidX?: number;
  Z0?: number;
  network?: LNetwork | null;
  ssNetwork?: LNetwork | null;
  freq?: number;
  showTrajectory?: boolean;
  showSS?: boolean;
  className?: string;
}

const CX = 160, CY = 160, R = 140;

function toSVG(re: number, im: number) {
  return { x: CX + re * R, y: CY - im * R };
}

function stateToSVG(resistance: number, reactance: number, Z0: number) {
  const g = zToGamma(resistance, reactance, Z0);
  return toSVG(g.r, g.i);
}

// Draw a constant-R circle in Γ-space
// Center: (r/(r+1), 0),  radius: 1/(r+1),  normalized r = R/Z0
function RCircle({ rNorm, ...props }: { rNorm: number } & React.SVGProps<SVGCircleElement>) {
  const cx = CX + (rNorm / (rNorm + 1)) * R;
  const cr = R / (rNorm + 1);
  return <circle cx={cx} cy={CY} r={cr} fill="none" {...props} />;
}

// Constant-X arc clipped to unit circle
// Center in Γ-space: (1, 1/x),  radius: 1/|x|
function XArc({ xNorm, clipId, ...props }: { xNorm: number; clipId: string } & React.SVGProps<SVGCircleElement>) {
  if (Math.abs(xNorm) < 0.01) return null;
  const cy = CY - (1 / xNorm) * R;
  const cr = Math.abs(1 / xNorm) * R;
  const cx2 = CX + 1 * R;
  return (
    <circle cx={cx2} cy={cy} r={cr} fill="none" clipPath={`url(#${clipId})`} {...props} />
  );
}

export function SmithChart({
  states, centroidR, centroidX, Z0 = 50,
  network = null, ssNetwork = null,
  freq = 13.56e6, showTrajectory = false, showSS = false,
  className = '',
}: Props) {
  const clipId = React.useId().replace(/:/g, '');
  const gridStroke = '#334155';
  const gridStrokeLight = '#1e293b';

  return (
    <div className={`rounded-xl border border-slate-700 bg-slate-900 ${className}`}>
      <svg viewBox="0 0 320 320" className="w-full h-full">
        <defs>
          <clipPath id={clipId}>
            <circle cx={CX} cy={CY} r={R} />
          </clipPath>
        </defs>

        {/* Background */}
        <circle cx={CX} cy={CY} r={R} fill="#0f172a" stroke="#475569" strokeWidth="1.5" />

        {/* Constant-R grid */}
        {[0.2, 0.5, 1, 2, 5].map(r => (
          <RCircle key={r} rNorm={r} stroke={r === 1 ? '#475569' : gridStroke} strokeWidth={r === 1 ? 0.8 : 0.5} clipPath={`url(#${clipId})`} />
        ))}
        <RCircle rNorm={0} stroke={gridStroke} strokeWidth={0.5} clipPath={`url(#${clipId})`} />

        {/* Constant-X arcs */}
        {[0.2, 0.5, 1, 2, 5, -0.2, -0.5, -1, -2, -5].map(x => (
          <XArc key={x} xNorm={x} clipId={clipId} stroke={Math.abs(x) === 1 ? '#475569' : gridStrokeLight} strokeWidth={Math.abs(x) === 1 ? 0.8 : 0.5} />
        ))}

        {/* Real axis */}
        <line x1={CX - R} y1={CY} x2={CX + R} y2={CY} stroke={gridStroke} strokeWidth="0.8" />

        {/* R labels */}
        {[0, 0.5, 1, 2].map(r => {
          const lx = CX + (2 * r / (r + 1) - 1) * R;
          return <text key={r} x={lx} y={CY + 10} fontSize="7" fill="#64748b" textAnchor="middle">{r * Z0}Ω</text>;
        })}

        {/* Trajectories */}
        {showTrajectory && network && states.map((st, i) => {
          const pts = trajectoryPoints(st, network, Z0, freq, 50);
          const d = pts.map((p, k) => {
            const s = toSVG(p.re, p.im);
            return `${k === 0 ? 'M' : 'L'}${s.x.toFixed(1)},${s.y.toFixed(1)}`;
          }).join(' ');
          return <path key={st.id} d={d} fill="none" stroke={STATE_COLORS[i % STATE_COLORS.length]} strokeWidth="1.5" strokeOpacity="0.7" clipPath={`url(#${clipId})`} />;
        })}

        {/* SS design trajectories (faded) */}
        {showSS && showTrajectory && ssNetwork && states.map((st, i) => {
          const pts = trajectoryPoints(st, ssNetwork, Z0, freq, 50);
          const d = pts.map((p, k) => {
            const s = toSVG(p.re, p.im);
            return `${k === 0 ? 'M' : 'L'}${s.x.toFixed(1)},${s.y.toFixed(1)}`;
          }).join(' ');
          return <path key={`ss-${st.id}`} d={d} fill="none" stroke={STATE_COLORS[i % STATE_COLORS.length]} strokeWidth="1" strokeOpacity="0.25" strokeDasharray="3 3" clipPath={`url(#${clipId})`} />;
        })}

        {/* State points */}
        {states.map((st, i) => {
          const { x, y } = stateToSVG(st.resistance, st.reactance, Z0);
          const color = STATE_COLORS[i % STATE_COLORS.length];
          return (
            <g key={st.id}>
              <circle cx={x} cy={y} r={6} fill={color} fillOpacity={0.25} stroke={color} strokeWidth="1.5" />
              <circle cx={x} cy={y} r={2.5} fill={color} />
              <text x={x + 8} y={y - 4} fontSize="7.5" fill={color} fontWeight="600">{st.label.split(' ')[0]}</text>
            </g>
          );
        })}

        {/* Centroid */}
        {centroidR !== undefined && centroidX !== undefined && (() => {
          const { x, y } = stateToSVG(centroidR, centroidX, Z0);
          return (
            <g>
              {/* Diamond shape */}
              <polygon
                points={`${x},${y - 9} ${x + 7},${y} ${x},${y + 9} ${x - 7},${y}`}
                fill="#818cf8" fillOpacity={0.3} stroke="#818cf8" strokeWidth="2"
              />
              <circle cx={x} cy={y} r={2.5} fill="#818cf8" />
              <text x={x + 10} y={y + 3} fontSize="8" fill="#818cf8" fontWeight="700">Z̄</text>
            </g>
          );
        })()}

        {/* 50Ω centre marker */}
        <circle cx={CX} cy={CY} r={4} fill="none" stroke="#64748b" strokeWidth="1" />
        <circle cx={CX} cy={CY} r={1.5} fill="#94a3b8" />
        <text x={CX + 6} y={CY - 5} fontSize="7" fill="#64748b">50Ω</text>
      </svg>
    </div>
  );
}
