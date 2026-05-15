import React from 'react';
import { Cpu, Zap, Settings } from 'lucide-react';
import { InputField } from '../ui/InputField';
import { SelectField } from '../ui/SelectField';
import { Badge } from '../ui/Badge';
import { useStore } from '../../store/useStore';
import type { ToolType } from '../../types';
import { formatFreq } from '../../calculations/rfCalc';

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

export function Step1SystemConfig() {
  const { state, updateSystemConfig, setStep } = useStore();
  const cfg = state.systemConfig;
  const info = TOOL_INFO[cfg.toolType];

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
          <InputField label="Pressure" value={cfg.operatingPressure} onChange={v => updateSystemConfig({ operatingPressure: Number(v) })} unit="mTorr" />
          <InputField label="Source Impedance" value={cfg.sourceImpedance} onChange={v => updateSystemConfig({ sourceImpedance: Number(v) })} unit="Ω" hint="50 Ω standard" />
          <InputField label="Ambient Temp" value={cfg.ambientTemp} onChange={v => updateSystemConfig({ ambientTemp: Number(v) })} unit="°C" />
          <InputField label="Process Gas" value={cfg.procesGas} onChange={v => updateSystemConfig({ procesGas: v })} type="text" />
        </div>
      </div>

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
