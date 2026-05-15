import React from 'react';
import { useAIRack } from '../../store/useAIRackStore';
import { InputField, SelectField, ResultCard, MetricRow, RunButton, SectionHeader } from '../ui';

export default function DCDCStages() {
  const { state, updateDCDCConfig: upd, runDCDCCalc } = useAIRack();
  const cfg = state.dcdcConfig;
  const res = state.dcdcResult;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="DC-DC Converter Stages"
        subtitle="48V bus to GPU/CPU rails — LLC bricks, multi-phase VRM design."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField label="Conversion Path" value={cfg.conversionPath}
          onChange={v => upd({ conversionPath: v })}
          options={[
            { value: '2stage_12V',      label: '2-Stage: 48V→12V→VRM (mature)' },
            { value: 'direct_48V_VRM',  label: 'Direct 48V VRM (GaN, efficient)' },
            { value: 'hybrid',          label: 'Hybrid (GPU direct + CPU via 12V)' },
          ]}
          help="Direct 48V VRM eliminates intermediate 12V bus; requires high-voltage GaN VRM silicon"
        />
        <InputField label="Primary Bus Voltage" value={cfg.primaryBusVoltage_V}
          onChange={v => upd({ primaryBusVoltage_V: parseFloat(v) || 48 })}
          unit="V" min={12} max={400}
        />
        <InputField label="Total Load Power" value={cfg.totalLoadPower_kW}
          onChange={v => upd({ totalLoadPower_kW: parseFloat(v) || 100 })}
          unit="kW" min={1} max={500}
        />
        <InputField label="GPU Count" value={cfg.gpuCount}
          onChange={v => upd({ gpuCount: parseInt(v) || 8 })}
          min={1} max={128}
        />
        <InputField label="GPU TDP" value={cfg.gpuTdp_W}
          onChange={v => upd({ gpuTdp_W: parseFloat(v) || 700 })}
          unit="W" min={100} max={2000}
        />
        <InputField label="GPU Rail Voltage" value={cfg.gpuVoltage_V}
          onChange={v => upd({ gpuVoltage_V: parseFloat(v) || 1.8 })}
          unit="V" min={0.5} max={12}
          help="Typical: 1.8 V (H100/B100) or 1.0 V (direct)"
        />
        <InputField label="CPU Rail Voltage" value={cfg.cpuVoltage_V}
          onChange={v => upd({ cpuVoltage_V: parseFloat(v) || 12 })}
          unit="V" min={0.5} max={48}
        />
        <InputField label="Switch Frequency" value={cfg.switchFrequency_kHz}
          onChange={v => upd({ switchFrequency_kHz: parseFloat(v) || 500 })}
          unit="kHz" min={50} max={5000}
          help="VRM: 500–2000 kHz; intermediate LLC: 200–500 kHz"
        />
        <InputField label="VRM Phases" value={cfg.vrmPhases}
          onChange={v => upd({ vrmPhases: parseInt(v) || 8 })}
          min={1} max={64}
          help="More phases → lower per-phase current, better transient response"
        />
      </div>

      <RunButton onClick={runDCDCCalc} label="Design DC-DC Stages →" />

      {res && (
        <div className="space-y-4">
          {res.stages.map((stage, i) => (
            <ResultCard key={i} title={stage.name} accent={i === 0 ? 'blue' : 'purple'}>
              <div className="grid grid-cols-2 gap-x-4">
                <MetricRow label="Input Voltage" value={stage.inputVoltage_V} unit="V" />
                <MetricRow label="Output Voltage" value={stage.outputVoltage_V} unit="V" />
                <MetricRow label="Output Current" value={stage.outputCurrent_A} unit="A" highlight />
                <MetricRow label="Efficiency" value={stage.efficiency_pct} unit="%" highlight />
                <MetricRow label="Peak Switch Current" value={stage.switchCurrentPeak_A} unit="A" />
                <MetricRow label="Inductance / Phase" value={stage.inductancePerPhase_nH} unit="nH" />
                <MetricRow label="Output Capacitance" value={stage.outputCapacitance_uF} unit="µF" />
                <MetricRow label="Power Loss" value={stage.powerLoss_W} unit="W" />
              </div>
              <div className="mt-2 pt-2 border-t border-slate-700">
                <p className="text-xs text-slate-400 mb-1">Switch / IC Suggestion</p>
                <p className="text-xs text-slate-300">{stage.switchSuggestion}</p>
              </div>
            </ResultCard>
          ))}

          <ResultCard title="Overall Efficiency Chain" accent="green">
            <MetricRow label="Overall Efficiency" value={res.overallEfficiency_pct} unit="%" highlight />
            <MetricRow label="Total Conversion Loss" value={res.totalConversionLoss_kW} unit="kW" />
            <MetricRow label="Power at GPU Rail" value={res.powerAtGPURail_kW} unit="kW" highlight />
            <MetricRow label="VRM Output Ripple" value={res.vrmRipple_mV} unit="mV" />
            <MetricRow label="Load Transient Response" value={res.loadTransientResponse_us} unit="µs" />
          </ResultCard>

          <ResultCard title="Design Notes" accent="amber">
            <ul className="space-y-1">
              {res.designNotes.map((n, i) => (
                <li key={i} className="text-xs text-slate-300 flex gap-2">
                  <span className="text-amber-400 shrink-0">▸</span>{n}
                </li>
              ))}
            </ul>
          </ResultCard>
        </div>
      )}
    </div>
  );
}
