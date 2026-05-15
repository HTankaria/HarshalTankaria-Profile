import React from 'react';
import { FileText, Download, CheckCircle, XCircle, AlertTriangle, Shield, Lightbulb } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { useStore } from '../../store/useStore';
import { formatValue, formatFreq } from '../../calculations/rfCalc';

const SEVERITY_CONFIG = {
  low:    { color: 'text-blue-400',    bg: 'bg-blue-500/10  border-blue-500/30',    icon: <Shield size={14} /> },
  medium: { color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/30',  icon: <AlertTriangle size={14} /> },
  high:   { color: 'text-red-400',     bg: 'bg-red-500/10   border-red-500/30',      icon: <XCircle size={14} /> },
};

export function Step7FeasibilityReport() {
  const { state, generateReport, setStep } = useStore();
  const { feasibilityReport: report, systemConfig, matchingResult, transmissionLineResult, harmonicFilterResult, thermalResult } = state;

  const allReady = matchingResult && transmissionLineResult && harmonicFilterResult && thermalResult;

  const handlePrint = () => window.print();

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-blue-500/15 border border-blue-500/30">
          <FileText size={20} className="text-blue-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-100">Feasibility Report</h2>
          <p className="text-sm text-slate-400">
            Comprehensive design summary including BOM, risk assessment, and patentability analysis of the AITO™ methodology.
          </p>
        </div>
        {report && (
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg text-sm transition-colors print:hidden"
          >
            <Download size={14} /> Export PDF
          </button>
        )}
      </div>

      {!allReady && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-300">
          Complete all previous steps (1–6) before generating the report. Missing:{' '}
          {!matchingResult && 'Matching Network, '}
          {!transmissionLineResult && 'Transmission Line, '}
          {!harmonicFilterResult && 'Harmonic Filter, '}
          {!thermalResult && 'Thermal Analysis'}
        </div>
      )}

      {allReady && (
        <button
          onClick={generateReport}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-lg text-sm font-semibold transition-colors print:hidden"
        >
          <FileText size={16} />
          Generate Full Feasibility Report
        </button>
      )}

      {/* ─── Printable Report Section ─────────────────────────────────────── */}
      {report && (
        <div id="report-content" className="flex flex-col gap-6 print:gap-4">

          {/* Cover */}
          <div className="rounded-xl border border-blue-500/30 bg-slate-800/60 p-6 print:p-4">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="text-xs text-blue-400 font-semibold mb-1 uppercase tracking-widest">RF Power Delivery System Design</div>
                <h1 className="text-2xl font-bold text-slate-100 mb-1">Feasibility Report</h1>
                <div className="text-sm text-slate-400">
                  {systemConfig.toolType.replace('_', ' ')} · {formatFreq(systemConfig.primaryFrequency)} · {systemConfig.primaryPower} W
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Generated: {new Date(report.generatedAt).toLocaleString()}
                </div>
              </div>
              <div className="text-center">
                <div className={`text-4xl font-bold font-mono ${
                  report.feasibilityScore >= 80 ? 'text-emerald-400' :
                  report.feasibilityScore >= 60 ? 'text-yellow-400' : 'text-red-400'
                }`}>{report.feasibilityScore}</div>
                <div className="text-xs text-slate-500">/ 100</div>
                <div className={`text-xs font-semibold mt-1 ${report.feasible ? 'text-emerald-400' : 'text-red-400'}`}>
                  {report.feasible ? '✓ FEASIBLE' : '✗ REVIEW REQUIRED'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-700">
              {[
                { label: 'Overall Efficiency', val: `${(report.overallEfficiency * 100).toFixed(1)}%` },
                { label: 'Power at Plasma', val: `${report.totalPowerDelivered.toFixed(0)} W` },
                { label: 'AITO™ Score', val: `${matchingResult!.aitoScore}/100` },
              ].map(m => (
                <div key={m.label} className="text-center">
                  <div className="text-xs text-slate-500">{m.label}</div>
                  <div className="text-lg font-mono font-semibold text-slate-200">{m.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* AITO™ Summary */}
          <section className="rounded-xl border border-blue-500/20 bg-slate-800/40 p-4">
            <h3 className="text-sm font-semibold text-blue-300 mb-2 flex items-center gap-2">
              ⚡ AITO™ Design Summary
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">{report.aitoSummary}</p>
          </section>

          {/* Design Parameters */}
          <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Design Parameters</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {[
                { k: 'Tool Type', v: systemConfig.toolType.replace(/_/g, ' ') },
                { k: 'Frequency', v: formatFreq(systemConfig.primaryFrequency) },
                { k: 'Power Level', v: `${systemConfig.primaryPower} W` },
                { k: 'Duty Cycle', v: `${(systemConfig.dutyCycle * 100).toFixed(0)}%` },
                { k: 'Plasma R', v: `${state.plasmaLoad.effectiveR.toFixed(2)} Ω` },
                { k: 'Plasma X', v: `${state.plasmaLoad.effectiveX.toFixed(1)} Ω` },
                { k: 'Network Topology', v: matchingResult!.topology.replace('_', ' ') },
                { k: 'Design Q', v: matchingResult!.designQ.toFixed(1) },
                { k: 'Matching η', v: `${(matchingResult!.efficiency * 100).toFixed(1)}%` },
                { k: 'Bandwidth', v: formatFreq(matchingResult!.bandwidth3dB) },
                { k: 'Cable VSWR', v: `${transmissionLineResult!.inputVSWR.toFixed(2)}:1` },
                { k: 'Filter Order', v: `${harmonicFilterResult!.order} (Butterworth)` },
                { k: 'Attenuation @ 2f', v: `${harmonicFilterResult!.attenuation2f.toFixed(1)} dB` },
                { k: 'Hotspot Temp', v: `${thermalResult!.hotspotTemp.toFixed(1)} °C` },
                { k: 'Cooling', v: thermalResult!.coolingMethod.replace('_', ' ') },
                { k: 'Worst VSWR', v: `${matchingResult!.worstCaseVSWR.toFixed(1)}:1` },
              ].map(p => (
                <div key={p.k} className="flex flex-col">
                  <span className="text-slate-500">{p.k}</span>
                  <span className="font-mono text-slate-200">{p.v}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Risk Assessment */}
          <section>
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <AlertTriangle size={14} className="text-yellow-400" /> Risk Assessment ({report.risks.length} items)
            </h3>
            {report.risks.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                <CheckCircle size={16} /> No significant risks identified.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {report.risks.map((r, i) => {
                  const cfg = SEVERITY_CONFIG[r.severity];
                  return (
                    <div key={i} className={`rounded-lg border ${cfg.bg} p-3`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cfg.color}>{cfg.icon}</span>
                        <Badge color={r.severity === 'high' ? 'red' : r.severity === 'medium' ? 'yellow' : 'blue'}>
                          {r.severity.toUpperCase()}
                        </Badge>
                        <Badge color="slate">{r.category}</Badge>
                      </div>
                      <p className="text-sm text-slate-300 mb-1">{r.description}</p>
                      <p className="text-xs text-slate-400"><strong className="text-slate-300">Mitigation:</strong> {r.mitigation}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Recommendations */}
          <section>
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Lightbulb size={14} className="text-yellow-400" /> Recommendations
            </h3>
            <ul className="flex flex-col gap-2">
              {report.recommendations.map((r, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-300">
                  <span className="text-blue-400 flex-shrink-0">•</span> {r}
                </li>
              ))}
            </ul>
          </section>

          {/* BOM */}
          <section>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Bill of Materials</h3>
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700">
                    {['Qty', 'Part Description', 'Value', 'Specification', 'Est. Cost (USD)'].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-slate-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.bomList.map((b, i) => (
                    <tr key={i} className="border-b border-slate-700/50">
                      <td className="px-3 py-2 text-slate-300 text-center">{b.qty}</td>
                      <td className="px-3 py-2 text-slate-200">{b.partDescription}</td>
                      <td className="px-3 py-2 font-mono text-slate-300">{b.value}</td>
                      <td className="px-3 py-2 text-slate-400">{b.specification}</td>
                      <td className="px-3 py-2 font-mono text-slate-300">${b.estimatedCost.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-slate-600 font-semibold">
                    <td colSpan={4} className="px-3 py-2 text-slate-300 text-right">Total Estimated BOM Cost:</td>
                    <td className="px-3 py-2 font-mono text-emerald-400">
                      ${report.bomList.reduce((a, b) => a + b.qty * b.estimatedCost, 0).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Patentability Notes */}
          <section className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4">
            <h3 className="text-sm font-semibold text-purple-300 mb-3 flex items-center gap-2">
              <Shield size={14} /> Novel & Patentable Design Aspects
            </h3>
            <div className="flex flex-col gap-4">
              {report.patentabilityNotes.map((n, i) => (
                <div key={i} className="border-l-2 border-purple-500/40 pl-3">
                  <div className="text-sm font-semibold text-purple-200 mb-1">{n.aspect}</div>
                  <p className="text-xs text-slate-300 mb-1"><strong className="text-slate-400">Novelty:</strong> {n.novelty}</p>
                  <p className="text-xs text-slate-400"><strong className="text-slate-500">vs. Prior Art:</strong> {n.priorArtDifferentiator}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 p-2 rounded-lg bg-slate-800/50 text-xs text-slate-500 italic">
              These aspects represent novel methods and workflows. Consult a registered patent attorney
              for formal patentability assessment and filing strategy. This report documents invention
              disclosure details for prior art dating.
            </div>
          </section>

          {/* Footer */}
          <div className="text-xs text-slate-600 text-center py-2 border-t border-slate-800">
            RF Power Design Assistant · AITO™ / PSTAW™ / MHCN™ / ETCD-RF™ Methodology ·
            Report generated {new Date(report.generatedAt).toLocaleString()}
          </div>
        </div>
      )}

      <div className="flex justify-between print:hidden">
        <button onClick={() => setStep(6)} className="text-slate-400 hover:text-slate-200 text-sm transition-colors">← Back</button>
        {report && (
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Download size={14} /> Save as PDF
          </button>
        )}
      </div>
    </div>
  );
}
