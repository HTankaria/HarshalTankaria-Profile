import { useState, useRef } from 'react';
import { Cpu, Upload, RefreshCw, Info, Copy, CheckCheck } from 'lucide-react';
import { computeTuningMap, c1c2Gamma, pFtoAngle } from '../calculations/tuningMap';
import { parseSsn } from '../calculations/ssnParser';
import type { MapResult } from '../calculations/tuningMap';
import type { ImpedanceState } from '../types';
import { STATE_COLORS, fmtF } from '../calculations/aito';

interface Props {
  states: ImpedanceState[];
  freq: number;
  Z0: number;
  onNetworkLoad?: (freq: number, Z0: number) => void;
}

interface Analysis {
  map: MapResult;
  gradC1: number;
  gradC2: number;
  stepCoarseC1: number;
  stepCoarseC2: number;
  stepFineC1: number;
  stepFineC2: number;
}

function NumberInput({ label, value, onChange, unit, min, max, step, width = 'w-28' }: {
  label: string; value: number; onChange: (v: number) => void;
  unit: string; min: number; max: number; step: number; width?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-400">{label}</label>
      <div className={`flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-2 focus-within:border-blue-500 ${width}`}>
        <input type="number" value={value} min={min} max={max} step={step}
          onChange={e => onChange(Number(e.target.value))}
          className="flex-1 bg-transparent text-sm text-slate-100 outline-none" />
        <span className="text-xs text-slate-500">{unit}</span>
      </div>
    </div>
  );
}

function generateAlgorithmCode(
  a: Analysis, L1_uH: number, L2_uH: number, C1max: number, C2max: number,
  freq: number, Z0: number,
): string {
  const { map } = a;
  const cC1 = Math.max(1, Math.round(a.stepCoarseC1));
  const cC2 = Math.max(1, Math.round(a.stepCoarseC2));
  const fC1 = Math.max(1, Math.round(a.stepFineC1));
  const fC2 = Math.max(1, Math.round(a.stepFineC2));
  const tC1 = pFtoAngle(map.optC1, C1max);
  const tC2 = pFtoAngle(map.optC2, C2max);

  const lookupLines = map.perStateOptima.map(p =>
    `  '${p.label}': { C1: ${Math.round(p.C1)}, C2: ${Math.round(p.C2)} },  // θ1=${pFtoAngle(p.C1, C1max)}°, θ2=${pFtoAngle(p.C2, C2max)}°, |Γ|=${p.gamma.toFixed(3)}`
  ).join('\n');

  return `// AITO™ Tuning Algorithm  —  auto-generated
// Topology: Gen → L2(${L2_uH}µH) → C2([0-${C2max}pF] series) → [node] → L1(${L1_uH}µH) → Plasma
//           C1([0-${C1max}pF] shunt at node)
// f=${fmtF(freq)}, Z0=${Z0}Ω  |  AITO score=${map.optScore.toFixed(4)} (1−Σpᵢ|Γᵢ|²)

// ── Pre-position lookup table ─────────────────────────────────────────────────
const LOOKUP = {
${lookupLines}
};

// AITO™ compromise pre-position (minimises weighted reflected power)
const AITO_PRE = { C1: ${Math.round(map.optC1)}, C2: ${Math.round(map.optC2)} };
// θ1=${tC1}°, θ2=${tC2}° — use this when process state is unknown

// ── Motor step sizes (from ∂Score/∂C gradient at AITO point) ─────────────────
const STEP_C1_COARSE = ${cC1};   // pF  ≈5% score/step  (fast acquisition)
const STEP_C2_COARSE = ${cC2};   // pF
const STEP_C1_FINE   = ${fC1};   // pF  ≈0.5% score/step (fine convergence)
const STEP_C2_FINE   = ${fC2};   // pF

// ── Reflected power thresholds (|Γ|² fraction of forward power) ──────────────
const THRESH_FAST  = 0.15;  // |Γ|²  — above this: run fast hill-climb
const THRESH_MAINT = 0.04;  // |Γ|²  — maintenance target  (VSWR ≈ 1.5)
const MAINT_MS     = 100;   // ms    — maintenance polling interval

// ── Main tuning entry point ───────────────────────────────────────────────────
// motor: { moveTo(C1_pF, C2_pF): Promise<void> }
// sensor: { gamma2(): Promise<number> }  // returns |Γ|² from directional coupler

async function runTuning(motor, sensor) {
  // Phase 0: pre-position before RF is applied
  let pos = { ...AITO_PRE };
  await motor.moveTo(pos.C1, pos.C2);

  // Phase 1: fast acquisition after RF strikes (large reflected power)
  pos = await hillClimb(pos, STEP_C1_COARSE, STEP_C2_COARSE, THRESH_FAST, motor, sensor);

  // Phase 2: fine convergence
  pos = await hillClimb(pos, STEP_C1_FINE, STEP_C2_FINE, THRESH_MAINT, motor, sensor);

  // Phase 3: maintenance loop — detect state transitions, apply corrections
  let prevG2 = await sensor.gamma2();
  setInterval(async () => {
    const g2 = await sensor.gamma2();

    if (g2 > prevG2 * 3 && g2 > THRESH_FAST) {
      // State transition: large sudden jump → re-acquire from AITO pre-position
      pos = { ...AITO_PRE };
      await motor.moveTo(pos.C1, pos.C2);
      pos = await hillClimb(pos, STEP_C1_COARSE, STEP_C2_COARSE, THRESH_FAST, motor, sensor);
      pos = await hillClimb(pos, STEP_C1_FINE, STEP_C2_FINE, THRESH_MAINT, motor, sensor);
    } else if (g2 > THRESH_MAINT) {
      // Drift correction: small hill-climb from current position
      pos = await hillClimb(pos, STEP_C1_FINE, STEP_C2_FINE, THRESH_MAINT, motor, sensor);
    }
    prevG2 = await sensor.gamma2();
  }, MAINT_MS);
}

// 4-direction hill-climb: try ±C1, ±C2, accept best improvement, repeat
async function hillClimb(pos, dC1, dC2, target, motor, sensor) {
  let g2 = await sensor.gamma2();
  let improved = true;

  while (g2 > target && improved) {
    improved = false;
    const moves = [[dC1,0], [-dC1,0], [0,dC2], [0,-dC2]];
    for (const [dc1, dc2] of moves) {
      const C1 = clamp(pos.C1 + dc1, 0, ${C1max});
      const C2 = clamp(pos.C2 + dc2, 0, ${C2max});
      await motor.moveTo(C1, C2);
      const candidate = await sensor.gamma2();
      if (candidate < g2) {
        pos = { C1, C2 };
        g2 = candidate;
        improved = true;
        break;  // greedy: accept first improvement, restart loop
      }
    }
    // If no neighbour improved, stay at current (local minimum reached)
    if (!improved) await motor.moveTo(pos.C1, pos.C2);
  }
  return pos;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }`;
}

