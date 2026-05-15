import React from 'react';
import { GitMerge, Play } from 'lucide-react';
import { InputField } from '../ui/InputField';
import { SelectField } from '../ui/SelectField';
import { ResultCard } from '../ui/ResultCard';
import { Badge } from '../ui/Badge';
import { useGenerator } from '../../store/useGeneratorStore';
import { formatFreq } from '../../calculations/rfCalc';

const COUPLER_OPTIONS = [
  { value: 'transformer',    label: 'Ferrite Transformer Coupler (high power, wideband)' },
  { value: 'coupled_line',   label: 'Coupled Microstrip / Stripline (PCB, < 200 W)' },
  { value: 'bridge_coupler', label: 'Dual-Transformer Bridge Coupler (highest directivity)' },
];

// Coupler block diagram
function CouplerDiagram({ topology }: { topology: string }) {
  return (
    <svg viewBox="0 0 540 90" className="w-full rounded-lg bg-slate-950 border border-slate-700">
      {/* Input */}
      <text x="8" y="36" fill="#94a3b8" fontSize="9">Port 1</text>
      <text x="8" y="47" fill="#60a5fa" fontSize="8">Input</text>
      <line x1="50" y1="40" x2="110" y2="40" stroke="#60a5fa" strokeWidth="2" />

      {/* Main line */}
      {topology === 'transformer' ? (
        <>
          {/* Toroid symbol */}
          {[0,1,2,3].map(n => (
            <ellipse key={n} cx={130 + n * 16} cy={40} rx={8} ry={12} fill="none" stroke="#a78bfa" strokeWidth="1.5" />
          ))}
          <line x1="174" y1="40" x2="310" y2="40" stroke="#60a5fa" strokeWidth="2" />
          {/* Secondary winding */}
          <line x1="147" y1="28" x2="147" y2="12" stroke="#f59e0b" strokeWidth="1.5" />
          <rect x="130" y="6" width="34" height="14" rx="3" fill="#1a1a2e" stroke="#f59e0b" strokeWidth="1" />
          <text x="147" y="15" fill="#fde68a" fontSize="8" textAnchor="middle">1:N</text>
        </>
      ) : topology === 'coupled_line' ? (
        <>
          <line x1="110" y1="40" x2="300" y2="40" stroke="#60a5fa" strokeWidth="3" />
          {/* Coupled line on top */}
          <line x1="140" y1="20" x2="270" y2="20" stroke="#f59e0b" strokeWidth="2" />
          <text x="205" y="16" fill="#fde68a" fontSize="7.5" textAnchor="middle">Coupled line (λ/4)</text>
          {/* Gap indication */}
          <line x1="140" y1="28" x2="140" y2="34" stroke="#475569" strokeWidth="0.8" strokeDasharray="2,2" />
          <line x1="270" y1="28" x2="270" y2="34" stroke="#475569" strokeWidth="0.8" strokeDasharray="2,2" />
          <text x="205" y="33" fill="#475569" fontSize="7" textAnchor="middle">gap</text>
        </>
      ) : (
        <>
          {/* Bridge: two transformers */}
          {[120, 220].map(x => (
            <g key={x}>
              {[0,1,2].map(n => (
                <ellipse key={n} cx={x + n * 14} cy={40} rx={7} ry={10} fill="none" stroke="#a78bfa" strokeWidth="1.5" />
              ))}
            </g>
          ))}
          <line x1="248" y1="40" x2="310" y2="40" stroke="#60a5fa" strokeWidth="2" />
        </>
      )}

      {/* Output (thru) */}
      <line x1="310" y1="40" x2="390" y2="40" stroke="#60a5fa" strokeWidth="2" />
      <text x="392" y="36" fill="#94a3b8" fontSize="9">Port 2</text>
      <text x="392" y="47" fill="#60a5fa" fontSize="8">Thru</text>

      {/* Forward port */}
      <line x1="220" y1="12" x2="220" y2="1" stroke="#4ade80" strokeWidth="1.5" />
      <text x="260" y="10" fill="#4ade80" fontSize="8.5">Port 3 → Fwd Power</text>

      {/* Reflected port */}
      <rect x="460" y="28" width="65" height="24" rx="4" fill="#3b1f1f" stroke="#f87171" strokeWidth="1" />
      <text x="493" y="38" fill="#fca5a5" fontSize="8" textAnchor="middle">50 Ω</text>
      <text x="493" y="49" fill="#fca5a5" fontSize="8" textAnchor="middle">Termination</text>
      <line x1="390" y1="58" x2="460" y2="58" stroke="#f87171" strokeWidth="1.5" />
      <text x="415" y="71" fill="#f87171" fontSize="8.5">Port 4 → Ref Power</text>

      {/* Vertical to reflected */}
      <line x1="350" y1="40" x2="350" y2="58" stroke="#f87171" strokeWidth="1" strokeDasharray="3,3" />
    </svg>
  );
}

