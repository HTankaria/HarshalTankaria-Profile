import React from 'react';
import { Timer, Play, Info } from 'lucide-react';
import { InputField } from '../ui/InputField';
import { SelectField } from '../ui/SelectField';
import { ResultCard } from '../ui/ResultCard';
import { Badge } from '../ui/Badge';
import { useGenerator } from '../../store/useGeneratorStore';

const MOD_OPTIONS = [
  { value: 'gate_bias',     label: 'Gate Bias Modulation (fastest, <1 µs)' },
  { value: 'driver_enable', label: 'Driver Enable Pin (0.5–5 µs)' },
  { value: 'dc_bus_switch', label: 'DC Bus Switching (10–100 µs, lowest loss)' },
  { value: 'envelope_amp',  label: 'Envelope Amplifier (shaped edges, <200 ns)' },
];

// Pulse timing waveform SVG
function PulseWaveform({ ton, period, rise, fall, overshoot }: {
  ton: number; period: number; rise: number; fall: number; overshoot: number;
}) {
  const w = 460, h = 70;
  const pad = 20;
  const availW = w - 2 * pad;
  const scale = availW / period;
  const pxTon = Math.max(ton * scale, 30);
  const pxRise = Math.max(rise * scale, 6);
  const pxFall = Math.max(fall * scale, 6);
  const mid = h / 2;
  const top = 12, bot = h - 12;
  const ovH = overshoot > 0 ? (top - 8) : top;

  const pts = [
    [pad, bot],
    [pad + 10, bot],
    [pad + 10 + pxRise, ovH],
    [pad + 10 + pxRise + 6, top],
    [pad + 10 + pxTon - pxFall - 6, top],
    [pad + 10 + pxTon - pxFall, bot],
    [pad + 10 + pxTon + 20, bot],
    [w - pad, bot],
  ].map(p => p.join(',')).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full rounded-lg bg-slate-950 border border-slate-700">
      {/* Grid */}
      <line x1={pad} y1={top} x2={w - pad} y2={top} stroke="#1e293b" strokeWidth="1" />
      <line x1={pad} y1={bot} x2={w - pad} y2={bot} stroke="#334155" strokeWidth="0.8" />
      <line x1={pad} y1={mid} x2={w - pad} y2={mid} stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3,4" />

      {/* Waveform */}
      <polyline points={pts} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />

      {/* Rise time annotation */}
      <line x1={pad + 10} y1={bot + 5} x2={pad + 10 + pxRise} y2={bot + 5} stroke="#22c55e" strokeWidth="1" markerEnd="url(#arr)" />
      <text x={pad + 10 + pxRise / 2} y={bot + 14} fill="#22c55e" fontSize="7" textAnchor="middle">tr={rise.toFixed(1)}µs</text>

      {/* Period annotation */}
      <line x1={pad + 10} y1={h - 3} x2={pad + 10 + pxTon + 20} y2={h - 3} stroke="#94a3b8" strokeWidth="0.8" />
      <text x={pad + 10 + (pxTon + 20) / 2} y={h - 0.5} fill="#94a3b8" fontSize="7" textAnchor="middle">T={period.toFixed(0)}µs</text>

      {/* Labels */}
      <text x={pad + 2} y={top - 2} fill="#60a5fa" fontSize="7">P_peak</text>
      <text x={pad + 2} y={bot + 3} fill="#475569" fontSize="7">0 W</text>
      {overshoot > 0 && (
        <text x={pad + 10 + pxRise + 8} y={ovH + 3} fill="#fbbf24" fontSize="7">{overshoot}% OS</text>
      )}
    </svg>
  );
}

