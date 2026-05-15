import React from 'react';
import { Check, Cpu, Waves, Network, Cable, Filter, Thermometer, FileText } from 'lucide-react';
import { useStore } from '../store/useStore';

const STEPS = [
  { n: 1, label: 'System Config',        short: 'System',   icon: Cpu },
  { n: 2, label: 'Plasma Load',          short: 'Plasma',   icon: Waves },
  { n: 3, label: 'Matching Network',     short: 'Matching', icon: Network },
  { n: 4, label: 'Transmission Line',    short: 'TX Line',  icon: Cable },
  { n: 5, label: 'Harmonic Filter',      short: 'Harmonics',icon: Filter },
  { n: 6, label: 'Thermal Analysis',     short: 'Thermal',  icon: Thermometer },
  { n: 7, label: 'Feasibility Report',   short: 'Report',   icon: FileText },
];

export function StepIndicator() {
  const { state, setStep } = useStore();
  const { currentStep, completedSteps } = state;

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col gap-1 w-52 flex-shrink-0">
        <div className="mb-4 px-2">
          <div className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-1">RF Design Wizard</div>
          <div className="text-xs text-slate-500">AITO™ · PSTAW™ · MHCN™</div>
        </div>
        {STEPS.map(s => {
          const Icon = s.icon;
          const done = completedSteps.has(s.n);
          const active = currentStep === s.n;
          return (
            <button
              key={s.n}
              onClick={() => setStep(s.n)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all text-sm ${
                active
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : done
                  ? 'text-emerald-400 hover:bg-slate-800'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold border ${
                active ? 'bg-white text-blue-600 border-white' :
                done   ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' :
                         'bg-slate-800 border-slate-600 text-slate-500'
              }`}>
                {done && !active ? <Check size={10} /> : s.n}
              </div>
              <Icon size={14} className="flex-shrink-0" />
              <span className="truncate">{s.label}</span>
            </button>
          );
        })}

        {/* Progress bar */}
        <div className="mt-4 px-3">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Progress</span>
            <span>{completedSteps.size}/7</span>
          </div>
          <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${(completedSteps.size / 7) * 100}%` }}
            />
          </div>
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 z-50 safe-area-bottom">
        <div className="flex overflow-x-auto scrollbar-none">
          {STEPS.map(s => {
            const Icon = s.icon;
            const done = completedSteps.has(s.n);
            const active = currentStep === s.n;
            return (
              <button
                key={s.n}
                onClick={() => setStep(s.n)}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 flex-shrink-0 min-w-[60px] transition-colors ${
                  active ? 'text-blue-400' : done ? 'text-emerald-400' : 'text-slate-500'
                }`}
              >
                {done && !active
                  ? <Check size={16} />
                  : <Icon size={16} />}
                <span className="text-[9px] truncate max-w-[56px]">{s.short}</span>
                {active && <div className="h-0.5 w-full bg-blue-400 rounded-full" />}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
