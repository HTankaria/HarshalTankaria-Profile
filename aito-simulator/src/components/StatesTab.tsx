import { useState } from 'react';
import { Plus, Trash2, RotateCcw, Zap, Sparkles } from 'lucide-react';
import { InputField } from './ui/InputField';
import { SmithChart } from './SmithChart';
import { computeAITO, optimizeNetwork, networkResponseAt, DEFAULT_STATES, STATE_COLORS, fmtC, fmtL, fmtF, gammaMag } from '../calculations/aito';
import type { ImpedanceState, LNetwork } from '../types';

interface Props {
  states: ImpedanceState[];
  setStates: (s: ImpedanceState[]) => void;
  freq: number;
  Z0: number;
}

let idCounter = 10;

function newState(): ImpedanceState {
  return { id: String(idCounter++), label: 'Custom state', resistance: 8, reactance: -80, probability: 0.1 };
}

export function StatesTab({ states, setStates, freq, Z0 }: Props) {
  const result = computeAITO(states, Z0, freq);
  const probSum = states.reduce((s, st) => s + st.probability, 0);
  const probOk = Math.abs(probSum - 1) < 0.005;
  const [optimized, setOptimized] = useState<{ network: LNetwork; score: number } | null>(null);
  const [optimizing, setOptimizing] = useState(false);

  function update(id: string, patch: Partial<ImpedanceState>) {
    setStates(states.map(s => s.id === id ? { ...s, ...patch } : s));
    setOptimized(null);
  }

  function runOptimize() {
    setOptimizing(true);
    setOptimized(null);
    // defer to next tick so React can render the loading state
    setTimeout(() => {
      const result = optimizeNetwork(states, Z0, freq);
      setOptimized(result);
      setOptimizing(false);
    }, 30);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          <button onClick={() => setStates([...states, newState()])}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors">
            <Plus size={13} /> Add State
          </button>
          <button onClick={() => setStates(DEFAULT_STATES)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium transition-colors">
            <RotateCcw size={13} /> Reset Defaults
          </button>
        </div>
        {!probOk && (
          <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-1">
            Probabilities sum to {(probSum * 100).toFixed(1)}% — normalise to 100%
          </span>
        )}
      </div>

      {/* State cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {states.map((st, i) => {
          const g = gammaMag(st.resistance, st.reactance, Z0);
          const vswr = g >= 1 ? 999 : (1 + g) / (1 - g);
          const color = STATE_COLORS[i % STATE_COLORS.length];
          return (
            <div key={st.id} className="rounded-xl border bg-slate-800/50 p-3 flex flex-col gap-3"
              style={{ borderColor: color + '40' }}>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
                <input
                  value={st.label}
                  onChange={e => update(st.id, { label: e.target.value })}
                  className="flex-1 bg-transparent text-sm font-semibold text-slate-100 outline-none border-b border-transparent focus:border-slate-600"
                />
                <button onClick={() => setStates(states.filter(s => s.id !== st.id))}
                  className="p-1 text-slate-600 hover:text-red-400 transition-colors rounded">
                  <Trash2 size={13} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <InputField label="R (Ω)" value={st.resistance} onChange={v => update(st.id, { resistance: v })} min={0.1} max={5000} step={0.5} />
                <InputField label="X (Ω)" value={st.reactance} onChange={v => update(st.id, { reactance: v })} min={-5000} max={5000} step={1} hint="−=cap" />
                <InputField label="Prob" value={st.probability} onChange={v => update(st.id, { probability: Math.max(0, Math.min(1, v)) })} min={0} max={1} step={0.01} />
              </div>

              <div className="grid grid-cols-3 gap-1 text-xs text-center">
                <div className="rounded bg-slate-900/60 border border-slate-700 p-1.5">
                  <div className="text-slate-500">|Γ|</div>
                  <div className="font-mono text-slate-200">{g.toFixed(3)}</div>
                </div>
                <div className="rounded bg-slate-900/60 border border-slate-700 p-1.5">
                  <div className="text-slate-500">VSWR</div>
                  <div className={`font-mono ${vswr > 10 ? 'text-red-400' : vswr > 3 ? 'text-amber-400' : 'text-emerald-400'}`}>{vswr > 99 ? '>99' : vswr.toFixed(1)}</div>
                </div>
                <div className="rounded bg-slate-900/60 border border-slate-700 p-1.5">
                  <div className="text-slate-500">RL (dB)</div>
                  <div className="font-mono text-slate-200">{g > 1e-6 ? (-20 * Math.log10(g)).toFixed(1) : '60+'}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* AITO Results */}
      {states.length >= 2 && (
        <div className="rounded-xl border border-indigo-700/40 bg-indigo-900/10 p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-indigo-400" />
            <h3 className="text-sm font-semibold text-indigo-300">AITO™ Centroid Network</h3>
            <span className="text-xs text-slate-500">analytical approximation</span>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-mono"
              style={{ background: result.score > 0.85 ? '#065f4640' : result.score > 0.7 ? '#78350f40' : '#7f1d1d40',
                       color: result.score > 0.85 ? '#34d399' : result.score > 0.7 ? '#fbbf24' : '#f87171',
                       border: `1px solid ${result.score > 0.85 ? '#34d39940' : result.score > 0.7 ? '#fbbf2440' : '#f8717140'}` }}>
              Score {result.score.toFixed(3)}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {[
              { label: 'Centroid R̄', value: `${result.centroidR.toFixed(2)} Ω`, sub: `±${result.sigmaR.toFixed(2)} σ` },
              { label: 'Centroid X̄', value: `${result.centroidX.toFixed(1)} Ω`, sub: `±${result.sigmaX.toFixed(1)} σ` },
              { label: 'Q_opt = R̄/σ_R', value: result.qOpt.toFixed(2), sub: 'optimal quality factor' },
              { label: 'Network Q', value: result.network.Q.toFixed(2), sub: 'synthesised Q' },
            ].map(m => (
              <div key={m.label} className="rounded-lg bg-slate-900/60 border border-slate-700 p-2.5">
                <div className="text-slate-500 mb-1">{m.label}</div>
                <div className="font-mono text-slate-100 text-sm">{m.value}</div>
                <div className="text-slate-600 mt-0.5">{m.sub}</div>
              </div>
            ))}
          </div>

          {/* L-network component values */}
          <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <div className="text-xs font-medium text-slate-400 mb-2">Synthesised L-Network (shunt-C / series-L @ {fmtF(freq)})</div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">C_shunt (load side)</span>
                <span className="font-mono text-yellow-400">{fmtC(result.network.C_shunt)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">L_series (source side)</span>
                <span className="font-mono text-purple-400">{fmtL(result.network.L_series)}</span>
              </div>
            </div>
          </div>

          {/* Per-state matched VSWR */}
          <div className="rounded-lg border border-slate-700 overflow-hidden">
            <div className="px-3 py-1.5 border-b border-slate-700 text-xs font-medium text-slate-400">
              Matched VSWR per state (AITO™ centroid network)
            </div>
            <div className="divide-y divide-slate-700/50">
              {result.stateResults.map((r, i) => (
                <div key={r.state.id} className="flex items-center gap-2 px-3 py-2 text-xs">
                  <div className="w-2 h-2 rounded-full" style={{ background: STATE_COLORS[i % STATE_COLORS.length] }} />
                  <span className="flex-1 text-slate-300">{r.state.label}</span>
                  <span className={`font-mono ${r.vswr < 1.5 ? 'text-emerald-400' : r.vswr < 3 ? 'text-amber-400' : 'text-red-400'}`}>
                    VSWR {r.vswr > 99 ? '>99' : r.vswr.toFixed(2)}:1
                  </span>
                  <span className="font-mono text-slate-500 w-16 text-right">|Γ| {r.gamma.toFixed(3)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Optimize button */}
          <button
            onClick={runOptimize}
            disabled={optimizing || states.length < 2}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-semibold transition-colors"
          >
            <Sparkles size={15} />
            {optimizing ? 'Optimizing…' : 'Optimize'}
          </button>

          {/* Optimized result */}
          {optimized && (
            <div className="rounded-xl border border-violet-600/40 bg-violet-900/10 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-violet-400" />
                  <span className="text-sm font-semibold text-violet-300">Power-Optimal Network</span>
                  <span className="text-xs text-slate-500">minimises Σp|Γ|² — true optimum</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">Before:</span>
                  <span className="font-mono text-amber-400">{result.score.toFixed(4)}</span>
                  <span className="text-slate-500">After:</span>
                  <span className="font-mono text-emerald-400">{optimized.score.toFixed(4)}</span>
                  <span className={`font-mono font-bold ${optimized.score > result.score ? 'text-emerald-400' : 'text-slate-400'}`}>
                    (+{((optimized.score - result.score) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>

              {/* Component values */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-slate-900/60 border border-violet-700/30 p-2.5">
                  <div className="text-slate-500 mb-1">C_shunt (load side)</div>
                  <div className="font-mono text-yellow-400 text-sm">{fmtC(optimized.network.C_shunt)}</div>
                </div>
                <div className="rounded-lg bg-slate-900/60 border border-violet-700/30 p-2.5">
                  <div className="text-slate-500 mb-1">L_series (source side)</div>
                  <div className="font-mono text-purple-400 text-sm">{fmtL(optimized.network.L_series)}</div>
                </div>
              </div>

              {/* Per-state VSWR with optimized network */}
              <div className="rounded-lg border border-slate-700 overflow-hidden">
                <div className="px-3 py-1.5 border-b border-slate-700 text-xs font-medium text-violet-400">
                  Matched VSWR per state (Optimized network)
                </div>
                <div className="divide-y divide-slate-700/50">
                  {states.map((st, i) => {
                    const r = networkResponseAt(st, optimized.network, Z0, freq);
                    return (
                      <div key={st.id} className="flex items-center gap-2 px-3 py-2 text-xs">
                        <div className="w-2 h-2 rounded-full" style={{ background: STATE_COLORS[i % STATE_COLORS.length] }} />
                        <span className="flex-1 text-slate-300">{st.label}</span>
                        <span className={`font-mono ${r.vswr < 1.5 ? 'text-emerald-400' : r.vswr < 3 ? 'text-amber-400' : 'text-red-400'}`}>
                          VSWR {r.vswr > 99 ? '>99' : r.vswr.toFixed(2)}:1
                        </span>
                        <span className="font-mono text-slate-500 w-16 text-right">|Γ| {r.gamma.toFixed(3)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Smith chart */}
      <SmithChart
        states={states}
        centroidR={result.centroidR}
        centroidX={result.centroidX}
        Z0={Z0}
        className="aspect-square max-w-xs mx-auto w-full"
      />
    </div>
  );
}
