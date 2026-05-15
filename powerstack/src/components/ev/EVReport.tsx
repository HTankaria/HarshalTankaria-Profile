import React from 'react';
import { Printer } from 'lucide-react';
import { useEV } from '../../store/useEVStore';
import { ResultCard, MetricRow, SectionHeader, ScoreGauge, RiskItem, Badge, RunButton } from '../ui';

export default function EVReport() {
  const { state, generateReport } = useEV();
  const res = state.report;
  const std = state.standardResult;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="EV Charger Design Report"
        subtitle="Full system feasibility, BOM highlights, and compliance summary."
      />

      {!res ? (
        <RunButton onClick={generateReport} label="Generate Full Report" />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="flex gap-8">
              <ScoreGauge score={res.feasibilityScore} label="Feasibility" />
              <div className="flex flex-col justify-center gap-2">
                <MetricRow label="Overall Efficiency" value={res.overallEfficiency_pct} unit="%" highlight />
                <MetricRow label="Total Power Loss" value={res.totalPowerLoss_kW} unit="kW" />
                <MetricRow label="Annual CO₂ Saved" value={res.co2Saved_kgPerYear} unit="kg/yr" />
                <MetricRow label="Annual Op. Cost" value={`$${res.costEstimate_USD.toLocaleString()}`} />
              </div>
            </div>
            <button onClick={() => window.print()}
              className="hidden sm:flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white text-sm px-4 py-2 rounded-xl transition-colors">
              <Printer size={15} /> Print / PDF
            </button>
          </div>

          {std?.arch800vNotes && std.arch800vNotes.length > 0 && res.arch800vAdvantages.length > 0 && (
            <ResultCard title="800 V Architecture Advantages" accent="green">
              <ul className="space-y-1">
                {res.arch800vAdvantages.map((a, i) => (
                  <li key={i} className="text-xs text-emerald-300 flex gap-2"><span className="text-emerald-500 shrink-0">▸</span>{a}</li>
                ))}
              </ul>
            </ResultCard>
          )}

          <ResultCard title="Bill of Materials Highlights" accent="blue">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left text-slate-400 py-2 pr-4">Component</th>
                    <th className="text-left text-slate-400 py-2 pr-4">Specification</th>
                    <th className="text-right text-slate-400 py-2">Est. Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {res.bomHighlights.map((b, i) => (
                    <tr key={i} className="border-b border-slate-700/40">
                      <td className="py-2 pr-4 text-slate-300">{b.item}</td>
                      <td className="py-2 pr-4 text-slate-400">{b.spec}</td>
                      <td className="py-2 text-right font-mono text-blue-300">${b.cost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ResultCard>

          <ResultCard title="Risk Assessment" accent="red">
            <div className="space-y-2">
              {res.risks.map((r, i) => <RiskItem key={i} severity={r.severity} text={r.text} />)}
            </div>
          </ResultCard>

          <ResultCard title="Compliance Checklist" accent="amber">
            <div className="flex flex-wrap gap-2">
              {res.complianceList.map((c, i) => <Badge key={i} label={c} variant="warning" />)}
            </div>
          </ResultCard>

          <div className="text-right">
            <button onClick={() => window.print()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm px-5 py-3 rounded-xl transition-colors ml-auto">
              <Printer size={15} /> Export to PDF
            </button>
          </div>
          <p className="text-xs text-slate-600 text-center">Generated: {new Date(res.generatedAt).toLocaleString()}</p>
        </>
      )}
    </div>
  );
}
