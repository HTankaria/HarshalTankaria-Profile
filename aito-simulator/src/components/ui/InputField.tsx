import { useState, useEffect } from 'react';

interface Props {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
}

export function InputField({ label, value, onChange, unit, min, max, step = 1, hint }: Props) {
  const [local, setLocal] = useState(String(value));

  useEffect(() => { setLocal(String(value)); }, [value]);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-400">{label}</label>
      <div className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-2 focus-within:border-blue-500 transition-colors">
        <input
          type="number"
          value={local}
          min={min} max={max} step={step}
          onChange={e => setLocal(e.target.value)}
          onBlur={() => {
            const n = parseFloat(local);
            if (!isNaN(n)) {
              let clamped = n;
              if (min !== undefined) clamped = Math.max(min, clamped);
              if (max !== undefined) clamped = Math.min(max, clamped);
              onChange(clamped);
              setLocal(String(clamped));
            } else {
              setLocal(String(value));
            }
          }}
          className="flex-1 bg-transparent text-sm text-slate-100 outline-none min-w-0"
        />
        {unit && <span className="text-xs text-slate-500 shrink-0">{unit}</span>}
      </div>
      {hint && <p className="text-xs text-slate-600">{hint}</p>}
    </div>
  );
}
