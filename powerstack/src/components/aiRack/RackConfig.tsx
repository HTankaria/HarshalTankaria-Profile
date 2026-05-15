import React from 'react';
import { useAIRack } from '../../store/useAIRackStore';
import { InputField, SelectField, ResultCard, MetricRow, RunButton, SectionHeader } from '../ui';

export default function RackConfig() {
  const { state, updateRackConfig: upd, runRackConfig } = useAIRack();
  const cfg = state.rackConfig;
  const res = state.rackResult;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="AI / GPU Rack Configuration"
        subtitle="Configure GPU model, count, and rack standard to size the power delivery system."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField label="GPU Model" value={cfg.gpuModel}
          onChange={v => upd({ gpuModel: v })}
          options={[
            { value: 'H100_SXM5', label: 'NVIDIA H100 SXM5 (700 W)' },
            { value: 'H200_SXM',  label: 'NVIDIA H200 SXM (1000 W)' },
            { value: 'B100_SXM',  label: 'NVIDIA B100 SXM (700 W)' },
            { value: 'B200_SXM',  label: 'NVIDIA B200 SXM (1000 W)' },
            { value: 'A100_SXM4', label: 'NVIDIA A100 SXM4 (400 W)' },
            { value: 'MI300X',    label: 'AMD MI300X (750 W)' },
            { value: 'CUSTOM',    label: 'Custom GPU' },
          ]}
        />
        {cfg.gpuModel === 'CUSTOM' && (
          <InputField label="Custom GPU TDP" value={cfg.customGpuTdp_W}
            onChange={v => upd({ customGpuTdp_W: parseFloat(v) || 700 })}
            unit="W" min={100} max={2000}
          />
        )}
        <InputField label="GPUs per Rack" value={cfg.gpusPerRack}
          onChange={v => upd({ gpusPerRack: parseInt(v) || 8 })}
          min={1} max={64}
          help="Typical: 8× HGX tray (NVL72 = 72 GPUs)"
        />
        <SelectField label="Rack Standard" value={cfg.rackStandard}
          onChange={v => upd({ rackStandard: v })}
          options={[
            { value: 'OCP_V3',    label: 'OCP Open Rack V3 (48U)' },
            { value: 'OCP_V2',    label: 'OCP Open Rack V2 (42U)' },
            { value: 'EIA_42U',   label: 'EIA-310 Standard 42U' },
            { value: 'OCP_21INC', label: 'OCP 21-inch (21U)' },
          ]}
        />
        <InputField label="CPU Nodes per Rack" value={cfg.cpuNodesPerRack}
          onChange={v => upd({ cpuNodesPerRack: parseInt(v) || 2 })}
          min={0} max={8}
        />
        <InputField label="CPU TDP per Node" value={cfg.cpuTdpPerNode_W}
          onChange={v => upd({ cpuTdpPerNode_W: parseFloat(v) || 350 })}
          unit="W" min={100} max={1000}
        />
        <InputField label="Network Switch Power" value={cfg.networkSwitch_W}
          onChange={v => upd({ networkSwitch_W: parseFloat(v) || 600 })}
          unit="W" min={100} max={5000}
          help="Top-of-rack InfiniBand NDR / Ethernet switch"
        />
        <SelectField label="Bus Voltage" value={cfg.busVoltage_V.toString() as '48' | '380'}
          onChange={v => upd({ busVoltage_V: parseInt(v) })}
          options={[
            { value: '48', label: '48 V (OCP standard)' },
            { value: '380', label: '380 V DC bus (future)' },
          ]}
        />
        <SelectField label="Redundancy Mode" value={cfg.redundancyMode}
          onChange={v => upd({ redundancyMode: v })}
          options={[
            { value: 'N+1', label: 'N+1 (standard)' },
            { value: 'N+N', label: 'N+N (high availability)' },
            { value: '2N',  label: '2N (full redundancy)' },
          ]}
        />
        <InputField label="Holdup Time" value={cfg.holdupTime_ms}
          onChange={v => upd({ holdupTime_ms: parseFloat(v) || 10 })}
          unit="ms" min={2} max={50}
          help="Bulk cap holdup before UPS takes over"
        />
      </div>

      <RunButton onClick={runRackConfig} label="Calculate Rack Power Budget →" />

      {res && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ResultCard title="Power Budget" accent="purple">
            <MetricRow label="GPU Model" value={res.gpuModel_name} />
            <MetricRow label="GPU TDP" value={res.gpuTdp_W} unit="W" />
            <MetricRow label="Total GPU Power" value={res.totalGpuPower_kW} unit="kW" highlight />
            <MetricRow label="Total CPU Power" value={res.totalCpuPower_kW} unit="kW" />
            <MetricRow label="Overhead Power" value={res.overheadPower_kW} unit="kW" />
            <MetricRow label="Total IT Power" value={res.totalITPower_kW} unit="kW" highlight />
            <MetricRow label="Peak Power (w/ redundancy)" value={res.peakPower_kW} unit="kW" />
          </ResultCard>
          <ResultCard title="PSU & Rack Sizing" accent="blue">
            <MetricRow label="PSUs Required" value={res.psusRequired} unit="units" highlight />
            <MetricRow label="PSU Rating" value={res.psuRating_kW} unit="kW each" />
            <MetricRow label="Rack Height" value={res.rackU_height} unit="U" />
            <MetricRow label="Power Density" value={res.powerDensity_kWperU} unit="kW/U" highlight />
            {res.powerDensity_kWperU > 3 && (
              <div className="mt-2 text-xs text-amber-300 bg-amber-500/10 rounded p-2">
                ⚡ High density ({res.powerDensity_kWperU} kW/U) — direct liquid cooling required
              </div>
            )}
          </ResultCard>
        </div>
      )}
    </div>
  );
}
