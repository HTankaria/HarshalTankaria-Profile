import React from 'react';
import { useAIRack } from '../../store/useAIRackStore';
import { InputField, SelectField, ResultCard, MetricRow, RunButton, SectionHeader } from '../ui';

export default function Bus48V() {
  const { state, updateBusConfig: upd, runBusCalc } = useAIRack();
  const cfg = state.busConfig;
  const res = state.busResult;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="48 V OCP Power Bus Design"
        subtitle="Size the bus bars, bulk capacitors, and PSU selection for OCP Open Rack V3."
      />

      {/* Bus topology diagram */}
      <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
        <svg viewBox="0 0 580 110" className="w-full" style={{ maxHeight: 110 }}>
          <defs>
            <marker id="ab" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#7c3aed"/>
            </marker>
          </defs>
          {/* AC Input */}
          <rect x="2" y="35" width="65" height="40" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="1.5"/>
          <text x="34" y="57" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="600">AC INPUT</text>
          <text x="34" y="67" textAnchor="middle" fill="#64748b" fontSize="6">{cfg.acInputVoltage_V}V 3φ</text>
          <line x1="67" y1="55" x2="90" y2="55" stroke="#475569" strokeWidth="1.5"/>
          {/* PSU Array */}
          <rect x="90" y="20" width="90" height="70" rx="6" fill="#1d2461" stroke="#7c3aed" strokeWidth="1.5"/>
          <text x="135" y="45" textAnchor="middle" fill="#c4b5fd" fontSize="8" fontWeight="700">OCP PSU</text>
          <text x="135" y="56" textAnchor="middle" fill="#a78bfa" fontSize="7">× {cfg.psusInParallel}</text>
          <text x="135" y="67" textAnchor="middle" fill="#64748b" fontSize="6">{cfg.psuTopology}</text>
          <text x="135" y="78" textAnchor="middle" fill="#64748b" fontSize="6">48V shelf</text>
          <line x1="180" y1="55" x2="200" y2="55" stroke="#7c3aed" strokeWidth="1.5" markerEnd="url(#ab)"/>
          {/* Bus Bar */}
          <rect x="200" y="42" width="100" height="26" rx="4" fill="#312e81" stroke="#6366f1" strokeWidth="1.5"/>
          <text x="250" y="57" textAnchor="middle" fill="#a5b4fc" fontSize="9" fontWeight="700">48 V BUS BAR</text>
          {/* Holdup Cap */}
          <rect x="230" y="72" width="40" height="28" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="1"/>
          <text x="250" y="88" textAnchor="middle" fill="#64748b" fontSize="6">HOLDUP CAP</text>
          <line x1="250" y1="68" x2="250" y2="72" stroke="#475569" strokeWidth="1"/>
          {/* Load */}
          <line x1="300" y1="55" x2="320" y2="55" stroke="#6366f1" strokeWidth="1.5" markerEnd="url(#ab)"/>
          <rect x="320" y="20" width="85" height="70" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="1.5"/>
          <text x="362" y="45" textAnchor="middle" fill="#94a3b8" fontSize="7" fontWeight="700">GPU NODES</text>
          <text x="362" y="57" textAnchor="middle" fill="#64748b" fontSize="6">DC-DC VRM</text>
          <text x="362" y="68" textAnchor="middle" fill="#64748b" fontSize="6">48V→1.8V</text>
          <text x="362" y="79" textAnchor="middle" fill="#64748b" fontSize="6">CPU nodes</text>
          <line x1="405" y1="55" x2="425" y2="55" stroke="#475569" strokeWidth="1.5" markerEnd="url(#ab)"/>
          {/* Monitoring */}
          <rect x="425" y="35" width="80" height="40" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="1.5"/>
          <text x="465" y="52" textAnchor="middle" fill="#94a3b8" fontSize="7" fontWeight="700">SHELF MGR</text>
          <text x="465" y="64" textAnchor="middle" fill="#64748b" fontSize="6">PMBUS / I²C</text>
        </svg>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField label="Bus Voltage" value={cfg.busVoltage_V}
          onChange={v => upd({ busVoltage_V: parseFloat(v) || 48 })}
          unit="V" min={12} max={400}
        />
        <InputField label="Total Power" value={cfg.totalPower_kW}
          onChange={v => upd({ totalPower_kW: parseFloat(v) || 100 })}
          unit="kW" min={1} max={500}
        />
        <InputField label="Bus Length" value={cfg.busLength_m}
          onChange={v => upd({ busLength_m: parseFloat(v) || 1.2 })}
          unit="m" min={0.1} max={5}
          help="Rack height + manifold connections, typically 1.0–1.5 m"
        />
        <SelectField label="Conductor Material" value={cfg.conductorMaterial}
          onChange={v => upd({ conductorMaterial: v })}
          options={[
            { value: 'copper',    label: 'Copper (recommended)' },
            { value: 'aluminum', label: 'Aluminium (lighter, higher X-section)' },
          ]}
        />
        <InputField label="PSUs in Parallel" value={cfg.psusInParallel}
          onChange={v => upd({ psusInParallel: parseInt(v) || 6 })}
          min={1} max={24}
        />
        <SelectField label="PSU Topology" value={cfg.psuTopology}
          onChange={v => upd({ psuTopology: v })}
          options={[
            { value: 'LLC_PFC',    label: 'LLC + PFC (standard OCP)' },
            { value: 'PSFB_PFC',  label: 'Phase-Shift Full Bridge' },
            { value: 'CLLC_BIDIR', label: 'CLLC Bidirectional' },
          ]}
        />
        <InputField label="AC Input Voltage" value={cfg.acInputVoltage_V}
          onChange={v => upd({ acInputVoltage_V: parseFloat(v) || 480 })}
          unit="V" min={100} max={690}
        />
        <InputField label="Holdup Time" value={cfg.holdupTime_ms}
          onChange={v => upd({ holdupTime_ms: parseFloat(v) || 10 })}
          unit="ms" min={2} max={50}
        />
      </div>

      <RunButton onClick={runBusCalc} label="Design 48 V Bus →" />

      {res && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ResultCard title="Bus Bar Design" accent="purple">
              <MetricRow label="Total Bus Current" value={res.totalBusCurrent_A} unit="A" highlight />
              <MetricRow label="Bus Bar X-Section" value={res.busBarCrossSection_mm2} unit="mm²" />
              <MetricRow label="Dimensions" value={res.busBarDimensions} />
              <MetricRow label="Resistance" value={res.busBarResistance_uOhm} unit="µΩ" />
              <MetricRow label="Voltage Drop" value={res.busBarVoltageDrop_mV} unit="mV" />
              <MetricRow label="Power Loss" value={res.busBarPowerLoss_W} unit="W" />
              <MetricRow label="Bulk Capacitance" value={res.bulkCapacitance_mF} unit="mF" highlight />
            </ResultCard>
            <ResultCard title="PSU & AC Input" accent="blue">
              <MetricRow label="Current per PSU" value={res.currentPerPSU_A} unit="A" />
              <MetricRow label="PSU Efficiency" value={`${(res.psuEfficiency * 100).toFixed(1)}`} unit="%" highlight />
              <MetricRow label="Total AC Input Power" value={res.totalACInputPower_kW} unit="kW" />
              <MetricRow label="AC Input Current" value={res.acInputCurrent_A} unit="A" />
              <MetricRow label="Bolt Torque" value={res.busBoltTorque_Nm} unit="N·m" />
              <div className="pt-2 mt-2 border-t border-slate-700">
                <p className="text-xs text-slate-400 mb-1 font-medium">PSU Suggestion</p>
                <p className="text-xs text-slate-300">{res.psPartSuggestion}</p>
              </div>
            </ResultCard>
          </div>
          <ResultCard title="Installation Notes" accent="amber">
            <p className="text-xs text-slate-300">{res.connectionNote}</p>
          </ResultCard>
        </div>
      )}
    </div>
  );
}
