import React from 'react';
import { Printer } from 'lucide-react';
import { useGenerator } from '../../store/useGeneratorStore';
import { ResultCard, MetricRow, SectionHeader } from '../ui';

export default function GeneratorReport() {
  const { state } = useGenerator();
  const dc = state.dcResult;
  const amp = state.ampResult;
  const pulse = state.pulsingResult;
  const arc = state.arcResult;
  const coupler = state.couplerResult;
  const ctrl = state.controlResult;
  const allDone = dc && amp && pulse && arc && coupler && ctrl;

  const wallPlugEff = allDone
    ? Math.round(dc.efficiency_pct * amp.drainEfficiency_pct / 100 * 10) / 10
    : null;

  return (
    <div className="space-y-6">
      <SectionHeader title="RF Generator System Report" subtitle="Cross-subsystem summary and wall-plug efficiency." />
      {!allDone && <p className="text-slate-400 text-sm">Complete all subsystem designs to generate the full report.</p>}
      {allDone && (
        <>
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-slate-800 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-violet-300">{wallPlugEff}%</p>
                <p className="text-xs text-slate-400 mt-1">Wall-Plug Efficiency</p>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-emerald-300">{arc!.detectionLatency_us.toFixed(2)} µs</p>
                <p className="text-xs text-slate-400 mt-1">Arc Detection</p>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-blue-300">{pulse!.actualRiseTime_us.toFixed(1)} µs</p>
                <p className="text-xs text-slate-400 mt-1">Pulse Rise Time</p>
              </div>
            </div>
            <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white text-sm px-4 py-2 rounded-xl transition-colors no-print">
              <Printer size={15} /> Print / PDF
            </button>
          </div>
          <ResultCard title="DC Supply" accent="blue">
            <MetricRow label="DC Bus" value={dc!.dcBusVoltage_V} unit="V" />
            <MetricRow label="Bulk Cap" value={dc!.bulkCapacitance_uF} unit="µF" />
            <MetricRow label="PFC Efficiency" value={dc!.efficiency_pct} unit="%" highlight />
          </ResultCard>
          <ResultCard title="RF Amplifier" accent="purple">
            <MetricRow label="Drain Efficiency" value={amp!.drainEfficiency_pct} unit="%" highlight />
            <MetricRow label="Peak Vds" value={amp!.vdsPeak_V.toFixed(1)} unit="V" />
            <MetricRow label="Ropt" value={amp!.Ropt_ohm.toFixed(1)} unit="Ω" />
            <MetricRow label="Transistor" value={amp!.transistorSuggestion.split(' ')[0] + '...'} />
          </ResultCard>
          <ResultCard title="Control & Safety" accent="red">
            <MetricRow label="PLL Lock Time" value={ctrl!.lockTime_us.toFixed(1)} unit="µs" />
            <MetricRow label="Phase Noise" value={ctrl!.phaseNoise_dBcHz} unit="dBc/Hz" />
            <MetricRow label="Interlocks" value={ctrl!.interlocks.length} unit="active" highlight />
          </ResultCard>
          <p className="text-xs text-slate-600 text-center">Generated: {new Date().toLocaleString()}</p>
        </>
      )}
    </div>
  );
}
