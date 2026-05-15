import React from 'react';
import { Zap, Play, ShieldAlert, AlertTriangle } from 'lucide-react';
import { InputField } from '../ui/InputField';
import { SelectField } from '../ui/SelectField';
import { ResultCard } from '../ui/ResultCard';
import { Badge } from '../ui/Badge';
import { useGenerator } from '../../store/useGeneratorStore';

const DETECT_OPTIONS = [
  { value: 'reflected_ratio',  label: 'Reflected Power Ratio (most common)' },
  { value: 'voltage_collapse', label: 'Load Voltage Collapse detection' },
  { value: 'dI_dt',            label: 'Current Derivative (dI/dt spike)' },
  { value: 'combined',         label: 'Combined (Reflected + Voltage, fastest)' },
];
const PROTECT_OPTIONS = [
  { value: 'basic',        label: 'Basic (fast recovery, 50 µs blanking)' },
  { value: 'enhanced',     label: 'Enhanced (150 µs blanking, slow ramp)' },
  { value: 'process_safe', label: 'Process-safe (500 µs+, min plasma disturbance)' },
];

// Arc detection circuit block diagram
function ArcCircuitDiagram({ threshold_V }: { threshold_V: number }) {
  return (
    <svg viewBox="0 0 540 85" className="w-full rounded-lg bg-slate-950 border border-slate-700">
      {/* Coupler */}
      <rect x="10" y="28" width="60" height="28" rx="4" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="1" />
      <text x="40" y="39" fill="#93c5fd" fontSize="8" textAnchor="middle">Dir.</text>
      <text x="40" y="49" fill="#93c5fd" fontSize="8" textAnchor="middle">Coupler</text>

      {/* Ref port line */}
      <line x1="70" y1="42" x2="90" y2="42" stroke="#f87171" strokeWidth="1.5" />
      <text x="80" y="37" fill="#f87171" fontSize="7">Ref</text>

      {/* Detector diode */}
      <rect x="90" y="32" width="55" height="20" rx="3" fill="#3b1f1f" stroke="#f87171" strokeWidth="1" />
      <text x="118" y="40" fill="#fca5a5" fontSize="7.5" textAnchor="middle">Schottky</text>
      <text x="118" y="50" fill="#fca5a5" fontSize="7.5" textAnchor="middle">Detector</text>

      {/* Video filter */}
      <line x1="145" y1="42" x2="165" y2="42" stroke="#f87171" strokeWidth="1.5" />
      <rect x="165" y="32" width="50" height="20" rx="3" fill="#1e2a2a" stroke="#f59e0b" strokeWidth="1" />
      <text x="190" y="40" fill="#fde68a" fontSize="7.5" textAnchor="middle">Video</text>
      <text x="190" y="50" fill="#fde68a" fontSize="7.5" textAnchor="middle">Filter</text>

      {/* Comparator */}
      <line x1="215" y1="42" x2="230" y2="42" stroke="#f59e0b" strokeWidth="1.5" />
      <polygon points="230,28 260,42 230,56" fill="#14532d" stroke="#22c55e" strokeWidth="1.5" />
      <text x="244" y="38" fill="#86efac" fontSize="7">V+</text>
      <text x="244" y="52" fill="#86efac" fontSize="7">V−</text>
      {/* Threshold ref */}
      <line x1="230" y1="49" x2="215" y2="49" stroke="#22c55e" strokeWidth="1" strokeDasharray="2,2" />
      <text x="200" y="64" fill="#22c55e" fontSize="7">{threshold_V.toFixed(3)}V ref</text>

      {/* Latch */}
      <line x1="260" y1="42" x2="280" y2="42" stroke="#22c55e" strokeWidth="1.5" />
      <rect x="280" y="32" width="45" height="20" rx="3" fill="#1c1917" stroke="#a78bfa" strokeWidth="1" />
      <text x="303" y="40" fill="#c4b5fd" fontSize="7.5" textAnchor="middle">SR</text>
      <text x="303" y="50" fill="#c4b5fd" fontSize="7.5" textAnchor="middle">Latch</text>

      {/* Opto coupler */}
      <line x1="325" y1="42" x2="345" y2="42" stroke="#a78bfa" strokeWidth="1.5" />
      <rect x="345" y="32" width="50" height="20" rx="3" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1" />
      <text x="370" y="40" fill="#a5b4fc" fontSize="7.5" textAnchor="middle">Opto /</text>
      <text x="370" y="50" fill="#a5b4fc" fontSize="7.5" textAnchor="middle">Isolator</text>

      {/* Gate driver shutdown */}
      <line x1="395" y1="42" x2="415" y2="42" stroke="#818cf8" strokeWidth="1.5" />
      <rect x="415" y="28" width="65" height="28" rx="4" fill="#1a2a1a" stroke="#22c55e" strokeWidth="1.5" />
      <text x="448" y="39" fill="#86efac" fontSize="8" textAnchor="middle">Gate</text>
      <text x="448" y="49" fill="#86efac" fontSize="8" textAnchor="middle">Driver ×2</text>

      {/* PA shutdown arrow */}
      <line x1="480" y1="42" x2="510" y2="42" stroke="#ef4444" strokeWidth="1.5" />
      <text x="488" y="37" fill="#f87171" fontSize="7.5">PA</text>
      <text x="488" y="47" fill="#f87171" fontSize="7.5">OFF</text>

      {/* Fwd reference port */}
      <line x1="70" y1="35" x2="90" y2="35" stroke="#4ade80" strokeWidth="1" strokeDasharray="2,2" />
      <text x="80" y="30" fill="#4ade80" fontSize="7">Fwd</text>

      {/* Labels row */}
      <text x="10" y="78" fill="#475569" fontSize="7">Coupler → Detector → Filter → Comparator → Latch → Isolator → Driver → PA shutdown</text>
    </svg>
  );
}

