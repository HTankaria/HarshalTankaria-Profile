import React from 'react';
import { useEV } from '../../store/useEVStore';
import { InputField, SelectField, ResultCard, MetricRow, RunButton, SectionHeader } from '../ui';

export default function DCDCConverter() {
  const { state, updateDCDCConfig: upd, runDCDCCalc } = useEV();
  const cfg = state.dcdcConfig;
  const res = state.dcdcResult;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Isolated DC-DC Converter"
        subtitle="LLC / CLLC resonant converter design — turns ratio, tank components, and switch selection."
      />

      {/* Resonant Tank Diagram */}
      <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
        <svg viewBox="0 0 580 90" className="w-full" style={{ maxHeight: 90 }}>
          <defs>
            <marker id="a2" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#475569"/>
            </marker>
          </defs>
          {/* DC Bus */}
          <rect x="2" y="25" width="60" height="40" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="1.5"/>
          <text x="32" y="47" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="600">DC BUS</text>
          <text x="32" y="57" textAnchor="middle" fill="#64748b" fontSize="7">{cfg.primaryVoltage_V}V</text>
          <line x1="62" y1="45" x2="82" y2="45" stroke="#475569" strokeWidth="1.5"/>
          {/* Primary H-Bridge */}
          <rect x="82" y="20" width="70" height="50" rx="6" fill="#1d3461" stroke="#3b82f6" strokeWidth="1.5"/>
          <text x="117" y="43" textAnchor="middle" fill="#93c5fd" fontSize="8" fontWeight="700">H-BRIDGE</text>
          <text x="117" y="54" textAnchor="middle" fill="#60a5fa" fontSize="7">SiC / GaN</text>
          <text x="117" y="64" textAnchor="middle" fill="#64748b" fontSize="6">{cfg.switchFrequency_kHz} kHz</text>
          <line x1="152" y1="45" x2="172" y2="45" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#a2)"/>
          {/* Resonant Tank */}
          <rect x="172" y="15" width="110" height="60" rx="6" fill="#1a1a3e" stroke="#7c3aed" strokeWidth="1.5"/>
          <text x="227" y="36" textAnchor="middle" fill="#c4b5fd" fontSize="8" fontWeight="700">RESONANT TANK</text>
          <text x="227" y="48" textAnchor="middle" fill="#a78bfa" fontSize="7">Lr — Cr — Lm</text>
          <text x="227" y="59" textAnchor="middle" fill="#64748b" fontSize="6">fr = {res ? res.resonantFrequency_kHz : '~'}kHz</text>
          <line x1="282" y1="45" x2="302" y2="45" stroke="#7c3aed" strokeWidth="1.5" markerEnd="url(#a2)"/>
          {/* Transformer */}
          <rect x="302" y="20" width="70" height="50" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="1.5"/>
          <text x="337" y="43" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="600">XFMR</text>
          <text x="337" y="54" textAnchor="middle" fill="#64748b" fontSize="7">n={res ? res.turnsRatio : '?'}</text>
          <line x1="372" y1="45" x2="392" y2="45" stroke="#475569" strokeWidth="1.5" markerEnd="url(#a2)"/>
          {/* SR Rectifier */}
          <rect x="392" y="20" width="70" height="50" rx="6" fill="#1d3461" stroke="#3b82f6" strokeWidth="1.5"/>
          <text x="427" y="43" textAnchor="middle" fill="#93c5fd" fontSize="8" fontWeight="700">SYNC RECT</text>
          <text x="427" y="54" textAnchor="middle" fill="#60a5fa" fontSize="7">SiC SR</text>
          <line x1="462" y1="45" x2="482" y2="45" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#a2)"/>
          {/* Output */}
          <rect x="482" y="25" width="80" height="40" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="1.5"/>
          <text x="522" y="43" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="600">OUTPUT</text>
          <text x="522" y="54" textAnchor="middle" fill="#64748b" fontSize="7">{cfg.outputVoltageNom_V}V</text>
        </svg>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField label="Converter Topology" value={cfg.topology}
          onChange={v => upd({ topology: v })}
          options={[
            { value: 'LLC', label: 'LLC Resonant (Unidirectional)' },
            { value: 'CLLC_BIDIR', label: 'CLLC Bidirectional (V2G)' },
            { value: 'PSFB', label: 'Phase-Shift Full-Bridge' },
            { value: 'DAB', label: 'Dual Active Bridge (DAB)' },
          ]}
        />
        <SelectField label="Switch Technology" value={cfg.switchTech}
          onChange={v => upd({ switchTech: v })}
          options={[
            { value: 'SiC_MOSFET', label: 'SiC MOSFET (recommended)' },
            { value: 'GaN_HEMT', label: 'GaN HEMT (< 100 kW)' },
            { value: 'Si_IGBT', label: 'Si IGBT (legacy)' },
          ]}
        />
        <InputField label="Primary (DC Bus)" value={cfg.primaryVoltage_V}
          onChange={v => upd({ primaryVoltage_V: parseFloat(v) || 800 })}
          unit="V" min={100} max={1200}
        />
        <InputField label="Output Voltage Nominal" value={cfg.outputVoltageNom_V}
          onChange={v => upd({ outputVoltageNom_V: parseFloat(v) || 400 })}
          unit="V" min={100} max={1000}
        />
        <InputField label="Output Voltage Min" value={cfg.outputVoltageMin_V}
          onChange={v => upd({ outputVoltageMin_V: parseFloat(v) || 200 })}
          unit="V" min={50} max={900}
        />
        <InputField label="Output Voltage Max" value={cfg.outputVoltageMax_V}
          onChange={v => upd({ outputVoltageMax_V: parseFloat(v) || 1000 })}
          unit="V" min={200} max={1200}
        />
        <InputField label="Output Power" value={cfg.outputPower_kW}
          onChange={v => upd({ outputPower_kW: parseFloat(v) || 50 })}
          unit="kW" min={1} max={1000}
        />
        <InputField label="Switch Frequency" value={cfg.switchFrequency_kHz}
          onChange={v => upd({ switchFrequency_kHz: parseFloat(v) || 100 })}
          unit="kHz" min={10} max={500}
        />
      </div>

      <RunButton onClick={runDCDCCalc} label="Design DC-DC Converter →" />

      {res && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ResultCard title="Resonant Tank" accent="purple">
              <MetricRow label="Turns Ratio n" value={res.turnsRatio} highlight />
              <MetricRow label="Resonant Frequency" value={res.resonantFrequency_kHz} unit="kHz" />
              <MetricRow label="Resonant Inductance Lr" value={res.resonantInductance_uH} unit="µH" />
              <MetricRow label="Resonant Capacitance Cr" value={res.resonantCapacitance_nF} unit="nF" />
              <MetricRow label="Magnetising Inductance Lm" value={res.magnetisingInductance_uH} unit="µH" />
              <MetricRow label="Quality Factor Q" value={res.qualityFactor} />
              <MetricRow label="Freq Operating Range" value={`${res.frequencyRange_kHz[0]}–${res.frequencyRange_kHz[1]}`} unit="kHz" />
            </ResultCard>
            <ResultCard title="Switches & Efficiency" accent="blue">
              <MetricRow label="Primary Switch Voltage" value={res.primarySwitchVoltage_V} unit="V" />
              <MetricRow label="Primary Switch Current" value={res.primarySwitchCurrent_A} unit="A" />
              <MetricRow label="Secondary Switch Voltage" value={res.secondarySwitchVoltage_V} unit="V" />
              <MetricRow label="Secondary Switch Current" value={res.secondarySwitchCurrent_A} unit="A" />
              <MetricRow label="Estimated Efficiency" value={res.estimatedEfficiency_pct} unit="%" highlight />
              <div className="pt-2 border-t border-slate-700 mt-2">
                <p className="text-xs text-slate-400 mb-0.5">Transformer Note</p>
                <p className="text-xs text-slate-300">{res.transformerTurnsNote}</p>
              </div>
            </ResultCard>
          </div>
          <ResultCard title="Switch Suggestions" accent="amber">
            <p className="text-xs text-slate-400 mb-1 font-medium">Primary</p>
            <p className="text-xs text-slate-300 mb-3">{res.primarySwitchSuggestion}</p>
            <p className="text-xs text-slate-400 mb-1 font-medium">Secondary (SR)</p>
            <p className="text-xs text-slate-300">{res.secondarySwitchSuggestion}</p>
          </ResultCard>
          <ResultCard title="Design Notes" accent="green">
            <ul className="space-y-1">
              {res.designNotes.map((n, i) => (
                <li key={i} className="text-xs text-slate-300 flex gap-2">
                  <span className="text-emerald-400 shrink-0">▸</span>{n}
                </li>
              ))}
            </ul>
          </ResultCard>
        </div>
      )}
    </div>
  );
}
