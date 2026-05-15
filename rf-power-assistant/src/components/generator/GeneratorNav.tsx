import React from 'react';
import { Zap, Radio, Activity, AlertTriangle, ArrowUpDown, Settings, FileText } from 'lucide-react';
import { useGenerator } from '../../store/useGeneratorStore';
import type { GeneratorAppState } from '../../types/generator';
import type { LucideIcon } from 'lucide-react';

const TABS: { id: GeneratorAppState['activeTab']; label: string; short: string; icon: LucideIcon }[] = [
  { id: 'dc_supply',   label: 'DC Power Supply', short: 'DC',      icon: Zap },
  { id: 'rf_amp',      label: 'RF Amplifier',    short: 'RF Amp',  icon: Radio },
  { id: 'pulsing',     label: 'Pulsing Control', short: 'Pulse',   icon: Activity },
  { id: 'arc_detect',  label: 'Arc Detection',   short: 'Arc',     icon: AlertTriangle },
  { id: 'coupler',     label: 'Dir. Coupler',    short: 'Coupler', icon: ArrowUpDown },
  { id: 'control',     label: 'Control / PLL',   short: 'Control', icon: Settings },
  { id: 'gen_report',  label: 'Report',          short: 'Report',  icon: FileText },
];

const COMPLETE_MAP: Record<GeneratorAppState['activeTab'], keyof GeneratorAppState> = {
  dc_supply: 'dcResult', rf_amp: 'ampResult', pulsing: 'pulsingResult',
  arc_detect: 'arcResult', coupler: 'couplerResult', control: 'controlResult', gen_report: 'controlResult',
};

export default function GeneratorNav() {
  const { state, setTab } = useGenerator();
  return (
    <>
      <nav className="hidden md:flex flex-col gap-1 w-52 shrink-0">
        {TABS.map((tab, i) => {
          const Icon = tab.icon;
          const done = !!state[COMPLETE_MAP[tab.id]];
          const active = state.activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${active ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${done ? 'bg-violet-500 text-white' : active ? 'bg-violet-400 text-white' : 'bg-slate-700 text-slate-400'}`}>{done ? '✓' : i + 1}</span>
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          );
        })}
      </nav>
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-slate-900 border-t border-slate-700 flex z-50 overflow-x-auto scrollbar-none">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = state.activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setTab(tab.id)}
              className={`flex-shrink-0 flex flex-col items-center gap-1 py-2 px-3 text-xs transition-colors ${active ? 'text-violet-400' : 'text-slate-500'}`}>
              <Icon size={16} />{tab.short}
            </button>
          );
        })}
      </nav>
    </>
  );
}
