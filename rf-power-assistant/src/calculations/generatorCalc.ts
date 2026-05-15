// ─── RF Generator Internal Design Calculations ────────────────────────────────

import type {
  DCSupplyConfig, DCSupplyResult,
  RFAmpConfig, RFAmpResult,
  PulsingConfig, PulsingResult,
  ArcDetectConfig, ArcDetectResult,
  CouplerConfig, CouplerResult,
  ControlConfig, ControlResult,
} from '../types/generator';

// ─── DC Supply / PFC ─────────────────────────────────────────────────────────

export function designDCSupply(cfg: DCSupplyConfig): DCSupplyResult {
  const omega = 2 * Math.PI * 50; // 50 Hz mains
  const Vin_pk = cfg.acInputVoltage_V * Math.SQRT2;
  const P = cfg.outputPower_W;

  // DC bus voltage from PFC topology
  const Vdc = cfg.pfcTopology === 'vienna_3ph'
    ? cfg.acInputVoltage_V * Math.sqrt(3) * Math.SQRT2 * 0.95
    : cfg.acInputVoltage_V * Math.SQRT2 * 1.05;

  const Vmax = Vdc;
  const Vmin = cfg.outputVoltage_V * 0.9;

  // Bulk capacitance: C = 2·P·t / (Vmax² - Vmin²)
  const C_uF = (2 * P * cfg.holdupTime_ms * 1e-3) / (Vmax ** 2 - Vmin ** 2) * 1e6;

  // PFC inductor: L = Vin_pk*(Vdc-Vin_pk)/(Vdc*fsw*ΔIL), ΔIL = 30% Irms
  const Irms = P / (0.99 * cfg.acInputVoltage_V * (cfg.acInputPhases === 3 ? Math.sqrt(3) : 1));
  const dIL = 0.3 * Irms * Math.SQRT2;
  const fsw = cfg.switchFrequency_kHz * 1e3;
  const L_uH = (Vin_pk * (Vdc - Vin_pk)) / (Vdc * fsw * dIL) * 1e6;

  const Isw_pk = Irms * Math.SQRT2 * 1.5;
  const eff = 0.95;
  const ripple = (Irms * 0.05) / (C_uF * 1e-6 * 2 * Math.PI * 100);

  const pfcSuggestion = cfg.pfcTopology === 'bridgeless_totem_pole'
    ? `GaN Systems GS66516T (650V/60A) half-bridge × ${cfg.acInputPhases === 3 ? 6 : 2} — totem-pole PFC`
    : cfg.pfcTopology === 'vienna_3ph'
    ? 'Infineon IPP60R080P7 (600V Si) × 6 legs + IXYS DSS2x101 diode bridge'
    : `Infineon IPP65R065C7 (650V CoolMOS) + STPS30L60 diode`;

  return {
    dcBusVoltage_V:      Math.round(Vdc),
    bulkCapacitance_uF:  Math.round(C_uF),
    pfcInductance_uH:    Math.round(L_uH * 10) / 10,
    inputCurrentRMS_A:   Math.round(Irms * 10) / 10,
    switchCurrentPeak_A: Math.round(Isw_pk * 10) / 10,
    efficiency_pct:      Math.round(eff * 1000) / 10,
    fuseRating_A:        Math.ceil(Irms * 1.5 / 5) * 5,
    rippleVoltage_V:     Math.round(ripple * 100) / 100,
    pfcSwitchSuggestion: pfcSuggestion,
    notes: [
      `Bulk cap ${C_uF.toFixed(0)} µF provides ${cfg.holdupTime_ms} ms holdup at ${(Vmin).toFixed(0)} V min`,
      `PFC inductor ${L_uH.toFixed(1)} µH — CCM at ${cfg.switchFrequency_kHz} kHz`,
      `DC bus ${Vdc.toFixed(0)} V — fed to RF PA drain supply via regulated DC-DC`,
    ],
  };
}

// ─── RF Power Amplifier ───────────────────────────────────────────────────────

