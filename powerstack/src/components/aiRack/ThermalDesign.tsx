import React from 'react';
import { useAIRack } from '../../store/useAIRackStore';
import { InputField, SelectField, ResultCard, MetricRow, RunButton, SectionHeader, Badge } from '../ui';

export default function ThermalDesign() {
  const { state, updateThermalConfig: upd, runThermalCalc } = useAIRack();
  const cfg = state.thermalConfig;
  const res = state.thermalResult;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Rack Thermal Design"
        subtitle="Cooling architecture sizing for high-density AI GPU racks."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField label="Cooling Architecture" value={cfg.coolingArch}
          onChange={v => upd({ coolingArch: v })}
          options={[
            { value: 'forced_air',    label: 'Forced Air (ASHRAE A3/A4)' },
            { value: 'direct_liquid', label: 'Direct Liquid Cooling (DLC)' },
            { value: 'rear_door_hx',  label: 'Rear-Door Heat Exchanger' },
            { value: 'immersion',     label: '2-Phase Immersion' },
          ]}
          help="DLC required for >30 kW/rack; immersion for >100 kW/rack"
        />
        <InputField label="Total Heat Load" value={cfg.totalHeatLoad_kW}
          onChange={v => upd({ totalHeatLoad_kW: parseFloat(v) || 100 })}
          unit="kW" min={1} max={500}
          help="Auto-filled from DC-DC losses + IT load"
        />
        <InputField label="Coolant Inlet Temp" value={cfg.inletTemp_C}
          onChange={v => upd({ inletTemp_C: parseFloat(v) || 18 })}
          unit="°C" min={5} max={45}
          help="Chilled water: 18 °C typical (ASHRAE W4: 45 °C)"
        />
        <InputField label="Target Exit Temp" value={cfg.targetExitTemp_C}
          onChange={v => upd({ targetExitTemp_C: parseFloat(v) || 35 })}
          unit="°C" min={20} max={70}
        />
        <InputField label="Rack Height" value={cfg.rackHeight_U}
          onChange={v => upd({ rackHeight_U: parseInt(v) || 48 })}
          unit="U" min={8} max={96}
        />
        <InputField label="GPU Count" value={cfg.gpuCount}
          onChange={v => upd({ gpuCount: parseInt(v) || 8 })}
          min={1} max={128}
        />
        <InputField label="GPU TDP" value={cfg.gpuTdp_W}
          onChange={v => upd({ gpuTdp_W: parseFloat(v) || 700 })}
          unit="W" min={100} max={2000}
        />
      </div>

      <RunButton onClick={runThermalCalc} label="Analyse Thermal Design →" />

      {res && (
        <div className="space-y-4">
          <ResultCard title="Cooling Requirements" accent="blue">
            <MetricRow label="Cooling Method" value={res.coolingMethod_desc} />
          </ResultCard>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ResultCard title="Air Cooling" accent={cfg.coolingArch === 'forced_air' ? 'blue' : 'amber'}>
              <MetricRow label="Airflow Required" value={res.airflowRequired_CFM} unit="CFM" highlight={cfg.coolingArch === 'forced_air'} />
              <MetricRow label="Airflow Volume" value={res.airflowRequired_m3s} unit="m³/s" />
              <MetricRow label="Fan Power" value={res.fanPower_W} unit="W" />
            </ResultCard>
            <ResultCard title="Liquid Cooling" accent={cfg.coolingArch !== 'forced_air' ? 'purple' : 'blue'}>
              <MetricRow label="Coolant Flow Rate" value={res.coolantFlowRate_Lpm} unit="L/min" highlight={cfg.coolingArch !== 'forced_air'} />
              <MetricRow label="Manifold Pressure Drop" value={res.manifoldPressureDrop_kPa} unit="kPa" />
              <MetricRow label="Per-Server Flow" value={res.perServerFlowRate} />
            </ResultCard>
          </div>

          <ResultCard title="Thermal Performance" accent="green">
            <MetricRow label="PUE" value={res.pue} highlight />
            <MetricRow label="Total Facility Power" value={res.totalFacilityPower_kW} unit="kW" />
            <MetricRow label="Cooling Power" value={res.coolingPower_kW} unit="kW" />
            <MetricRow label="GPU Hot-Spot Temp" value={res.hotSpotTemp_C} unit="°C" />
            <MetricRow label="Thermal Resistance J-A" value={res.thermalResistanceJA} unit="°C/W" />
            <MetricRow label="CO₂ / Year" value={res.co2PerYear_tonnes} unit="tonnes/yr" />
            <MetricRow label="Energy Cost / Year" value={`$${res.costPerYear_USD.toLocaleString()}`} />
          </ResultCard>

          <ResultCard title="Recommended CDU" accent="amber">
            <p className="text-xs text-slate-300">{res.recommendedCDU}</p>
          </ResultCard>

          {res.pue > 1.5 && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-300">
              ⚠ PUE {res.pue} is high — consider upgrading to direct liquid cooling or immersion to reduce overhead.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
