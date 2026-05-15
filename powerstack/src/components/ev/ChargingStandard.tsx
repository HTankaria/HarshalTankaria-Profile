import React from 'react';
import { useEV } from '../../store/useEVStore';
import { InputField, SelectField, ToggleField, ResultCard, MetricRow, RunButton, SectionHeader, Badge } from '../ui';

export default function ChargingStandard() {
  const { state, updateStandardConfig: upd, runStandardCalc } = useEV();
  const cfg = state.standardConfig;
  const res = state.standardResult;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Charging Standard & Architecture"
        subtitle="Select the connector standard, power level, and vehicle architecture to set system constraints."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField label="Connector Standard" value={cfg.standard}
          onChange={v => upd({ standard: v })}
          options={[
            { value: 'NACS', label: 'NACS (Tesla / SAE J3400)' },
            { value: 'CCS1', label: 'CCS Combo 1 (SAE)' },
            { value: 'CCS2', label: 'CCS Combo 2 (IEC)' },
            { value: 'CHADEMO', label: 'CHAdeMO' },
            { value: 'J1772_AC', label: 'J1772 AC Only' },
            { value: 'GB_T', label: 'GB/T (China)' },
          ]}
        />
        <SelectField label="Power Level" value={cfg.powerLevel}
          onChange={v => upd({ powerLevel: v })}
          options={[
            { value: 'L1', label: 'L1 — 1.44 kW' },
            { value: 'L2_7kW', label: 'L2 — 7.2 kW' },
            { value: 'L2_11kW', label: 'L2 — 11 kW' },
            { value: 'L2_22kW', label: 'L2 — 22 kW' },
            { value: 'DCFC_50kW', label: 'DCFC — 50 kW' },
            { value: 'DCFC_150kW', label: 'DCFC — 150 kW' },
            { value: 'DCFC_350kW', label: 'DCFC — 350 kW' },
            { value: 'HPC_500kW', label: 'HPC — 500 kW' },
          ]}
        />
        <SelectField label="Vehicle Architecture" value={cfg.vehicleArch}
          onChange={v => upd({ vehicleArch: v })}
          options={[
            { value: '400V', label: '400 V (Standard)' },
            { value: '800V', label: '800 V (Porsche / Hyundai Ioniq 6)' },
          ]}
        />
        <InputField label="Simultaneous Ports" value={cfg.simultaneousPorts}
          onChange={v => upd({ simultaneousPorts: parseInt(v) || 1 })}
          min={1} max={8}
        />
        <InputField label="AC Input Voltage" value={cfg.acInputVoltage}
          onChange={v => upd({ acInputVoltage: parseFloat(v) || 480 })}
          unit="V" min={100} max={690}
        />
        <SelectField label="AC Phases" value={cfg.acInputPhases.toString() as '1' | '3'}
          onChange={v => upd({ acInputPhases: parseInt(v) as 1 | 3 })}
          options={[{ value: '1', label: 'Single Phase' }, { value: '3', label: '3-Phase' }]}
        />
        <div className="sm:col-span-2">
          <ToggleField label="Bidirectional (V2G / V2H)" value={cfg.bidirectional}
            onChange={v => upd({ bidirectional: v })}
            help="Enables CLLC topology for vehicle-to-grid energy return"
          />
        </div>
      </div>

      <RunButton onClick={runStandardCalc} label="Calculate Standard & Architecture →" />

      {res && (
        <div className="space-y-4">
          <ResultCard title="System Parameters" accent="blue">
            <MetricRow label="Max Output Power" value={res.maxOutputPower_kW} unit="kW" highlight />
            <MetricRow label="Output Voltage Range" value={`${res.outputVoltageRange[0]}–${res.outputVoltageRange[1]}`} unit="V" />
            <MetricRow label="Max Output Current" value={res.maxOutputCurrent_A} unit="A" />
            <MetricRow label="Intermediate DC Bus" value={res.dcBusVoltage_V} unit="V" />
            <MetricRow label="Switch Technology" value={res.switchTechRequired.replace('_', ' ')} />
            <MetricRow label="Isolation Required" value={res.isolationRequired ? 'Yes' : 'No'} />
            <MetricRow label="Approx Efficiency" value={`${(res.approxEfficiency * 100).toFixed(1)}`} unit="%" />
            <MetricRow label="Weight Estimate" value={res.weightEstimate_kg} unit="kg" />
          </ResultCard>

          <ResultCard title="Connector & Protocol" accent="purple">
            <p className="text-xs text-slate-300 mb-2">{res.connectorPinout}</p>
            <p className="text-xs text-slate-400">{res.protocolNote}</p>
          </ResultCard>

          {res.arch800vNotes.length > 0 && (
            <ResultCard title="800 V Architecture Advantages" accent="green">
              <ul className="space-y-1">
                {res.arch800vNotes.map((n, i) => (
                  <li key={i} className="text-xs text-emerald-300 flex gap-2">
                    <span className="text-emerald-500 shrink-0">▸</span>{n}
                  </li>
                ))}
              </ul>
            </ResultCard>
          )}

          <ResultCard title="Compliance Standards" accent="amber">
            <div className="flex flex-wrap gap-2">
              {res.standards.map((s, i) => <Badge key={i} label={s} variant="warning" />)}
            </div>
          </ResultCard>
        </div>
      )}
    </div>
  );
}