export function ArcDetection() {
  const { state, updateArcConfig, runArcDesign } = useGenerator();
  const { arcConfig: cfg, arcResult: res, couplerResult } = state;

  const syncCoupler = () => {
    if (couplerResult) updateArcConfig({ couplingFactor_dB: state.couplerConfig.couplingFactor_dB });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-red-500/15 border border-red-500/30">
          <ShieldAlert size={18} className="text-red-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-100">Arc Detection & Protection</h3>
          <p className="text-xs text-slate-400">Hardware arc detection pipeline: comparator thresholds, response latency chain, blanking, recovery ramp, and hard-fault logic.</p>
        </div>
      </div>

      <ArcCircuitDiagram threshold_V={res?.comparatorThreshold_V ?? 0.05} />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <SelectField label="Detection Method" value={cfg.detectionMethod} onChange={v => updateArcConfig({ detectionMethod: v as typeof cfg.detectionMethod })} options={DETECT_OPTIONS} />
        <SelectField label="Protection Level" value={cfg.protectionLevel} onChange={v => updateArcConfig({ protectionLevel: v as typeof cfg.protectionLevel })} options={PROTECT_OPTIONS} />
        <InputField label="VSWR Trip Threshold" value={cfg.vswr_threshold} onChange={v => updateArcConfig({ vswr_threshold: Number(v) })} unit="" min={1.5} max={10} step={0.5} hint="Trip VSWR (e.g. 3.0)" />
        <InputField label="RF Power" value={cfg.rfPower_W} onChange={v => updateArcConfig({ rfPower_W: Number(v) })} unit="W" />
        <InputField label="Coupler Factor" value={cfg.couplingFactor_dB} onChange={v => updateArcConfig({ couplingFactor_dB: Number(v) })} unit="dB" hint="e.g. −20 dB" />
        <InputField label="Max Recoveries/sec" value={cfg.maxRecoveriesPerSec} onChange={v => updateArcConfig({ maxRecoveriesPerSec: Number(v) })} unit="/s" />
        <InputField label="Hard Fault After N Arcs" value={cfg.consecutiveFaultThreshold} onChange={v => updateArcConfig({ consecutiveFaultThreshold: Number(v) })} unit="arcs" />
      </div>

      {couplerResult && (
        <button onClick={syncCoupler} className="text-xs text-red-400 hover:text-red-300 self-start underline transition-colors">
          ↑ Import coupler factor from Coupler Design
        </button>
      )}

      <button onClick={runArcDesign}
        className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors">
        <Play size={14} /> Design Arc Detection System
      </button>

      {res && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ResultCard title="Detection Thresholds" icon={<Zap size={14} />} accent="border-red-500/40"
              metrics={[
                { label: '|Γ| threshold', value: res.reflectionCoeffThreshold.toFixed(3), status: 'warning' },
                { label: 'Reflected power trip', value: `${res.reflectedPowerThreshold_W.toFixed(0)} W`, status: 'warning' },
                { label: 'Coupler Vfwd (rms)', value: `${res.couplerForwardVoltage_V.toFixed(3)} V` },
                { label: 'Comparator setpoint', value: `${res.comparatorThreshold_V.toFixed(4)} V`, status: 'info' },
                { label: 'Total response time', value: `${res.totalDetectionTime_us.toFixed(2)} µs`, status: res.totalDetectionTime_us < 2 ? 'ok' : 'warning' },
                { label: 'Arc energy / event', value: `${res.arcEnergyPerEvent_uJ.toFixed(2)} µJ` },
              ]}
            />
            <ResultCard title="Recovery Sequence" accent="border-orange-500/30"
              metrics={[
                { label: 'Blanking time', value: `${res.recommendedBlankingTime_us} µs` },
                { label: 'Recovery delay', value: `${res.recommendedRecoveryDelay_us} µs` },
                { label: 'Power ramp rate', value: `${res.powerRampRate_kWpms} kW/ms` },
                { label: 'Hard fault holdoff', value: `${res.hardFaultHoldoff_ms} ms` },
                { label: 'Comparator IC', value: res.comparatorIC.split(' ')[0] },
                { label: 'Detector diode', value: res.detectorDiode.split(' ')[0] },
              ]}
            />
          </div>

          {/* Latency chain */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-x-auto">
            <div className="px-3 py-2 border-b border-slate-700 flex items-center gap-2">
              <AlertTriangle size={12} className="text-yellow-400" />
              <h4 className="text-xs font-semibold text-slate-300">Detection Latency Chain</h4>
              <Badge color="yellow">{res.totalDetectionTime_us.toFixed(2)} µs total</Badge>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700">
                  {['Stage', 'Delay', 'Cumulative', 'Notes'].map(h => (
                    <th key={h} className="text-left px-3 py-1.5 text-slate-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let cum = 0;
                  return res.responseChain.map((s, i) => {
                    cum += s.delay_ns;
                    return (
                      <tr key={i} className="border-b border-slate-700/40 hover:bg-slate-700/20">
                        <td className="px-3 py-1.5 text-slate-200">{s.stage}</td>
                        <td className="px-3 py-1.5 font-mono text-yellow-400">{s.delay_ns} ns</td>
                        <td className="px-3 py-1.5 font-mono text-slate-400">{(cum / 1000).toFixed(3)} µs</td>
                        <td className="px-3 py-1.5 text-slate-500 text-[10px]">
                          {i === 0 ? 'Propagation in coupled element' :
                           i === 1 ? 'HSMS-2852 recovery time' :
                           i === 2 ? '20 MHz video bandwidth RC' :
                           i === 3 ? `LT1016 typ. ${s.delay_ns} ns` :
                           i === 4 ? 'D-type FF or SR latch' :
                           i === 5 ? '6N137 opto, propagation' :
                           i === 6 ? 'IXDD414 gate driver disable' : 'Drain current di/dt'}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>

          {/* Protection notes */}
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
            <div className="text-xs font-semibold text-red-300 mb-2">Protection Design Notes</div>
            <ul className="flex flex-col gap-1">
              {res.protectionNotes.map((n, i) => (
                <li key={i} className="text-xs text-slate-300 flex gap-1.5">
                  <span className="text-red-400 flex-shrink-0">⚡</span>{n}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
