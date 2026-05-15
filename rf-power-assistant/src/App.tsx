import React, { useState } from 'react';
import { StoreProvider, useStore } from './store/useStore';
import { GeneratorStoreProvider, useGenerator } from './store/useGeneratorStore';
import { StepIndicator } from './components/StepIndicator';
import { Step1SystemConfig } from './components/steps/Step1SystemConfig';
import { Step2PlasmaLoad } from './components/steps/Step2PlasmaLoad';
import { Step3MatchingNetwork } from './components/steps/Step3MatchingNetwork';
import { Step4TransmissionLine } from './components/steps/Step4TransmissionLine';
import { Step5HarmonicsFilter } from './components/steps/Step5HarmonicsFilter';
import { Step6ThermalAnalysis } from './components/steps/Step6ThermalAnalysis';
import { Step7FeasibilityReport } from './components/steps/Step7FeasibilityReport';
import { GeneratorNav } from './components/generator/GeneratorNav';
import { DCPowerSupply } from './components/generator/DCPowerSupply';
import { RFAmplifier } from './components/generator/RFAmplifier';
import { PulsingControl } from './components/generator/PulsingControl';
import { ArcDetection } from './components/generator/ArcDetection';
import { DirectionalCoupler } from './components/generator/DirectionalCoupler';
import { ControlSystem } from './components/generator/ControlSystem';
import { GeneratorReport } from './components/generator/GeneratorReport';
import { Zap, RadioTower, Waves } from 'lucide-react';

// ─── System Design (existing 7-step wizard) ────────────────────────────────

const STEP_COMPONENTS: Record<number, React.ComponentType> = {
  1: Step1SystemConfig,  2: Step2PlasmaLoad,    3: Step3MatchingNetwork,
  4: Step4TransmissionLine, 5: Step5HarmonicsFilter, 6: Step6ThermalAnalysis,
  7: Step7FeasibilityReport,
};

function SystemDesignApp() {
  const { state } = useStore();
  const StepComponent = STEP_COMPONENTS[state.currentStep] ?? Step1SystemConfig;
  return (
    <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 flex gap-6 pb-24 md:pb-6">
      <StepIndicator />
      <main className="flex-1 min-w-0">
        <div className="rounded-2xl border border-slate-800 bg-slate-800/30 backdrop-blur p-5 md:p-6">
          <StepComponent />
        </div>
      </main>
    </div>
  );
}

// ─── Generator Design (new tool) ─────────────────────────────────────────

const GEN_PANELS: Record<string, React.ComponentType> = {
  dc_supply:  DCPowerSupply,
  rf_amp:     RFAmplifier,
  pulsing:    PulsingControl,
  arc_detect: ArcDetection,
  coupler:    DirectionalCoupler,
  control:    ControlSystem,
  report:     GeneratorReport,
};

function GeneratorApp() {
  const { state } = useGenerator();
  const Panel = GEN_PANELS[state.activeTab] ?? DCPowerSupply;
  return (
    <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 flex gap-6 pb-24 md:pb-6">
      <GeneratorNav />
      <main className="flex-1 min-w-0">
        <div className="rounded-2xl border border-violet-900/40 bg-slate-800/30 backdrop-blur p-5 md:p-6">
          <Panel />
        </div>
      </main>
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────

type Mode = 'system' | 'generator';

export default function App() {
  const [mode, setMode] = useState<Mode>('system');

  return (
    <StoreProvider>
      <GeneratorStoreProvider>
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">

          {/* Header */}
          <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur sticky top-0 z-40 print:hidden">
            <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
              {/* Logo */}
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <div className="p-1.5 rounded-lg bg-blue-600 shadow-lg shadow-blue-600/30">
                  <Zap size={16} className="text-white" />
                </div>
                <span className="font-bold text-slate-100 text-sm hidden sm:block">RF Power Design Assistant</span>
                <span className="text-xs text-blue-400 font-mono hidden sm:block">AITO™</span>
              </div>

              {/* Mode toggle — the key new addition */}
              <div className="flex gap-1 p-1 rounded-xl bg-slate-800 border border-slate-700 flex-shrink-0">
                <button
                  onClick={() => setMode('system')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    mode === 'system'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Waves size={12} />
                  <span className="hidden sm:block">RF System Design</span>
                  <span className="sm:hidden">System</span>
                </button>
                <button
                  onClick={() => setMode('generator')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    mode === 'generator'
                      ? 'bg-violet-600 text-white shadow-sm shadow-violet-600/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <RadioTower size={12} />
                  <span className="hidden sm:block">RF Generator Design</span>
                  <span className="sm:hidden">Generator</span>
                </button>
              </div>

              {/* Right badges */}
              <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 flex-shrink-0">
                {mode === 'system'
                  ? <span className="px-2 py-0.5 rounded bg-purple-900/40 border border-purple-700/40 text-purple-300">AITO™ · PSTAW™ · MHCN™ · ETCD-RF™</span>
                  : <span className="px-2 py-0.5 rounded bg-violet-900/40 border border-violet-700/40 text-violet-300">DC · PA · Pulse · Arc · Coupler · Control</span>
                }
              </div>
            </div>
          </header>

          {/* Content area */}
          {mode === 'system' ? <SystemDesignApp /> : <GeneratorApp />}
        </div>
      </GeneratorStoreProvider>
    </StoreProvider>
  );
}
