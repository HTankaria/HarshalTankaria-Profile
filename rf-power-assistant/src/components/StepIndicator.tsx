import React from 'react';
import { useStore } from '../store/useStore';
import type { AppState } from '../types/index';

const STEPS: { n: AppState['activeStep']; label: string; short: string }[] = [
  { n: 1, label: 'System Config',      short: 'Config'  },
  { n: 2, label: 'Plasma Model',       short: 'Plasma'  },
  { n: 3, label: 'Matching Network',   short: 'Match'   },
  { n: 4, label: 'Transmission Line',  short: 'TxLine'  },
  { n: 5, label: 'Harmonic Filter',    short: 'Filter'  },
  { n: 6, label: 'Thermal Design',     short: 'Thermal' },
  { n: 7, label: 'Feasibility Report', short: 'Report'  },
];

const COMPLETE_AT: Record<AppState['activeStep'], keyof AppState> = {
  1: 'plasmaStates', 2: 'matchingResult', 3: 'matchingResult',
  4: 'txLineResult', 5: 'filterResult', 6: 'thermalResult', 7: 'report',
};

export default function StepIndicator() {
  const { state, setStep } = useStore();
  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col gap-1 w-52 shrink-0">
        {STEPS.map(s => {
          const done = !!(state[COMPLETE_AT[s.n]]);
          const active = state.activeStep === s.n;
          return (
            <button key={s.n} onClick={() => setStep(s.n)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${active ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${done ? 'bg-emerald-500 text-white' : active ? 'bg-emerald-400 text-white' : 'bg-slate-700 text-slate-400'}`}>
                {done ? '✓' : s.n}
              </span>
              <span className="text-sm font-medium">{s.label}</span>
            </button>
          );
        })}
      </nav>
      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-slate-900 border-t border-slate-700 flex z-50 overflow-x-auto scrollbar-none">
        {STEPS.map(s => {
          const active = state.activeStep === s.n;
          const done = !!(state[COMPLETE_AT[s.n]]);
          return (
            <button key={s.n} onClick={() => setStep(s.n)}
              className={`flex-shrink-0 flex flex-col items-center gap-0.5 py-2 px-3 text-xs transition-colors ${active ? 'text-emerald-400' : 'text-slate-500'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mb-0.5 ${done ? 'bg-emerald-500 text-white' : active ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'}`}>{done ? '✓' : s.n}</span>
              {s.short}
            </button>
          );
        })}
      </nav>
    </>
  );
}
