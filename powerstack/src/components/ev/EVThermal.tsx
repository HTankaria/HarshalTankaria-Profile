import React from 'react';
import { useEV } from '../../store/useEVStore';
import { InputField, SelectField, ResultCard, MetricRow, RunButton, SectionHeader, Badge } from '../ui';

export default function EVThermal() {
  const { state, updateThermalConfig: upd, runThermalCalc } = useEV();
  const cfg = state.thermalConfig;
  const res = state.thermalResult;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Thermal Management & Safety"
        subtitle="Heatsink, coolant, and safety compliance design for the power conversion stack."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField label="Total Power Loss" value={cfg.totalLoss_W}
          onChange={v => upd({ totalLoss_W: parseFloat(v) || 1000 })}
          unit="W" min={100} max={50000}
          help="Sum of PFC and DC-DC losses — auto-filled from previous steps"
        />
        <SelectField label="Cooling Method" value={cfg.coolingMethod}
          onChange={v => upd({ coolingMethod: v })}
          options={[
            { value: 'forced_air', label: 'Forced Air' },
            { value: 'liquid_glycol', label: 'Liquid Glycol (50/50)' },
            { value: 'liquid_direct', label: 'Direct Liquid Cooling' },
          ]}
        />
        <InputField label="Ambient Temperature" value={cfg.ambientTemp_C}
          onChange={v => upd({ ambientTemp_C: parseFloat(v) || 40 })}
          unit="°C" min={-20} max={60}
          help="Outdoor ambient: typically 40 °C per IEC 60068-2"
        />
        <InputField label="Target Junction Temp" value={cfg.targetJunctionTemp_C}
          onChange={v => upd({ targetJunctionTemp_C: parseFloat(v) || 125 })}
          unit="°C" min={60} max={175}
          help="SiC MOSFET Tj max: 175 °C; design target: 125 °C"
        />
      </div>

      <RunButton onClick={runThermalCalc} label="Analyse Thermal Design →" />

      {res && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ResultCard title="Cooling Requirements" accent="blue">
              <MetricRow label="Coolant Flow Rate" value={res.coolantFlowRate} unit={res.coolantFlowUnit} highlight />
              <MetricRow label="Heatsink Rth (case→coolant)" value={res.heatsinkRth_CperW} unit="°C/W" />
              <MetricRow label="Case Temperature" value={res.caseTemp_C} unit="°C" />
              <MetricRow label="Cooling Power" value={res.coolingPower_W} unit="W" />
              <MetricRow label="Thermal Margin" value={res.thermalMargin_C} unit="°C"
                highlight={res.thermalMargin_C > 20}
              />
            </ResultCard>
            <ResultCard title="Safety & Enclosure" accent="amber">
              <MetricRow label="Enclosure Rating" value={res.enclosureIP} />
              <div className="pt-2 mt-2 border-t border-slate-700">
                <p className="text-xs text-slate-400 mb-2 font-medium">Safety Standards</p>
                <div className="flex flex-wrap gap-1">
                  {res.safetyStandards.map((s, i) => <Badge key={i} label={s} variant="warning" />)}
                </div>
              </div>
              <div className="pt-2 mt-2 border-t border-slate-700">
                <p className="text-xs text-slate-400 mb-1 font-medium">Ground Fault Detection</p>
                <p className="text-xs text-slate-300">{res.groundFaultNote}</p>
              </div>
            </ResultCard>
          </div>
          {res.thermalMargin_C < 10 && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-300">
              ⚠ Thermal margin &lt; 10 °C — consider upgrading to liquid cooling or increasing heatsink area.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
