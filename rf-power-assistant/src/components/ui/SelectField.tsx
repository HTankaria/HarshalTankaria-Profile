import React from 'react';
import { ChevronDown } from 'lucide-react';

interface Option { value: string; label: string }

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  hint?: string;
}

export function SelectField({ label, value, onChange, options, hint }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 pr-9 text-sm text-slate-100 outline-none focus:border-blue-500 transition-colors cursor-pointer"
        >
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
      </div>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
