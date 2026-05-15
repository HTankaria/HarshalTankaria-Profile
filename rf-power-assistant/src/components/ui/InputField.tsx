import React from 'react';

interface Props {
  label: string;
  value: number | string;
  onChange: (v: string) => void;
  type?: 'number' | 'text';
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
  disabled?: boolean;
}

export function InputField({ label, value, onChange, type = 'number', unit, min, max, step, hint, disabled }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</label>
      <div className="flex items-center gap-0 rounded-lg border border-slate-700 focus-within:border-blue-500 bg-slate-900 transition-colors">
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          min={min} max={max} step={step}
          disabled={disabled}
          className="flex-1 bg-transparent px-3 py-2.5 text-sm text-slate-100 outline-none placeholder-slate-600 disabled:opacity-50 min-w-0"
        />
        {unit && (
          <span className="px-3 py-2.5 text-xs text-slate-500 border-l border-slate-700 whitespace-nowrap bg-slate-800/50 rounded-r-lg">
            {unit}
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
