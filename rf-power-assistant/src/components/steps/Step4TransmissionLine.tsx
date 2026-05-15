import React from 'react';
import { Cable, AlertTriangle, CheckCircle } from 'lucide-react';
import { SelectField } from '../ui/SelectField';
import { InputField } from '../ui/InputField';
import { ResultCard } from '../ui/ResultCard';
import { Badge } from '../ui/Badge';
import { useStore } from '../../store/useStore';
import type { CableType } from '../../types';

const CABLE_OPTIONS = [
  { value: 'LMR400',     label: 'LMR-400 (50 Ω, 2.5 kW, flexible)' },
  { value: 'LMR600',     label: 'LMR-600 (50 Ω, 4.5 kW, semi-rigid)' },
  { value: 'RG8',        label: 'RG-8 / RG-8X (52 Ω, 1 kW)' },
  { value: 'RG213',      label: 'RG-213 (50 Ω, 1 kW)' },
  { value: 'HELIAX_1_2', label: 'Andrew HELIAX ½″ (50 Ω, 8 kW)' },
  { value: 'CUSTOM',     label: 'Custom Specification' },
];

export function Step4TransmissionLine() {
  const { state, updateTxLineConfig, runTxLineAnalysis, setStep } = useStore();
  const { transmissionLineConfig: cfg, transmissionLineResult: res, systemConfig, plasmaLoad } = state;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-yellow-500/15 border border-yellow-500/30">
          <Cable size={20} className="text-yellow-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Transmission Line Analysis</h2>
          <p className="text-sm text-slate-400">
            Characterise the coaxial cable between the RF generator/matching box and the process chamber.
            Cable length affects impedance presented to the matching network.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField
          label="Cable Type"
          value={cfg.cableType}
          onChange={v => updateTxLineConfig({ cableType: v as CableType })}
          options={CABLE_OPTIONS}
        />
        <InputField
          label="Cable Length"
          value={cfg.length}
          onChange={v => updateTxLineConfig({ length: Number(v) })}
          unit="m" min={0.1} step={0.1}
          hint="Physical length of coax"
        />
      </div>

      {cfg.cableType === 'CUSTOM' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 rounded-lg border border-slate-700 bg-slate-800/40">
          <InputField label="Characteristic Z₀" value={cfg.customZ0} onChange={v => updateTxLineConfig({ customZ0: Number(v) })} unit="Ω" />
          <InputField label="Velocity Factor" value={cfg.customVF} onChange={v => updateTxLineConfig({ customVF: Number(v) })} unit="(0–1)" step={0.01} />
          <InputField label="Attenuation" value={cfg.customAttendB100ft} onChange={v => updateTxLineConfig({ customAttendB100ft: Number(v) })} unit="dB/100ft" />
        </div>
      )}

      <button
        onClick={runTxLineAnalysis}
        className="flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-3 rounded-lg text-sm font-semibold transition-colors"
      >
        <Cable size={16} />
        Analyse Transmission Line
      </button>

      {res && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ResultCard
              title="Line Parameters"
              icon={<Cable size={16} />}
              accent="border-yellow-500/40"
              metrics={[
                { label: 'Z₀', value: `${res.characteristicImpedance} Ω` },
                { label: 'Velocity Factor', value: res.velocityFactor.toFixed(2) },
                { label: 'Electrical Length', value: `${res.electricalLength.toFixed(1)}°` },
                { label: 'Total Attenuation', value: `${res.attenuation.toFixed(3)} dB`, status: res.attenuation > 0.5 ? 'warning' : 'ok' },
              ]}
            />
            <ResultCard
              title="Power & Voltage"
              accent="border-orange-500/40"
              metrics={[
                { label: 'Input VSWR', value: `${res.inputVSWR.toFixed(2)}:1`, status: res.inputVSWR > 2 ? 'warning' : 'ok' },
                { label: 'Reflected Power', value: `${res.reflectedPower.toFixed(1)} W`, status: res.reflectedPower > systemConfig.primaryPower * 0.05 ? 'warning' : 'ok' },
                { label: 'Peak Voltage', value: `${res.peakVoltage.toFixed(0)} V`, status: res.peakVoltage > 2000 ? 'warning' : 'ok' },
                { label: 'Peak Current', value: `${res.peakCurrent.toFixed(2)} A` },
                { label: 'Power Rating', value: `${res.powerHandling} W`, status: systemConfig.primaryPower > res.powerHandling * 0.8 ? 'critical' : 'ok' },
              ]}
            />
          </div>

          {/* Input impedance */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
            <h4 className="text-xs font-semibold text-slate-400 mb-2">Transformed Input Impedance (at generator port)</h4>
            <div className="flex flex-wrap gap-3 items-center">
              <span className="font-mono text-sm text-slate-200">
                Z<sub>in</sub> = {res.inputImpedance.r.toFixed(2)} {res.inputImpedance.i >= 0 ? '+' : ''}
                {res.inputImpedance.i.toFixed(2)} j Ω
              </span>
              <Badge color={res.inputVSWR > 3 ? 'red' : res.inputVSWR > 2 ? 'yellow' : 'green'}>
                VSWR {res.inputVSWR.toFixed(1)}:1
              </Badge>
              {res.inputVSWR <= 1.5 && (
                <div className="flex items-center gap-1 text-emerald-400 text-xs">
                  <CheckCircle size={12} /> Excellent match
                </div>
              )}
              {res.inputVSWR > 3 && (
                <div className="flex items-center gap-1 text-yellow-400 text-xs">
                  <AlertTriangle size={12} /> High mismatch — consider cable re-routing or stub matching
                </div>
              )}
            </div>
          </div>

          {/* Safety check */}
          {systemConfig.primaryPower > res.powerHandling && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 flex gap-2 items-start">
              <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-red-300">
                <strong>Power Overrating:</strong> Selected cable rated for {res.powerHandling} W; system power is {systemConfig.primaryPower} W.
                Upgrade to LMR-600 or Andrew HELIAX ½″.
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between">
        <button onClick={() => setStep(3)} className="text-slate-400 hover:text-slate-200 text-sm transition-colors">← Back</button>
        <button
          onClick={() => setStep(5)}
          disabled={!res}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Next: Harmonic Filter →
        </button>
      </div>
    </div>
  );
}
