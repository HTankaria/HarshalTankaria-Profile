import React from 'react';

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}

export function InputField({ label, value, onChange, placeholder, hint }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</label>
      <div className="flex items-center rounded-lg border border-slate-700 focus-within:border-blue-500 bg-slate-900 transition-colors">
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          className="flex-1 bg-transparent px-3 py-2.5 text-sm text-slate-100 outline-none placeholder-slate-600 min-w-0"
        />
      </div>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
