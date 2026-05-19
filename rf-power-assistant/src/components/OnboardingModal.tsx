import React, { useEffect, useState } from 'react';
import { Radio, Zap, ChevronRight, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { SystemConfig } from '../types';

const STORAGE_KEY = 'rf_design_onboarded_v3';

interface Preset {
  name: string;
  badge: string;
  desc: string;
  config: Partial<SystemConfig>;
}

const PRESETS: Preset[] = [
  {
    name: 'CCP Etch — 13.56 MHz / 1 kW',
    badge: 'Most Common',
    desc: '300mm CCP etch at 50 mTorr Ar/CF₄. Standard L-network matching. Most common fab process node.',
    config: {
      toolType: 'CCP_ETCH',
      primaryFrequency: 13.56e6,
      primaryPower: 1000,
      operatingPressure: 50,
      chamberDiameter: 300,
      electrodeGap: 25,
      filterOrder: 7,
      qTarget: 5,
    },
  },
  {
    name: 'ICP Source — 13.56 MHz / 3 kW',
    badge: 'High Density',
    desc: '200mm ICP etch at 10 mTorr. High-density plasma source with low R_plasma — T-network for step-up from 50 Ω.',
    config: {
      toolType: 'ICP_ETCH',
      primaryFrequency: 13.56e6,
      primaryPower: 3000,
      operatingPressure: 10,
      chamberDiameter: 200,
      electrodeGap: 40,
      filterOrder: 7,
      qTarget: 6,
    },
  },
  {
    name: 'PECVD — 13.56 MHz / 500 W',
    badge: 'Deposition',
    desc: '300mm PECVD SiN/SiO₂ at 1 Torr. Lower power density required for film quality. L-network sufficient.',
    config: {
      toolType: 'PECVD',
      primaryFrequency: 13.56e6,
      primaryPower: 500,
      operatingPressure: 1000,
      chamberDiameter: 300,
      electrodeGap: 20,
      filterOrder: 5,
      qTarget: 3,
    },
  },
  {
    name: 'Dual-Freq CCP — 2 + 13.56 MHz',
    badge: 'Dual Freq',
    desc: 'Independent HF (density) + LF (ion energy) control. 300mm etch. Two separate RF delivery chains.',
    config: {
      toolType: 'DUAL_FREQ_CCP',
      primaryFrequency: 13.56e6,
      primaryPower: 2000,
      secondaryFrequency: 2e6,
      secondaryPower: 800,
      operatingPressure: 30,
      chamberDiameter: 300,
      electrodeGap: 25,
      filterOrder: 7,
      qTarget: 5,
    },
  },
];

const WORKFLOW = [
  { n: 1, label: 'System Config',      desc: 'Frequency, power, tool type, matching topology. Physics validation runs automatically.' },
  { n: 2, label: 'Plasma Model',       desc: 'PSTAW™ generates 4 operating states. Edit R, X, and probability per state.' },
  { n: 3, label: 'Matching Network',   desc: 'AITO™ designs L/Pi/T network to the probability-weighted impedance centroid.' },
  { n: 4, label: 'Transmission Line',  desc: 'Coax analysis: standing waves, electrical length, attenuation.' },
  { n: 5, label: 'Harmonic Filter',    desc: 'MHCN™ Butterworth LP (5/7/9th order) for FCC/SEMI harmonic compliance.' },
  { n: 6, label: 'Thermal Analysis',   desc: 'ETCD-RF™ skin-effect-corrected temperatures for matching and filter components.' },
  { n: 7, label: 'Design Report',      desc: 'Full BOM with part numbers, voltage/current ratings, AITO™ score, risk register.' },
];

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const { updateSystemConfig, autoEstimatePlasma, setStep } = useStore();

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1');
    setOpen(false);
  }

  function applyPreset(p: Preset) {
    updateSystemConfig(p.config);
    // Give the config update time to flush before generating plasma model
    setTimeout(() => {
      autoEstimatePlasma();
      setStep(2);
    }, 50);
    dismiss();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center">
              <Radio size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">RF Power Design Assistant</h2>
              <p className="text-sm text-slate-400 mt-0.5">EE-centric plasma tool RF delivery designer</p>
            </div>
          </div>
          <button onClick={dismiss} className="text-slate-500 hover:text-slate-300 transition-colors p-1 mt-0.5">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 pb-4 space-y-5">
          {/* EE focus note */}
          <div className="bg-blue-950/40 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-200 leading-relaxed">
            <Zap size={14} className="inline mr-2 text-blue-400" />
            Designed for <strong>electrical engineers</strong> — not process engineers.
            Plasma chemistry (gas, etch rate, deposition uniformity) is abstracted out.
            The tool exposes only EE-relevant parameters: impedance, VSWR, Q-factor, component ratings, skin depth.
            All plasma physics constraints are enforced automatically.
          </div>

          {/* Workflow */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">7-Step Design Workflow</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {WORKFLOW.map(s => (
                <div key={s.n} className="flex gap-3 rounded-lg p-3 bg-slate-800/50 border border-slate-700/50">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">{s.n}</span>
                  <div>
                    <p className="text-xs font-semibold text-slate-200">{s.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Presets */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Quick Start — Choose a Template</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRESETS.map(p => (
                <button key={p.name} onClick={() => applyPreset(p)}
                  className="text-left rounded-xl border border-slate-700 hover:border-blue-500/60 bg-slate-800/50 hover:bg-slate-800 p-4 transition-all group">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors leading-tight">{p.name}</span>
                    <span className="shrink-0 text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded px-1.5 py-0.5 whitespace-nowrap">{p.badge}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{p.desc}</p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Apply template &amp; generate plasma model</span>
                    <ChevronRight size={11} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
          <p className="text-xs text-slate-500">Templates pre-fill all parameters and auto-generate the plasma model.</p>
          <button onClick={dismiss}
            className="text-sm text-slate-400 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-slate-800">
            Start from scratch →
          </button>
        </div>
      </div>
    </div>
  );
}
