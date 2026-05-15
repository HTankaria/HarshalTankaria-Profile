import React from 'react';

interface Props {
  children: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'slate';
}

const colors: Record<string, string> = {
  blue:   'bg-blue-500/15 text-blue-300 border-blue-500/30',
  green:  'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  yellow: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  red:    'bg-red-500/15 text-red-300 border-red-500/30',
  purple: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  slate:  'bg-slate-700/50 text-slate-300 border-slate-600',
};

export function Badge({ children, color = 'blue' }: Props) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${colors[color]}`}>
      {children}
    </span>
  );
}
