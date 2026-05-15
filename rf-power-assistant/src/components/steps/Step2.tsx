import React from 'react';
import { useStore } from '../../store/useStore';
import { ResultCard, MetricRow, RunButton, SectionHeader } from '../ui';
import SmithChart from '../SmithChart';
import { aitoWeightedImpedance } from '../../calculations/rfCalc';

export default function Step2() {
  const { state, runMatchingDesign } = useStore();
  const states = state.plasmaStates;
  const f = state.systemConfig.frequency_Hz;
  const centroid = states.length ? aitoWeightedImpedance(states, f) : undefined;

  return (
    <div className="space-y-6">
      <SectionHeader title="Plasma Impedance Model — PSTAW™" subtitle="Four plasma operating states auto-generated. Probabilities weight the AITO™ impedance centroid." />
      {states.length === 0 ? (
        <p className="text-slate-400 text-sm">Run Step 1 first to generate plasma states.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SmithChart states={states} centroid={centroid} Z0={state.systemConfig.sourceImpedance_R} />
            <div className="space-y-3">
              {states.map(s => {
                const omega = 2 * Math.PI * f;
                const Xc = -1 / (omega * s.C_plasma);
                const ZL = { re: s.R_plasma, im: Xc + omega * s.L_stray };
                return (
                  <ResultCard key={s.id} title={s.label} accent={s.probability >= 0.5 ? 'green' : s.probability >= 0.2 ? 'blue' : 'amber'}>
                    <MetricRow label="Probability" value={`${(s.probability * 100).toFixed(0)}%`} highlight={s.probability >= 0.5} />
                    <MetricRow label="R plasma" value={s.R_plasma.toFixed(2)} unit="Ω" />
                    <MetricRow label="C plasma" value={(s.C_plasma * 1e12).toFixed(1)} unit="pF" />
                    <MetricRow label="ZL" value={`${ZL.re.toFixed(1)} ${ZL.im >= 0 ? '+' : ''}${ZL.im.toFixed(1)}j`} unit="Ω" />
                  </ResultCard>
                );
              })}
            </div>
          </div>
          {centroid && (
            <ResultCard title="AITO™ Weighted Centroid" accent="purple">
              <MetricRow label="Centroid R" value={centroid.re.toFixed(2)} unit="Ω" highlight />
              <MetricRow label="Centroid X" value={centroid.im.toFixed(2)} unit="Ω" highlight />
              <p className="text-xs text-slate-400 mt-2">The matching network will be designed to this probability-weighted impedance centroid, maximising performance across all plasma states.</p>
            </ResultCard>
          )}
          <RunButton onClick={runMatchingDesign} label="Design Matching Network →" />
        </>
      )}
    </div>
  );
}
