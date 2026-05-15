import React from 'react';
import { RadioTower, Play, Cpu } from 'lucide-react';
import { InputField } from '../ui/InputField';
import { SelectField } from '../ui/SelectField';
import { ResultCard } from '../ui/ResultCard';
import { Badge } from '../ui/Badge';
import { useGenerator } from '../../store/useGeneratorStore';
import { formatValue, formatFreq } from '../../calculations/rfCalc';

const CLASS_OPTIONS = [
  { value: 'A',     label: 'Class A – Linear, low distortion (η≈50%)' },
  { value: 'B',     label: 'Class B – Half-wave, higher efficiency (η≈78%)' },
  { value: 'AB',    label: 'Class AB – Linear compromise (η≈65%)' },
  { value: 'D',     label: 'Class D – Switching, wideband (η≈90%)' },
  { value: 'E',     label: 'Class E – Resonant switching, ISM standard (η≈90%)' },
  { value: 'F_inv', label: 'Class F⁻¹ – Inverse Class F, HF-optimised (η≈92%)' },
];
const DEVICE_OPTIONS = [
  { value: 'LDMOS',      label: 'RF LDMOS (Vdd 28–65V, best 1–300 MHz)' },
  { value: 'GaN_HEMT',   label: 'GaN HEMT (Vdd 28–65V, best 100 MHz–6 GHz)' },
  { value: 'GaAs_pHEMT', label: 'GaAs pHEMT (Vdd 5–12V, best > 1 GHz)' },
  { value: 'SiC_MOSFET', label: 'SiC MOSFET (Vdd 48–120V, < 100 MHz, pulsed)' },
];

function PABlockDiagram({ paClass, stages }: { paClass: string; stages: number }) {
  const stageW = stages === 1 ? 0 : 90;
  return (
    <svg viewBox={`0 0 ${300 + stageW} 80`} className="w-full rounded-lg bg-slate-950 border border-slate-700">
      <text x="8" y="28" fill="#94a3b8" fontSize="8">Exciter</text>
      <text x="8" y="40" fill="#60a5fa" fontSize="8">~0 dBm</text>
      <line x1="50" y1="34" x2="70" y2="34" stroke="#60a5fa" strokeWidth="1.5" />
      <line x1="50" y1="50" x2="510" y2="50" stroke="#334155" strokeWidth="0.7" strokeDasharray="3,3" />

      {stages >= 2 && (
        <>
          <rect x="70" y="18" width="75" height="32" rx="4" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1" />
          <text x="108" y="32" fill="#a5b4fc" fontSize="8" textAnchor="middle">Driver</text>
          <text x="108" y="43" fill="#a5b4fc" fontSize="8" textAnchor="middle">Stage</text>
          <line x1="145" y1="34" x2="165" y2="34" stroke="#60a5fa" strokeWidth="1.5" />
          {/* Driver DC feed */}
          <line x1="108" y1="18" x2="108" y2="8" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2,2" />
          <text x="112" y="10" fill="#f59e0b" fontSize="7">Vdd</text>
        </>
      )}

      {/* Final stage */}
      {(() => {
        const x = stages >= 2 ? 165 : 70;
        return (
          <>
            <rect x={x} y="12" width="95" height="44" rx="4" fill="#1a2e1a" stroke="#22c55e" strokeWidth="1.5" />
            <text x={x + 47} y="30" fill="#86efac" fontSize="9" textAnchor="middle" fontWeight="bold">Final PA</text>
            <text x={x + 47} y="42" fill="#86efac" fontSize="8" textAnchor="middle">Class {paClass.replace('_inv', '⁻¹')}</text>
            <text x={x + 47} y="52" fill="#4ade80" fontSize="7" textAnchor="middle">RF LDMOS/GaN</text>
            <line x1={x} y1="34" x2={x} y2="34" stroke="#60a5fa" strokeWidth="1.5" />
            {/* PA DC feed */}
            <line x1={x + 47} y1="12" x2={x + 47} y2="4" stroke="#f59e0b" strokeWidth="1.2" />
            <text x={x + 52} y="9" fill="#f59e0b" fontSize="7">+Vdd</text>
            {/* Output */}
            <line x1={x + 95} y1="34" x2={x + 120} y2="34" stroke="#60a5fa" strokeWidth="1.5" />
            {/* Output network */}
            <rect x={x + 120} y="22" width="55" height="24" rx="4" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="1" />
            <text x={x + 148} y="32" fill="#93c5fd" fontSize="8" textAnchor="middle">Output</text>
            <text x={x + 148} y="42" fill="#93c5fd" fontSize="8" textAnchor="middle">Match</text>
            <line x1={x + 175} y1="34" x2={x + 195} y2="34" stroke="#60a5fa" strokeWidth="1.5" />
            <text x={x + 197} y="30" fill="#94a3b8" fontSize="8">50 Ω</text>
            <text x={x + 197} y="41" fill="#60a5fa" fontSize="8">→ Filter</text>
          </>
        );
      })()}
    </svg>
  );
}

