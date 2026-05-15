import React from 'react';
import { Plug, RadioTower, Timer, ShieldAlert, GitMerge, Cpu, FileText } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useGenerator } from '../../store/useGeneratorStore';
import type { GeneratorAppState } from '../../types/generator';

const TABS: { id: GeneratorAppState['activeTab']; label: string; short: string; icon: LucideIcon }[] = [
  { id: 'dc_supply',  label: 'DC Power Supply',       short: 'DC PSU',   icon: Plug        },
  { id: 'rf_amp',     label: 'RF Amplifier',           short: 'RF PA',    icon: RadioTower  },
  { id: 'pulsing',    label: 'Pulsing Control',        short: 'Pulsing',  icon: Timer       },
  { id: 'arc_detect', label: 'Arc Detection',          short: 'Arc Det',  icon: ShieldAlert },
  { id: 'coupler',    label: 'Directional Coupler',    short: 'Coupler',  icon: GitMerge    },
  { id: 'control',    label: 'Control & PLL',          short: 'Control',  icon: Cpu         },
  { id: 'report',     label: 'Generator Report',       short: 'Report',   icon: FileText    },
];

const DONE_IF: Partial<Record<GeneratorAppState['activeTab'], keyof GeneratorAppState>> = {
  dc_supply:  'dcResult',
  rf_amp:     'ampResult',
  pulsing:    'pulsingResult',
  arc_detect: 'arcResult',
  coupler:    'couplerResult',
  control:    'controlResult',
};

export function GeneratorNav() {
  const { state, setTab } = useGenerator();

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col gap-1 w-48 flex-shrink-0">
        <div className="mb-4 px-2">
          <div className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-1">Generator Design</div>
          <div className="text-xs text-slate-500">Internal subsystem tool</div>
        </div>
        {TABS.map(t => {
          const Icon = t.icon;
          const doneKey = DONE_IF[t.id];
          const done = doneKey ? !!state[doneKey] : false;
          const active = state.activeTab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm transition-all ${
                active ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                       : done  ? 'text-emerald-400 hover:bg-slate-800'
                               : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 border ${
                active ? 'bg-white text-violet-600 border-white' :
                done   ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' :
                         'border-slate-600 text-slate-500 bg-slate-800'
              }`}>
                {done && !active ? '✓' : TABS.indexOf(t) + 1}
              </div>
              <Icon size={13} />
              <span className="truncate text-xs">{t.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 z-50">
        <div className="flex overflow-x-auto scrollbar-none">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = state.activeTab === t.id;
            const doneKey = DONE_IF[t.id];
            const done = doneKey ? !!state[doneKey] : false;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex flex-col items-center gap-0.5 px-2.5 py-2 flex-shrink-0 min-w-[52px] transition-colors ${
                  active ? 'text-violet-400' : done ? 'text-emerald-400' : 'text-slate-500'
                }`}>
                <Icon size={15} />
                <span className="text-[9px] truncate max-w-[50px]">{t.short}</span>
                {active && <div className="h-0.5 w-full bg-violet-400 rounded-full" />}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
