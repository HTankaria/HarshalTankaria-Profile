import React from 'react';
import { useStore } from '../../store/useStore';
import { InputField, SelectField, ResultCard, MetricRow, RunButton, SectionHeader } from '../ui';

export default function Step4() {
  const { state, updateTxLineConfig: upd, runTxLineAnalysis, runHarmonicFilter } = useStore();
  const cfg = state.txLineConfig;
  const res = state.txLineResult;

  return (
    <div className="space-y-6">
      <SectionHeader title="Transmission Line Analysis" subtitle="Coax or stripline between RF generator and matching network." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField label="Line Type" value={cfg.lineType} onChange={v => upd({ lineType: v })}
          options={[
            { value: 'coax_50', label: '50Ω Coaxial (RG-8 / LMR-400)' },
            { value: 'coax_75', label: '75Ω Coaxial (RG-6)' },
            { value: 'stripline', label: 'Stripline (PCB)' },
            { value: 'custom', label: 'Custom Z₀' },
          ]}
        />
        <InputField label="Length" value={cfg.length_m} onChange={v => upd({ length_m: parseFloat(v) || 1 })} unit="m" min={0.1} max={50} step={0.1} />
        {cfg.lineType === 'custom' && (
          <InputField label="Custom Z₀" value={cfg.customZ0 ?? 50} onChange={v => upd({ customZ0: parseFloat(v) })} unit="Ω" min={10} max={300} />
        )}
        <InputField label="Loss Factor" value={cfg.lossFactor_dBper100m ?? 1.5} onChange={v => upd({ lossFactor_dBper100m: parseFloat(v) })} unit="dB/100m" min={0} max={20} help="At reference frequency — scales with √f" />
      </div>
      <RunButton onClick={runTxLineAnalysis} label="Analyse Transmission Line" />
      {res && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ResultCard title="Line Parameters" accent="blue">
              <MetricRow label="Characteristic Z₀" value={res.Z0} unit="Ω" />
              <MetricRow label="Electrical Length" value={res.betaL_deg.toFixed(1)} unit="°" />
              <MetricRow label="Phase Shift" value={res.phaseShift_deg.toFixed(1)} unit="°" />
              <MetricRow label="Attenuation" value={res.attenuation_dB.toFixed(3)} unit="dB" />
              <MetricRow label="Power Loss" value={res.powerLoss_W.toFixed(1)} unit="W" />
            </ResultCard>
            <ResultCard title="Load Reflection" accent="green">
              <MetricRow label="VSWR at Load" value={res.vswr.toFixed(2)} highlight={res.vswr < 1.5} />
              <MetricRow label="Return Loss" value={res.returnLoss_dB.toFixed(1)} unit="dB" highlight />
              <MetricRow label="Zin Re" value={res.Zin.re.toFixed(2)} unit="Ω" />
              <MetricRow label="Zin Im" value={res.Zin.im.toFixed(2)} unit="Ω" />
            </ResultCard>
          </div>
          {res.notes.length > 0 && (
            <ResultCard title="Notes" accent="amber">
              <ul className="space-y-1">{res.notes.map((n, i) => <li key={i} className="text-xs text-slate-300 flex gap-2"><span className="text-amber-400 shrink-0">▸</span>{n}</li>)}</ul>
            </ResultCard>
          )}
          <RunButton onClick={runHarmonicFilter} label="Design Harmonic Filter →" />
        </div>
      )}
    </div>
  );
}