export function PulsingControl() {
  const { state, updatePulsingConfig, runPulsingDesign } = useGenerator();
  const { pulsingConfig: cfg, pulsingResult: res, dcResult, ampResult } = state;

  // Sync from other designs
  const syncDC = () => {
    if (dcResult) updatePulsingConfig({ dcBusVoltage: dcResult.dcBusVoltage, bulkCapacitance_uF: dcResult.bulkCapacitance_uF });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-cyan-500/15 border border-cyan-500/30">
          <Timer size={18} className="text-cyan-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-100">Pulsing & Modulation Control</h3>
          <p className="text-xs text-slate-400">Design the pulse timing, gate drive, voltage droop, and plasma ignition constraints.</p>
        </div>
      </div>

      {/* Waveform preview */}
      {res && (
        <PulseWaveform
          ton={res.onTime_us} period={res.pulsePeriod_us}
          rise={res.achievableRiseTime_us} fall={res.achievableFallTime_us}
          overshoot={res.overshoot_pct}
        />
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Pulsing Enabled</label>
          <div className="flex gap-2">
            {[true, false].map(v => (
              <button key={String(v)} onClick={() => updatePulsingConfig({ enabled: v })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${cfg.enabled === v ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                {v ? 'ON' : 'OFF'}
              </button>
            ))}
          </div>
        </div>
        <InputField label="Pulse Frequency" value={cfg.pulseFrequency_Hz} onChange={v => updatePulsingConfig({ pulseFrequency_Hz: Number(v) })} unit="Hz" hint={`${(1e6 / cfg.pulseFrequency_Hz).toFixed(0)} µs period`} />
        <InputField label="Duty Cycle" value={cfg.dutyCycle} onChange={v => updatePulsingConfig({ dutyCycle: Math.min(0.99, Math.max(0.01, Number(v))) })} unit="(0–1)" hint={`${(cfg.dutyCycle * 100).toFixed(0)}% on`} />
        <SelectField label="Modulation Method" value={cfg.modulationMethod} onChange={v => updatePulsingConfig({ modulationMethod: v as typeof cfg.modulationMethod })} options={MOD_OPTIONS} />
        <InputField label="Target Rise Time" value={cfg.desiredRiseTime_us} onChange={v => updatePulsingConfig({ desiredRiseTime_us: Number(v) })} unit="µs" />
        <InputField label="Target Fall Time" value={cfg.desiredFallTime_us} onChange={v => updatePulsingConfig({ desiredFallTime_us: Number(v) })} unit="µs" />
        <InputField label="RF Power" value={cfg.rfPower_W} onChange={v => updatePulsingConfig({ rfPower_W: Number(v) })} unit="W" />
        <InputField label="DC Bus Voltage" value={cfg.dcBusVoltage} onChange={v => updatePulsingConfig({ dcBusVoltage: Number(v) })} unit="V" />
        <InputField label="Bulk Capacitance" value={cfg.bulkCapacitance_uF} onChange={v => updatePulsingConfig({ bulkCapacitance_uF: Number(v) })} unit="µF" />
        <InputField label="Matching Network Q" value={cfg.matchingNetworkQ} onChange={v => updatePulsingConfig({ matchingNetworkQ: Number(v) })} unit="" hint="From Step 3" />
        <InputField label="Stall Power (off-phase)" value={cfg.stallPower_W} onChange={v => updatePulsingConfig({ stallPower_W: Number(v) })} unit="W" hint="0 = fully off" />
      </div>

      {dcResult && (
        <button onClick={syncDC} className="text-xs text-cyan-400 hover:text-cyan-300 self-start underline transition-colors">
          ↑ Import DC bus values from Supply Design
        </button>
      )}

      <button onClick={runPulsingDesign}
        className="flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors">
        <Play size={14} /> Calculate Pulse Design
      </button>

      {res && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ResultCard title="Pulse Timing" icon={<Timer size={14} />} accent="border-cyan-500/40"
              metrics={[
                { label: 'Period', value: `${res.pulsePeriod_us.toFixed(1)} µs` },
                { label: 'On-time', value: `${res.onTime_us.toFixed(1)} µs` },
                { label: 'Off-time', value: `${res.offTime_us.toFixed(1)} µs` },
                { label: 'Rise Time (10–90%)', value: `${res.achievableRiseTime_us.toFixed(1)} µs`, status: res.achievableRiseTime_us < 10 ? 'ok' : 'warning' },
                { label: 'Fall Time', value: `${res.achievableFallTime_us.toFixed(1)} µs` },
                { label: 'Overshoot', value: `${res.overshoot_pct}%`, status: res.overshoot_pct < 5 ? 'ok' : 'warning' },
              ]}
            />
            <ResultCard title="Power & Plasma" accent="border-yellow-500/40"
              metrics={[
                { label: 'Peak Power', value: `${res.peakPower_W.toFixed(0)} W` },
                { label: 'Average Power', value: `${res.avgPower_W.toFixed(0)} W` },
                { label: 'Voltage Droop', value: `${res.voltageDropDuringPulse_pct.toFixed(1)}%`, status: res.voltageDropDuringPulse_pct < 2 ? 'ok' : 'warning' },
                { label: 'Plasma Ignition Delay', value: `${res.plasmaResponseDelay_us} µs` },
                { label: 'Min Stable Pulse', value: `${res.minStablePulseWidth_us.toFixed(0)} µs`, status: 'info' },
              ]}
            />
          </div>

          {/* Gate drive recommendation */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
            <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1">
              <Info size={12} /> Gating Circuit
            </div>
            <div className="text-xs text-slate-300 mb-1">{res.gatingComponentSuggestion}</div>
            {res.gateResistor_Ohm > 0 && (
              <div className="text-xs text-slate-400">Gate resistor: {res.gateResistor_Ohm} Ω · DC block cap: {res.isolationCapacitor_pF} pF</div>
            )}
          </div>

          {/* Notes */}
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
            <div className="text-xs font-semibold text-cyan-300 mb-2">Design Notes</div>
            <ul className="flex flex-col gap-1">
              {res.modulationNotes.map((n, i) => (
                <li key={i} className="text-xs text-slate-300 flex gap-1.5">
                  <span className="text-cyan-400 flex-shrink-0">•</span>{n}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