export function DirectionalCoupler() {
  const { state, updateCouplerConfig, runCouplerDesign } = useGenerator();
  const { couplerConfig: cfg, couplerResult: res } = state;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-teal-500/15 border border-teal-500/30">
          <GitMerge size={18} className="text-teal-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-100">Directional Coupler Design</h3>
          <p className="text-xs text-slate-400">Design the forward/reflected power sampling coupler. Transformer type for high power; coupled-line for PCB integration.</p>
        </div>
      </div>

      <CouplerDiagram topology={cfg.topology} />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <SelectField label="Coupler Topology" value={cfg.topology} onChange={v => updateCouplerConfig({ topology: v as typeof cfg.topology })} options={COUPLER_OPTIONS} />
        <InputField label="RF Power" value={cfg.rfPower_W} onChange={v => updateCouplerConfig({ rfPower_W: Number(v) })} unit="W" />
        <InputField label="Frequency" value={cfg.frequency_Hz} onChange={v => updateCouplerConfig({ frequency_Hz: Number(v) })} unit="Hz" hint={formatFreq(cfg.frequency_Hz)} />
        <InputField label="Coupling Factor" value={cfg.couplingFactor_dB} onChange={v => updateCouplerConfig({ couplingFactor_dB: Number(v) })} unit="dB" hint="e.g. −20 for 1% power sample" />
        <InputField label="Target Directivity" value={cfg.targetDirectivity_dB} onChange={v => updateCouplerConfig({ targetDirectivity_dB: Number(v) })} unit="dB" hint=">30 dB desired" />
        <InputField label="System Impedance" value={cfg.systemImpedance} onChange={v => updateCouplerConfig({ systemImpedance: Number(v) })} unit="Ω" />
      </div>

      <button onClick={runCouplerDesign}
        className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors">
        <Play size={14} /> Design Directional Coupler
      </button>

      {res && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ResultCard title="Coupler Performance" icon={<GitMerge size={14} />} accent="border-teal-500/40"
              metrics={[
                { label: 'Coupling Factor', value: `${res.couplingFactor_dB} dBc` },
                { label: 'Directivity', value: `${res.directivity_dB} dB`, status: res.directivity_dB >= 30 ? 'ok' : 'warning' },
                { label: 'Insertion Loss', value: `${res.insertionLoss_dB.toFixed(3)} dB`, status: res.insertionLoss_dB < 0.2 ? 'ok' : 'warning' },
                { label: 'Power Rating', value: `${res.powerRating_W} W` },
                { label: 'Bandwidth', value: `${res.bandwidth_pct}%` },
                { label: 'Coupled Port Power', value: `${res.forwardPortPower_W.toFixed(2)} W` },
              ]}
            />
            <ResultCard title="Port Voltages" accent="border-yellow-500/40"
              metrics={[
                { label: 'Forward Port (Vrms)', value: `${res.forwardPortVoltage_Vrms.toFixed(3)} V rms`, status: 'ok' },
                { label: 'Detector IC', value: res.diodeDetectorSuggestion.split(' ')[0] },
                { label: 'Video Filter', value: res.videoFilterSuggestion },
                { label: 'Termination R', value: `${res.terminationResistor_Ohm} Ω` },
              ]}
            />
          </div>

          {/* Topology-specific details */}
          {cfg.topology === 'transformer' && res.primaryTurns > 0 && (
            <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
              <div className="text-xs font-semibold text-purple-300 mb-2">Transformer Winding Details</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                {[
                  { label: 'Primary Turns', val: String(res.primaryTurns) },
                  { label: 'Secondary Turns', val: String(res.secondaryTurns) },
                  { label: 'Core', val: res.corePartSuggestion },
                ].map(m => (
                  <div key={m.label}>
                    <div className="text-slate-500">{m.label}</div>
                    <div className="font-mono text-purple-200">{m.val}</div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                Wind primary as {res.primaryTurns}-turn bifilar over secondary 1-turn. Use twisted-pair for balance.
                Terminate unused port with {res.terminationResistor_Ohm} Ω non-inductive resistor.
              </div>
            </div>
          )}

          {cfg.topology === 'coupled_line' && res.coupledLength_mm > 0 && (
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
              <div className="text-xs font-semibold text-blue-300 mb-2">Coupled-Line PCB Dimensions</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {[
                  { label: 'Coupled Length', val: `${res.coupledLength_mm.toFixed(1)} mm` },
                  { label: 'Line Width', val: `${res.lineWidth_mm.toFixed(1)} mm` },
                  { label: 'Gap Width', val: `${res.gapWidth_mm.toFixed(2)} mm` },
                  { label: 'Even Mode Z0e', val: `${res.evenModeZ_Ohm.toFixed(1)} Ω` },
                  { label: 'Odd Mode Z0o', val: `${res.oddModeZ_Ohm.toFixed(1)} Ω` },
                  { label: 'Substrate', val: res.substrateNote },
                ].map(m => (
                  <div key={m.label}>
                    <div className="text-slate-500">{m.label}</div>
                    <div className="font-mono text-blue-200">{m.val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
