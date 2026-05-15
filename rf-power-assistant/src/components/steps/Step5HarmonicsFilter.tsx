import React from 'react';
import { Filter, CheckCircle, XCircle } from 'lucide-react';
import { ResultCard } from '../ui/ResultCard';
import { Badge } from '../ui/Badge';
import { useStore } from '../../store/useStore';
import { formatValue, formatFreq } from '../../calculations/rfCalc';

export function Step5HarmonicsFilter() {
  const { state, runHarmonicFilter, setStep } = useStore();
  const { harmonicFilterResult: res, systemConfig } = state;
  const f = systemConfig.primaryFrequency;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-orange-500/15 border border-orange-500/30">
          <Filter size={20} className="text-orange-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Harmonic Filter Design</h2>
          <p className="text-sm text-slate-400">
            MHCN™ co-optimises a low-pass filter to suppress harmonic emissions to FCC Part 18
            and SEMI E33 levels (&lt; −40 dBc) while minimising insertion loss at the fundamental.
          </p>
        </div>
      </div>

      {/* Harmonic power levels (pre-filter) */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
        <h4 className="text-xs font-semibold text-slate-400 mb-3">Typical Harmonic Power Levels (before filter)</h4>
        <div className="grid grid-cols-4 gap-2 text-xs text-center">
          {[
            { label: 'Fundamental', freq: f, pct: '100%', dBc: '0' },
            { label: '2nd harmonic', freq: 2*f, pct: '5–20%', dBc: '−13 to −7' },
            { label: '3rd harmonic', freq: 3*f, pct: '1–5%', dBc: '−20 to −13' },
            { label: '5th harmonic', freq: 5*f, pct: '<1%', dBc: '<−20' },
          ].map(h => (
            <div key={h.label} className="rounded-lg bg-slate-900/60 border border-slate-700 p-2">
              <div className="text-slate-400 mb-1">{h.label}</div>
              <div className="font-mono text-slate-300">{formatFreq(h.freq)}</div>
              <div className="text-yellow-400 font-mono">{h.dBc} dBc</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-2">FCC Part 18 limit: −40 dBc at all harmonics</p>
      </div>

      <button
        onClick={runHarmonicFilter}
        className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-3 rounded-lg text-sm font-semibold transition-colors"
      >
        <Filter size={16} />
        Design MHCN™ Harmonic Filter
      </button>

      {res && (
        <div className="flex flex-col gap-4">
          {/* Compliance banner */}
          <div className={`rounded-lg border p-3 flex items-center gap-3 ${
            res.compliant
              ? 'border-emerald-500/30 bg-emerald-500/10'
              : 'border-red-500/30 bg-red-500/10'
          }`}>
            {res.compliant
              ? <CheckCircle size={18} className="text-emerald-400 flex-shrink-0" />
              : <XCircle size={18} className="text-red-400 flex-shrink-0" />}
            <div>
              <div className={`text-sm font-medium ${res.compliant ? 'text-emerald-300' : 'text-red-300'}`}>
                {res.compliant ? 'FCC Part 18 / SEMI E33 Compliant' : 'Compliance Not Met — increase filter order'}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Required: −{res.requiredAttenuation} dBc at all harmonics |
                Achieved at 2f: −{res.attenuation2f.toFixed(1)} dBc
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ResultCard
              title="Filter Specification"
              icon={<Filter size={16} />}
              accent="border-orange-500/40"
              metrics={[
                { label: 'Topology', value: 'Butterworth LP' },
                { label: 'Order', value: String(res.order) },
                { label: 'Corner Frequency', value: formatFreq(res.cornerFrequency) },
                { label: 'Insertion Loss @ f₀', value: `${res.insertionLoss.toFixed(3)} dB`, status: 'ok' },
              ]}
            />
            <ResultCard
              title="Harmonic Attenuation"
              accent="border-red-500/30"
              metrics={[
                { label: 'At 2f₀', value: `${res.attenuation2f.toFixed(1)} dB`, status: res.attenuation2f >= 40 ? 'ok' : 'critical' },
                { label: 'At 3f₀', value: `${res.attenuation3f.toFixed(1)} dB`, status: res.attenuation3f >= 40 ? 'ok' : 'warning' },
                { label: 'At 5f₀', value: `${res.attenuation5f.toFixed(1)} dB`, status: 'ok' },
                { label: 'FCC Limit', value: `${res.requiredAttenuation} dBc` },
              ]}
            />
          </div>

          {/* Component table */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-x-auto">
            <div className="px-3 py-2 border-b border-slate-700">
              <h4 className="text-xs font-semibold text-slate-400">Filter Component Values</h4>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700">
                  {['ID', 'Type', 'Placement', 'Value', 'Reactance @ f₀', 'V-Rating', 'Part Suggestion'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-slate-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {res.components.map(c => (
                  <tr key={c.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td className="px-3 py-2 font-mono text-slate-200">{c.id}</td>
                    <td className="px-3 py-2"><Badge color={c.type === 'L' ? 'purple' : 'yellow'}>{c.type}</Badge></td>
                    <td className="px-3 py-2 text-slate-400">{c.placement}</td>
                    <td className="px-3 py-2 font-mono text-slate-200">{formatValue(c.value, c.type === 'L' ? 'H' : 'F')}</td>
                    <td className="px-3 py-2 font-mono text-slate-400">{c.reactance.toFixed(1)} Ω</td>
                    <td className="px-3 py-2 font-mono text-slate-300">{c.voltageRating} V</td>
                    <td className="px-3 py-2 text-slate-400 max-w-[200px] truncate">{c.partSuggestion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <button onClick={() => setStep(4)} className="text-slate-400 hover:text-slate-200 text-sm transition-colors">← Back</button>
        <button
          onClick={() => setStep(6)}
          disabled={!res}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Next: Thermal Analysis →
        </button>
      </div>
    </div>
  );
}
