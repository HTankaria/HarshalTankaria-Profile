import React, { useState } from 'react';
import { Radio, Cpu } from 'lucide-react';

// System tool
import { StoreProvider } from './store/useStore';
import { useStore } from './store/useStore';
import StepIndicator from './components/StepIndicator';
import Step1 from './components/steps/Step1';
import Step2 from './components/steps/Step2';
import Step3 from './components/steps/Step3';
import Step4 from './components/steps/Step4';
import Step5 from './components/steps/Step5';
import Step6 from './components/steps/Step6';
import Step7 from './components/steps/Step7';

// Generator tool
import { GeneratorStoreProvider } from './store/useGeneratorStore';
import { useGenerator } from './store/useGeneratorStore';
import GeneratorNav from './components/generator/GeneratorNav';
import DCPowerSupply from './components/generator/DCPowerSupply';
import RFAmplifier from './components/generator/RFAmplifier';
import PulsingControl from './components/generator/PulsingControl';
import ArcDetection from './components/generator/ArcDetection';
import DirectionalCoupler from './components/generator/DirectionalCoupler';
import ControlSystem from './components/generator/ControlSystem';
import GeneratorReport from './components/generator/GeneratorReport';

function SystemApp() {
  const { state } = useStore();
  const s = state.activeStep;
  return (
    <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
      <StepIndicator />
      <main className="flex-1 min-w-0 pb-20 md:pb-6 overflow-y-auto scrollbar-none">
        {s === 1 && <Step1 />}
        {s === 2 && <Step2 />}
        {s === 3 && <Step3 />}
        {s === 4 && <Step4 />}
        {s === 5 && <Step5 />}
        {s === 6 && <Step6 />}
        {s === 7 && <Step7 />}
      </main>
    </div>
  );
}

function GeneratorApp() {
  const { state } = useGenerator();
  const t = state.activeTab;
  return (
    <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
      <GeneratorNav />
      <main className="flex-1 min-w-0 pb-20 md:pb-6 overflow-y-auto scrollbar-none">
        {t === 'dc_supply'  && <DCPowerSupply />}
        {t === 'rf_amp'     && <RFAmplifier />}
        {t === 'pulsing'    && <PulsingControl />}
        {t === 'arc_detect' && <ArcDetection />}
        {t === 'coupler'    && <DirectionalCoupler />}
        {t === 'control'    && <ControlSystem />}
        {t === 'gen_report' && <GeneratorReport />}
      </main>
    </div>
  );
}

type Mode = 'system' | 'generator';

export default function App() {
  const [mode, setMode] = useState<Mode>('system');
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center text-lg">📡</div>
          <div>
            <h1 className="text-lg font-bold text-white leading-none">RF Power Design</h1>
            <p className="text-xs text-slate-400 leading-none mt-0.5">
              {mode === 'system' ? 'Plasma Tool RF Delivery System' : 'RF Generator Internal Design'}
            </p>
          </div>
        </div>
        <div className="flex items-center bg-slate-800 rounded-xl p-1 gap-1">
          <button onClick={() => setMode('system')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'system' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            <Radio size={14} /><span className="hidden sm:inline">RF System</span>
          </button>
          <button onClick={() => setMode('generator')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'generator' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            <Cpu size={14} /><span className="hidden sm:inline">Generator</span>
          </button>
        </div>
      </header>

      <div className={`px-4 py-2 text-xs text-center border-b ${mode === 'system' ? 'bg-emerald-950/50 border-emerald-900/50 text-emerald-300' : 'bg-violet-950/50 border-violet-900/50 text-violet-300'}`}>
        {mode === 'system'
          ? '📡 CCP / ICP / PECVD / PVD · AITO™ · PSTAW™ · MHCN™ · ETCD-RF™ · Smith Chart · 7th-Order Filter'
          : '⚡ Class E Sokal · PFC / Bulk Cap · Pulsing · Arc Detection < 1µs · PLL · 7 Interlocks'}
      </div>

      <div className="flex-1 flex flex-col min-h-0 p-4 md:p-6">
        {mode === 'system' ? (
          <StoreProvider>
            <SystemApp />
          </StoreProvider>
        ) : (
          <GeneratorStoreProvider>
            <GeneratorApp />
          </GeneratorStoreProvider>
        )}
      </div>
    </div>
  );
}
