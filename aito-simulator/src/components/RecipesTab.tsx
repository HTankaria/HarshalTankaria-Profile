import { useState } from 'react';
import { Plus, Trash2, Upload, ChevronDown, ChevronRight } from 'lucide-react';
import { InputField } from './ui/InputField';
import { SmithChart } from './SmithChart';
import { computeAITO, STATE_COLORS, fmtF, gammaMag } from '../calculations/aito';
import type { Recipe, ImpedanceState } from '../types';

const PRESET_RECIPES: Recipe[] = [
  {
    id: 'r1', name: 'CCP Etch — Cl₂/HBr', toolType: 'CCP_ETCH',
    frequency: 13.56e6, power: 1000, notes: '300mm wafer, 50 mTorr',
    states: [
      { id: 's1', label: 'Pre-ignition',    resistance: 2,  reactance: -150, probability: 0.05 },
      { id: 's2', label: 'Steady-state',    resistance: 8,  reactance: -80,  probability: 0.75 },
      { id: 's3', label: 'Process drift',   resistance: 12, reactance: -60,  probability: 0.15 },
      { id: 's4', label: 'Near-extinction', resistance: 3,  reactance: -120, probability: 0.05 },
    ],
  },
  {
    id: 'r2', name: 'ICP Etch — CF₄/O₂', toolType: 'ICP_ETCH',
    frequency: 13.56e6, power: 3000, notes: '200mm, 10 mTorr oxide etch',
    states: [
      { id: 's5', label: 'Pre-ignition',    resistance: 1,  reactance: -200, probability: 0.05 },
      { id: 's6', label: 'Steady-state',    resistance: 4,  reactance: -60,  probability: 0.80 },
      { id: 's7', label: 'Near-extinction', resistance: 1.5,reactance: -180, probability: 0.15 },
    ],
  },
  {
    id: 'r3', name: 'PECVD SiN — NH₃/SiH₄', toolType: 'PECVD',
    frequency: 13.56e6, power: 500, notes: '200mm, 1 Torr deposition',
    states: [
      { id: 's8', label: 'Pre-ignition',  resistance: 5,  reactance: -120, probability: 0.05 },
      { id: 's9', label: 'Steady-state',  resistance: 20, reactance: -40,  probability: 0.80 },
      { id: 's10', label: 'Process drift', resistance: 30, reactance: -30,  probability: 0.15 },
    ],
  },
];

let rIdCounter = 100;
let sIdCounter = 200;

interface Props {
  onLoad: (states: ImpedanceState[], freq: number) => void;
}

