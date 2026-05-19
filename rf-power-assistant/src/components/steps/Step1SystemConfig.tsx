import React, { useState } from 'react';
import { Cpu, Zap, Settings, ChevronDown, ChevronUp, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { InputField } from '../ui/InputField';
import { SelectField } from '../ui/SelectField';
import { Badge } from '../ui/Badge';
import { useStore } from '../../store/useStore';
import type { ToolType } from '../../types';
import { formatFreq, validateSystemPhysics, TOOL_PHYSICS } from '../../calculations/rfCalc';
import type { PhysicsWarning } from '../../calculations/rfCalc';

const TOOL_OPTIONS = [
  { value: 'CCP_ETCH',      label: 'CCP Etch (Capacitively Coupled Plasma)' },
  { value: 'ICP_ETCH',      label: 'ICP Etch (Inductively Coupled Plasma)' },
  { value: 'DUAL_FREQ_CCP', label: 'Dual-Frequency CCP Etch' },
  { value: 'PECVD',         label: 'PECVD (Plasma-Enhanced CVD)' },
  { value: 'PVD_SPUTTER',   label: 'PVD / Magnetron Sputter' },
  { value: 'HDP_CVD',       label: 'HDP-CVD (High-Density Plasma CVD)' },
  { value: 'ION_IMPLANT',   label: 'Ion Implant (Plasma Doping)' },
  { value: 'CUSTOM',        label: 'Custom / Other' },
];

const FREQ_PRESETS = [
  { value: '400000',    label: '400 kHz' },
  { value: '2000000',   label: '2 MHz' },
  { value: '13560000',  label: '13.56 MHz (ISM standard)' },
  { value: '27120000',  label: '27.12 MHz' },
  { value: '40680000',  label: '40.68 MHz' },
  { value: '60000000',  label: '60 MHz' },
  { value: '100000000', label: '100 MHz' },
];

const TOOL_INFO: Record<ToolType, { desc: string; typicalPower: string; freqRange: string }> = {
  CCP_ETCH:      { desc: 'Parallel-plate capacitive discharge for dielectric/conductor etch', typicalPower: '200–3000 W',  freqRange: '2/13.56/27 MHz' },
  ICP_ETCH:      { desc: 'Planar or TCP coil-driven inductively coupled plasma', typicalPower: '300–5000 W',  freqRange: '13.56/60 MHz' },
  DUAL_FREQ_CCP: { desc: 'Independent HF (plasma density) + LF (ion energy) control',      typicalPower: '200–6000 W',  freqRange: '2+13.56 / 2+27 MHz' },
  PECVD:         { desc: 'Plasma-assisted deposition at lower pressures and power', typicalPower: '100–1500 W',  freqRange: '13.56 / 40 MHz' },
  PVD_SPUTTER:   { desc: 'RF magnetron sputtering of metals and insulators', typicalPower: '500–20000 W', freqRange: '13.56 MHz' },
  HDP_CVD:       { desc: 'High-density ICP with substrate bias for gap-fill applications', typicalPower: '1000–8000 W', freqRange: '2/13.56 MHz' },
  ION_IMPLANT:   { desc: 'Plasma immersion ion implantation (PIII)', typicalPower: '500–5000 W',  freqRange: '2/13.56 MHz' },
  CUSTOM:        { desc: 'User-defined RF plasma or power delivery system', typicalPower: 'User-defined', freqRange: 'User-defined' },
};

function WarningBanner({ w }: { w: PhysicsWarning }) {
  const styles = {
    error: 'bg-red-500/10 border-red-500/30 text-red-300',
    warn:  'bg-amber-500/10 border-amber-500/30 text-amber-300',
    info:  'bg-blue-500/10 border-blue-500/30 text-blue-300',
  } as const;
  const Icon = w.severity === 'error' ? AlertCircle : w.severity === 'warn' ? AlertTriangle : Info;
  return (
    <div className={`rounded-lg border p-3 text-xs flex gap-2 items-start ${styles[w.severity]}`}>
      <Icon size={14} className="shrink-0 mt-0.5" />
      <span className="leading-relaxed">{w.message}</span>
    </div>
  );
}

export function Step1SystemConfig() {
  const { state, updateSystemConfig, setStep } = useStore();
  const cfg = state.systemConfig;
  const info = TOOL_INFO[cfg.toolType];
  const physics = TOOL_PHYSICS[cfg.toolType] ?? TOOL_PHYSICS.CUSTOM;
  const [showAdvanced, setShowAdvanced] = useState(false);

  const warnings = validateSystemPhysics(cfg, state.plasmaLoad.states.length ? state.plasmaLoad.states : undefined);

  const area_cm2 = Math.PI * (cfg.chamberDiameter / 20) ** 2;
  const powerDensity = (cfg.primaryPower / area_cm2).toFixed(2);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-blue-500/15 border border-blue-500/30">
          <Cpu size={20} className="text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-100">System Configuration</h2>
          <p className="text-sm text-slate-400">Select your semiconductor tool type and define the RF power delivery requirements.</p>
        </div>
      </div>

      {/* Tool type */}
      <div className="grid grid-cols-1 gap-4">
        <SelectField
          label="Tool / Process Type"
          value={cfg.toolType}
          onChange={v => updateSystemConfig({ toolType: v as ToolType })}
          options={TOOL_OPTIONS}
        />
        {/* Tool info card */}
        <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3 text-sm">
          <p className="text-slate-300 mb-1.5">{info.desc}</p>
          <div className="flex flex-wrap gap-2">
            <Badge color="blue">Power: {info.typicalPower}</Badge>
            <Badge color="purple">Freq: {info.freqRange}</Badge>
          </div>
        </div>
        {/* EE-specific note */}
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/20 px-3 py-2 text-xs text-slate-400 leading-relaxed">
          <span className="text-blue-400 font-semibold mr-1.5">EE note:</span>{physics.eeNote}
        </div>
      </div>

      {/* Frequency & power */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Zap size={16} className="text-yellow-400" />
          <h3 className="text-sm font-semibold text-slate-300">Primary RF Source</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Frequency Preset</label>
            <select
              value={String(cfg.primaryFrequency)}
              onChange={e => updateSystemConfig({ primaryFrequency: Number(e.target.value) })}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500"
            >
              {FREQ_PRESETS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <InputField
            label="Custom Frequency Override"
            value={cfg.primaryFrequency}
            onChange={v => updateSystemConfig({ primaryFrequency: Number(v) })}
            unit="Hz" min={100000} max={1e9} step={1000}
            hint={formatFreq(cfg.primaryFrequency)}
          />
          <InputField
            label="Power Level"
            value={cfg.primaryPower}
            onChange={v => updateSystemConfig({ primaryPower: Number(v) })}
            unit="W" min={1} max={100000} step={50}
          />
          <InputField
            label="Duty Cycle"
            value={cfg.dutyCycle}
            onChange={v => updateSystemConfig({ dutyCycle: Math.min(1, Math.max(0, Number(v))) })}
            unit="(0–1)" min={0.01} max={1} step={0.01}
            hint={`${(cfg.dutyCycle * 100).toFixed(0)}% on-time`}
          />
        </div>
      </div>

      {/* Dual-frequency (shown only when relevant) */}
      {(cfg.toolType === 'DUAL_FREQ_CCP' || cfg.toolType === 'HDP_CVD') && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} className="text-purple-400" />
            <h3 className="text-sm font-semibold text-slate-300">Secondary RF Source</h3>
            <Badge color="purple">Dual-Freq</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              label="Secondary Frequency"
              value={cfg.secondaryFrequency || 2e6}
              onChange={v => updateSystemConfig({ secondaryFrequency: Number(v) })}
              unit="Hz" hint={formatFreq(cfg.secondaryFrequency || 2e6)}
            />
            <InputField
              label="Secondary Power"
              value={cfg.secondaryPower}
              onChange={v => updateSystemConfig({ secondaryPower: Number(v) })}
              unit="W"
            />
          </div>
        </div>
      )}

      {/* Chamber & process */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Settings size={16} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-300">Chamber & Process Parameters</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InputField label="Chamber Diameter" value={cfg.chamberDiameter} onChange={v => updateSystemConfig({ chamberDiameter: Number(v) })} unit="mm" />
          <InputField label="Electrode Gap" value={cfg.electrodeGap} onChange={v => updateSystemConfig({ electrodeGap: Number(v) })} unit="mm" hint="CCP gap spacing" />
          <InputField label="Pressure" value={cfg.operatingPressure} onChange={v => updateSystemConfig({ operatingPressure: Number(v) })} unit="mTorr"
            hint={`Typical ${cfg.toolType}: ${physics.pressureRange[0]}–${physics.pressureRange[1]} mTorr`} />
          <InputField label="Source Impedance" value={cfg.sourceImpedance} onChange={v => updateSystemConfig({ sourceImpedance: Number(v) })} unit="Ω" hint="50 Ω standard" />
          <InputField label="Ambient Temp" value={cfg.ambientTemp} onChange={v => updateSystemConfig({ ambientTemp: Number(v) })} unit="°C"
            hint="For thermal analysis. Enclosed rack: 40–55°C" />
          <InputField label="Power Density" value={powerDensity} onChange={() => {}} unit="W/cm²" disabled
            hint={`Limit: ${physics.powerDensityLimit} W/cm² for ${cfg.toolType}`} />
          <InputField label="Process Gas" value={cfg.procesGas} onChange={v => updateSystemConfig({ procesGas: v })} type="text" />
        </div>
      </div>

      {/* Advanced Design Handles */}
      <div className="rounded-xl border border-slate-700 overflow-hidden">
        <button
          onClick={() => setShowAdvanced(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/60 hover:bg-slate-800 transition-colors text-sm font-medium text-slate-300"
        >
          <span>Advanced RF Design Handles</span>
          {showAdvanced ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
        {showAdvanced && (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-800/20">
            <SelectField
              label="Harmonic Filter Order"
              value={String(cfg.filterOrder ?? 7)}
              onChange={v => updateSystemConfig({ filterOrder: parseInt(v) as 5 | 7 | 9 })}
              hint="5th ≈ 30 dB @ 2f · 7th ≈ 42 dB (standard) · 9th ≈ 54 dB"
              options={[
                { value: '5', label: '5th-order — compact, 3C + 2L' },
                { value: '7', label: '7th-order — SEMI standard, 4C + 3L' },
                { value: '9', label: '9th-order — highest rejection, 5C + 4L' },
              ]}
            />
            <InputField
              label="Pi/T Network Q Target"
              value={cfg.qTarget ?? 5}
              onChange={v => updateSystemConfig({ qTarget: Math.max(1, Math.min(12, Number(v))) })}
              unit="" min={1} max={12} step={0.5}
              hint="Higher Q = better harmonic rejection + higher component voltages"
            />
          </div>
        )}
      </div>

      {/* Physics Validation */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Physics Validation</p>
          {warnings.map((w, i) => <WarningBanner key={i} w={w} />)}
        </div>
      )}

      {/* CTA */}
      <button
        onClick={() => setStep(2)}
        className="self-end flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
      >
        Next: Plasma Load Characterisation →
      </button>
    </div>
  );
}
