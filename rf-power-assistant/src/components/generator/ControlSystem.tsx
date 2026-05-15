import React from 'react';
import { Cpu, Play, Lock } from 'lucide-react';
import { InputField } from '../ui/InputField';
import { SelectField } from '../ui/SelectField';
import { ResultCard } from '../ui/ResultCard';
import { Badge } from '../ui/Badge';
import { useGenerator } from '../../store/useGeneratorStore';
import { formatFreq } from '../../calculations/rfCalc';

const FREQ_CTRL_OPTIONS = [
  { value: 'fixed_crystal',    label: 'Crystal Oscillator (TCXO/OCXO) – no PLL' },
  { value: 'vcxo_adj',         label: 'VCXO with Analog Control (±0.01% tuning)' },
  { value: 'pll_synthesiser',  label: 'Integer-N PLL Synthesiser (agile frequency)' },
];
const PWR_CTRL_OPTIONS = [
  { value: 'analog_feedback',   label: 'Analog PI Feedback Loop (fast, simple)' },
  { value: 'digital_pid',       label: 'Digital PID (DSP/MCU, programmable)' },
  { value: 'model_predictive',  label: 'Model Predictive Control (MPC, best transient)' },
];

// PLL block diagram
function PLLDiagram({ method }: { method: string }) {
  return (
    <svg viewBox="0 0 540 70" className="w-full rounded-lg bg-slate-950 border border-slate-700">
      {/* Reference */}
      <rect x="8" y="22" width="65" height="26" rx="4" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="1" />
      <text x="40" y="32" fill="#93c5fd" fontSize="8" textAnchor="middle">
        {method === 'fixed_crystal' ? 'TCXO' : method === 'vcxo_adj' ? 'VCXO' : 'REF OSC'}
      </text>
      <text x="40" y="43" fill="#93c5fd" fontSize="8" textAnchor="middle">
        {method === 'fixed_crystal' ? '±2 ppm' : '±0.01%'}
      </text>
      <line x1="73" y1="35" x2="95" y2="35" stroke="#60a5fa" strokeWidth="1.5" />

      {method === 'pll_synthesiser' ? (
        <>
          {/* PFD */}
          <rect x="95" y="22" width="50" height="26" rx="4" fill="#1e2a40" stroke="#818cf8" strokeWidth="1" />
          <text x="120" y="32" fill="#a5b4fc" fontSize="8" textAnchor="middle">PFD /</text>
          <text x="120" y="43" fill="#a5b4fc" fontSize="8" textAnchor="middle">ChgPump</text>
          <line x1="145" y1="35" x2="165" y2="35" stroke="#a78bfa" strokeWidth="1.5" />

          {/* Loop filter */}
          <rect x="165" y="22" width="55" height="26" rx="4" fill="#1a1a2e" stroke="#818cf8" strokeWidth="1" />
          <text x="193" y="32" fill="#c4b5fd" fontSize="8" textAnchor="middle">Loop</text>
          <text x="193" y="43" fill="#c4b5fd" fontSize="8" textAnchor="middle">Filter</text>
          <line x1="220" y1="35" x2="240" y2="35" stroke="#818cf8" strokeWidth="1.5" />

          {/* VCO */}
          <rect x="240" y="18" width="60" height="34" rx="4" fill="#14532d" stroke="#22c55e" strokeWidth="1.5" />
          <text x="270" y="32" fill="#86efac" fontSize="9" textAnchor="middle" fontWeight="bold">VCO</text>
          <text x="270" y="43" fill="#4ade80" fontSize="7.5" textAnchor="middle">13.56 MHz</text>
          <line x1="300" y1="35" x2="395" y2="35" stroke="#22c55e" strokeWidth="2" />

          {/* Divider feedback */}
          <line x1="350" y1="35" x2="350" y2="60" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2,3" />
          <rect x="315" y="55" width="70" height="14" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
          <text x="350" y="65" fill="#94a3b8" fontSize="8" textAnchor="middle">÷N divider</text>
          <line x1="315" y1="62" x2="120" y2="62" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2,3" />
          <line x1="120" y1="62" x2="120" y2="48" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2,3" />
        </>
      ) : (
        <line x1="73" y1="35" x2="240" y2="35" stroke="#60a5fa" strokeWidth="1.5" />
      )}

      {/* PA block */}
      <rect x="395" y="18" width="70" height="34" rx="4" fill="#1a2e1a" stroke="#22c55e" strokeWidth="1.5" />
      <text x="430" y="32" fill="#86efac" fontSize="8.5" textAnchor="middle">RF PA</text>
      <text x="430" y="43" fill="#4ade80" fontSize="7.5" textAnchor="middle">Class E/D</text>
      <line x1="465" y1="35" x2="535" y2="35" stroke="#22c55e" strokeWidth="2" />
      <text x="505" y="28" fill="#94a3b8" fontSize="8">50Ω</text>

      {/* Power control feedback */}
      <line x1="510" y1="35" x2="510" y2="65" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2,3" />
      <text x="470" y="63" fill="#f59e0b" fontSize="7.5">PWR feedback loop</text>
    </svg>
  );
}

