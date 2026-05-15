import React from 'react';
import { useStore } from '../../store/useStore';
import { ResultCard, MetricRow, RunButton, SectionHeader, Badge } from '../ui';

export default function Step5() {
  const { state, runHarmonicFilter, runThermalAnalysis } = useStore();
  const res = state.filterResult;

  return (
    <div className="space-y-6">
      <SectionHeader title="Harmonic Filter Design — MHCN™" subtitle="7th-order Butterworth low-pass filter. Attenuates 2nd and 3rd harmonics to meet FCC Part 18 / SEMI RF-001." />
      <RunButton onClick={runHarmonicFilter} label="Design Harmonic Filter" />
      {res && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ResultCard title="Filter Performance" accent="green">
              <MetricRow label="Filter Order" value={`${res.order}th-order Butterworth`} />
              <MetricRow label="Cutoff Frequency" value={res.cutoffFreq_MHz.toFixed(3)} unit="MHz" highlight />
              <MetricRow label="2nd Harmonic Atten." value={res.attenuation2f_dB} unit="dB" highlight />
              <MetricRow label="3rd Harmonic Atten." value={res.attenuation3f_dB} unit="dB" />
              <MetricRow label="Insertion Loss" value={res.insertionLoss_dB.toFixed(2)} unit="dB" />
            </ResultCard>
            <ResultCard title="Component Values" accent="blue">
              <div className="space-y-1">
                {res.components.map((c, i) => (
                  <div key={i} className="flex justify-between text-xs py-1 border-b border-slate-700/40 last:border-0">
                    <span className="text-slate-400">{c.label} ({c.type})</span>
                    <span className="font-mono text-emerald-300">{c.value.toFixed(1)} {c.unit}</span>
                  </div>
                ))}
              </div>
            </ResultCard>
          </div>
          <ResultCard title="Compliance" accent="amber">
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge label="FCC Part 18" variant="success" />
              <Badge label="SEMI RF-001" variant="success" />
              <Badge label={`2f: −${res.attenuation2f_dB} dB`} variant="info" />
              <Badge label={`3f: −${res.attenuation3f_dB} dB`} variant="info" />
            </div>
            <ul className="space-y-1">{res.notes.map((n, i) => <li key={i} className="text-xs text-slate-300 flex gap-2"><span className="text-emerald-400 shrink-0">▸</span>{n}</li>)}</ul>
          </ResultCard>
          <RunButton onClick={runThermalAnalysis} label="Analyse Thermal Design →" />
        </div>
      )}
    </div>
  );
}
