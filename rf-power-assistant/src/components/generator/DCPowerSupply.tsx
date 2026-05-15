import React from 'react';
import { useGenerator } from '../../store/useGeneratorStore';
import { InputField, SelectField, ResultCard, MetricRow, RunButton, SectionHeader } from '../ui';

export default function DCPowerSupply() {
  const { state, updateDCConfig: upd, runDCDesign } = useGenerator();
  const cfg = state.dcConfig;
  const res = state.dcResult;
  return (
    <div className="space-y-6">
      <SectionHeader title="DC Power Supply & PFC" subtitle="Front-end AC-DC converter: PFC topology, bulk capacitor, and holdup design." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField label="AC Input Voltage" value={cfg.acInputVoltage_V} onChange={v => upd({ acInputVoltage_V: parseFloat(v) || 480 })} unit="V" min={100} max={690} />
        <SelectField label="AC Phases" value={cfg.acInputPhases.toString() as '1'|'3'} onChange={v => upd({ acInputPhases: parseInt(v) as 1|3 })} options={[{ value: '1', label: 'Single Phase' }, { value: '3', label: '3-Phase' }]} />
        <InputField label="Output Power" value={cfg.outputPower_W} onChange={v => upd({ outputPower_W: parseFloat(v) || 3000 })} unit="W" min={100} max={30000} />
        <InputField label="Output Voltage" value={cfg.outputVoltage_V} onChange={v => upd({ outputVoltage_V: parseFloat(v) || 300 })} unit="V" min={100} max={800} />
        <SelectField label="PFC Topology" value={cfg.pfcTopology} onChange={v => upd({ pfcTopology: v })}
          options={[
            { value: 'boost_pfc', label: 'Boost PFC (classic)' },
            { value: 'bridgeless_totem_pole', label: 'Bridgeless Totem-Pole' },
            { value: 'vienna_3ph', label: 'Vienna 3-Phase' },
          ]}
        />
        <InputField label="Holdup Time" value={cfg.holdupTime_ms} onChange={v => upd({ holdupTime_ms: parseFloat(v) || 20 })} unit="ms" min={1} max={100} />
        <InputField label="Switch Frequency" value={cfg.switchFrequency_kHz} onChange={v => upd({ switchFrequency_kHz: parseFloat(v) || 100 })} unit="kHz" min={16} max={500} />
      </div>
      <RunButton onClick={runDCDesign} label="Design DC Supply →" />
      {res && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ResultCard title="DC Bus Design" accent="purple">
            <MetricRow label="DC Bus Voltage" value={res.dcBusVoltage_V} unit="V" highlight />
            <MetricRow label="Bulk Capacitance" value={res.bulkCapacitance_uF} unit="µF" highlight />
            <MetricRow label="PFC Inductance" value={res.pfcInductance_uH} unit="µH" />
            <MetricRow label="Ripple Voltage" value={res.rippleVoltage_V.toFixed(2)} unit="V" />
            <MetricRow label="Efficiency" value={res.efficiency_pct} unit="%" />
            <MetricRow label="Fuse Rating" value={res.fuseRating_A} unit="A" />
          </ResultCard>
          <ResultCard title="Switch Ratings" accent="blue">
            <MetricRow label="Input RMS Current" value={res.inputCurrentRMS_A} unit="A" />
            <MetricRow label="Peak Switch Current" value={res.switchCurrentPeak_A} unit="A" highlight />
            <div className="mt-2 pt-2 border-t border-slate-700">
              <p className="text-xs text-slate-400 mb-1">Switch Suggestion</p>
              <p className="text-xs text-slate-300">{res.pfcSwitchSuggestion}</p>
            </div>
          </ResultCard>
          <ResultCard title="Design Notes" accent="amber">
            <ul className="space-y-1">{res.notes.map((n, i) => <li key={i} className="text-xs text-slate-300 flex gap-2"><span className="text-amber-400 shrink-0">▸</span>{n}</li>)}</ul>
          </ResultCard>
        </div>
      )}
    </div>
  );
}