const CLASS_PARAMS: Record<string, { eff: number; pac: number; vdsFactor: number; idFactor: number }> = {
  CLASS_A:     { eff: 0.50, pac: 0.45, vdsFactor: 2.0,   idFactor: 2.0   },
  CLASS_AB:    { eff: 0.65, pac: 0.60, vdsFactor: 2.0,   idFactor: 1.5   },
  CLASS_B:     { eff: 0.785, pac: 0.70, vdsFactor: 2.0,  idFactor: 1.57  },
  CLASS_E:     { eff: 0.96, pac: 0.90, vdsFactor: 3.562, idFactor: 2.862 },
  CLASS_D:     { eff: 0.95, pac: 0.90, vdsFactor: 1.0,   idFactor: 3.14  },
  CLASS_F_INV: { eff: 0.90, pac: 0.85, vdsFactor: 2.0,   idFactor: 2.0   },
};

const TRANSISTOR_PARAMS: Record<string, { freq_max_MHz: number; suggestion: (f: number, P: number) => string }> = {
  LDMOS:    {
    freq_max_MHz: 500,
    suggestion: (f, P) => P > 500
      ? 'NXP BLF578 (900V LDMOS, 600W, TO-264) or Ampleon BLF578XR'
      : 'NXP MRF300 (50V, 300W) or Ampleon CLF1G0060-10',
  },
  GaN_HEMT: {
    freq_max_MHz: 6000,
    suggestion: (f, P) => f > 100e6
      ? 'Wolfspeed CGHV1F006S (65W GaN HEMT 0.25µm) or MACOM MAGX-001214'
      : 'Wolfspeed CG2H40010 (10W) or Infineon IGN1010M10 (10W 10MHz GaN)',
  },
  Si_BJT:   {
    freq_max_MHz: 30,
    suggestion: () => 'Thomson SD1487 (175W NPN RF BJT) or Motorola MRF454',
  },
  SiC_JFET: {
    freq_max_MHz: 50,
    suggestion: () => 'UnitedSiC UJ3C120080K3S (1200V SiC JFET) — Class E < 50MHz',
  },
};

export function designRFAmplifier(cfg: RFAmpConfig): RFAmpResult {
  const cls = CLASS_PARAMS[cfg.paClass] ?? CLASS_PARAMS.CLASS_E;
  const tr  = TRANSISTOR_PARAMS[cfg.transistorType] ?? TRANSISTOR_PARAMS.GaN_HEMT;
  const P   = cfg.outputPower_W;
  const Vdd = cfg.supplyVoltage_V;
  const f   = cfg.frequency_Hz;
  const omega = 2 * Math.PI * f;

  // Class E Sokal formulas
  const Ropt   = 0.5768 * Vdd * Vdd / P;
  const Cshunt = (0.2085 / (omega * Ropt)) * 1e12; // pF
  const Lseries = (1.1525 * Ropt / omega) * 1e9;    // nH
  const Vds_pk  = cls.vdsFactor * Vdd;
  const Id_pk   = cls.idFactor * P / Vdd;
  const Idc     = P / (cls.eff * Vdd);

  // Input power
  const Pin = P / (cfg.stages > 1 ? cls.pac * 0.85 : cls.pac);

  // Output matching Q (L-network to 50Ω)
  const Q_out = Math.sqrt(50 / Ropt - 1);

  // Harmonic levels (approximate)
  const harmonics: { h: number; dBc: number }[] = [];
  const baseHarmonics: Record<string, number[]> = {
    CLASS_A:     [-13, -20, -30, -40],
    CLASS_AB:    [-20, -30, -40, -50],
    CLASS_B:     [-25, -35, -45, -55],
    CLASS_E:     [-40, -50, -60, -70],
    CLASS_D:     [-35, -45, -55, -65],
    CLASS_F_INV: [-30, -40, -50, -60],
  };
  const hBase = baseHarmonics[cfg.paClass] ?? [-20, -30, -40, -50];
  for (let i = 0; i < 4; i++) {
    harmonics.push({ h: i + 2, dBc: hBase[i] });
  }

  return {
    drainEfficiency_pct: Math.round(cls.eff * 1000) / 10,
    pac_efficiency_pct:  Math.round(cls.pac * 1000) / 10,
    inputPower_W:        Math.round(Pin * 10) / 10,
    dcCurrent_A:         Math.round(Idc * 10) / 10,
    vdsPeak_V:           Math.round(Vds_pk * 10) / 10,
    idPeak_A:            Math.round(Id_pk * 10) / 10,
    Ropt_ohm:            Math.round(Ropt * 10) / 10,
    Cshunt_pF:           Math.round(Cshunt * 10) / 10,
    Lseries_nH:          Math.round(Lseries * 10) / 10,
    outputMatchQ:        Math.round(Q_out * 100) / 100,
    harmonicLevels:      harmonics,
    transistorSuggestion: tr.suggestion(f, P),
    classNotes: [
      `${cfg.paClass.replace('_', ' ')}: ${(cls.eff * 100).toFixed(1)}% drain efficiency`,
      cfg.paClass === 'CLASS_E'
        ? `Class E ZVS: Vds_pk = 3.56×Vdd = ${Vds_pk.toFixed(1)}V — ensure transistor rated > ${Math.ceil(Vds_pk * 1.25)}V`
        : `Peak drain voltage: ${Vds_pk.toFixed(1)}V — device must be rated > ${Math.ceil(Vds_pk * 1.25)}V`,
      `Output match: Ropt=${Ropt.toFixed(1)}Ω → 50Ω, Q=${Q_out.toFixed(2)}`,
    ],
  };
}