export function ControlSystem() {
  const { state, updateControlConfig, runControlDesign } = useGenerator();
  const { controlConfig: cfg, controlResult: res } = state;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-indigo-500/15 border border-indigo-500/30">
          <Cpu size={18} className="text-indigo-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-100">Control System Design</h3>
          <p className="text-xs text-slate-400">PLL/frequency synthesis, power control loop, ADC/DAC sizing, and hardware interlock chain.</p>
        </div>
      </div>

      <PLLDiagram method={cfg.freqControlMethod} />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <SelectField label="Frequency Control" value={cfg.freqControlMethod} onChange={v => updateControlConfig({ freqControlMethod: v as typeof cfg.freqControlMethod })} options={FREQ_CTRL_OPTIONS} />
        <InputField label="Operating Frequency" value={cfg.frequency_Hz} onChange={v => updateControlConfig({ frequency_Hz: Number(v) })} unit="Hz" hint={formatFreq(cfg.frequency_Hz)} />
        <InputField label="Power Control BW" value={cfg.powerControlBandwidth_Hz} onChange={v => updateControlConfig({ powerControlBandwidth_Hz: Number(v) })} unit="Hz" hint="Closed-loop bandwidth" />
        <InputField label="Setpoint Accuracy" value={cfg.targetAccuracy_pct} onChange={v => updateControlConfig({ targetAccuracy_pct: Number(v) })} unit="%" hint="Steady-state error" />
      </div>

      <button onClick={runControlDesign}
        className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors">
        <Play size={14} /> Design Control System
      </button>

      {res && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ResultCard title="Frequency Synthesis" icon={<Lock size={14} />} accent="border-indigo-500/40"
              metrics={[
                { label: 'Reference Frequency', value: `${res.pllReferenceFreq_MHz} MHz` },
                { label: 'Divider N', value: String(res.pllDividerN) },
                { label: 'VCO Tuning Range', value: res.vcoTuningRange_MHz > 0 ? `±${res.vcoTuningRange_MHz} MHz` : 'N/A (crystal)' },
                { label: 'PLL Lock Time', value: res.pllLockTime_us > 0 ? `${res.pllLockTime_us} µs` : 'N/A', status: 'info' },
                { label: 'Phase Noise', value: `${res.phaseNoise_dBcAt1kHz} dBc/Hz @ 1kHz` },
                { label: 'Loop Filter BW', value: res.loopFilterBandwidth_kHz > 0 ? `${res.loopFilterBandwidth_kHz} kHz` : 'N/A' },
              ]}
            />
            <ResultCard title="Power Control Loop" accent="border-yellow-500/40"
              metrics={[
                { label: 'Kp', value: res.powerLoopPidGains.kp.toFixed(3) },
                { label: 'Ki', value: res.powerLoopPidGains.ki.toExponential(2) },
                { label: 'Kd', value: res.powerLoopPidGains.kd.toExponential(2) },
                { label: 'Settling Time', value: `${res.settlingTime_ms.toFixed(1)} ms`, status: res.settlingTime_ms < 5 ? 'ok' : 'warning' },
                { label: 'Steady-state Error', value: `${res.steadyStateError_pct}%` },
                { label: 'ADC / DAC', value: `${res.adcBits}-bit` },
              ]}
            />
          </div>

          {/* MCU suggestion */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3 text-xs">
            <div className="font-semibold text-slate-300 mb-1">Recommended Microcontroller / DSP</div>
            <div className="text-slate-300">{res.microcontrollerSuggestion}</div>
          </div>

          {/* Interlocks */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/50">
            <div className="px-3 py-2 border-b border-slate-700 flex items-center gap-2">
              <Lock size={12} className="text-red-400" />
              <h4 className="text-xs font-semibold text-slate-300">Recommended Hardware Interlocks</h4>
              <Badge color="red">{res.interlocks.length} required</Badge>
            </div>
            <ul className="divide-y divide-slate-700/40">
              {res.interlocks.map((il, i) => (
                <li key={i} className="flex items-start gap-2 px-3 py-2 text-xs">
                  <span className="text-red-400 mt-0.5 flex-shrink-0">⚑</span>
                  <span className="text-slate-300">{il}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
