import React from 'react';
import { FileText, Download, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { useGenerator } from '../../store/useGeneratorStore';
import { formatFreq, formatValue } from '../../calculations/rfCalc';

export function GeneratorReport() {
  const { state } = useGenerator();
  const { dcResult: dc, ampResult: amp, pulsingResult: pulse,
          arcResult: arc, couplerResult: coupler, controlResult: ctrl,
          dcConfig, ampConfig, pulsingConfig, arcConfig, couplerConfig } = state;

  const allDone = dc && amp && pulse && arc && coupler && ctrl;

  const wallPlugEta = allDone
    ? dc.supplyEfficiency * amp.realEfficiency
    : null;

  const issues: { sev: 'ok' | 'warn' | 'crit'; text: string }[] = [];
  if (amp) {
    if (amp.powerDissipation > ampConfig.rfOutputPower * 0.3)
      issues.push({ sev: 'warn', text: `High PA dissipation: ${amp.powerDissipation.toFixed(0)} W — ensure >90°C heatsink` });
    if (amp.peakVoltage_Vds > amp.vdsMaxRating * 0.85)
      issues.push({ sev: 'crit', text: 'Vds peak approaching device rating — increase Vdd margin or use higher-rated device' });
  }
  if (dc) {
    if (dc.rippleVoltage_pk > dc.dcBusVoltage * 0.1)
      issues.push({ sev: 'warn', text: `DC bus ripple ${dc.rippleVoltage_pk.toFixed(1)} V > 10% — increase bulk capacitance` });
  }
  if (pulse) {
    if (pulse.voltageDropDuringPulse_pct > 5)
      issues.push({ sev: 'warn', text: `Voltage droop ${pulse.voltageDropDuringPulse_pct.toFixed(1)}% during pulse — add local bypass caps at PA supply rail` });
  }
  if (arc) {
    if (arc.totalDetectionTime_us > 3)
      issues.push({ sev: 'warn', text: `Arc detection ${arc.totalDetectionTime_us.toFixed(1)} µs — consider removing opto-isolator for faster hardware path` });
  }
  if (coupler) {
    if (coupler.directivity_dB < 25)
      issues.push({ sev: 'crit', text: 'Directivity < 25 dB will cause inaccurate VSWR readings — use transformer topology or improve PCB layout' });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-500/15 border border-blue-500/30">
            <FileText size={18} className="text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">Generator Design Summary</h3>
            <p className="text-xs text-slate-400">Complete RF generator specification across all subsystems.</p>
          </div>
        </div>
        {allDone && (
          <button onClick={() => window.print()}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-lg text-xs transition-colors print:hidden">
            <Download size={12} /> Export PDF
          </button>
        )}
      </div>

      {!allDone && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-300">
          Complete all 6 design sections to generate the full report.
          Missing: {[!dc && 'DC Supply', !amp && 'RF Amplifier', !pulse && 'Pulsing',
                     !arc && 'Arc Detection', !coupler && 'Coupler', !ctrl && 'Control'].filter(Boolean).join(', ')}
        </div>
      )}

      {allDone && (
        <div id="gen-report" className="flex flex-col gap-5">

          {/* Header card */}
          <div className="rounded-xl border border-blue-500/30 bg-slate-800/60 p-5">
            <div className="text-xs text-blue-400 uppercase tracking-widest mb-1 font-semibold">RF Generator Internal Design</div>
            <h2 className="text-xl font-bold text-slate-100 mb-1">Generator Specification Report</h2>
            <div className="text-sm text-slate-400">
              {formatFreq(ampConfig.frequency)} · {ampConfig.rfOutputPower} W · {ampConfig.paClass === 'E' ? 'Class E' : `Class ${ampConfig.paClass}`} · {ampConfig.transistorType}
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-700">
              <div className="text-center">
                <div className="text-xs text-slate-500">Wall-Plug Efficiency</div>
                <div className={`text-2xl font-mono font-bold ${wallPlugEta! > 0.75 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                  {(wallPlugEta! * 100).toFixed(1)}%
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500">PA Drain Efficiency</div>
                <div className="text-2xl font-mono font-bold text-blue-400">
                  {(amp.realEfficiency * 100).toFixed(0)}%
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500">Issues Found</div>
                <div className={`text-2xl font-mono font-bold ${issues.filter(i => i.sev === 'crit').length > 0 ? 'text-red-400' : issues.length > 0 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                  {issues.length}
                </div>
              </div>
            </div>
          </div>

          {/* Issues */}
          {issues.length > 0 && (
            <section>
              <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                <AlertTriangle size={14} className="text-yellow-400" /> Design Issues
              </h4>
              {issues.map((is, i) => (
                <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg border mb-1.5 text-xs ${
                  is.sev === 'crit' ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300'
                }`}>
                  {is.sev === 'crit' ? <XCircle size={12} className="flex-shrink-0 mt-0.5" /> : <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />}
                  {is.text}
                </div>
              ))}
            </section>
          )}
          {issues.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
              <CheckCircle size={15} /> No design issues detected — all subsystem parameters within safe operating range.
            </div>
          )}

          {/* Section: DC Supply */}
          <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
            <h4 className="text-xs font-semibold text-orange-300 mb-3 flex items-center gap-2">⚡ DC Power Supply</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {[
                { k: 'Topology', v: dc.rectifierType },
                { k: 'DC Bus', v: `${dc.dcBusVoltage.toFixed(0)} V` },
                { k: 'Input Current', v: `${dc.inputCurrentRms.toFixed(1)} A rms` },
                { k: 'Power Factor', v: dc.inputPowerFactor.toFixed(3) },
                { k: 'Bulk Cap', v: `${dc.bulkCapacitance_uF.toFixed(0)} µF / ${dc.capacitorVoltageRating} V` },
                { k: 'Holdup', v: `${dc.holdupTime_ms.toFixed(1)} ms` },
                { k: 'Ripple', v: `${dc.rippleVoltage_pk.toFixed(1)} V pk` },
                { k: 'Supply η', v: `${(dc.supplyEfficiency * 100).toFixed(1)}%` },
              ].map(p => <div key={p.k}><div className="text-slate-500">{p.k}</div><div className="font-mono text-slate-200">{p.v}</div></div>)}
            </div>
          </section>

          {/* Section: RF PA */}
          <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
            <h4 className="text-xs font-semibold text-violet-300 mb-3 flex items-center gap-2">📡 RF Power Amplifier</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {[
                { k: 'PA Class', v: ampConfig.paClass },
                { k: 'Device', v: ampConfig.transistorType },
                { k: 'Ropt / device', v: `${amp.optimalLoadR_per_device.toFixed(2)} Ω` },
                { k: 'Drain η', v: `${(amp.realEfficiency * 100).toFixed(0)}%` },
                { k: 'DC Current', v: `${amp.dcCurrentTotal.toFixed(1)} A` },
                { k: 'Peak Vds', v: `${amp.peakVoltage_Vds.toFixed(0)} V pk` },
                { k: 'Device Rating', v: `${amp.vdsMaxRating} V / ${amp.idMaxRating} A` },
                { k: 'Dissipation', v: `${amp.powerDissipation.toFixed(0)} W` },
                { k: '2nd Harmonic', v: `${amp.harmonicLevel_2f_dBc} dBc` },
                { k: 'Int. Match L', v: formatValue(amp.internalMatchNetworkL_nH * 1e-9, 'H') },
                { k: 'Int. Match C', v: formatValue(amp.internalMatchNetworkC_pF * 1e-12, 'F') },
                { k: 'Suggested Part', v: amp.transistorPartSuggestion.split('(')[0].trim() },
              ].map(p => <div key={p.k}><div className="text-slate-500">{p.k}</div><div className="font-mono text-slate-200">{p.v}</div></div>)}
            </div>
          </section>

          {/* Sections: Pulsing, Arc, Coupler, Control in 2-col */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
              <h4 className="text-xs font-semibold text-cyan-300 mb-3">⏱ Pulsing</h4>
              {[
                { k: 'Method', v: pulsingConfig.modulationMethod.replace('_', ' ') },
                { k: 'Frequency', v: `${pulsingConfig.pulseFrequency_Hz.toLocaleString()} Hz` },
                { k: 'Duty Cycle', v: `${(pulsingConfig.dutyCycle * 100).toFixed(0)}%` },
                { k: 'Rise Time', v: `${pulse.achievableRiseTime_us.toFixed(1)} µs` },
                { k: 'Overshoot', v: `${pulse.overshoot_pct}%` },
                { k: 'Voltage Droop', v: `${pulse.voltageDropDuringPulse_pct.toFixed(1)}%` },
              ].map(p => (
                <div key={p.k} className="flex justify-between text-xs py-0.5 border-b border-slate-700/40">
                  <span className="text-slate-500">{p.k}</span>
                  <span className="font-mono text-slate-200">{p.v}</span>
                </div>
              ))}
            </section>
            <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
              <h4 className="text-xs font-semibold text-red-300 mb-3">⚡ Arc Detection</h4>
              {[
                { k: 'Method', v: arcConfig.detectionMethod.replace('_', ' ') },
                { k: 'VSWR Trip', v: `${arcConfig.vswr_threshold}:1` },
                { k: 'Response Time', v: `${arc.totalDetectionTime_us.toFixed(2)} µs` },
                { k: 'Blanking', v: `${arc.recommendedBlankingTime_us} µs` },
                { k: 'Recovery Delay', v: `${arc.recommendedRecoveryDelay_us} µs` },
                { k: 'Comparator IC', v: arc.comparatorIC.split('(')[0] },
              ].map(p => (
                <div key={p.k} className="flex justify-between text-xs py-0.5 border-b border-slate-700/40">
                  <span className="text-slate-500">{p.k}</span>
                  <span className="font-mono text-slate-200">{p.v}</span>
                </div>
              ))}
            </section>
            <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
              <h4 className="text-xs font-semibold text-teal-300 mb-3">🔀 Directional Coupler</h4>
              {[
                { k: 'Topology', v: couplerConfig.topology },
                { k: 'Coupling', v: `${coupler.couplingFactor_dB} dB` },
                { k: 'Directivity', v: `${coupler.directivity_dB} dB` },
                { k: 'Ins. Loss', v: `${coupler.insertionLoss_dB.toFixed(3)} dB` },
                { k: 'Fwd Port Vout', v: `${coupler.forwardPortVoltage_Vrms.toFixed(3)} V rms` },
                { k: 'Core/Part', v: couplerConfig.topology === 'transformer' ? coupler.corePartSuggestion.split(' ')[0] : 'PCB coupled-line' },
              ].map(p => (
                <div key={p.k} className="flex justify-between text-xs py-0.5 border-b border-slate-700/40">
                  <span className="text-slate-500">{p.k}</span>
                  <span className="font-mono text-slate-200">{p.v}</span>
                </div>
              ))}
            </section>
            <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
              <h4 className="text-xs font-semibold text-indigo-300 mb-3">🎛 Control System</h4>
              {[
                { k: 'Freq. Synth.', v: ctrl.pllReferenceFreq_MHz > 0 ? `PLL ${ctrl.pllReferenceFreq_MHz} MHz ÷${ctrl.pllDividerN}` : 'Crystal' },
                { k: 'Phase Noise', v: `${ctrl.phaseNoise_dBcAt1kHz} dBc @ 1kHz` },
                { k: 'Power Loop BW', v: `${dcConfig.acFrequency * 2} Hz (fixed by design)` },
                { k: 'Settling Time', v: `${ctrl.settlingTime_ms.toFixed(1)} ms` },
                { k: 'ADC/DAC', v: `${ctrl.adcBits}-bit` },
                { k: 'MCU', v: ctrl.microcontrollerSuggestion.split(' ')[0] },
              ].map(p => (
                <div key={p.k} className="flex justify-between text-xs py-0.5 border-b border-slate-700/40">
                  <span className="text-slate-500">{p.k}</span>
                  <span className="font-mono text-slate-200">{p.v}</span>
                </div>
              ))}
            </section>
          </div>

          {/* Interlocks summary */}
          <section className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <h4 className="text-xs font-semibold text-red-300 mb-2">Safety Interlocks Required ({ctrl.interlocks.length})</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {ctrl.interlocks.map((il, i) => (
                <div key={i} className="text-xs text-slate-300 flex gap-1.5">
                  <span className="text-red-500 flex-shrink-0">⚑</span>{il}
                </div>
              ))}
            </div>
          </section>

          <div className="text-xs text-slate-600 text-center border-t border-slate-800 pt-3">
            RF Generator Design Report · Generated {new Date().toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}
