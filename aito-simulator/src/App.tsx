import React, { useState } from 'react';
import { Zap, Layers, BookOpen, GitBranch, MapPin, Cpu } from 'lucide-react';
import { StatesTab } from './components/StatesTab';
import { RecipesTab } from './components/RecipesTab';
import { TrajectoryTab } from './components/TrajectoryTab';
import { TuningMapTab } from './components/TuningMapTab';
import { TuningAlgoTab } from './components/TuningAlgoTab';
import { DEFAULT_STATES, fmtF } from './calculations/aito';
import type { ImpedanceState } from './types';

type Tab = 'states' | 'recipes' | 'tuning' | 'trajectory' | 'algo';

export default function App() {
  const [tab, setTab] = useState<Tab>('states');
  const [states, setStates] = useState<ImpedanceState[]>(DEFAULT_STATES);
  const [freqMHz, setFreqMHz] = useState(13.56);
  const [Z0, setZ0] = useState(50);
  const freq = freqMHz * 1e6;

  function handleNetworkLoad(newFreq: number, newZ0: number) {
    setFreqMHz(parseFloat((newFreq / 1e6).toFixed(4)));
    setZ0(newZ0);
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'states',     label: 'States',     icon: <Layers size={13} /> },
    { id: 'recipes',    label: 'Recipes',    icon: <BookOpen size={13} /> },
    { id: 'tuning',     label: 'Tuning Map', icon: <MapPin size={13} /> },
    { id: 'trajectory', label: 'Trajectory', icon: <GitBranch size={13} /> },
    { id: 'algo',       label: 'Algorithm',  icon: <Cpu size={13} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-600 shadow-lg shadow-indigo-600/30">
              <Zap size={16} className="text-white" />
            </div>
            <span className="font-bold text-slate-100 text-sm">AITO™ Simulator</span>
            <span className="text-xs text-indigo-400 font-mono hidden sm:block">v0.2 · Patent Pending</span>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 hidden sm:block">f =</span>
              <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 focus-within:border-indigo-500 transition-colors">
                <input
                  type="number" value={freqMHz} min={0.001} max={2450} step={0.001}
                  onChange={e => setFreqMHz(parseFloat(e.target.value) || 13.56)}
                  className="w-20 bg-transparent text-slate-100 outline-none text-right text-xs"
                />
                <span className="text-slate-500">MHz</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 hidden sm:block">Z₀ =</span>
              <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 focus-within:border-indigo-500 transition-colors">
                <input
                  type="number" value={Z0} min={1} max={300} step={1}
                  onChange={e => setZ0(parseFloat(e.target.value) || 50)}
                  className="w-12 bg-transparent text-slate-100 outline-none text-right text-xs"
                />
                <span className="text-slate-500">Ω</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <div className="border-b border-slate-800 bg-slate-900/80">
        <div className="max-w-5xl mx-auto px-4 flex gap-1 py-1.5">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                tab === t.id
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}>
              {t.icon}
              <span className="hidden sm:block">{t.label}</span>
            </button>
          ))}

          <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
            <span className="hidden sm:block">{states.length} states · {fmtF(freq)} · {Z0}Ω</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-800/30 backdrop-blur p-5">
          {tab === 'states' && (
            <StatesTab states={states} setStates={setStates} freq={freq} Z0={Z0} />
          )}
          {tab === 'recipes' && (
            <RecipesTab onLoad={(s, f) => { setStates(s); setFreqMHz(f / 1e6); setTab('states'); }} />
          )}
          {tab === 'tuning' && (
            <TuningMapTab states={states} freq={freq} Z0={Z0} onNetworkLoad={handleNetworkLoad} />
          )}
          {tab === 'trajectory' && (
            <TrajectoryTab states={states} freq={freq} Z0={Z0} />
          )}
          {tab === 'algo' && (
            <TuningAlgoTab states={states} freq={freq} Z0={Z0} onNetworkLoad={handleNetworkLoad} />
          )}
        </div>
      </main>

      <footer className="border-t border-slate-800 py-3 px-4 text-center text-xs text-slate-600">
        AITO™ — Adaptive Impedance Trajectory Optimisation · Provisional patent pending · Simulator v0.2
      </footer>
    </div>
  );
}
