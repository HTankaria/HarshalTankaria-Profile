import React from 'react';
import { useStore } from '../../store/useStore';
import { ResultCard, MetricRow, RunButton, SectionHeader } from '../ui';

export default function Step6() {
  const { state, runThermalAnalysis, generateReport } = useStore();
  const res = state.thermalResult;

  return (
    <div className="space-y-6">
      <SectionHeader title="Thermal Design — ETCD-RF™" subtitle="Skin-effect corrected RF thermal model for matching network and filter components." />
      <RunButton onClick={runThermalAnalysis} label="Run Thermal Analysis" />
      {res && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ResultCard title="Component Temperatures" accent={res.matchNetworkTemp_C > 100 ? 'red' : 'green'}>
              <MetricRow label="Ambient Temp" value={res.ambientTemp_C} unit="°C" />
              <MetricRow label="Match Network Temp" value={res.matchNetworkTemp_C.toFixed(1)} unit="°C" highlight={res.matchNetworkTemp_C > 80} />
              <MetricRow label="Filter Temp" value={res.filterTemp_C.toFixed(1)} unit="°C" />
              <MetricRow label="Total RF Loss" value={res.totalPowerLoss_W.toFixed(2)} unit="W" />
            </ResultCard>
            <ResultCard title="RF Skin Effect" accent="blue">
              <MetricRow label="Skin Depth" value={res.skinDepth_um.toFixed(2)} unit="µm" highlight />
              <MetricRow label="RF Current Density" value={res.rfCurrentDensity_Amm2.toFixed(2)} unit="A/mm²" />
              <MetricRow label="Heatsink Required" value={res.heatsinkRequired ? 'Yes' : 'No'} highlight={res.heatsinkRequired} />
              {res.heatsinkRequired && <MetricRow label="Required Rth" value={`< ${res.heatsinkRth.toFixed(1)}`} unit="K/W" />}
            </ResultCard>
          </div>
          <ResultCard title="Cooling Recommendation" accent="amber">
            <p className="text-xs text-slate-300">{res.coolingRecommendation}</p>
          </ResultCard>
          <ResultCard title="ETCD-RF™ Notes" accent="purple">
            <ul className="space-y-1">{res.notes.map((n, i) => <li key={i} className="text-xs text-slate-300 flex gap-2"><span className="text-purple-400 shrink-0">▸</span>{n}</li>)}</ul>
          </ResultCard>
          {res.matchNetworkTemp_C > 125 && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-300">
              ⚠ Component temperature {res.matchNetworkTemp_C.toFixed(0)}°C exceeds 125°C limit — mandatory heatsink and forced cooling required.
            </div>
          )}
          <RunButton onClick={generateReport} label="Generate Feasibility Report →" />
        </div>
      )}
    </div>
  );
}
