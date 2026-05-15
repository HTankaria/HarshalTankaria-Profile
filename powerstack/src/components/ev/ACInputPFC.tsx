import React from 'react';
import { useEV } from '../../store/useEVStore';
import { InputField, SelectField, ResultCard, MetricRow, RunButton, SectionHeader } from '../ui';

export default function ACInputPFC() {
  const { state, updatePFCConfig: upd, runPFCCalc } = useEV();
  const cfg = state.pfcConfig;
  const res = state.pfcResult;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="AC Input & Power Factor Correction"
        subtitle="Design the front-end PFC stage: topology, inductor, and switch selection."
      />

      {/* PFC Block Diagram */}
      <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
        <svg viewBox="0 0 560 80" className="w-full" style={{ maxHeight: 80 }}>
          {/* AC Grid */}
          <rect x="2" y="20" width="70" height="40" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="1.5"/>
          <text x="37" y="43" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="600">AC GRID</text>
          <text x="37" y="54" textAnchor="middle" fill="#64748b" fontSize="7">{cfg.acInputVoltage}V {cfg.acInputPhases}φ</text>
          {/* Arrow */}
          <line x1="72" y1="40" x2="95" y2="40" stroke="#475569" strokeWidth="1.5" markerEnd="url(#arr)"/>
          {/* EMI Filter */}
          <rect x="95" y="20" width="70" height="40" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="1.5"/>
          <text x="130" y="43" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="600">EMI</text>
          <text x="130" y="54" textAnchor="middle" fill="#64748b" fontSize="7">FILTER</text>
          <line x1="165" y1="40" x2="188" y2="40" stroke="#475569" strokeWidth="1.5" markerEnd="url(#arr)"/>
          {/* PFC Stage */}
          <rect x="188" y="14" width="100" height="52" rx="6" fill="#1d3461" stroke="#3b82f6" strokeWidth="1.5"/>
          <text x="238" y="37" textAnchor="middle" fill="#93c5fd" fontSize="9" fontWeight="700">PFC STAGE</text>
          <text x="238" y="49" textAnchor="middle" fill="#60a5fa" fontSize="7">
            {cfg.topology === 'bridgeless_totem_pole' ? 'Totem-Pole'
              : cfg.topology === 'vienna_3ph' ? 'Vienna 3φ'
              : 'Boost PFC'}
          </text>
          <text x="238" y="59" textAnchor="middle" fill="#64748b" fontSize="7">{cfg.switchFrequency_kHz} kHz</text>
          <line x1="288" y1="40" x2="311" y2="40" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#arr)"/>
          {/* DC Bus Cap */}
          <rect x="311" y="20" width="70" height="40" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="1.5"/>
          <text x="346" y="37" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="600">DC BUS</text>
          <text x="346" y="54" textAnchor="middle" fill="#64748b" fontSize="7">CAP</text>
          <line x1="381" y1="40" x2="404" y2="40" stroke="#475569" strokeWidth="1.5" markerEnd="url(#arr)"/>
          {/* DC Output */}
          <rect x="404" y="20" width="80" height="40" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="1.5"/>
          <text x="444" y="37" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="600">DC OUTPUT</text>
          <text x="444" y="54" textAnchor="middle" fill="#64748b" fontSize="7">{cfg.targetDCBus_V} V</text>
          <defs>
            <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#475569"/>
            </marker>
          </defs>
        </svg>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField label="PFC Topology" value={cfg.topology}
          onChange={v => upd({ topology: v })}
          options={[
            { value: 'boost_pfc', label: 'Boost PFC (Classic)' },
            { value: 'bridgeless_totem_pole', label: 'Bridgeless Totem-Pole' },
            { value: 'vienna_3ph', label: 'Vienna 3-Phase Rectifier' },
          ]}
          help="Totem-pole: best for 1-ph ≤ 50 kW; Vienna: ideal for 3-ph > 50 kW"
        />
        <InputField label="Target DC Bus" value={cfg.targetDCBus_V}
          onChange={v => upd({ targetDCBus_V: parseFloat(v) || 800 })}
          unit="V" min={300} max={1100}
        />
        <InputField label="Switch Frequency" value={cfg.switchFrequency_kHz}
          onChange={v => upd({ switchFrequency_kHz: parseFloat(v) || 100 })}
          unit="kHz" min={16} max={500}
        />
        <InputField label="Power Factor Target" value={cfg.powerFactor}
          onChange={v => upd({ powerFactor: parseFloat(v) || 0.99 })}
          min={0.8} max={1.0} step={0.01}
          help="0.99 typical for IEC 61000-3-2 Class A"
        />
        <InputField label="Total Power" value={cfg.totalPower_kW}
          onChange={v => upd({ totalPower_kW: parseFloat(v) || 50 })}
          unit="kW" min={1} max={1000}
        />
      </div>

      <RunButton onClick={runPFCCalc} label="Design PFC Stage →" />

      {res && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ResultCard title="PFC Design Results" accent="blue">
            <MetricRow label="Topology" value={res.topology} />
            <MetricRow label="DC Bus Voltage" value={res.dcBusVoltage_V} unit="V" highlight />
            <MetricRow label="Boost Inductance" value={res.boostInductance_uH} unit="µH" />
            <MetricRow label="Peak Switch Current" value={res.switchCurrentPeak_A} unit="A" />
            <MetricRow label="Input THD" value={res.inputCurrentTHD_pct} unit="%" />
            <MetricRow label="Input RMS Current" value={res.inputCurrentRms_A} unit="A" />
            <MetricRow label="PFC Efficiency" value={res.efficiency_pct} unit="%" highlight />
          </ResultCard>
          <ResultCard title="Filter & Switch" accent="purple">
            <MetricRow label="Filter Cap" value={res.filterCapacitance_uF} unit="µF" />
            <MetricRow label="Cap Voltage Rating" value={res.filterCapVoltageRating_V} unit="V" />
            <MetricRow label="Switch/Bridge Loss" value={res.bridgeOrSwitchLoss_W} unit="W" />
            <div className="pt-2 border-t border-slate-700 mt-2">
              <p className="text-xs text-slate-400 font-medium mb-1">Switch Suggestion</p>
              <p className="text-xs text-slate-300">{res.pfcSwitchSuggestion}</p>
            </div>
          </ResultCard>
        </div>
      )}
    </div>
  );
}
