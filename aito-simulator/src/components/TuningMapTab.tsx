import { useState, useRef, useEffect } from 'react';
import { Map, Zap, AlertTriangle, CheckCircle, Info, Upload } from 'lucide-react';
import { computeTuningMap, pFtoAngle, scoreToRgb } from '../calculations/tuningMap';
import { parseSsn } from '../calculations/ssnParser';
import type { MapResult } from '../calculations/tuningMap';
import type { ImpedanceState } from '../types';

interface Props {
  states: ImpedanceState[];
  freq: number;
  Z0: number;
  onNetworkLoad?: (freq: number, Z0: number) => void;
}

const CANVAS_PX = 360;

function useMapCanvas(result: MapResult | null) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!result || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const { N, scoreGrid } = result;

    const buf = ctx.createImageData(N, N);
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const score = scoreGrid[i * N + j];
        const [r, g, b] = scoreToRgb(score);
        const row = N - 1 - j;
        const idx = (row * N + i) * 4;
        buf.data[idx] = r; buf.data[idx + 1] = g; buf.data[idx + 2] = b; buf.data[idx + 3] = 255;
      }
    }

    const offscreen = document.createElement('canvas');
    offscreen.width = N; offscreen.height = N;
    offscreen.getContext('2d')!.putImageData(buf, 0, 0);
    ctx.clearRect(0, 0, CANVAS_PX, CANVAS_PX);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(offscreen, 0, 0, CANVAS_PX, CANVAS_PX);
  }, [result]);

  return canvasRef;
}

function toCanvasXY(C1: number, C2: number, C1max: number, C2max: number) {
  return { x: (C2 / C2max) * CANVAS_PX, y: CANVAS_PX - (C1 / C1max) * CANVAS_PX };
}

