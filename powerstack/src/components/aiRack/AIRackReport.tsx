import React from 'react';
import { Printer } from 'lucide-react';
import { useAIRack } from '../../store/useAIRackStore';
import { ResultCard, MetricRow, SectionHeader, ScoreGauge, RiskItem, Badge, RunButton } from '../ui';

export default function AIRackReport() {
  const { state, generateReport } = useAIRack();
  const res = state.report;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="AI Rack Power Design Report"
        subtitle="Full feasibility, BOM highlights, and OCP compliance summary."
      />

      {!res ? (
        <RunButton onClick={generateReport} label="Generate Full Report" />
      ) : (
        <>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex gap-8">
              <ScoreGauge score={res.feasibilityScore} label="Feasibility" />
              <div className="flex flex-col justify-center gap-2">
                <MetricRow label="IT Power" value={res.totalITPower_kW} unit="kW" highlight />
                <MetricRow label="Wall Power" value={res.wallPower_kW} unit="kW" />
                <MetricRow label="PUE" value={res.pue} highlight />
                <MetricRow label="Power Chain Efficiency" value={res.overallChainEfficiency_pct} unit="%" />
                <MetricRow label="Annual Energy Cost" value={`$${res.annualEnergyCost_USD.toLocaleString()}`} />
                <MetricRow label="Annual CO₂" value={res.annualCO2_tonnes} unit="tonnes/yr" />
              </div>
            </div>
            <button onClick={() => window.print()}
              className="hidden sm:flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white text-sm px-4 py-2 rounded-xl transition-colors">
              <Printer size={15} /> Print / PDF
            </button>
          </div>

          <ResultCard title="OCP Compliance" accent={res.ocp_compliance ? 'green' : 'red'}>
            <div className="flex items-center gap-3">
              <span className={`text-2xl ${res.ocp_compliance ? 'text-emerald-400' : 'text-red-400'}`}>
                {res.ocp_compliance ? '✓' : '✗'}
              </span>
              <span className="text-sm text-slate-300">
                {res.ocp_compliance
                  ? 'Design meets OCP Open Rack V3 power shelf specifications'
                  : 'OCP compliance issues detected — review bus voltage and PSU spec'}
              </span>
            </div>
          </ResultCard>

          <ResultCard title="Design Notes" accent="blue">
            <ul className="space-y-1">
              {res.designNotes.map((n, i) => (
                <li key={i} className="text-xs text-slate-300 flex gap-2">
                  <span className="text-blue-400 shrink-0">▸</span>{n}
                </li>
              ))}
            </ul>
          </ResultCard>

          <ResultCard title="Bill of Materials Highlights" accent="purple">
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
                      <td className="py-2 text-right font-mono text-violet-300">${b.estCost.toLocaleString()}</td>
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

          <div className="text-right">
            <button onClick={() => window.print()}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm px-5 py-3 rounded-xl transition-colors ml-auto">
              <Printer size={15} /> Export to PDF
            </button>
          </div>
          <p className="text-xs text-slate-600 text-center">Generated: {new Date(res.generatedAt).toLocaleString()}</p>
        </>
      )}
    </div>
  );
}
