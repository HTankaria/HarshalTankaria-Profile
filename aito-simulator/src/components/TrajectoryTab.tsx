import React from 'react';
import { TrendingUp, Target, AlertTriangle, CheckCircle } from 'lucide-react';
import { SmithChart } from './SmithChart';
import { computeAITO, STATE_COLORS, fmtC, fmtL } from '../calculations/aito';
import type { ImpedanceState } from '../types';

interface Props {
  states: ImpedanceState[];
  freq: number;
  Z0: number;
}

export function TrajectoryTab({ states, freq, Z0 }: Props) {
  const result = computeAITO(states, Z0, freq);

  if (states.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-500">
        <Target size={32} className="text-slate-700" />
        <p className="text-sm">Add at least 2 impedance states in the States tab to see tuning trajectories.</p>
      </div>
    );
  }

  const ssState = states.reduce((a, b) => b.probability > a.probability ? b : a);

  return (
    <div className="flex flex-col gap-6">
      {/* Header explanation */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-4 text-xs text-slate-400 leading-relaxed">
        <span className="text-indigo-300 font-semibold">Tuning trajectory</span> shows the path each plasma state takes through the L-network as matching components transform impedance toward 50Ω.
        Solid arcs = AITO™ centroid network. Dashed arcs = steady-state-only network.
        The key insight: AITO™ reduces worst-case VSWR across <em>all</em> states, not just steady-state.
      </div>

      {/* Two Smith charts side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
            <CheckCircle size={13} /> AITO™ Centroid Network
          </h4>
          <p className="text-xs text-slate-500">
            Design target: Z̄ = {result.centroidR.toFixed(2)}+j{result.centroidX.toFixed(1)} Ω
          </p>
          <SmithChart
            states={states} Z0={Z0} freq={freq}
            centroidR={result.centroidR} centroidX={result.centroidX}
            network={result.network}
            showTrajectory
            className="aspect-square"
          />
        </div>

        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
            <AlertTriangle size={13} /> Steady-State-Only Network
          </h4>
          <p className="text-xs text-slate-500">
            Design target: {ssState.label} = {ssState.resistance.toFixed(2)}+j{ssState.reactance.toFixed(1)} Ω
          </p>
          <SmithChart
            states={states} Z0={Z0} freq={freq}
            centroidR={ssState.resistance} centroidX={ssState.reactance}
            network={result.ssNetwork}
            showTrajectory
            className="aspect-square"
          />
        </div>
      </div>

      {/* Component comparison */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/30 overflow-hidden">
        <div className="px-4 py-2 border-b border-slate-700 text-xs font-medium text-slate-400">
          Network Component Comparison
        </div>
        <div className="grid grid-cols-3 gap-0 text-xs">
          <div className="px-3 py-2 text-slate-500 border-b border-slate-700">Parameter</div>
          <div className="px-3 py-2 text-indigo-300 border-b border-l border-slate-700">AITO™</div>
          <div className="px-3 py-2 text-amber-300 border-b border-l border-slate-700">SS-only</div>

          {[
            { label: 'Design R', aito: `${result.network.designR.toFixed(2)} Ω`, ss: `${result.ssNetwork.designR.toFixed(2)} Ω` },
            { label: 'Design X', aito: `${result.network.designX.toFixed(1)} Ω`, ss: `${result.ssNetwork.designX.toFixed(1)} Ω` },
            { label: 'C_shunt', aito: fmtC(result.network.C_shunt), ss: fmtC(result.ssNetwork.C_shunt) },
            { label: 'L_series', aito: fmtL(result.network.L_series), ss: fmtL(result.ssNetwork.L_series) },
            { label: 'Network Q', aito: result.network.Q.toFixed(2), ss: result.ssNetwork.Q.toFixed(2) },
          ].map(row => (
            <React.Fragment key={row.label}>
              <div className="px-3 py-2 text-slate-500 border-b border-slate-700/50">{row.label}</div>
              <div className="px-3 py-2 font-mono text-slate-200 border-b border-l border-slate-700/50">{row.aito}</div>
              <div className="px-3 py-2 font-mono text-slate-200 border-b border-l border-slate-700/50">{row.ss}</div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Per-state VSWR comparison table */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/30 overflow-hidden">
        <div className="px-4 py-2 border-b border-slate-700 text-xs font-medium text-slate-400 flex items-center gap-2">
          <TrendingUp size={13} />
          VSWR at Each Plasma State
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700 text-slate-500">
              <th className="text-left px-3 py-2 font-medium">State</th>
              <th className="text-left px-3 py-2 font-medium">R + jX (Ω)</th>
              <th className="text-left px-3 py-2 font-medium">Prob</th>
              <th className="text-left px-3 py-2 font-medium text-indigo-300">AITO™ VSWR</th>
              <th className="text-left px-3 py-2 font-medium text-amber-300">SS-only VSWR</th>
              <th className="text-left px-3 py-2 font-medium">Δ Improvement</th>
            </tr>
          </thead>
          <tbody>
            {states.map((st, i) => {
              const ar = result.stateResults[i];
              const sr = result.ssStateResults[i];
              const delta = sr.vswr - ar.vswr;
              return (
                <tr key={st.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="px-3 py-2 flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: STATE_COLORS[i % STATE_COLORS.length] }} />
                    <span className="text-slate-300">{st.label}</span>
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-400">
                    {st.resistance.toFixed(1)}+j{st.reactance.toFixed(0)}
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-400">{(st.probability * 100).toFixed(0)}%</td>
                  <td className="px-3 py-2">
                    <span className={`font-mono ${ar.vswr < 1.5 ? 'text-emerald-400' : ar.vswr < 3 ? 'text-amber-400' : 'text-red-400'}`}>
                      {ar.vswr > 99 ? '>99' : ar.vswr.toFixed(2)}:1
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`font-mono ${sr.vswr < 1.5 ? 'text-emerald-400' : sr.vswr < 3 ? 'text-amber-400' : 'text-red-400'}`}>
                      {sr.vswr > 99 ? '>99' : sr.vswr.toFixed(2)}:1
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {delta > 0.05
                      ? <span className="text-emerald-400 font-mono">−{delta.toFixed(2)} ↓</span>
                      : delta < -0.05
                      ? <span className="text-red-400 font-mono">+{Math.abs(delta).toFixed(2)} ↑</span>
                      : <span className="text-slate-500 font-mono">≈ same</span>
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Summary row */}
        <div className="border-t border-slate-700 px-3 py-2 flex items-center justify-between text-xs">
          <span className="text-slate-500">AITO™ Score</span>
          <span className="font-mono text-indigo-300">{result.score.toFixed(4)}</span>
          <span className="text-slate-500">Worst-case VSWR (AITO™ / SS-only)</span>
          <span className="font-mono">
            <span className="text-indigo-300">{Math.max(...result.stateResults.map(r => r.vswr)).toFixed(2)}</span>
            {' / '}
            <span className="text-amber-300">{Math.max(...result.ssStateResults.map(r => r.vswr)).toFixed(2)}</span>
          </span>
        </div>
      </div>

      {/* Patent claim callout */}
      <div className="rounded-xl border border-indigo-700/40 bg-indigo-900/10 p-4 text-xs text-slate-400 leading-relaxed">
        <div className="text-indigo-300 font-semibold mb-1">Patent Claim Evidence</div>
        The table above demonstrates the core AITO™ claim: a matching network designed to the probability-weighted centroid
        achieves lower worst-case VSWR across all process states compared to a network designed for the most probable
        (steady-state) point alone. Q_opt = R̄/σ_R = <strong className="text-indigo-200">{result.qOpt.toFixed(2)}</strong> was
        derived analytically from the impedance state distribution.
      </div>
    </div>
  );
}
