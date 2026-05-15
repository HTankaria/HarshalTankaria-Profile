import React, { useState } from 'react';
import { Network, Sliders } from 'lucide-react';
import { SelectField } from '../ui/SelectField';
import { InputField } from '../ui/InputField';
import { ResultCard } from '../ui/ResultCard';
import { Badge } from '../ui/Badge';
import { SchematicSVG } from '../SchematicSVG';
import { useStore } from '../../store/useStore';
import type { MatchingTopology } from '../../types';
import { formatValue, formatFreq } from '../../calculations/rfCalc';

const TOPOLOGY_OPTIONS = [
  { value: 'L_LOWPASS',  label: 'L-Network – Low-pass (shunt C → series L)' },
  { value: 'L_HIGHPASS', label: 'L-Network – High-pass (shunt L → series C)' },
  { value: 'PI',         label: 'Pi-Network (C – L – C) – Higher Q' },
  { value: 'T',          label: 'T-Network (L – C – L) – Highest Q' },
];

export function Step3MatchingNetwork() {
  const { state, setMatchingTopology, runMatchingDesign, setStep } = useStore();
  const [designQ, setDesignQ] = useState(5);
  const { matchingResult, plasmaLoad, systemConfig, matchingTopology } = state;
  const res = matchingResult;

  const aitoColor = !res ? 'slate' : res.aitoScore >= 70 ? 'green' : res.aitoScore >= 40 ? 'yellow' : 'red';

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30">
          <Network size={20} className="text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Matching Network Design</h2>
          <p className="text-sm text-slate-400">
            Design the impedance transformation network. The AITO™ optimiser evaluates
            each design across all plasma states and reports a multi-state VSWR score.
          </p>
        </div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField
          label="Network Topology"
          value={matchingTopology}
          onChange={v => setMatchingTopology(v as MatchingTopology)}
          options={TOPOLOGY_OPTIONS}
        />
        {(matchingTopology === 'PI' || matchingTopology === 'T') && (
          <InputField
            label="Design Q Factor"
            value={designQ}
            onChange={v => setDesignQ(Number(v))}
            min={1} max={50} step={0.5}
            hint="Higher Q = narrower bandwidth"
          />
        )}
      </div>

      {/* Design parameters summary */}
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: 'Source', val: `${systemConfig.sourceImpedance} Ω` },
          { label: 'Load R', val: `${plasmaLoad.effectiveR.toFixed(1)} Ω` },
          { label: 'Load X', val: `${plasmaLoad.effectiveX.toFixed(0)} Ω` },
        ].map(p => (
          <div key={p.label} className="rounded-lg bg-slate-800/50 border border-slate-700 py-2 px-3">
            <div className="text-xs text-slate-500">{p.label}</div>
            <div className="text-sm font-mono text-slate-200">{p.val}</div>
          </div>
        ))}
      </div>

      <button
        onClick={() => runMatchingDesign(designQ)}
        className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-lg text-sm font-semibold transition-colors"
      >
        <Sliders size={16} />
        Run AITO™ Matching Design
      </button>

      {/* Results */}
      {res && (
        <div className="flex flex-col gap-4">
          {/* Schematic */}
          <SchematicSVG result={res} />

          {/* Component table */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700">
                  {['ID', 'Type', 'Placement', 'Value', 'Reactance', 'V-Rating', 'I-Rating', 'Pdiss', 'Suggested Part'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-slate-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {res.components.map(c => (
                  <tr key={c.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="px-3 py-2 font-mono text-slate-200">{c.id}</td>
                    <td className="px-3 py-2">
                      <Badge color={c.type === 'L' ? 'purple' : 'yellow'}>{c.type}</Badge>
                    </td>
                    <td className="px-3 py-2 text-slate-400">{c.placement}</td>
                    <td className="px-3 py-2 font-mono text-slate-200">
                      {formatValue(c.value, c.type === 'L' ? 'H' : 'F')}
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-400">
                      {c.reactance.toFixed(1)} Ω
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-300">{c.voltageRating} V</td>
                    <td className="px-3 py-2 font-mono text-slate-300">{c.currentRating.toFixed(1)} A</td>
                    <td className="px-3 py-2 font-mono text-slate-300">{c.powerDissipation.toFixed(1)} W</td>
                    <td className="px-3 py-2 text-slate-400 max-w-[180px] truncate">{c.partSuggestion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Performance metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ResultCard
              title="Network Performance"
              icon={<Network size={16} />}
              accent="border-emerald-500/40"
              metrics={[
                { label: 'Topology', value: res.topology.replace('_', ' ') },
                { label: 'Design Q', value: res.designQ.toFixed(1), status: res.designQ > 20 ? 'warning' : 'ok' },
                { label: 'Bandwidth (−3 dB)', value: formatFreq(res.bandwidth3dB) },
                { label: 'Efficiency', value: `${(res.efficiency * 100).toFixed(1)}%`, status: res.efficiency > 0.97 ? 'ok' : 'warning' },
                { label: 'Insertion Loss', value: `${res.insertionLoss.toFixed(2)} dB`, status: res.insertionLoss < 0.2 ? 'ok' : 'warning' },
                { label: 'Input VSWR', value: `${res.inputVSWR.toFixed(2)}:1`, status: 'ok' },
              ]}
            />
            <ResultCard
              title="AITO™ Multi-State Score"
              accent="border-blue-500/40"
              metrics={[
                { label: 'AITO™ Score', value: `${res.aitoScore}/100`, status: aitoColor as 'ok' | 'warning' | 'critical' },
                { label: 'Worst-case VSWR', value: `${res.worstCaseVSWR.toFixed(1)}:1`, status: res.worstCaseVSWR < 3 ? 'ok' : 'critical' },
                { label: 'States evaluated', value: String(plasmaLoad.states.length || 1) },
                { label: 'Freq', value: formatFreq(systemConfig.primaryFrequency) },
              ]}
            />
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <button onClick={() => setStep(2)} className="text-slate-400 hover:text-slate-200 text-sm transition-colors">← Back</button>
        <button
          onClick={() => setStep(4)}
          disabled={!res}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Next: Transmission Line →
        </button>
      </div>
    </div>
  );
}
