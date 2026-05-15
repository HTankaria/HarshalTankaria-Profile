import React from 'react';
import { useGenerator } from '../../store/useGeneratorStore';
import { InputField, SelectField, ResultCard, MetricRow, RunButton, SectionHeader } from '../ui';

export default function ControlSystem() {
  const { state, updateControlConfig: upd, runControlDesign } = useGenerator();
  const cfg = state.controlConfig;
  const res = state.controlResult;
  return (
    <div className="space-y-6">
      <SectionHeader title="Control System & PLL" subtitle="Frequency synthesis, PID power control, and safety interlocks." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField label="Frequency Control" value={cfg.frequencyControl} onChange={v => upd({ frequencyControl: v })}
          options={[
            { value: 'integer_N_PLL', label: 'Integer-N PLL' },
            { value: 'DDS', label: 'Direct Digital Synthesis (DDS)' },
            { value: 'fixed_crystal', label: 'Fixed Crystal / VCXO' },
          ]}
        />
        <InputField label="Reference Frequency" value={cfg.referenceFreq_MHz} onChange={v => upd({ referenceFreq_MHz: parseFloat(v) || 1 })} unit="MHz" min={0.001} max={100} step={0.001} />
        <InputField label="Target Frequency" value={cfg.targetFreq_MHz} onChange={v => upd({ targetFreq_MHz: parseFloat(v) || 13.56 })} unit="MHz" min={0.1} max={300} step={0.01} />
        <InputField label="Loop Bandwidth" value={cfg.loopBandwidth_kHz} onChange={v => upd({ loopBandwidth_kHz: parseFloat(v) || 10 })} unit="kHz" min={0.1} max={1000} />
        <InputField label="PID Kp" value={cfg.pidKp} onChange={v => upd({ pidKp: parseFloat(v) || 0.5 })} step={0.01} />
        <InputField label="PID Ki" value={cfg.pidKi} onChange={v => upd({ pidKi: parseFloat(v) || 10 })} step={0.1} />
        <InputField label="PID Kd" value={cfg.pidKd} onChange={v => upd({ pidKd: parseFloat(v) || 0.001 })} step={0.0001} />
      </div>
      <RunButton onClick={runControlDesign} label="Design Control System →" />
      {res && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ResultCard title="PLL Performance" accent="purple">
              <MetricRow label="Divider N" value={res.pllDividerN} highlight />
              <MetricRow label="Lock Time" value={res.lockTime_us.toFixed(1)} unit="µs" />
              <MetricRow label="Phase Noise" value={res.phaseNoise_dBcHz} unit="dBc/Hz" />
              <MetricRow label="Freq Resolution" value={res.frequencyResolution_Hz} unit="Hz" />
              <MetricRow label="PID Bandwidth" value={res.pidBandwidth_Hz.toFixed(0)} unit="Hz" />
            </ResultCard>
            <ResultCard title="MCU / Synthesiser" accent="blue">
              <p className="text-xs text-slate-300">{res.mcuSuggestion}</p>
            </ResultCard>
          </div>
          <ResultCard title="Safety Interlocks" accent="red">
            <ul className="space-y-1">{res.interlocks.map((il, i) => <li key={i} className="text-xs text-slate-300 flex gap-2"><span className="text-red-400 shrink-0">⚠</span>{il}</li>)}</ul>
          </ResultCard>
          <ResultCard title="Notes" accent="amber">
            <ul className="space-y-1">{res.notes.map((n, i) => <li key={i} className="text-xs text-slate-300 flex gap-2"><span className="text-amber-400 shrink-0">▸</span>{n}</li>)}</ul>
          </ResultCard>
        </div>
      )}
    </div>
  );
}
