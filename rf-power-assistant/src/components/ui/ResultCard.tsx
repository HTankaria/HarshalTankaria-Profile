import React from 'react';

interface Metric {
  label: string;
  value: string;
  unit?: string;
  status?: 'ok' | 'warning' | 'critical' | 'info';
}

interface Props {
  title: string;
  icon?: React.ReactNode;
  metrics: Metric[];
  accent?: string;
}

const statusColors: Record<string, string> = {
  ok:       'text-emerald-400',
  warning:  'text-yellow-400',
  critical: 'text-red-400',
  info:     'text-blue-400',
};

export function ResultCard({ title, icon, metrics, accent = 'border-blue-500/40' }: Props) {
  return (
    <div className={`rounded-xl border ${accent} bg-slate-800/60 backdrop-blur p-4`}>
      <div className="flex items-center gap-2 mb-3">
        {icon && <span className="text-blue-400">{icon}</span>}
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {metrics.map(m => (
          <div key={m.label} className="flex flex-col">
            <span className="text-xs text-slate-500">{m.label}</span>
            <span className={`text-sm font-mono font-medium ${m.status ? statusColors[m.status] : 'text-slate-100'}`}>
              {m.value}{m.unit && <span className="text-xs text-slate-500 ml-0.5">{m.unit}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