export function RecipesTab({ onLoad }: Props) {
  const [recipes, setRecipes] = useState<Recipe[]>(PRESET_RECIPES);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTool, setNewTool] = useState('CCP_ETCH');
  const [newFreq, setNewFreq] = useState(13.56);
  const [newPower, setNewPower] = useState(1000);
  const [newNotes, setNewNotes] = useState('');

  function addRecipe() {
    if (!newName.trim()) return;
    const id = String(rIdCounter++);
    setRecipes([...recipes, {
      id, name: newName.trim(), toolType: newTool,
      frequency: newFreq * 1e6, power: newPower, notes: newNotes,
      states: [
        { id: String(sIdCounter++), label: 'Steady-state', resistance: 8, reactance: -80, probability: 1.0 },
      ],
    }]);
    setNewName(''); setNewNotes(''); setAdding(false);
    setExpanded(id);
  }

  function addStateToRecipe(recipeId: string) {
    setRecipes(recipes.map(r => r.id !== recipeId ? r : {
      ...r,
      states: [...r.states, { id: String(sIdCounter++), label: 'New state', resistance: 8, reactance: -80, probability: 0.1 }],
    }));
  }

  function updateState(recipeId: string, stateId: string, patch: Partial<ImpedanceState>) {
    setRecipes(recipes.map(r => r.id !== recipeId ? r : {
      ...r, states: r.states.map(s => s.id !== stateId ? s : { ...s, ...patch }),
    }));
  }

  function removeState(recipeId: string, stateId: string) {
    setRecipes(recipes.map(r => r.id !== recipeId ? r : {
      ...r, states: r.states.filter(s => s.id !== stateId),
    }));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">Build process recipes with custom impedance states. Load any recipe into the simulator.</p>
        <button onClick={() => setAdding(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors">
          <Plus size={13} /> New Recipe
        </button>
      </div>

      {/* New recipe form */}
      {adding && (
        <div className="rounded-xl border border-blue-700/40 bg-blue-900/10 p-4 flex flex-col gap-3">
          <h4 className="text-xs font-semibold text-blue-300">New Recipe</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">Name</label>
              <input value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="e.g. CCP Etch Cl₂/HBr 1kW"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-2 text-sm text-slate-100 outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Tool Type</label>
              <select value={newTool} onChange={e => setNewTool(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-2 text-sm text-slate-100 outline-none">
                {['CCP_ETCH','ICP_ETCH','PECVD','DUAL_FREQ_CCP','PVD_SPUTTER','HDP_CVD','CUSTOM'].map(t =>
                  <option key={t} value={t}>{t}</option>
                )}
              </select>
            </div>
            <InputField label="Frequency (MHz)" value={newFreq} onChange={setNewFreq} unit="MHz" min={1} max={2450} step={0.01} />
            <InputField label="Power" value={newPower} onChange={setNewPower} unit="W" min={10} max={20000} />
            <div className="col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">Notes</label>
              <input value={newNotes} onChange={e => setNewNotes(e.target.value)}
                placeholder="Wafer size, pressure, chemistry..."
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-2 text-sm text-slate-100 outline-none focus:border-blue-500" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addRecipe} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors">Create</button>
            <button onClick={() => setAdding(false)} className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Recipe list */}
      {recipes.map(recipe => {
        const isOpen = expanded === recipe.id;
        const result = computeAITO(recipe.states, 50, recipe.frequency);
        return (
          <div key={recipe.id} className="rounded-xl border border-slate-700 bg-slate-800/40 overflow-hidden">
            {/* Header */}
            <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800/60 transition-colors"
              onClick={() => setExpanded(isOpen ? null : recipe.id)}>
              {isOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-slate-100">{recipe.name}</div>
                <div className="text-xs text-slate-500">{recipe.toolType} · {fmtF(recipe.frequency)} · {recipe.power}W · {recipe.states.length} states</div>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded"
                style={{ background: result.score > 0.85 ? '#06473440' : '#78350f40',
                         color: result.score > 0.85 ? '#34d399' : '#fbbf24' }}>
                AITO {result.score.toFixed(3)}
              </span>
              <button
                onClick={e => { e.stopPropagation(); onLoad(recipe.states, recipe.frequency); }}
                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors ml-2">
                <Upload size={11} /> Load
              </button>
              {!PRESET_RECIPES.find(p => p.id === recipe.id) && (
                <button onClick={e => { e.stopPropagation(); setRecipes(recipes.filter(r => r.id !== recipe.id)); }}
                  className="p-1 text-slate-600 hover:text-red-400 transition-colors ml-1">
                  <Trash2 size={13} />
                </button>
              )}
            </button>

            {/* Expanded detail */}
            {isOpen && (
              <div className="border-t border-slate-700 p-4 flex flex-col gap-4">
                {recipe.notes && <p className="text-xs text-slate-500 italic">{recipe.notes}</p>}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* State editor */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-medium text-slate-400">Impedance States</h4>
                      <button onClick={() => addStateToRecipe(recipe.id)}
                        className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                        <Plus size={11} /> Add
                      </button>
                    </div>
                    {recipe.states.map((st, i) => {
                      const g = gammaMag(st.resistance, st.reactance, 50);
                      return (
                        <div key={st.id} className="rounded-lg border border-slate-700 bg-slate-900/40 p-2.5 flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: STATE_COLORS[i % STATE_COLORS.length] }} />
                            <input value={st.label} onChange={e => updateState(recipe.id, st.id, { label: e.target.value })}
                              className="flex-1 bg-transparent text-xs font-medium text-slate-200 outline-none border-b border-transparent focus:border-slate-600" />
                            <button onClick={() => removeState(recipe.id, st.id)} className="text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={11} /></button>
                          </div>
                          <div className="grid grid-cols-4 gap-1.5">
                            <InputField label="R (Ω)" value={st.resistance} onChange={v => updateState(recipe.id, st.id, { resistance: v })} min={0.1} max={5000} step={0.5} />
                            <InputField label="X (Ω)" value={st.reactance} onChange={v => updateState(recipe.id, st.id, { reactance: v })} min={-5000} max={5000} />
                            <InputField label="Prob" value={st.probability} onChange={v => updateState(recipe.id, st.id, { probability: v })} min={0} max={1} step={0.01} />
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-slate-500">|Γ|</span>
                              <span className="font-mono text-xs text-slate-300 pt-1">{g.toFixed(3)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Smith chart */}
                  <SmithChart
                    states={recipe.states}
                    centroidR={result.centroidR}
                    centroidX={result.centroidX}
                    Z0={50}
                    className="aspect-square"
                  />
                </div>

                {/* AITO summary */}
                <div className="grid grid-cols-3 gap-2 text-xs text-center">
                  {[
                    { label: 'Centroid R̄', value: `${result.centroidR.toFixed(2)} Ω` },
                    { label: 'σ_R', value: `${result.sigmaR.toFixed(2)} Ω` },
                    { label: 'Q_opt = R̄/σ_R', value: result.qOpt.toFixed(2) },
                  ].map(m => (
                    <div key={m.label} className="rounded-lg bg-slate-900/60 border border-slate-700 p-2">
                      <div className="text-slate-500">{m.label}</div>
                      <div className="font-mono text-slate-100 mt-0.5">{m.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
