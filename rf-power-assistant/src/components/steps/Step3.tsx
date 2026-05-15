import React from 'react';
import { useStore } from '../../store/useStore';
import { ResultCard, MetricRow, RunButton, SectionHeader, ScoreGauge } from '../ui';
import SchematicSVG from '../SchematicSVG';

export default function Step3() {
  const { state, runTxLineAnalysis } = useStore();
  const res = state.matchingResult;

  return (
    <div className="space-y-6">
      <SectionHeader title="Matching Network Design" subtitle="AITO™-optimised network components and RF performance metrics." />
      {!res ? <p className="text-slate-400 text-sm">Complete Step 2 first.</p> : (
        <>
          <SchematicSVG components={res.components} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ResultCard title="RF Performance" accent="green">
              <MetricRow label="VSWR" value={res.vswr.toFixed(2)} highlight={res.vswr < 1.5} />
              <MetricRow label="Return Loss" value={res.returnLoss_dB.toFixed(1)} unit="dB" highlight />
              <MetricRow label="Mismatch Loss" value={res.mismatchLoss_dB.toFixed(3)} unit="dB" />
              <MetricRow label="Network Efficiency" value={res.networkEfficiency_pct.toFixed(1)} unit="%" highlight />
            </ResultCard>
            <div className="flex flex-col items-center justify-center">
              <ScoreGauge score={res.aitoScore} label="AITO™ Score" />
              <p className="text-xs text-slate-400 text-center mt-2 max-w-xs">
                {res.aitoScore >= 75 ? 'Excellent multi-state coverage' : res.aitoScore >= 50 ? 'Acceptable — consider Pi/T for better Q' : 'Poor — try different topology or Q target'}
              </p>
            </div>
          </div>
          <ResultCard title="Component Values" accent="blue">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-slate-700"><th className="text-left text-slate-400 py-2 pr-4">Component</th><th className="text-left text-slate-400 py-2 pr-4">Value</th><th className="text-left text-slate-400 py-2 pr-4">Irms</th><th className="text-left text-slate-400 py-2">Vrms</th></tr></thead>
                <tbody>
                  {res.components.map((c, i) => (
                    <tr key={i} className="border-b border-slate-700/40">
                      <td className="py-2 pr-4 text-slate-300">{c.label}</td>
                      <td className="py-2 pr-4 font-mono text-emerald-300">{c.value.toFixed(1)} {c.unit}</td>
                      <td className="py-2 pr-4 text-slate-400">{c.currentRMS_A.toFixed(2)} A</td>
                      <td className="py-2 text-slate-400">{c.voltageRMS_V.toFixed(1)} V</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ResultCard>
          {res.designNotes.length > 0 && (
            <ResultCard title="Design Notes" accent="amber">
              <ul className="space-y-1">{res.designNotes.map((n, i) => <li key={i} className="text-xs text-slate-300 flex gap-2"><span className="text-amber-400 shrink-0">▸</span>{n}</li>)}</ul>
            </ResultCard>
          )}
          <RunButton onClick={runTxLineAnalysis} label="Analyse Transmission Line →" />
        </>
      )}
    </div>
  );
}
