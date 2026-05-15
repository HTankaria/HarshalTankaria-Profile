import React from 'react';
import { StoreProvider, useStore } from './store/useStore';
import { StepIndicator } from './components/StepIndicator';
import { Step1SystemConfig } from './components/steps/Step1SystemConfig';
import { Step2PlasmaLoad } from './components/steps/Step2PlasmaLoad';
import { Step3MatchingNetwork } from './components/steps/Step3MatchingNetwork';
import { Step4TransmissionLine } from './components/steps/Step4TransmissionLine';
import { Step5HarmonicsFilter } from './components/steps/Step5HarmonicsFilter';
import { Step6ThermalAnalysis } from './components/steps/Step6ThermalAnalysis';
import { Step7FeasibilityReport } from './components/steps/Step7FeasibilityReport';
import { Zap } from 'lucide-react';

const STEP_COMPONENTS: Record<number, React.ComponentType> = {
  1: Step1SystemConfig,
  2: Step2PlasmaLoad,
  3: Step3MatchingNetwork,
  4: Step4TransmissionLine,
  5: Step5HarmonicsFilter,
  6: Step6ThermalAnalysis,
  7: Step7FeasibilityReport,
};

function AppInner() {
  const { state } = useStore();
  const StepComponent = STEP_COMPONENTS[state.currentStep] ?? Step1SystemConfig;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Top header */}
      <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur sticky top-0 z-40 print:hidden">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-600 shadow-lg shadow-blue-600/30">
              <Zap size={16} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-slate-100 text-sm">RF Power Design Assistant</span>
              <span className="ml-2 text-xs text-blue-400 font-mono">AITO™</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 hidden sm:flex">
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Semiconductor Tool RF Designer</span>
            <span className="px-2 py-0.5 rounded bg-purple-900/40 border border-purple-700/40 text-purple-300">Patent-Ready Methodology</span>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 flex gap-6 pb-24 md:pb-6">
        {/* Sidebar step indicator (desktop) */}
        <StepIndicator />

        {/* Step content */}
        <main className="flex-1 min-w-0">
          <div className="rounded-2xl border border-slate-800 bg-slate-800/30 backdrop-blur p-5 md:p-6">
            <StepComponent />
          </div>
        </main>
      </div>

      {/* Mobile bottom nav (rendered inside StepIndicator) */}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppInner />
    </StoreProvider>
  );
}
