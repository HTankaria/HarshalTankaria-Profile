import React from 'react';

interface InputProps {
  label: string; value: number | string; onChange: (v: string) => void;
  type?: 'number' | 'text'; unit?: string; min?: number; max?: number; step?: number; help?: string;
}
export function InputField({ label, value, onChange, type = 'number', unit, min, max, step, help }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</label>
      <div className="flex items-center gap-2">
        <input type={type} value={value} min={min} max={max} step={step}
          onChange={e => onChange(e.target.value)}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors" />
        {unit && <span className="text-xs text-slate-400 w-14 shrink-0">{unit}</span>}
      </div>
      {help && <p className="text-xs text-slate-500">{help}</p>}
    </div>
  );
}

interface SelectProps<T extends string> {
  label: string; value: T; onChange: (v: T) => void;
  options: { value: T; label: string }[]; help?: string;
}
export function SelectField<T extends string>({ label, value, onChange, options, help }: SelectProps<T>) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value as T)}
        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors appearance-none">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {help && <p className="text-xs text-slate-500">{help}</p>}
    </div>
  );
}

interface ResultCardProps { title: string; children: React.ReactNode; accent?: 'green'|'blue'|'amber'|'red'|'purple'; }
const ACCENT = { green:'border-emerald-500/30 bg-emerald-500/5', blue:'border-blue-500/30 bg-blue-500/5', amber:'border-amber-500/30 bg-amber-500/5', red:'border-red-500/30 bg-red-500/5', purple:'border-purple-500/30 bg-purple-500/5' };
export function ResultCard({ title, children, accent = 'green' }: ResultCardProps) {
  return (
    <div className={`rounded-xl border p-4 ${ACCENT[accent]}`}>
      <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

export function MetricRow({ label, value, unit, highlight }: { label: string; value: string|number; unit?: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-slate-700/50 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`text-sm font-mono font-medium ${highlight ? 'text-emerald-300' : 'text-slate-200'}`}>
        {value}{unit && <span className="text-xs text-slate-500 ml-1">{unit}</span>}
      </span>
    </div>
  );
}

export function RunButton({ onClick, label = 'Calculate', disabled }: { onClick: () => void; label?: string; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3 px-6 rounded-xl transition-colors text-sm">
      {label}
    </button>
  );
}

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
    </div>
  );
}

export function Badge({ label, variant = 'default' }: { label: string; variant?: 'default'|'success'|'warning'|'danger'|'info' }) {
  const cls = { default:'bg-slate-700 text-slate-300', success:'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30', warning:'bg-amber-500/20 text-amber-300 border border-amber-500/30', danger:'bg-red-500/20 text-red-300 border border-red-500/30', info:'bg-blue-500/20 text-blue-300 border border-blue-500/30' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls[variant]}`}>{label}</span>;
}

export function RiskItem({ severity, text }: { severity: 'low'|'medium'|'high'; text: string }) {
  const cls = severity === 'high' ? 'bg-red-500/10 border-red-500/30 text-red-300' : severity === 'medium' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300';
  return <div className={`rounded-lg border p-3 text-xs ${cls}`}><span className="font-semibold uppercase mr-2">{severity}:</span>{text}</div>;
}

export function ScoreGauge({ score, label }: { score: number; label: string }) {
  const pct = Math.max(0, Math.min(100, score));
  const color = pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
  const r = 36, cx = 50, cy = 50, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120" viewBox="0 0 100 100">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ * 0.25}
          strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} />
        <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">{pct}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#94a3b8" fontSize="8">/ 100</text>
      </svg>
      <span className="text-xs text-slate-400 mt-1">{label}</span>
    </div>
  );
}
