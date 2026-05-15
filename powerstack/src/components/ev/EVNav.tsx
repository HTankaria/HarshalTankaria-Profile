import React from 'react';
import { Plug, Zap, Cpu, Thermometer, FileText } from 'lucide-react';
import { useEV } from '../../store/useEVStore';
import type { EVAppState } from '../../types/ev';

const TABS: { id: EVAppState['activeTab']; label: string; short: string; icon: typeof Plug }[] = [
  { id: 'standard', label: 'Charging Standard', short: 'Standard', icon: Plug },
  { id: 'pfc',      label: 'AC Input / PFC',    short: 'PFC',      icon: Zap },
  { id: 'dcdc',     label: 'DC-DC Converter',   short: 'DC-DC',    icon: Cpu },
  { id: 'thermal',  label: 'Thermal & Safety',  short: 'Thermal',  icon: Thermometer },
  { id: 'report',   label: 'Report',            short: 'Report',   icon: FileText },
];

const COMPLETE_MAP: Record<EVAppState['activeTab'], keyof ReturnType<typeof useEV>['state']> = {
  standard: 'standardResult',
  pfc:      'pfcResult',
  dcdc:     'dcdcResult',
  thermal:  'thermalResult',
  report:   'report',
};

export default function EVNav() {
  const { state, setActiveTab } = useEV();
  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col gap-1 w-52 shrink-0">
        {TABS.map((tab, i) => {
          const Icon = tab.icon;
          const done = !!state[COMPLETE_MAP[tab.id]];
          const active = state.activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                done ? 'bg-emerald-500 text-white' : active ? 'bg-blue-400 text-white' : 'bg-slate-700 text-slate-400'
              }`}>{done ? '✓' : i + 1}</span>
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          );
        })}
      </nav>
      {/* Mobile tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-slate-900 border-t border-slate-700 flex z-50">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = state.activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-colors ${
                active ? 'text-blue-400' : 'text-slate-500'
              }`}>
              <Icon size={18} />
              <span>{tab.short}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
