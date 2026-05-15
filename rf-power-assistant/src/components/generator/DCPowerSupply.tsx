import React from 'react';
import { Plug, Zap, Play } from 'lucide-react';
import { InputField } from '../ui/InputField';
import { SelectField } from '../ui/SelectField';
import { ResultCard } from '../ui/ResultCard';
import { Badge } from '../ui/Badge';
import { useGenerator } from '../../store/useGeneratorStore';

const PFC_OPTIONS = [
  { value: 'none',           label: 'None (uncontrolled rectifier)' },
  { value: 'boost_pfc',      label: 'Single-stage Boost PFC (CCM)' },
  { value: 'bridgeless_pfc', label: 'Bridgeless Totem-Pole PFC' },
  { value: 'vienna_3ph',     label: 'Vienna 3-Level PFC (3-phase)' },
];

// Block diagram SVG for AC-DC supply
function DCBlockDiagram({ pfc, phases }: { pfc: string; phases: number }) {
  return (
    <svg viewBox="0 0 520 80" className="w-full rounded-lg bg-slate-950 border border-slate-700">
      {/* AC input */}
      <text x="8" y="30" fill="#94a3b8" fontSize="9">{phases}ϕ AC</text>
      <text x="8" y="42" fill="#60a5fa" fontSize="9">{phases === 3 ? '3-wire' : '2-wire'}</text>
      <line x1="55" y1="36" x2="80" y2="36" stroke="#60a5fa" strokeWidth="1.5" />

      {/* EMI filter */}
      <rect x="80" y="24" width="60" height="24" rx="4" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="1" />
      <text x="110" y="35" fill="#93c5fd" fontSize="8" textAnchor="middle">EMI</text>
      <text x="110" y="45" fill="#93c5fd" fontSize="8" textAnchor="middle">Filter</text>
      <line x1="140" y1="36" x2="165" y2="36" stroke="#60a5fa" strokeWidth="1.5" />

      {/* Rectifier */}
      <rect x="165" y="24" width="60" height="24" rx="4" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="1" />
      <text x="195" y="35" fill="#93c5fd" fontSize="8" textAnchor="middle">{phases === 3 ? '6-Pulse' : 'Full'}</text>
      <text x="195" y="45" fill="#93c5fd" fontSize="8" textAnchor="middle">Rect.</text>
      <line x1="225" y1="36" x2="250" y2="36" stroke="#60a5fa" strokeWidth="1.5" />

      {/* PFC stage (optional) */}
      {pfc !== 'none' ? (
        <>
          <rect x="250" y="24" width="70" height="24" rx="4" fill="#14532d" stroke="#22c55e" strokeWidth="1" />
          <text x="285" y="35" fill="#86efac" fontSize="8" textAnchor="middle">PFC</text>
          <text x="285" y="45" fill="#86efac" fontSize="8" textAnchor="middle">{pfc === 'boost_pfc' ? 'Boost' : pfc === 'bridgeless_pfc' ? 'B-less' : 'Vienna'}</text>
          <line x1="320" y1="36" x2="345" y2="36" stroke="#60a5fa" strokeWidth="1.5" />
          {/* Bulk cap */}
          <line x1="345" y1="20" x2="345" y2="52" stroke="#475569" strokeWidth="1" />
          <line x1="350" y1="20" x2="350" y2="52" stroke="#475569" strokeWidth="1" />
          <text x="360" y="32" fill="#f59e0b" fontSize="8">C</text>
          <text x="360" y="43" fill="#f59e0b" fontSize="8">bulk</text>
          <line x1="350" y1="36" x2="385" y2="36" stroke="#60a5fa" strokeWidth="1.5" />
        </>
      ) : (
        <>
          {/* Just bulk cap */}
          <line x1="250" y1="20" x2="250" y2="52" stroke="#475569" strokeWidth="1" />
          <line x1="255" y1="20" x2="255" y2="52" stroke="#475569" strokeWidth="1" />
          <text x="265" y="32" fill="#f59e0b" fontSize="8">C</text>
          <text x="265" y="43" fill="#f59e0b" fontSize="8">bulk</text>
          <line x1="255" y1="36" x2="385" y2="36" stroke="#60a5fa" strokeWidth="1.5" />
        </>
      )}

      {/* DC bus output */}
      <rect x="385" y="24" width="70" height="24" rx="4" fill="#3b1f1f" stroke="#f87171" strokeWidth="1" />
      <text x="420" y="35" fill="#fca5a5" fontSize="8" textAnchor="middle">DC Bus</text>
      <text x="420" y="45" fill="#fca5a5" fontSize="8" textAnchor="middle">+Vdc</text>
      <line x1="455" y1="36" x2="510" y2="36" stroke="#f87171" strokeWidth="1.5" />
      <text x="465" y="30" fill="#f87171" fontSize="9">→ PA</text>

      {/* Ground */}
      <line x1="8" y1="60" x2="510" y2="60" stroke="#334155" strokeWidth="0.8" strokeDasharray="3,3" />
      <text x="12" y="72" fill="#475569" fontSize="8">⏚ GND</text>
    </svg>
  );
}

