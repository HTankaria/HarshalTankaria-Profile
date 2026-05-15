import React from 'react';
import { useGenerator } from '../../store/useGeneratorStore';
import { InputField, SelectField, ResultCard, MetricRow, RunButton, SectionHeader } from '../ui';

export default function DirectionalCoupler() {
  const { state, updateCouplerConfig: upd, runCouplerDesign } = useGenerator();
  const cfg = state.couplerConfig;
  const res = state.couplerResult;
  return (
    <div className="space-y-6">
      <SectionHeader title="Directional Coupler" subtitle="Toroidal transformer or quarter-wave coupled-line coupler design." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField label="Topology" value={cfg.topology} onChange={v => upd({ topology: v })}
          options={[
            { value: 'transformer', label: 'Toroidal Transformer (< 100 MHz)' },
            { value: 'coupled_line', label: 'Coupled-Line (λ/4, PCB)' },
          ]}
        />
        <InputField label="Coupling Factor" value={cfg.couplingFactor_dB} onChange={v => upd({ couplingFactor_dB: parseFloat(v) || 20 })} unit="dB" min={6} max={40} />
        <InputField label="RF Power" value={cfg.power_W} onChange={v => upd({ power_W: parseFloat(v) || 3000 })} unit="W" min={10} max={30000} />
        <InputField label="Source Impedance" value={cfg.sourceImpedance_ohm} onChange={v => upd({ sourceImpedance_ohm: parseFloat(v) || 50 })} unit="Ω" min={25} max={100} />
      </div>
      <RunButton onClick={runCouplerDesign} label="Design Coupler →" />
      {res && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ResultCard title="Coupler Performance" accent="purple">
              <MetricRow label="Coupling Factor" value={res.couplingFactor_dB} unit="dB" highlight />
              <MetricRow label="Directivity" value={res.directivity_dB} unit="dB" highlight />
              <MetricRow label="Insertion Loss" value={res.insertionLoss_dB.toFixed(2)} unit="dB" />
              <MetricRow label="Forward Port Power" value={res.forwardPower_W.toFixed(2)} unit="W" />
            </ResultCard>
            <ResultCard title="Topology Details" accent="blue">
              <p className="text-xs text-slate-300">{res.topologyDetails}</p>
            </ResultCard>
          </div>
          <ResultCard title="Part Suggestion" accent="amber">
            <p className="text-xs text-slate-300">{res.partSuggestion}</p>
          </ResultCard>
          <ResultCard title="Notes" accent="green">
            <ul className="space-y-1">{res.notes.map((n, i) => <li key={i} className="text-xs text-slate-300 flex gap-2"><span className="text-emerald-400 shrink-0">▸</span>{n}</li>)}</ul>
          </ResultCard>
        </div>
      )}
    </div>
  );
}