export function TuningAlgoTab({ states, freq, Z0, onNetworkLoad }: Props) {
  const [L1_uH, setL1_uH] = useState(36.6);
  const [L2_uH, setL2_uH] = useState(93.9);
  const [C1max, setC1max] = useState(20000);
  const [C2max, setC2max] = useState(20000);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [computing, setComputing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ssnName, setSsnName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (states.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-500">
        <Cpu size={32} className="text-slate-700" />
        <p className="text-sm">Add at least 2 impedance states to generate a tuning algorithm.</p>
      </div>
    );
  }

  function handleSsnFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(text => {
      const p = parseSsn(text);
      setL1_uH(parseFloat(p.L1_uH.toFixed(3)));
      setL2_uH(parseFloat(p.L2_uH.toFixed(3)));
      setC1max(Math.round(p.C1max_nF * 1000));
      setC2max(Math.round(p.C2max_nF * 1000));
      setSsnName(file.name.replace(/^.*[\\/]/, ''));
      onNetworkLoad?.(p.freq_Hz, p.Z0);
      setAnalysis(null);
    });
  }

  function analyze() {
    setComputing(true);
    setAnalysis(null);
    setTimeout(() => {
      const map = computeTuningMap(states, Z0, freq, C1max, C2max, L1_uH, L2_uH, 70);
      const { optC1, optC2 } = map;
      const totalP = states.reduce((s, st) => s + st.probability, 0) || 1;

      function score(C1: number, C2: number) {
        return 1 - states.reduce((s, st) => s + st.probability * c1c2Gamma(st, C1, C2, L1_uH, L2_uH, Z0, freq) ** 2, 0) / totalP;
      }

      const d1 = C1max * 0.01, d2 = C2max * 0.01;
      const gradC1 = (score(optC1 + d1, optC2) - score(optC1 - d1, optC2)) / (2 * d1);
      const gradC2 = (score(optC1, optC2 + d2) - score(optC1, optC2 - d2)) / (2 * d2);

      const safeAbs = (g: number, fb: number) => Math.abs(g) > 1e-10 ? Math.abs(g) : fb;
      const stepCoarseC1 = 0.05 / safeAbs(gradC1, 1 / C1max);
      const stepCoarseC2 = 0.05 / safeAbs(gradC2, 1 / C2max);
      const stepFineC1   = 0.005 / safeAbs(gradC1, 1 / C1max);
      const stepFineC2   = 0.005 / safeAbs(gradC2, 1 / C2max);

      setAnalysis({ map, gradC1, gradC2, stepCoarseC1, stepCoarseC2, stepFineC1, stepFineC2 });
      setComputing(false);
    }, 30);
  }

  async function copyCode() {
    if (!analysis) return;
    const code = generateAlgorithmCode(analysis, L1_uH, L2_uH, C1max, C2max, freq, Z0);
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Network config */}
      <div className="flex flex-wrap items-end gap-3">
        <NumberInput label="L1 load-side" value={L1_uH} onChange={v => { setL1_uH(v); setAnalysis(null); }} unit="µH" min={0.1} max={500} step={0.1} />
        <NumberInput label="L2 gen-side" value={L2_uH} onChange={v => { setL2_uH(v); setAnalysis(null); }} unit="µH" min={0.1} max={500} step={0.1} />
        <NumberInput label="C1 max (shunt)" value={C1max} onChange={v => { setC1max(v); setAnalysis(null); }} unit="pF" min={100} max={100000} step={100} width="w-32" />
        <NumberInput label="C2 max (series)" value={C2max} onChange={v => { setC2max(v); setAnalysis(null); }} unit="pF" min={100} max={100000} step={100} width="w-32" />

        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">SimNEC .ssn</label>
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors">
            <Upload size={12} />
            {ssnName ? ssnName.slice(0, 18) : 'Import file'}
          </button>
          <input ref={fileRef} type="file" accept=".ssn,.xml" className="hidden" onChange={handleSsnFile} />
        </div>

        <button onClick={analyze} disabled={computing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-semibold transition-colors">
          <RefreshCw size={14} className={computing ? 'animate-spin' : ''} />
          {computing ? 'Analyzing…' : 'Generate Algorithm'}
        </button>
      </div>

      {/* Topology description */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-3 text-xs text-slate-400 font-mono">
        Gen({Z0}Ω) → L2({L2_uH}µH) → C2([0–{C2max}pF] series) → [node A] → L1({L1_uH}µH) → Plasma
        <span className="block mt-1 pl-[22ch] text-slate-600">└── C1([0–{C1max}pF] shunt to GND)</span>
        <span className="block mt-1 text-slate-600 font-sans">freq = {fmtF(freq)} · Z₀ = {Z0} Ω · {states.length} impedance states</span>
      </div>

      {!analysis && !computing && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-6 text-center text-slate-500 text-sm">
          Click "Generate Algorithm" to compute the tuning map, gradient sensitivity, and generate controller pseudocode.
        </div>
      )}

      {analysis && (
        <div className="flex flex-col gap-5">
          {/* Pre-position lookup table */}
          <div className="rounded-xl border border-slate-700 overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-700 text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Info size={12} /> Pre-position Lookup Table
              <span className="ml-auto text-slate-600 font-normal">load this into your controller's flash</span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700 text-slate-500">
                  <th className="text-left px-3 py-1.5 font-medium">State</th>
                  <th className="text-left px-3 py-1.5 font-medium">p</th>
                  <th className="text-left px-3 py-1.5 font-medium">C1 pF</th>
                  <th className="text-left px-3 py-1.5 font-medium">θ1</th>
                  <th className="text-left px-3 py-1.5 font-medium">C2 pF</th>
                  <th className="text-left px-3 py-1.5 font-medium">θ2</th>
                  <th className="text-left px-3 py-1.5 font-medium">|Γ|</th>
                  <th className="text-left px-3 py-1.5 font-medium">VSWR</th>
                </tr>
              </thead>
              <tbody>
                {analysis.map.perStateOptima.map((pt, i) => {
                  const st = states[i];
                  const g = pt.gamma;
                  const vswr = g >= 0.9999 ? 999 : (1 + g) / (1 - g);
                  return (
                    <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                      <td className="px-3 py-2 flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: STATE_COLORS[i % STATE_COLORS.length] }} />
                        <span className="text-slate-300">{pt.label}</span>
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-400">{(st.probability * 100).toFixed(0)}%</td>
                      <td className="px-3 py-2 font-mono text-yellow-300">{Math.round(pt.C1)}</td>
                      <td className="px-3 py-2 font-mono text-slate-400">{pFtoAngle(pt.C1, C1max)}°</td>
                      <td className="px-3 py-2 font-mono text-purple-300">{Math.round(pt.C2)}</td>
                      <td className="px-3 py-2 font-mono text-slate-400">{pFtoAngle(pt.C2, C2max)}°</td>
                      <td className="px-3 py-2 font-mono">
                        <span className={g < 0.1 ? 'text-emerald-400' : g < 0.3 ? 'text-amber-400' : 'text-red-400'}>
                          {g.toFixed(3)}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono">
                        <span className={vswr < 1.5 ? 'text-emerald-400' : vswr < 3 ? 'text-amber-400' : 'text-red-400'}>
                          {vswr > 99 ? '>99' : vswr.toFixed(2)}:1
                        </span>
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-indigo-900/10 border-b border-slate-700/50">
                  <td className="px-3 py-2 flex items-center gap-1.5">
                    <div className="w-2 h-2 rotate-45 shrink-0 bg-indigo-400" />
                    <span className="text-indigo-300 font-medium">AITO™ pre-pos</span>
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-500">Σ</td>
                  <td className="px-3 py-2 font-mono text-indigo-300">{Math.round(analysis.map.optC1)}</td>
                  <td className="px-3 py-2 font-mono text-indigo-400">{pFtoAngle(analysis.map.optC1, C1max)}°</td>
                  <td className="px-3 py-2 font-mono text-indigo-300">{Math.round(analysis.map.optC2)}</td>
                  <td className="px-3 py-2 font-mono text-indigo-400">{pFtoAngle(analysis.map.optC2, C2max)}°</td>
                  <td colSpan={2} className="px-3 py-2 font-mono text-emerald-400">Score {analysis.map.optScore.toFixed(4)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Gradient analysis */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-3">
            <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
              <Cpu size={12} /> Gradient Sensitivity at AITO Point
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                {
                  label: 'C1 (shunt)',
                  grad: analysis.gradC1,
                  coarse: analysis.stepCoarseC1,
                  fine: analysis.stepFineC1,
                  color: 'text-yellow-300',
                },
                {
                  label: 'C2 (series)',
                  grad: analysis.gradC2,
                  coarse: analysis.stepCoarseC2,
                  fine: analysis.stepFineC2,
                  color: 'text-purple-300',
                },
              ].map(({ label, grad, coarse, fine, color }) => (
                <div key={label} className="rounded-lg bg-slate-900/60 border border-slate-700 p-2.5">
                  <div className="text-slate-400 font-medium mb-1.5">{label}</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">∂Score/∂C</span>
                      <span className={`font-mono ${color}`}>{(grad * 1000).toFixed(4)}/nF</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Coarse step (~5%)</span>
                      <span className="font-mono text-amber-400">{Math.max(1, Math.round(coarse))} pF</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Fine step (~0.5%)</span>
                      <span className="font-mono text-emerald-400">{Math.max(1, Math.round(fine))} pF</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-600 mt-2">
              Step sizes computed at gradient ∂Score/∂C at AITO optimum.
              Coarse for fast acquisition after ignition; fine for maintenance corrections.
            </p>
          </div>

          {/* Algorithm code */}
          <div className="rounded-xl border border-violet-700/40 bg-slate-900/60 overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-700 flex items-center gap-2">
              <span className="text-xs font-semibold text-violet-300">Generated Tuning Algorithm</span>
              <span className="text-xs text-slate-500">JavaScript pseudocode — adapt to your motor/RF controller</span>
              <button onClick={copyCode}
                className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs transition-colors">
                {copied ? <CheckCheck size={11} className="text-emerald-400" /> : <Copy size={11} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="p-4 text-xs text-slate-300 overflow-x-auto leading-relaxed font-mono whitespace-pre">
              {generateAlgorithmCode(analysis, L1_uH, L2_uH, C1max, C2max, freq, Z0)}
            </pre>
          </div>

          {/* Implementation notes */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/20 p-3 text-xs text-slate-400">
            <div className="font-medium text-slate-300 mb-2">Implementation Notes</div>
            <ul className="space-y-1.5 list-disc list-inside text-slate-500">
              <li><span className="text-slate-400">sensor.gamma2()</span> — measure reflected/forward power ratio from a bidirectional coupler. No DSP needed: a simple diode detector gives |Γ|².</li>
              <li><span className="text-slate-400">motor.moveTo(C1_pF, C2_pF)</span> — convert pF → motor angle using θ = arcsin(√(C/C_max)), then command servo. Cache position to avoid redundant moves.</li>
              <li><span className="text-slate-400">State transition threshold ×3</span> — a 3× jump in reflected power is a reliable plasma state change signal. Adjust based on your process noise floor.</li>
              <li><span className="text-slate-400">MAINT_MS=100</span> — 10 Hz maintenance is sufficient for most plasma processes. Reduce to 20–50 ms for high-speed pulsed applications.</li>
              <li>For the AITO™ pre-position to be meaningful, probabilities in the States tab must reflect real dwell-time fractions of your recipe.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