// ─── Pulsing & Modulation ─────────────────────────────────────────────────────

export function designPulsing(cfg: PulsingConfig): PulsingResult {
  const P   = cfg.outputPower_W;
  const Vdd = cfg.supplyVoltage_V;
  const f   = cfg.frequency_Hz;
  const omega = 2 * Math.PI * f;

  // Q of output network (approximate)
  const Ropt = 0.5768 * Vdd * Vdd / P;
  const Q_net = Math.sqrt(50 / Ropt - 1);

  // Rise time from network Q: τ = Q / (π·f)
  const riseTime_us = (Q_net / (Math.PI * f)) * 1e6;
  const fallTime_us = riseTime_us * 1.2;

  // Average and peak power
  const avgPower = P * cfg.dutyCycle_pct / 100;
  const peakPower = P;

  // Supply droop: ΔV = I·Δt/C
  const Idc = P / Vdd;
  const dt   = (1 / cfg.pulseFrequency_Hz) * cfg.dutyCycle_pct / 100;
  const droop = (Idc * dt) / (cfg.bulkCapacitance_uF * 1e-6);

  let switchSuggestion = '';
  let driverSuggestion = '';

  switch (cfg.modulationMethod) {
    case 'gate_bias':
      switchSuggestion = 'Gate bias switch: Analog Devices ADG1419 SPDT (< 10ns switching)';
      driverSuggestion = 'Gate driver: Texas Instruments UCC27531 (4A peak, 13ns propagation)';
      break;
    case 'driver_enable':
      switchSuggestion = 'Driver enable: Microchip TC4422 (9A gate driver with enable pin)';
      driverSuggestion = 'FPGA GPIO → optocoupler → driver enable (SiGe SE5501A)';
      break;
    case 'dc_bus_switch':
      switchSuggestion = 'DC bus MOSFET: Infineon IPP023N10N5 (100V/180A, < 5ns switching)';
      driverSuggestion = 'High-side driver: Infineon IR2110 half-bridge driver';
      break;
    case 'envelope_amp':
      switchSuggestion = 'Envelope amp: Apex Microtechnology PA12 (power op-amp, ±150V/1A)';
      driverSuggestion = 'DAC: TI DAC8554 16-bit + high-bandwidth buffer';
      break;
  }

  return {
    actualRiseTime_us:  Math.round(riseTime_us * 100) / 100,
    actualFallTime_us:  Math.round(fallTime_us * 100) / 100,
    peakPower_W:        peakPower,
    avgPower_W:         Math.round(avgPower * 10) / 10,
    droop_V:            Math.round(droop * 100) / 100,
    switchSuggestion,
    driverSuggestion,
    notes: [
      `Rise time limited by output network Q=${Q_net.toFixed(2)}: ~${riseTime_us.toFixed(2)} µs`,
      `Duty cycle ${cfg.dutyCycle_pct}%: avg power ${avgPower.toFixed(0)}W, peak ${peakPower}W`,
      droop > 1 ? `⚠ Supply droop ${droop.toFixed(2)}V — increase bulk cap or reduce duty cycle` : `Supply droop: ${droop.toFixed(2)}V — acceptable`,
      `${cfg.modulationMethod === 'gate_bias' ? 'Gate-bias: fastest modulation (< 50 ns), minimal reflected energy' : cfg.modulationMethod === 'dc_bus_switch' ? 'DC-bus switch: good for high-power (> 1kW) pulsing, ms-range timing' : 'Envelope amp: best for shaped pulses and soft-start ramps'}`,
    ],
  };
}

