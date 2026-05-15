import React from 'react';
import { useGenerator } from '../../store/useGeneratorStore';
import { InputField, SelectField, ResultCard, MetricRow, RunButton, SectionHeader } from '../ui';

export default function ArcDetection() {
  const { state, updateArcConfig: upd, runArcDesign } = useGenerator();
  const cfg = state.arcConfig;
  const res = state.arcResult;
  return (
    <div className="space-y-6">
      <SectionHeader title="Arc Detection Circuit" subtitle="Sub-microsecond arc detection and PA shutdown chain design." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField label="Detection Method" value={cfg.method} onChange={v => upd({ method: v })}
          options={[
            { value: 'reflected_power', label: 'Reflected Power (recommended)' },
            { value: 'voltage_dip', label: 'DC Bus Voltage Dip' },
            { value: 'current_spike', label: 'DC Current Spike' },
          ]}
        />
        <InputField label="Threshold" value={cfg.threshold_pct} onChange={v => upd({ threshold_pct: parseFloat(v) || 10 })} unit="%" min={1} max={50} help="% of forward power that triggers arc detection" />
        <InputField label="RF Power" value={cfg.outputPower_W} onChange={v => upd({ outputPower_W: parseFloat(v) || 3000 })} unit="W" min={100} max={30000} />
      </div>
      <RunButton onClick={runArcDesign} label="Design Arc Detection →" />
      {res && (
        <div className="space-y-4">
          <ResultCard title="Detection Performance" accent="red">
            <MetricRow label="Total Latency" value={res.detectionLatency_us.toFixed(2)} unit="µs" highlight />
            <MetricRow label="Arc Energy" value={res.arcEnergy_uJ.toFixed(1)} unit="µJ" />
            <MetricRow label="Threshold Level" value={res.thresholdLevel_dBm.toFixed(1)} unit="dBm" />
            <MetricRow label="Recovery Time" value={res.recoveryTime_ms} unit="ms" />
          </ResultCard>
          <ResultCard title="Latency Chain" accent="blue">
            <div className="space-y-1">
              {res.latencyChain.map((l, i) => (
                <div key={i} className="flex justify-between text-xs py-1 border-b border-slate-700/40 last:border-0">
                  <span className="text-slate-400">{l.stage}</span>
                  <span className="font-mono text-blue-300">{l.delay_ns} ns</span>
                </div>
              ))}
              <div className="flex justify-between text-xs py-1 font-semibold">
                <span className="text-slate-300">Total</span>
                <span className="font-mono text-red-300">{res.latencyChain.reduce((s, l) => s + l.delay_ns, 0)} ns</span>
              </div>
            </div>
          </ResultCard>
          <ResultCard title="Detector Suggestion" accent="amber">
            <p className="text-xs text-slate-300">{res.detectorSuggestion}</p>
          </ResultCard>
          <ResultCard title="Notes" accent="green">
            <ul className="space-y-1">{res.notes.map((n, i) => <li key={i} className="text-xs text-slate-300 flex gap-2"><span className="text-emerald-400 shrink-0">▸</span>{n}</li>)}</ul>
          </ResultCard>
        </div>
      )}
    </div>
  );
}
