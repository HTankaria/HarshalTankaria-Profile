import React from 'react';
import { useStore } from '../../store/useStore';
import { InputField, SelectField, RunButton, SectionHeader } from '../ui';

export default function Step1() {
  const { state, updateSystemConfig: upd, autoEstimatePlasma } = useStore();
  const cfg = state.systemConfig;
  return (
    <div className="space-y-6">
      <SectionHeader title="System Configuration" subtitle="Define the RF power delivery system parameters. The plasma model will be auto-generated using PSTAW™." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField label="Tool Type" value={cfg.toolType} onChange={v => upd({ toolType: v })}
          options={[
            { value: 'CCP', label: 'CCP — Capacitively Coupled Plasma' },
            { value: 'ICP', label: 'ICP — Inductively Coupled Plasma' },
            { value: 'PECVD', label: 'PECVD — Plasma Enhanced CVD' },
            { value: 'PVD', label: 'PVD — Physical Vapour Deposition' },
            { value: 'ALD', label: 'ALD — Atomic Layer Deposition' },
            { value: 'ECR', label: 'ECR — Electron Cyclotron Resonance' },
            { value: 'CUSTOM', label: 'Custom Tool' },
          ]}
        />
        <SelectField label="RF Frequency" value={(() => {
          const f = cfg.frequency_Hz;
          if (f <= 400e3) return '400kHz';
          if (f <= 2.1e6) return '2MHz';
          if (f <= 14e6) return '13.56MHz';
          if (f <= 27.5e6) return '27MHz';
          if (f <= 41e6) return '40MHz';
          return '60MHz';
        })()} onChange={v => {
          const map: Record<string, number> = { '400kHz': 400e3, '2MHz': 2e6, '13.56MHz': 13.56e6, '27MHz': 27.12e6, '40MHz': 40.68e6, '60MHz': 60e6 };
          upd({ frequency_Hz: map[v] ?? 13.56e6 });
        }}
          options={[
            { value: '400kHz', label: '400 kHz (Bias)' },
            { value: '2MHz', label: '2 MHz (Bias)' },
            { value: '13.56MHz', label: '13.56 MHz (ISM)' },
            { value: '27MHz', label: '27.12 MHz' },
            { value: '40MHz', label: '40.68 MHz' },
            { value: '60MHz', label: '60 MHz' },
          ]}
        />
        <InputField label="RF Power" value={cfg.rfPower_W} onChange={v => upd({ rfPower_W: parseFloat(v) || 1000 })} unit="W" min={10} max={20000} />
        <InputField label="Source Impedance" value={cfg.sourceImpedance_R} onChange={v => upd({ sourceImpedance_R: parseFloat(v) || 50 })} unit="Ω" min={25} max={75} />
        <InputField label="Chamber Pressure" value={cfg.chamberPressure_mTorr} onChange={v => upd({ chamberPressure_mTorr: parseFloat(v) || 20 })} unit="mTorr" min={0.1} max={1000} help="Affects plasma impedance — higher pressure → higher R_plasma" />
        <InputField label="Chamber Diameter" value={cfg.chamberDiameter_mm} onChange={v => upd({ chamberDiameter_mm: parseFloat(v) || 300 })} unit="mm" min={100} max={600} />
        <InputField label="Electrode Gap" value={cfg.electrodeGap_mm} onChange={v => upd({ electrodeGap_mm: parseFloat(v) || 25 })} unit="mm" min={5} max={100} />
        <SelectField label="Matching Topology" value={cfg.matchingTopology} onChange={v => upd({ matchingTopology: v })}
          options={[
            { value: 'L_lowpass', label: 'L-Network (Low-Pass)' },
            { value: 'L_highpass', label: 'L-Network (High-Pass)' },
            { value: 'Pi', label: 'Pi-Network' },
            { value: 'T', label: 'T-Network' },
          ]}
        />
        {cfg.toolType === 'CUSTOM' && (
          <>
            <InputField label="Custom Plasma R" value={cfg.customPlasmaR ?? 5} onChange={v => upd({ customPlasmaR: parseFloat(v) })} unit="Ω" min={0.1} max={1000} />
            <InputField label="Custom Plasma C" value={cfg.customPlasmaC ? cfg.customPlasmaC * 1e12 : 150} onChange={v => upd({ customPlasmaC: parseFloat(v) * 1e-12 })} unit="pF" min={1} max={10000} />
          </>
        )}
      </div>
      <RunButton onClick={autoEstimatePlasma} label="Generate Plasma Model (PSTAW™) →" />
    </div>
  );
}
