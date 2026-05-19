import React, { useState } from 'react';
import { Waves, Sparkles, Info, Edit2, RotateCcw, AlertTriangle } from 'lucide-react';
import { InputField } from '../ui/InputField';
import { ResultCard } from '../ui/ResultCard';
import { Badge } from '../ui/Badge';
import { SmithChart } from '../SmithChart';
import { useStore } from '../../store/useStore';
import type { PlasmaState } from '../../types';

function EditableStateCard({
  s, idx, onUpdate, onReset,
}: { s: PlasmaState; idx: number; onUpdate: (patch: Partial<PlasmaState>) => void; onReset: () => void }) {
  const [editing, setEditing] = useState(false);
  const gamma = Math.sqrt(
    ((s.resistance - 50) ** 2 + s.reactance ** 2) /
    ((s.resistance + 50) ** 2 + s.reactance ** 2)
  );

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-300">{s.label}</span>
        <div className="flex items-center gap-1">
          <Badge color="slate">{(s.probability * 100).toFixed(0)}%</Badge>
          <button onClick={onReset} title="Reset to PSTAW™ auto value"
            className="p-1 text-slate-500 hover:text-slate-300 transition-colors rounded"><RotateCcw size={12} /></button>
          <button onClick={() => setEditing(v => !v)} title={editing ? 'Collapse' : 'Edit state'}
            className={`p-1 transition-colors rounded ${editing ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}>
            <Edit2 size={12} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1 text-xs">
        <span className="text-slate-500">R_plasma:</span>
        <span className="font-mono text-emerald-400">{s.resistance.toFixed(2)} Ω</span>
        <span className="text-slate-500">X_plasma:</span>
        <span className="font-mono text-yellow-400">{s.reactance.toFixed(1)} Ω</span>
        <span className="text-slate-500">|Γ| (vs 50Ω):</span>
        <span className="font-mono text-slate-300">{gamma.toFixed(3)}</span>
      </div>
      {editing && (
        <div className="mt-3 pt-3 border-t border-slate-700 grid grid-cols-2 gap-2">
          <InputField label="Probability" value={s.probability} onChange={v => onUpdate({ probability: Math.max(0, Math.min(1, Number(v))) })}
            unit="0–1" min={0} max={1} step={0.01} hint="Weight in AITO™ centroid" />
          <InputField label="R_plasma" value={s.resistance} onChange={v => onUpdate({ resistance: Math.max(0.01, Number(v)) })}
            unit="Ω" min={0.01} max={5000} />
          <InputField label="X_plasma" value={s.reactance} onChange={v => onUpdate({ reactance: Number(v) })}
            unit="Ω" step={1} hint="Negative = capacitive" />
          <div className="col-span-2 text-xs text-slate-500">Editing overrides PSTAW™. Hit <RotateCcw size={10} className="inline" /> to restore.</div>
        </div>
      )}
    </div>
  );
}

export function Step2PlasmaLoad() {
  const { state, updatePlasmaLoad, updatePlasmaState, autoEstimatePlasma, setStep } = useStore();
  const { plasmaLoad, systemConfig } = state;
  const { states, effectiveR, effectiveX } = plasmaLoad;

  const gammaEff = Math.sqrt(
    ((effectiveR - systemConfig.sourceImpedance) ** 2 + effectiveX ** 2) /
    ((effectiveR + systemConfig.sourceImpedance) ** 2 + effectiveX ** 2)
  );
  const vswrEff = gammaEff >= 1 ? 99 : (1 + gammaEff) / (1 - gammaEff);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-purple-500/15 border border-purple-500/30">
          <Waves size={20} className="text-purple-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Plasma Load Characterisation</h2>
          <p className="text-sm text-slate-400">
            Define the plasma impedance across operating states. The PSTAW™ workflow auto-generates
            a multi-state model from your tool & process parameters.
          </p>
        </div>
      </div>

      {/* Estimation method toggle */}
      <div className="flex gap-2">
        {(['auto', 'manual'] as const).map(m => (
          <button key={m}
            onClick={() => updatePlasmaLoad({ estimationMethod: m })}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
              plasmaLoad.estimationMethod === m
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
            }`}
          >
            {m === 'auto' ? '⚡ PSTAW™ Auto-Estimate' : '✏️ Manual Entry'}
          </button>
        ))}
      </div>

      {plasmaLoad.estimationMethod === 'auto' ? (
        <div className="flex flex-col gap-4">
          {/* PSTAW info */}
          <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 flex gap-2">
            <Info size={16} className="text-purple-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-slate-400 leading-relaxed">
              <strong className="text-purple-300">PSTAW™</strong> derives plasma impedance from your chamber geometry,
              operating pressure, and tool type using a first-principles sheath-bulk model.
              Four states are generated: pre-ignition, steady-state, process-drift, and near-extinction,
              each with a probability weight used by the AITO™ optimiser.
            </div>
          </div>

          <button
            onClick={autoEstimatePlasma}
            className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors"
          >
            <Sparkles size={16} />
            Run PSTAW™ Auto-Estimation
          </button>

          {states.length > 0 && (() => {
            const probSum = states.reduce((s, st) => s + st.probability, 0);
            const probOk = Math.abs(probSum - 1) < 0.005;
            return (
              <div className="space-y-3">
                {!probOk && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-300">
                    <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                    <span>Probabilities sum to {(probSum * 100).toFixed(1)}% (should be 100%). AITO™ normalises automatically.</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">Click <Edit2 size={10} className="inline" /> to override R/X or probability per state.</p>
                  <button onClick={autoEstimatePlasma} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                    <RotateCcw size={11} /> Reset all
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {states.map((s, i) => (
                    <EditableStateCard key={i} s={s} idx={i}
                      onUpdate={patch => updatePlasmaState(i, patch)}
                      onReset={() => {
                        // Re-run PSTAW™ for just this state's fresh value - we can't do per-state reset
                        // without re-running the full estimation. Instead just run full reset.
                        autoEstimatePlasma();
                      }}
                    />
                  ))}
                </div>
                <div className="rounded-lg border border-slate-700/50 bg-slate-800/20 p-2.5 text-xs text-slate-500 leading-relaxed">
                  <span className="text-blue-400 font-semibold mr-1">Why 4 states?</span>
                  Real plasma loads are time-varying. Pre-ignition and near-extinction represent worst-case VSWR excursions.
                  Designing for steady-state only causes reflected power trips during ramp-up/down.
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            label="Plasma Resistance (R)"
            value={effectiveR}
            onChange={v => updatePlasmaLoad({ effectiveR: Number(v) })}
            unit="Ω" min={0.1} step={0.5}
            hint="Bulk plasma + sheath resistance"
          />
          <InputField
            label="Plasma Reactance (X)"
            value={effectiveX}
            onChange={v => updatePlasmaLoad({ effectiveX: Number(v) })}
            unit="Ω"
            hint="Negative = capacitive (typical for CCP)"
          />
          <InputField
            label="Shunt Capacitance"
            value={plasmaLoad.sheathCapacitance}
            onChange={v => updatePlasmaLoad({ sheathCapacitance: Number(v) })}
            unit="pF" hint="Sheath capacitance (both sheaths)"
          />
          <InputField
            label="Stray Inductance"
            value={plasmaLoad.strayInductance}
            onChange={v => updatePlasmaLoad({ strayInductance: Number(v) })}
            unit="nH" hint="Cable + electrode series inductance"
          />
        </div>
      )}

      {/* Results + Smith chart */}
      {(states.length > 0 || plasmaLoad.estimationMethod === 'manual') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="flex flex-col gap-3">
            <ResultCard
              title="AITO™ Weighted Impedance"
              icon={<Waves size={16} />}
              accent="border-purple-500/40"
              metrics={[
                { label: 'Effective R', value: effectiveR.toFixed(2), unit: ' Ω', status: 'ok' },
                { label: 'Effective X', value: effectiveX.toFixed(1), unit: ' Ω', status: effectiveX < 0 ? 'info' : 'ok' },
                { label: 'VSWR (unmatched)', value: vswrEff.toFixed(1) + ':1', status: vswrEff > 5 ? 'critical' : 'warning' },
                { label: '|Γ|', value: gammaEff.toFixed(3), status: gammaEff > 0.7 ? 'warning' : 'ok' },
                { label: 'States modelled', value: String(states.length || 1), status: 'info' },
                { label: 'Model', value: plasmaLoad.estimationMethod === 'auto' ? 'PSTAW™' : 'Manual', status: 'info' },
              ]}
            />
          </div>
          <SmithChart
            states={states.length > 0 ? states : [{ label: 'Manual', resistance: effectiveR, reactance: effectiveX, probability: 1 }]}
            centroidR={effectiveR}
            centroidX={effectiveX}
            Z0={systemConfig.sourceImpedance}
            className="h-64"
          />
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button onClick={() => setStep(1)} className="text-slate-400 hover:text-slate-200 text-sm transition-colors">
          ← Back
        </button>
        <button
          onClick={() => setStep(3)}
          disabled={states.length === 0 && plasmaLoad.estimationMethod === 'auto'}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Next: Matching Network Design →
        </button>
      </div>
    </div>
  );
}