export function DCPowerSupply() {
  const { state, updateDCConfig, runDCDesign } = useGenerator();
  const { dcConfig: cfg, dcResult: res } = state;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-orange-500/15 border border-orange-500/30">
          <Plug size={18} className="text-orange-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-100">DC Power Supply</h3>
          <p className="text-xs text-slate-400">AC mains → rectifier → PFC → DC bus sizing for the RF amplifier.</p>
        </div>
      </div>

      <DCBlockDiagram pfc={cfg.pfcTopology} phases={cfg.acInputPhases} />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <InputField label="AC Input Voltage" value={cfg.acInputVoltage} onChange={v => updateDCConfig({ acInputVoltage: Number(v) })} unit="V" hint="L-L for 3-phase" />
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Phases</label>
          <div className="flex gap-2">
            {([1, 3] as const).map(p => (
              <button key={p} onClick={() => updateDCConfig({ acInputPhases: p })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${cfg.acInputPhases === p ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                {p}ϕ
              </button>
            ))}
          </div>
        </div>
        <InputField label="AC Frequency" value={cfg.acFrequency} onChange={v => updateDCConfig({ acFrequency: Number(v) })} unit="Hz" />
        <SelectField label="PFC Topology" value={cfg.pfcTopology} onChange={v => updateDCConfig({ pfcTopology: v as typeof cfg.pfcTopology })} options={PFC_OPTIONS} />
        <InputField label="Target DC Bus" value={cfg.targetDCBusVoltage} onChange={v => updateDCConfig({ targetDCBusVoltage: Number(v) })} unit="V" hint="0 = auto" />
        <InputField label="RF Output Power" value={cfg.totalRFPower} onChange={v => updateDCConfig({ totalRFPower: Number(v) })} unit="W" />
        <InputField label="Overhead Power" value={cfg.overheadPower} onChange={v => updateDCConfig({ overheadPower: Number(v) })} unit="W" hint="fans, control, pre-amp" />
        <InputField label="Holdup Cycles" value={cfg.holdupCycles} onChange={v => updateDCConfig({ holdupCycles: Number(v) })} unit="AC cycles" hint="Typical: 2–4" />
      </div>

      <button onClick={runDCDesign}
        className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors">
        <Play size={14} /> Calculate DC Supply
      </button>

      {res && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ResultCard title="Rectifier & Bus" icon={<Zap size={14} />} accent="border-orange-500/40"
            metrics={[
              { label: 'Topology', value: res.rectifierType.split('(')[0].trim() },
              { label: 'DC Bus Voltage', value: `${res.dcBusVoltage.toFixed(0)} V` },
              { label: 'Cap Voltage Rating', value: `${res.capacitorVoltageRating} V` },
              { label: 'Total Input Power', value: `${res.totalInputPower.toFixed(0)} W` },
              { label: 'Supply Efficiency', value: `${(res.supplyEfficiency * 100).toFixed(1)}%`, status: res.supplyEfficiency > 0.95 ? 'ok' : 'warning' },
            ]}
          />
          <ResultCard title="Capacitor & Current" accent="border-yellow-500/40"
            metrics={[
              { label: 'Bulk Capacitance', value: `${res.bulkCapacitance_uF.toFixed(0)} µF`, status: 'ok' },
              { label: 'Holdup Time', value: `${res.holdupTime_ms.toFixed(1)} ms` },
              { label: 'Ripple Voltage', value: `${res.rippleVoltage_pk.toFixed(1)} V pk`, status: res.rippleVoltage_pk < res.dcBusVoltage * 0.05 ? 'ok' : 'warning' },
              { label: 'Ripple Current', value: `${res.rippleCurrent_rms.toFixed(1)} A rms` },
              { label: 'Input Current', value: `${res.inputCurrentRms.toFixed(1)} A rms` },
              { label: 'Power Factor', value: res.inputPowerFactor.toFixed(3), status: res.inputPowerFactor > 0.95 ? 'ok' : 'warning' },
            ]}
          />
          <div className="sm:col-span-2 rounded-lg border border-slate-700 bg-slate-800/40 p-3 text-xs space-y-1">
            <div className="font-semibold text-slate-300 mb-1">Recommendations</div>
            <div className="text-slate-400">
              <span className="text-slate-300">Fuse: </span>{res.recommendedFuse}
            </div>
            {res.pfcInductance_uH > 0 && (
              <div className="text-slate-400">
                <span className="text-slate-300">PFC Inductor: </span>{res.pfcInductance_uH.toFixed(1)} µH, rated {(res.rippleCurrent_rms * 2.5).toFixed(1)} A peak
              </div>
            )}
            <div className="text-slate-400">
              <span className="text-slate-300">Peak Rectifier Current: </span>{res.peakRectifierCurrent.toFixed(1)} A — select bridge diode rated ≥ {Math.ceil(res.peakRectifierCurrent * 1.5 / 10) * 10} A
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