export function TuningMapTab({ states, freq, Z0, onNetworkLoad }: Props) {
  const [C1max, setC1max] = useState(20000);
  const [C2max, setC2max] = useState(20000);
  const [L1_uH, setL1_uH] = useState(36.6);
  const [L2_uH, setL2_uH] = useState(93.9);
  const [result, setResult] = useState<MapResult | null>(null);
  const [computing, setComputing] = useState(false);
  const [hovered, setHovered] = useState<{ C1: number; C2: number; score: number } | null>(null);
  const [ssnName, setSsnName] = useState<string | null>(null);
  const canvasRef = useMapCanvas(result);
  const overlayRef = useRef<SVGSVGElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (states.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-500">
        <Map size={32} className="text-slate-700" />
        <p className="text-sm">Add at least 2 impedance states to compute the tuning map.</p>
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
      setSsnName(file.name);
      onNetworkLoad?.(p.freq_Hz, p.Z0);
      setResult(null);
    });
  }

  function compute() {
    setComputing(true);
    setTimeout(() => {
      const r = computeTuningMap(states, Z0, freq, C1max, C2max, L1_uH, L2_uH, 70);
      setResult(r);
      setComputing(false);
    }, 30);
  }

  function handleCanvasMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!result || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    const C2 = (px / CANVAS_PX) * C2max;
    const C1 = ((CANVAS_PX - py) / CANVAS_PX) * C1max;
    const ci = Math.max(0, Math.min(result.N - 1, Math.round((C1 / C1max) * (result.N - 1))));
    const cj = Math.max(0, Math.min(result.N - 1, Math.round((C2 / C2max) * (result.N - 1))));
    setHovered({ C1: Math.round(C1), C2: Math.round(C2), score: result.scoreGrid[ci * result.N + cj] });
  }

  function strategy() {
    if (!result) return null;
    const { spreadC1, spreadC2, optScore } = result;
    const totalSpread = Math.sqrt(spreadC1 ** 2 + spreadC2 ** 2);
    if (totalSpread < 500 && optScore > 0.85) return { level: 'ok', text: 'Fixed network viable — all state optima within 500 pF. Pre-position to AITO point, no active tuning needed.' };
    if (totalSpread < 3000 && optScore > 0.7) return { level: 'warn', text: `State optima spread ${Math.round(totalSpread)} pF. Pre-position to AITO point then run small hill-climb corrections (~${Math.round(totalSpread / 100)} motor steps).` };
    return { level: 'crit', text: `State optima spread ${Math.round(totalSpread)} pF. Active closed-loop tuning required. See Algorithm tab for generated tuning code.` };
  }

  const strat = strategy();

  return (
    <div className="flex flex-col gap-5">
      {/* Network controls */}
      <div className="flex flex-wrap items-end gap-3">
        {[
          { label: 'L1 load-side', val: L1_uH, set: setL1_uH, unit: 'µH', min: 0.1, max: 500, step: 0.1 },
          { label: 'L2 gen-side', val: L2_uH, set: setL2_uH, unit: 'µH', min: 0.1, max: 500, step: 0.1 },
        ].map(({ label, val, set, unit, min, max, step }) => (
          <div key={label} className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">{label}</label>
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-2 focus-within:border-blue-500 w-28">
              <input type="number" value={val} min={min} max={max} step={step}
                onChange={e => { set(Number(e.target.value)); setResult(null); }}
                className="flex-1 bg-transparent text-sm text-slate-100 outline-none" />
              <span className="text-xs text-slate-500">{unit}</span>
            </div>
          </div>
        ))}
        {[
          { label: 'C1 max (shunt)', val: C1max, set: setC1max },
          { label: 'C2 max (series)', val: C2max, set: setC2max },
        ].map(({ label, val, set }) => (
          <div key={label} className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">{label}</label>
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-2 focus-within:border-blue-500 w-32">
              <input type="number" value={val} min={100} max={100000} step={100}
                onChange={e => { set(Number(e.target.value)); setResult(null); }}
                className="flex-1 bg-transparent text-sm text-slate-100 outline-none" />
              <span className="text-xs text-slate-500">pF</span>
            </div>
          </div>
        ))}

        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">SimNEC .ssn</label>
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors">
            <Upload size={12} />
            {ssnName ? ssnName.replace(/^.*[\\/]/, '').slice(0, 16) : 'Import file'}
          </button>
          <input ref={fileRef} type="file" accept=".ssn,.xml" className="hidden" onChange={handleSsnFile} />
        </div>

        <button onClick={compute} disabled={computing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-semibold transition-colors">
          <Map size={14} />
          {computing ? 'Computing…' : result ? 'Recompute' : 'Compute Map'}
        </button>

        {hovered && (
          <div className="text-xs text-slate-400 font-mono">
            C1={hovered.C1}pF  C2={hovered.C2}pF  Score={hovered.score.toFixed(3)}
          </div>
        )}
      </div>

      {!result && !computing && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-6 text-center text-slate-500 text-sm">
          Click "Compute Map" to explore the full C1×C2 solution space.
          <div className="text-xs mt-1 text-slate-600">Topology: Gen → L2({L2_uH}µH) → C2(series) → [node] → L1({L1_uH}µH) → Plasma, C1 shunt at node</div>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-5">
          {strat && (
            <div className={`rounded-xl border p-3 flex items-start gap-2.5 text-xs ${
              strat.level === 'ok'   ? 'border-emerald-600/40 bg-emerald-900/10 text-emerald-300' :
              strat.level === 'warn' ? 'border-amber-600/40 bg-amber-900/10 text-amber-300' :
                                       'border-red-600/40 bg-red-900/10 text-red-300'}`}>
              {strat.level === 'ok' ? <CheckCircle size={14} className="mt-0.5 shrink-0" /> :
               <AlertTriangle size={14} className="mt-0.5 shrink-0" />}
              <span>{strat.text}</span>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-5">
            {/* Heatmap */}
            <div className="flex flex-col gap-2 shrink-0">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>C1(shunt)↑ · L1={L1_uH}µH+L2={L2_uH}µH · C2(series)→</span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#b41414' }} /> Low
                  <span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#14a050' }} /> High
                </span>
              </div>

              <div className="relative" style={{ width: CANVAS_PX, height: CANVAS_PX }}>
                <canvas ref={canvasRef} width={CANVAS_PX} height={CANVAS_PX}
                  className="rounded-lg border border-slate-700 cursor-crosshair"
                  onMouseMove={handleCanvasMove} onMouseLeave={() => setHovered(null)} />

                <svg ref={overlayRef} className="absolute inset-0 pointer-events-none" width={CANVAS_PX} height={CANVAS_PX}>
                  {result.perStateOptima.map((pt, i) => {
                    const { x, y } = toCanvasXY(pt.C1, pt.C2, C1max, C2max);
                    return (
                      <g key={i}>
                        <circle cx={x} cy={y} r={7} fill={pt.color} fillOpacity={0.3} stroke={pt.color} strokeWidth={1.5} />
                        <circle cx={x} cy={y} r={2.5} fill={pt.color} />
                        <text x={x + 9} y={y - 5} fontSize="8" fill={pt.color} fontWeight="600">
                          {pt.label.split(' ')[0]}
                        </text>
                      </g>
                    );
                  })}

                  {(() => {
                    const { x, y } = toCanvasXY(result.optC1, result.optC2, C1max, C2max);
                    return (
                      <g>
                        <polygon points={`${x},${y - 10} ${x + 8},${y} ${x},${y + 10} ${x - 8},${y}`}
                          fill="#818cf8" fillOpacity={0.35} stroke="#818cf8" strokeWidth={2} />
                        <circle cx={x} cy={y} r={2} fill="#818cf8" />
                        <text x={x + 11} y={y + 3} fontSize="9" fill="#818cf8" fontWeight="700">AITO</text>
                      </g>
                    );
                  })()}

                  <text x={CANVAS_PX / 2} y={CANVAS_PX - 4} fontSize="8" fill="#64748b" textAnchor="middle">
                    C2 → {C2max} pF
                  </text>
                  <text x={6} y={CANVAS_PX / 2} fontSize="8" fill="#64748b" textAnchor="middle"
                    transform={`rotate(-90, 6, ${CANVAS_PX / 2})`}>
                    C1 → {C1max} pF
                  </text>
                </svg>
              </div>

              <p className="text-xs text-slate-600">◆ = AITO optimal · ● = per-state best match</p>
            </div>

            {/* Right panel */}
            <div className="flex flex-col gap-4 flex-1">
              <div className="rounded-xl border border-indigo-700/40 bg-indigo-900/10 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={13} className="text-indigo-400" />
                  <span className="text-xs font-semibold text-indigo-300">AITO™ Optimal Position</span>
                  <span className="ml-auto text-xs font-mono text-emerald-400">Score {result.optScore.toFixed(4)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: 'C1 shunt', val: result.optC1, max: C1max },
                    { label: 'C2 series', val: result.optC2, max: C2max },
                  ].map(({ label, val, max }) => (
                    <div key={label} className="rounded-lg bg-slate-900/60 border border-slate-700 p-2">
                      <div className="text-slate-500">{label}</div>
                      <div className="font-mono text-slate-100 text-sm">{Math.round(val)} pF</div>
                      <div className="text-slate-600">{pFtoAngle(val, max)}° motor</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-700 overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-700 text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <Info size={12} /> Per-State Motor Positions
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-500">
                      <th className="text-left px-3 py-1.5 font-medium">State</th>
                      <th className="text-left px-3 py-1.5 font-medium">C1 pF</th>
                      <th className="text-left px-3 py-1.5 font-medium">θ1</th>
                      <th className="text-left px-3 py-1.5 font-medium">C2 pF</th>
                      <th className="text-left px-3 py-1.5 font-medium">θ2</th>
                      <th className="text-left px-3 py-1.5 font-medium">|Γ|</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.perStateOptima.map((pt, i) => (
                      <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                        <td className="px-3 py-2 flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: pt.color }} />
                          <span className="text-slate-300">{pt.label}</span>
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-200">{Math.round(pt.C1)}</td>
                        <td className="px-3 py-2 font-mono text-slate-400">{pFtoAngle(pt.C1, C1max)}°</td>
                        <td className="px-3 py-2 font-mono text-slate-200">{Math.round(pt.C2)}</td>
                        <td className="px-3 py-2 font-mono text-slate-400">{pFtoAngle(pt.C2, C2max)}°</td>
                        <td className="px-3 py-2 font-mono">
                          <span className={pt.gamma < 0.1 ? 'text-emerald-400' : pt.gamma < 0.3 ? 'text-amber-400' : 'text-red-400'}>
                            {pt.gamma.toFixed(3)}
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-indigo-900/10">
                      <td className="px-3 py-2 flex items-center gap-1.5">
                        <div className="w-2 h-2 rotate-45 shrink-0 bg-indigo-400" />
                        <span className="text-indigo-300 font-medium">AITO™</span>
                      </td>
                      <td className="px-3 py-2 font-mono text-indigo-300">{Math.round(result.optC1)}</td>
                      <td className="px-3 py-2 font-mono text-indigo-400">{pFtoAngle(result.optC1, C1max)}°</td>
                      <td className="px-3 py-2 font-mono text-indigo-300">{Math.round(result.optC2)}</td>
                      <td className="px-3 py-2 font-mono text-indigo-400">{pFtoAngle(result.optC2, C2max)}°</td>
                      <td className="px-3 py-2 font-mono text-emerald-400">{result.optScore.toFixed(3)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-3 text-xs">
                <div className="text-slate-400 font-medium mb-2">Motor Travel Between State Optima</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'C1 spread', val: result.spreadC1, max: C1max, desc: 'shunt motor' },
                    { label: 'C2 spread', val: result.spreadC2, max: C2max, desc: 'series motor' },
                  ].map(({ label, val, max, desc }) => (
                    <div key={label} className="rounded-lg bg-slate-900/60 border border-slate-700 p-2">
                      <div className="text-slate-500">{label}</div>
                      <div className={`font-mono text-sm ${val < 500 ? 'text-emerald-400' : val < 3000 ? 'text-amber-400' : 'text-red-400'}`}>
                        {Math.round(val)} pF
                      </div>
                      <div className="text-slate-600">{Math.round(pFtoAngle(val, max))}° {desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
