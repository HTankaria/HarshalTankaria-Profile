import React, { useState } from 'react';
import { Zap, Server } from 'lucide-react';

// EV stores & components
import { EVStoreProvider } from './store/useEVStore';
import EVNav from './components/ev/EVNav';
import ChargingStandard from './components/ev/ChargingStandard';
import ACInputPFC from './components/ev/ACInputPFC';
import DCDCConverter from './components/ev/DCDCConverter';
import EVThermal from './components/ev/EVThermal';
import EVReport from './components/ev/EVReport';

// AI Rack stores & components
import { AIRackStoreProvider } from './store/useAIRackStore';
import AIRackNav from './components/aiRack/AIRackNav';
import RackConfig from './components/aiRack/RackConfig';
import Bus48V from './components/aiRack/Bus48V';
import DCDCStages from './components/aiRack/DCDCStages';
import ThermalDesign from './components/aiRack/ThermalDesign';
import AIRackReport from './components/aiRack/AIRackReport';

// We need to read activeTab from stores, so create wrapper components
import { useEV } from './store/useEVStore';
import { useAIRack } from './store/useAIRackStore';

function EVApp() {
  const { state } = useEV();
  const tab = state.activeTab;
  return (
    <div className="flex flex-col md:flex-row gap-6 min-h-0 flex-1">
      <EVNav />
      <main className="flex-1 min-w-0 pb-20 md:pb-6 overflow-y-auto scrollbar-none">
        {tab === 'standard' && <ChargingStandard />}
        {tab === 'pfc'      && <ACInputPFC />}
        {tab === 'dcdc'     && <DCDCConverter />}
        {tab === 'thermal'  && <EVThermal />}
        {tab === 'report'   && <EVReport />}
      </main>
    </div>
  );
}

function AIRackApp() {
  const { state } = useAIRack();
  const tab = state.activeTab;
  return (
    <div className="flex flex-col md:flex-row gap-6 min-h-0 flex-1">
      <AIRackNav />
      <main className="flex-1 min-w-0 pb-20 md:pb-6 overflow-y-auto scrollbar-none">
        {tab === 'rack_config'  && <RackConfig />}
        {tab === 'bus48v'       && <Bus48V />}
        {tab === 'dcdc_stages'  && <DCDCStages />}
        {tab === 'thermal'      && <ThermalDesign />}
        {tab === 'report'       && <AIRackReport />}
      </main>
    </div>
  );
}

type Mode = 'ev' | 'rack';

export default function App() {
  const [mode, setMode] = useState<Mode>('ev');

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg flex items-center justify-center text-lg font-bold">
            ⚡
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-none">PowerStack</h1>
            <p className="text-xs text-slate-400 leading-none mt-0.5">
              {mode === 'ev' ? 'EV Charger Power Design' : 'AI / GPU Rack Power Design'}
            </p>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center bg-slate-800 rounded-xl p-1 gap-1">
          <button
            onClick={() => setMode('ev')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'ev' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap size={14} />
            <span className="hidden sm:inline">EV Charger</span>
          </button>
          <button
            onClick={() => setMode('rack')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'rack' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Server size={14} />
            <span className="hidden sm:inline">AI Rack</span>
          </button>
        </div>
      </header>

      {/* Tool description banner */}
      <div className={`px-4 py-2 text-xs text-center border-b ${
        mode === 'ev'
          ? 'bg-blue-950/50 border-blue-900/50 text-blue-300'
          : 'bg-violet-950/50 border-violet-900/50 text-violet-300'
      }`}>
        {mode === 'ev'
          ? '🔌 NACS / CCS / CHAdeMO · 400V & 800V Architecture · LLC & CLLC Bidirectional · V2G Ready'
          : '🖥 H100 / H200 / B200 · OCP v3 48V Bus · DC-DC Stages · DLC / Immersion Thermal · PUE'}
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col min-h-0 p-4 md:p-6">
        {mode === 'ev' ? (
          <EVStoreProvider>
            <EVApp />
          </EVStoreProvider>
        ) : (
          <AIRackStoreProvider>
            <AIRackApp />
          </AIRackStoreProvider>
        )}
      </div>
    </div>
  );
}