export function RFAmplifier() {
  const { state, updateAmpConfig, runAmpDesign } = useGenerator();
  const { ampConfig: cfg, ampResult: res } = state;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-violet-500/15 border border-violet-500/30">
          <RadioTower size={18} className="text-violet-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-100">RF Power Amplifier</h3>
          <p className="text-xs text-slate-400">PA class selection, transistor sizing, Class E/D resonant network, and internal output matching (Ropt → 50 Ω).</p>
        </div>
      </div>

      <PABlockDiagram paClass={cfg.paClass} stages={cfg.numStages} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SelectField label="PA Class" value={cfg.paClass} onChange={v => updateAmpConfig({ paClass: v as typeof cfg.paClass })} options={CLASS_OPTIONS} />
        <SelectField label="Transistor Technology" value={cfg.transistorType} onChange={v => updateAmpConfig({ transistorType: v as typeof cfg.transistorType })} options={DEVICE_OPTIONS} />
        <InputField label="Drain Voltage (Vdd)" value={cfg.drainVoltage} onChange={v => updateAmpConfig({ drainVoltage: Number(v) })} unit="V" hint="LDMOS: 50V, GaN: 28V" />
        <InputField label="RF Output Power" value={cfg.rfOutputPower} onChange={v => updateAmpConfig({ rfOutputPower: Number(v) })} unit="W" />
        <InputField label="Frequency" value={cfg.frequency} onChange={v => updateAmpConfig({ frequency: Number(v) })} unit="Hz" hint={formatFreq(cfg.frequency)} />
        <InputField label="Devices in Parallel" value={cfg.numParallelDevices} onChange={v => updateAmpConfig({ numParallelDevices: Math.max(1, Number(v)) })} unit="qty" hint="Push-pull pair = 2" />
        <InputField label="Number of Stages" value={cfg.numStages} onChange={v => updateAmpConfig({ numStages: Math.max(1, Math.min(4, Number(v))) })} unit="" hint="Driver + Final" />
        <InputField label="Target Total Gain" value={cfg.targetGain_dB} onChange={v => updateAmpConfig({ targetGain_dB: Number(v) })} unit="dB" />
      </div>

      <button onClick={runAmpDesign}
        className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors">
        <Play size={14} /> Design RF Amplifier
      </button>

      {res && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ResultCard title="PA Operating Point" icon={<RadioTower size={14} />} accent="border-violet-500/40"
              metrics={[
                { label: 'Ropt (per device)', value: `${res.optimalLoadR_per_device.toFixed(2)} Ω` },
                { label: 'Drain Efficiency (theoretical)', value: `${(res.drainEfficiency * 100).toFixed(0)}%` },
                { label: 'Real Efficiency', value: `${(res.realEfficiency * 100).toFixed(0)}%`, status: res.realEfficiency > 0.85 ? 'ok' : 'warning' },
                { label: 'PAE', value: `${(res.powerAddedEfficiency * 100).toFixed(0)}%` },
                { label: 'DC Total Current', value: `${res.dcCurrentTotal.toFixed(1)} A` },
                { label: 'Power Dissipation', value: `${res.powerDissipation.toFixed(0)} W (heat)`, status: res.powerDissipation > cfg.rfOutputPower * 0.2 ? 'warning' : 'ok' },
              ]}
            />
            <ResultCard title="Device Ratings" icon={<Cpu size={14} />} accent="border-red-500/30"
              metrics={[
                { label: 'Peak Vds', value: `${res.peakVoltage_Vds.toFixed(0)} V pk`, status: 'warning' },
                { label: 'Required Vds Rating', value: `${res.vdsMaxRating} V`, status: 'ok' },
                { label: 'Peak Id', value: `${res.peakCurrent_Id.toFixed(1)} A pk` },
                { label: 'Required Id Rating', value: `${res.idMaxRating} A`, status: 'ok' },
                { label: '2nd Harmonic', value: `${res.harmonicLevel_2f_dBc} dBc` },
                { label: '3rd Harmonic', value: `${res.harmonicLevel_3f_dBc} dBc` },
              ]}
            />
          </div>

          {/* Class E specific */}
          {cfg.paClass === 'E' && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
              <div className="text-xs font-semibold text-emerald-300 mb-2">Class E Resonant Network Components</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {[
                  { label: 'Shunt Capacitor (Cshunt)', val: `${res.classEshuntC_pF.toFixed(1)} pF`, note: 'Includes Coss of transistor' },
                  { label: 'Series Inductance (Lres)', val: `${res.classEseriesL_nH.toFixed(1)} nH`, note: 'Series resonant with series C' },
                  { label: 'Internal Match L', val: formatValue(res.internalMatchNetworkL_nH * 1e-9, 'H'), note: `Ropt=${res.optimalLoadR_per_device.toFixed(1)}Ω → 50Ω` },
                  { label: 'Internal Match C', val: formatValue(res.internalMatchNetworkC_pF * 1e-12, 'F'), note: 'Shunt at 50Ω port' },
                ].map(m => (
                  <div key={m.label} className="flex flex-col gap-0.5">
                    <span className="text-slate-500 text-[10px]">{m.label}</span>
                    <span className="font-mono text-emerald-300 font-semibold">{m.val}</span>
                    <span className="text-slate-600 text-[9px]">{m.note}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {cfg.paClass !== 'E' && (
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
              <div className="text-xs font-semibold text-blue-300 mb-2">Output Matching Network (Ropt → 50 Ω, L-network)</div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500">Series L: </span>
                  <span className="font-mono text-blue-300">{formatValue(res.internalMatchNetworkL_nH * 1e-9, 'H')}</span>
                  <span className="text-slate-600 ml-1">(PA side)</span>
                </div>
                <div>
                  <span className="text-slate-500">Shunt C: </span>
                  <span className="font-mono text-blue-300">{formatValue(res.internalMatchNetworkC_pF * 1e-12, 'F')}</span>
                  <span className="text-slate-600 ml-1">(50Ω side)</span>
                </div>
              </div>
            </div>
          )}

          {/* Part suggestion */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3 text-xs">
            <div className="text-slate-400 font-semibold mb-1">Suggested Transistor</div>
            <div className="text-slate-200">{res.transistorPartSuggestion}</div>
          </div>

          {/* Stage power breakdown */}
          {res.stagePower_W.length > 1 && (
            <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
              <div className="text-xs font-semibold text-slate-400 mb-2">Stage Power Breakdown</div>
              <div className="flex gap-4 items-center flex-wrap">
                {res.stagePower_W.map((p, i) => (
                  <div key={i} className="flex flex-col text-xs text-center">
                    <Badge color={i === res.stagePower_W.length - 1 ? 'green' : 'purple'}>
                      Stage {i + 1}: {p.toFixed(0)} W
                    </Badge>
                    {i < res.stagePower_W.length - 1 && <span className="text-slate-500 mt-1">→</span>}
                  </div>
                ))}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                Drive power required from exciter: {res.inputPower_W.toFixed(2)} W ({(10 * Math.log10(res.inputPower_W / 0.001)).toFixed(1)} dBm)
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
