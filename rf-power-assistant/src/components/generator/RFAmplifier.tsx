import React from 'react';
import { useGenerator } from '../../store/useGeneratorStore';
import { InputField, SelectField, ResultCard, MetricRow, RunButton, SectionHeader } from '../ui';

export default function RFAmplifier() {
  const { state, updateAmpConfig: upd, runAmpDesign } = useGenerator();
  const cfg = state.ampConfig;
  const res = state.ampResult;
  return (
    <div className="space-y-6">
      <SectionHeader title="RF Power Amplifier" subtitle="PA class selection and Sokal Class E / Class D design formulas." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField label="PA Class" value={cfg.paClass} onChange={v => upd({ paClass: v })}
          options={[
            { value: 'CLASS_E', label: 'Class E (ZVS, highest eff.)' },
            { value: 'CLASS_D', label: 'Class D (switching)' },
            { value: 'CLASS_F_INV', label: 'Class F⁻¹ (inverse F)' },
            { value: 'CLASS_AB', label: 'Class AB (linear)' },
            { value: 'CLASS_B', label: 'Class B' },
            { value: 'CLASS_A', label: 'Class A (most linear)' },
          ]}
        />
        <SelectField label="Transistor Technology" value={cfg.transistorType} onChange={v => upd({ transistorType: v })}
          options={[
            { value: 'GaN_HEMT', label: 'GaN HEMT (best for > 10 MHz)' },
            { value: 'LDMOS', label: 'LDMOS (< 500 MHz, high power)' },
            { value: 'SiC_JFET', label: 'SiC JFET (< 50 MHz)' },
            { value: 'Si_BJT', label: 'Si BJT (< 30 MHz, legacy)' },
          ]}
        />
        <InputField label="Output Power" value={cfg.outputPower_W} onChange={v => upd({ outputPower_W: parseFloat(v) || 3000 })} unit="W" min={10} max={30000} />
        <InputField label="Supply Voltage Vdd" value={cfg.supplyVoltage_V} onChange={v => upd({ supplyVoltage_V: parseFloat(v) || 300 })} unit="V" min={12} max={800} />
        <InputField label="Frequency" value={cfg.frequency_Hz / 1e6} onChange={v => upd({ frequency_Hz: parseFloat(v) * 1e6 || 13.56e6 })} unit="MHz" min={0.1} max={300} step={0.01} />
        <InputField label="Stages" value={cfg.stages} onChange={v => upd({ stages: parseInt(v) || 1 })} min={1} max={4} help="Multi-stage: driver + final; each stage ~10 dB gain" />
      </div>
      <RunButton onClick={runAmpDesign} label="Design RF Amplifier →" />
      {res && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ResultCard title="Operating Point" accent="purple">
              <MetricRow label="Drain Efficiency" value={res.drainEfficiency_pct} unit="%" highlight />
              <MetricRow label="PAE" value={res.pac_efficiency_pct} unit="%" />
              <MetricRow label="DC Current Idc" value={res.dcCurrent_A.toFixed(2)} unit="A" />
              <MetricRow label="Peak Vds" value={res.vdsPeak_V.toFixed(1)} unit="V" highlight />
              <MetricRow label="Peak Id" value={res.idPeak_A.toFixed(2)} unit="A" />
              <MetricRow label="Input Power" value={res.inputPower_W.toFixed(1)} unit="W" />
            </ResultCard>
            <ResultCard title="Class E Network" accent="blue">
              <MetricRow label="Ropt" value={res.Ropt_ohm.toFixed(2)} unit="Ω" highlight />
              <MetricRow label="Cshunt" value={res.Cshunt_pF.toFixed(1)} unit="pF" />
              <MetricRow label="Lseries" value={res.Lseries_nH.toFixed(1)} unit="nH" />
              <MetricRow label="Output Match Q" value={res.outputMatchQ.toFixed(2)} />
            </ResultCard>
          </div>
          <ResultCard title="Harmonic Levels" accent="amber">
            <div className="flex gap-4 flex-wrap">
              {res.harmonicLevels.map(h => (
                <div key={h.h} className="text-center">
                  <p className="text-xs text-slate-400">{h.h}nd harmonic</p>
                  <p className="font-mono text-sm text-amber-300">{h.dBc} dBc</p>
                </div>
              ))}
            </div>
          </ResultCard>
          <ResultCard title="Transistor Suggestion" accent="green">
            <p className="text-xs text-slate-300">{res.transistorSuggestion}</p>
            <ul className="mt-2 space-y-1">{res.classNotes.map((n, i) => <li key={i} className="text-xs text-slate-400 flex gap-2"><span className="text-emerald-400 shrink-0">▸</span>{n}</li>)}</ul>
          </ResultCard>
        </div>
      )}
    </div>
  );
}
