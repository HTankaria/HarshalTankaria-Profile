import React from 'react';
import { Printer } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { ResultCard, MetricRow, SectionHeader, ScoreGauge, RiskItem, Badge, RunButton } from '../ui';

export default function Step7() {
  const { state, generateReport } = useStore();
  const res = state.report;

  return (
    <div className="space-y-6">
      <SectionHeader title="Feasibility Report" subtitle="Full system assessment including AITO™ score, BOM, risks, and patentability notes." />
      {!res ? (
        <RunButton onClick={generateReport} label="Generate Report" />
      ) : (
        <>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex gap-8 flex-wrap">
              <ScoreGauge score={res.feasibilityScore} label="Feasibility" />
              <ScoreGauge score={res.aitoScore} label="AITO™ Score" />
              <div className="flex flex-col justify-center gap-2">
                <MetricRow label="Overall Efficiency" value={res.overallEfficiency_pct.toFixed(1)} unit="%" highlight />
                <MetricRow label="Power to Plasma" value={res.powerToPlasma_W} unit="W" highlight />
                <MetricRow label="Feasible" value={res.feasible ? '✓ Yes' : '✗ Review risks'} />
              </div>
            </div>
            <button onClick={() => window.print()} className="hidden sm:flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white text-sm px-4 py-2 rounded-xl transition-colors no-print">
              <Printer size={15} /> Print / PDF
            </button>
          </div>

          <ResultCard title="Bill of Materials" accent="blue">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-slate-700"><th className="text-left text-slate-400 py-2 pr-3">Component</th><th className="text-left text-slate-400 py-2 pr-3">Value</th><th className="text-left text-slate-400 py-2 pr-3">Rating</th><th className="text-left text-slate-400 py-2 pr-3">Part</th><th className="text-right text-slate-400 py-2">Cost</th></tr></thead>
                <tbody>
                  {res.bom.map((b, i) => (
                    <tr key={i} className="border-b border-slate-700/40">
                      <td className="py-2 pr-3 text-slate-300">{b.component}</td>
                      <td className="py-2 pr-3 font-mono text-emerald-300">{b.value}</td>
                      <td className="py-2 pr-3 text-slate-400">{b.rating}</td>
                      <td className="py-2 pr-3 text-slate-500 text-xs">{b.partSuggestion}</td>
                      <td className="py-2 text-right font-mono text-slate-300">${b.estimatedCost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ResultCard>

          <ResultCard title="Risk Assessment" accent="red">
            <div className="space-y-2">{res.risks.map((r, i) => <RiskItem key={i} severity={r.severity} text={`[${r.category}] ${r.description} — ${r.mitigation}`} />)}</div>
          </ResultCard>

          <ResultCard title="Patentability Notes — Novel Methods" accent="purple">
            <ul className="space-y-2">{res.patentabilityNotes.map((n, i) => <li key={i} className="text-xs text-purple-300 flex gap-2"><span className="shrink-0 text-purple-500">★</span>{n}</li>)}</ul>
          </ResultCard>

          <ResultCard title="Compliance" accent="amber">
            <div className="flex flex-wrap gap-2">{res.complianceNotes.map((c, i) => <Badge key={i} label={c} variant="warning" />)}</div>
          </ResultCard>

          <div className="text-right no-print">
            <button onClick={() => window.print()} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-5 py-3 rounded-xl transition-colors ml-auto">
              <Printer size={15} /> Export to PDF
            </button>
          </div>
          <p className="text-xs text-slate-600 text-center">Generated: {new Date(res.generatedAt).toLocaleString()}</p>
        </>
      )}
    </div>
  );
}