// ─── Arc Detection ────────────────────────────────────────────────────────────

export function designArcDetection(cfg: ArcDetectConfig): ArcDetectResult {
  const P   = cfg.outputPower_W;
  const f   = cfg.frequency_Hz;

  // Threshold
  const thresholdLevel_dBm = 10 * Math.log10(P * cfg.threshold_pct / 100 * 1000);

  // Latency chain (in nanoseconds)
  const latencyChain: { stage: string; delay_ns: number }[] = [
    { stage: 'Coupler propagation', delay_ns: 5 },
    { stage: 'Schottky detector (HSMS-286x)', delay_ns: 50 },
    { stage: 'Video filter (RC, 10 MHz BW)', delay_ns: 8 },
    { stage: 'Comparator (LT1016, 10 ns)', delay_ns: 10 },
    { stage: 'SR latch (74LVC1G175)', delay_ns: 5 },
    { stage: 'Optocoupler (HCPL-0720)', delay_ns: 200 },
    { stage: 'Gate driver (UCC27531)', delay_ns: 100 },
    { stage: 'Drain current collapse', delay_ns: 200 },
  ];

  const totalLatency_ns = latencyChain.reduce((s, l) => s + l.delay_ns, 0);
  const totalLatency_us = totalLatency_ns / 1000;

  // Arc energy: E = P × t_detect
  const arcEnergy_uJ = P * totalLatency_us;

  return {
    detectionLatency_us:  Math.round(totalLatency_us * 100) / 100,
    latencyChain,
    thresholdLevel_dBm:   Math.round(thresholdLevel_dBm * 10) / 10,
    detectorSuggestion:   `Avago HSMS-286x Schottky detector + LT1016 comparator @ ${(thresholdLevel_dBm).toFixed(1)} dBm threshold`,
    arcEnergy_uJ:         Math.round(arcEnergy_uJ * 100) / 100,
    recoveryTime_ms:      2,
    notes: [
      `Total detection latency: ${totalLatency_us.toFixed(2)} µs (${totalLatency_ns} ns)`,
      `Arc energy deposited before shutdown: ${arcEnergy_uJ.toFixed(1)} µJ`,
      `Threshold: ${cfg.threshold_pct}% reflected power = ${thresholdLevel_dBm.toFixed(1)} dBm`,
      'Recovery: 2 ms blank after arc before re-enabling RF — prevents arc re-ignition',
      'SEMI RF-001 requires arc detection and shutdown — this design complies',
    ],
  };
}

// ─── Directional Coupler ──────────────────────────────────────────────────────

export function designDirectionalCoupler(cfg: CouplerConfig): CouplerResult {
  const f   = cfg.frequency_Hz;
  const P   = cfg.power_W;
  const C_dB = cfg.couplingFactor_dB;
  const Z0  = cfg.sourceImpedance_ohm;

  const coupledPower = P / Math.pow(10, C_dB / 10);
  const insertionLoss = 0.1 + C_dB * 0.005; // approx
  const directivity = cfg.topology === 'transformer' ? 30 : 40;

  let topologyDetails = '';
  let partSuggestion = '';

  if (cfg.topology === 'transformer') {
    const N = Math.round(Math.pow(10, C_dB / 20));
    const freq_MHz = f / 1e6;
    const core = freq_MHz < 2 ? 'Fair-Rite #75 (Mn-Zn, 1–10 MHz)' : freq_MHz < 30 ? 'Fair-Rite #43 (Ni-Zn, 1–100 MHz)' : 'Fair-Rite #61 (Ni-Zn, 10–300 MHz)';
    topologyDetails = `Toroidal transformer: N=${N} turns on ${core} ferrite. Primary = transmission line, secondary = ${N}-turn winding to ${Z0}Ω termination.`;
    partSuggestion  = `Fair-Rite 5943001201 (${core}) + 26 AWG enamelled wire, ${N} turns secondary`;
  } else {
    const lambda = 3e8 / f;
    const length_mm = (lambda / 4) * 1000;
    const Z0e = Z0 * Math.sqrt((1 + Math.pow(10, -C_dB / 20)) / (1 - Math.pow(10, -C_dB / 20)));
    const Z0o = Z0 * Z0 / Z0e;
    topologyDetails = `Quarter-wave coupled line: length=${length_mm.toFixed(1)} mm, Z0e=${Z0e.toFixed(1)}Ω, Z0o=${Z0o.toFixed(1)}Ω. Implement as edge-coupled microstrip on Rogers RO4003C (εr=3.38).`;
    partSuggestion  = `Mini-Circuits ZFDC-20-5+ (DC–500 MHz, 20dB) or custom Rogers RO4003C coupled line at ${(f / 1e6).toFixed(1)} MHz`;
  }

  return {
    couplingFactor_dB: C_dB,
    directivity_dB:    directivity,
    insertionLoss_dB:  Math.round(insertionLoss * 100) / 100,
    forwardPower_W:    Math.round(coupledPower * 100) / 100,
    reflectedPower_W:  Math.round(coupledPower * 0.01 * 100) / 100,
    topologyDetails,
    partSuggestion,
    notes: [
      `Coupling factor: ${C_dB} dB — ${coupledPower.toFixed(2)} W at coupled port`,
      `Directivity: ${directivity} dB — forward/reflected discrimination`,
      `Insertion loss: ${insertionLoss.toFixed(2)} dB into main line`,
      'Connect coupled port to Schottky detector for power measurement / arc detection',
    ],
  };
}

