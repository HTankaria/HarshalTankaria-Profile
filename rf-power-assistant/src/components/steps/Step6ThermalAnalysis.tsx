import React from 'react';
import { Thermometer, Droplets, Wind, Flame } from 'lucide-react';
import { ResultCard } from '../ui/ResultCard';
import { Badge } from '../ui/Badge';
import { useStore } from '../../store/useStore';

const COOLING_ICONS = {
  natural:    <Wind size={16} />,
  forced_air: <Wind size={16} />,
  liquid:     <Droplets size={16} />,
};
const COOLING_LABELS = {
  natural:    'Natural Convection',
  forced_air: 'Forced Air (≥ 200 LFM)',
  liquid:     'Liquid Cooling (0.25 GPM, 25 °C in)',
};

export function Step6ThermalAnalysis() {
  const { state, runThermalAnalysis, setStep } = useStore();
  const { thermalResult: res, systemConfig, matchingResult, harmonicFilterResult } = state;
  const hasData = matchingResult && harmonicFilterResult;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-red-500/15 border border-red-500/30">
          <Thermometer size={20} className="text-red-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Thermal Analysis (ETCD-RF™)</h2>
          <p className="text-sm text-slate-400">
            ETCD-RF™ computes skin-effect-corrected RF power dissipation in each component and
            maps it to a thermal resistance network to predict operating temperatures.
          </p>
        </div>
      </div>

      {!hasData && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-300">
          Complete Steps 3 (Matching Network) and 5 (Harmonic Filter) before running thermal analysis.
        </div>
      )}

      {hasData && (
        <button
          onClick={runThermalAnalysis}
          className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-3 rounded-lg text-sm font-semibold transition-colors"
        >
          <Flame size={16} />
          Run ETCD-RF™ Thermal Analysis
        </button>
      )}

      {res && (
        <div className="flex flex-col gap-4">
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
            {[
              { label: 'Total Dissipation', val: `${res.totalDissipation.toFixed(1)} W`, color: res.totalDissipation > 50 ? 'text-red-400' : 'text-slate-200' },
              { label: 'Hotspot Temp', val: `${res.hotspotTemp.toFixed(0)} °C`, color: res.hotspotTemp > 100 ? 'text-red-400' : res.hotspotTemp > 75 ? 'text-yellow-400' : 'text-emerald-400' },
              { label: 'System Efficiency', val: `${(res.systemEfficiency * 100).toFixed(1)}%`, color: res.systemEfficiency > 0.97 ? 'text-emerald-400' : 'text-yellow-400' },
            ].map(m => (
              <div key={m.label} className="rounded-xl border border-slate-700 bg-slate-800/50 py-3 px-4">
                <div className="text-xs text-slate-500">{m.label}</div>
                <div className={`text-xl font-mono font-semibold mt-1 ${m.color}`}>{m.val}</div>
              </div>
            ))}
          </div>

          {/* Cooling recommendation */}
          <div className={`rounded-lg border p-3 flex items-center gap-3 ${
            res.coolingMethod === 'liquid'
              ? 'border-blue-500/30 bg-blue-500/10'
              : res.coolingMethod === 'forced_air'
              ? 'border-yellow-500/30 bg-yellow-500/10'
              : 'border-emerald-500/30 bg-emerald-500/10'
          }`}>
            <span className={
              res.coolingMethod === 'liquid' ? 'text-blue-400' :
              res.coolingMethod === 'forced_air' ? 'text-yellow-400' : 'text-emerald-400'
            }>
              {COOLING_ICONS[res.coolingMethod]}
            </span>
            <div>
              <div className="text-sm font-medium text-slate-200">
                Recommended: {COOLING_LABELS[res.coolingMethod]}
              </div>
              <div className="text-xs text-slate-400">
                Based on {res.totalDissipation.toFixed(1)} W total dissipation in matching + filter assembly
              </div>
            </div>
          </div>

          {/* Per-component thermal table */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-x-auto">
            <div className="px-3 py-2 border-b border-slate-700">
              <h4 className="text-xs font-semibold text-slate-400">Component Thermal Profile</h4>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700">
                  {['Component', 'P_diss', 'Rth', 'T_ambient', 'T_operating', 'T_max', 'Margin', 'Status'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-slate-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {res.components.map((c, i) => (
                  <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td className="px-3 py-2 text-slate-200">{c.name}</td>
                    <td className="px-3 py-2 font-mono text-slate-300">{c.powerDissipation.toFixed(2)} W</td>
                    <td className="px-3 py-2 font-mono text-slate-400">{c.thermalResistance} °C/W</td>
                    <td className="px-3 py-2 font-mono text-slate-400">{c.ambientTemp} °C</td>
                    <td className="px-3 py-2 font-mono text-slate-200">{c.operatingTemp.toFixed(1)} °C</td>
                    <td className="px-3 py-2 font-mono text-slate-400">{c.maxRatedTemp} °C</td>
                    <td className={`px-3 py-2 font-mono font-semibold ${
                      c.margin > 30 ? 'text-emerald-400' : c.margin > 10 ? 'text-yellow-400' : 'text-red-400'
                    }`}>{c.margin.toFixed(1)} °C</td>
                    <td className="px-3 py-2">
                      <Badge color={c.status === 'ok' ? 'green' : c.status === 'warning' ? 'yellow' : 'red'}>
                        {c.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ResultCard
            title="RF Chain Efficiency Summary"
            icon={<Thermometer size={16} />}
            accent="border-red-500/40"
            metrics={[
              { label: 'Generator Output', value: `${systemConfig.primaryPower} W` },
              { label: 'Matching Network η', value: `${(matchingResult!.efficiency * 100).toFixed(1)}%`, status: 'ok' },
              { label: 'Thermal Derating', value: `${((1 - res.systemEfficiency) * 100).toFixed(1)}%`, status: res.systemEfficiency > 0.97 ? 'ok' : 'warning' },
              { label: 'Net Power at Plasma', value: `${(systemConfig.primaryPower * matchingResult!.efficiency * res.systemEfficiency).toFixed(0)} W`, status: 'ok' },
            ]}
          />
        </div>
      )}

      <div className="flex justify-between">
        <button onClick={() => setStep(5)} className="text-slate-400 hover:text-slate-200 text-sm transition-colors">← Back</button>
        <button
          onClick={() => setStep(7)}
          disabled={!res}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Generate Feasibility Report →
        </button>
      </div>
    </div>
  );
}
