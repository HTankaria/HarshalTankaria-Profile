import React from 'react';
import { useGenerator } from '../../store/useGeneratorStore';
import { InputField, SelectField, ResultCard, MetricRow, RunButton, SectionHeader } from '../ui';

export default function PulsingControl() {
  const { state, updatePulsingConfig: upd, runPulsingDesign } = useGenerator();
  const cfg = state.pulsingConfig;
  const res = state.pulsingResult;
  return (
    <div className="space-y-6">
      <SectionHeader title="Pulsing & Modulation Control" subtitle="Gate-bias, driver-enable, DC-bus switch, or envelope amplifier pulsing." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField label="Modulation Method" value={cfg.modulationMethod} onChange={v => upd({ modulationMethod: v })}
          options={[
            { value: 'gate_bias', label: 'Gate Bias (fastest, < 50 ns)' },
            { value: 'driver_enable', label: 'Driver Enable' },
            { value: 'dc_bus_switch', label: 'DC Bus Switch (high power)' },
            { value: 'envelope_amp', label: 'Envelope Amplifier (shaped)' },
          ]}
        />
        <InputField label="Pulse Frequency" value={cfg.pulseFrequency_Hz} onChange={v => upd({ pulseFrequency_Hz: parseFloat(v) || 10000 })} unit="Hz" min={1} max={1000000} />
        <InputField label="Duty Cycle" value={cfg.dutyCycle_pct} onChange={v => upd({ dutyCycle_pct: parseFloat(v) || 50 })} unit="%" min={1} max={99} />
        <InputField label="Bulk Capacitance" value={cfg.bulkCapacitance_uF} onChange={v => upd({ bulkCapacitance_uF: parseFloat(v) || 4700 })} unit="µF" min={100} max={100000} help="DC bus holdup cap — reduces voltage droop during pulse" />
      </div>
      <RunButton onClick={runPulsingDesign} label="Design Pulsing System →" />
      {res && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ResultCard title="Pulse Timing" accent="purple">
              <MetricRow label="Rise Time" value={res.actualRiseTime_us.toFixed(2)} unit="µs" highlight />
              <MetricRow label="Fall Time" value={res.actualFallTime_us.toFixed(2)} unit="µs" />
              <MetricRow label="Peak Power" value={res.peakPower_W} unit="W" />
              <MetricRow label="Average Power" value={res.avgPower_W.toFixed(1)} unit="W" highlight />
              <MetricRow label="Supply Droop" value={res.droop_V.toFixed(2)} unit="V" />
            </ResultCard>
            <ResultCard title="Hardware" accent="blue">
              <p className="text-xs text-slate-400 mb-1 font-medium">Switch</p>
              <p className="text-xs text-slate-300 mb-3">{res.switchSuggestion}</p>
              <p className="text-xs text-slate-400 mb-1 font-medium">Driver</p>
              <p className="text-xs text-slate-300">{res.driverSuggestion}</p>
            </ResultCard>
          </div>
          <ResultCard title="Notes" accent="amber">
            <ul className="space-y-1">{res.notes.map((n, i) => <li key={i} className="text-xs text-slate-300 flex gap-2"><span className="text-amber-400 shrink-0">▸</span>{n}</li>)}</ul>
          </ResultCard>
        </div>
      )}
    </div>
  );
}