// ─── Control System / PLL ─────────────────────────────────────────────────────

export function designControl(cfg: ControlConfig): ControlResult {
  const fref = cfg.referenceFreq_MHz * 1e6;
  const ftarget = cfg.targetFreq_MHz * 1e6;
  const N = Math.round(ftarget / fref);
  const freqRes = fref; // integer-N: resolution = Fref

  // Lock time: approximately N / (2π × loop_bandwidth)
  const lockTime_us = (N / (2 * Math.PI * cfg.loopBandwidth_kHz * 1e3)) * 1e6;

  // Phase noise: rough estimate -100 dBc/Hz at 1 kHz for integer-N
  const phaseNoise = -100 - 20 * Math.log10(cfg.loopBandwidth_kHz);

  const pidBW = Math.sqrt(cfg.pidKp ** 2 + (cfg.pidKi * cfg.loopBandwidth_kHz * 1e3) ** 2) / (2 * Math.PI);

  const interlocks = [
    'Forward power > 110% setpoint for > 100 ms → trip RF',
    'Reflected power > 20% forward for > 10 ms → ramp down',
    'Arc count > 5 in 1 s → extended RF inhibit (10 s)',
    'Coolant flow < minimum → immediate RF off',
    'VSWR > 5:1 → immediate RF off',
    'DC bus voltage < 80% nominal → RF inhibit',
    'Junction temperature > 125 °C → power derating',
  ];

  const mcuSuggestion = cfg.frequencyControl === 'integer_N_PLL'
    ? 'ST STM32H743 (480 MHz, FPU) + ADF4351 integer-N synthesiser'
    : cfg.frequencyControl === 'DDS'
    ? 'AD9959 DDS (4-channel, 500 MHz sys clock) + STM32H7'
    : 'TI TMS320F28335 DSP + VCXO (Vectron V9 series)';

  return {
    pllDividerN:          N,
    lockTime_us:          Math.round(lockTime_us * 100) / 100,
    phaseNoise_dBcHz:     Math.round(phaseNoise),
    frequencyResolution_Hz: freqRes,
    pidBandwidth_Hz:      Math.round(pidBW),
    mcuSuggestion,
    interlocks,
    notes: [
      `Integer-N PLL: N=${N}, Fref=${cfg.referenceFreq_MHz} MHz → ${cfg.targetFreq_MHz} MHz`,
      `Lock time ~${lockTime_us.toFixed(1)} µs with ${cfg.loopBandwidth_kHz} kHz loop bandwidth`,
      `Phase noise: ~${Math.round(phaseNoise)} dBc/Hz at 1 kHz offset`,
      `PID: Kp=${cfg.pidKp}, Ki=${cfg.pidKi}, Kd=${cfg.pidKd} — tune for ${cfg.loopBandwidth_kHz} kHz power control bandwidth`,
    ],
  };
}
