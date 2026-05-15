/**
 * RF Generator Internal Design Calculations
 *
 * Covers: DC supply, RF PA (Class A/B/AB/D/E/F⁻¹), pulsing,
 * arc detection, directional coupler, and PLL/control design.
 */

import type {
  DCSupplyConfig, DCSupplyResult,
  RFAmpConfig, RFAmpResult,
  PulsingConfig, PulsingResult,
  ArcDetectConfig, ArcDetectResult,
  CouplerConfig, CouplerResult,
  ControlConfig, ControlResult,
  PAClass, TransistorType,
} from '../types/generator';

// ─── DC Power Supply Design ────────────────────────────────────────────────

export function designDCSupply(cfg: DCSupplyConfig): DCSupplyResult {
  const { acInputVoltage: Vac, acInputPhases: phases, acFrequency: fac,
          pfcTopology, holdupCycles, totalRFPower, overheadPower } = cfg;

  const Ptotal = totalRFPower + overheadPower;

  // DC bus voltage
  let Vdc: number;
  let rectifierType: string;
  let eta_supply: number;
  let pf: number;

  if (pfcTopology === 'none') {
    Vdc = phases === 3 ? 1.35 * Vac : 1.414 * Vac;
    rectifierType = phases === 3 ? '3-Phase 6-Pulse Bridge Rectifier' : 'Single-Phase Full-Bridge Rectifier';
    pf = phases === 3 ? 0.95 : 0.70;
    eta_supply = 0.94;
  } else if (pfcTopology === 'boost_pfc') {
    Vdc = cfg.targetDCBusVoltage > 0 ? cfg.targetDCBusVoltage : (phases === 3 ? 700 : 400);
    rectifierType = phases === 3 ? 'Three-Phase Boost PFC (Active)' : 'Single-Phase Boost PFC (CCM)';
    pf = 0.99;
    eta_supply = 0.97;
  } else if (pfcTopology === 'bridgeless_pfc') {
    Vdc = cfg.targetDCBusVoltage > 0 ? cfg.targetDCBusVoltage : 400;
    rectifierType = 'Bridgeless Totem-Pole PFC';
    pf = 0.999;
    eta_supply = 0.985;
  } else {
    // Vienna 3-phase
    Vdc = cfg.targetDCBusVoltage > 0 ? cfg.targetDCBusVoltage : 750;
    rectifierType = 'Vienna 3-Level PFC Rectifier';
    pf = 0.999;
    eta_supply = 0.98;
  }

  const totalInputPower = Ptotal / eta_supply;
  const holdupTime_ms = (holdupCycles / fac) * 1000;
  const t_hold = holdupCycles / fac;           // seconds

  // Bulk capacitor: C = 2P·t / (Vmax² - Vmin²)  [Vmin = 0.85·Vmax]
  const Vmin = 0.85 * Vdc;
  const C_bulk = (2 * Ptotal * t_hold) / (Vdc ** 2 - Vmin ** 2);     // Farads
  const C_uF = C_bulk * 1e6;

  // Ripple voltage (simplified sawtooth for capacitor filter)
  const Idc = Ptotal / Vdc;
  const fRipple = phases === 3 ? 6 * fac : 2 * fac;
  const Vripple = Idc / (fRipple * C_bulk);

  // Ripple current: for boost PFC approximately 0.3–0.4 × Idc
  const Iripple = pfcTopology === 'none' ? Idc * 0.8 : Idc * 0.35;

  // Input current
  const Iin_rms = phases === 3
    ? totalInputPower / (Math.sqrt(3) * Vac * pf)
    : totalInputPower / (Vac * pf);

  // Peak rectifier current (capacitive input: ~3–6× Idc for uncontrolled)
  const peakRectCurr = pfcTopology === 'none' ? Iin_rms * 4.5 : Iin_rms * 1.8;

  // Fuse recommendation: 1.5× Irms
  const fuseA = Math.ceil(Iin_rms * 1.5 / 5) * 5;
  const fuse = `${fuseA} A / ${phases === 3 ? '3-Phase' : 'Single-Phase'}, time-delay, IEC 60269`;

  // Cap voltage rating: 1.1× Vdc
  const capRating = Math.ceil(Vdc * 1.1 / 50) * 50;

  // PFC inductance (boost PFC, 20% current ripple)
  const pfcL_uH = pfcTopology !== 'none'
    ? (Vac * Math.SQRT2 * (1 - (Vac * Math.SQRT2) / Vdc)) / (0.2 * Idc * fac * 10) * 1e6 // simplified
    : 0;

  return {
    rectifierType, dcBusVoltage: Vdc,
    inputCurrentRms: Iin_rms, inputPowerFactor: pf,
    bulkCapacitance_uF: C_uF, holdupTime_ms,
    rippleVoltage_pk: Vripple, rippleCurrent_rms: Iripple,
    supplyEfficiency: eta_supply, totalInputPower,
    peakRectifierCurrent: peakRectCurr,
    recommendedFuse: fuse, capacitorVoltageRating: capRating,
    pfcInductance_uH: pfcL_uH,
  };
}

// ─── RF Power Amplifier Design ─────────────────────────────────────────────

const CLASS_PARAMS: Record<PAClass, {
  eta_th: number; eta_real: number;
  vds_factor: number; id_factor: number;
  idc_factor: number; pae_derating: number;
  h2_dBc: number; h3_dBc: number; name: string;
}> = {
  A:     { eta_th: 0.50, eta_real: 0.45, vds_factor: 2.0,  id_factor: 2.0,  idc_factor: 1.0,   pae_derating: 0.75, h2_dBc: -30, h3_dBc: -45, name: 'Class A'        },
  B:     { eta_th: 0.785,eta_real: 0.70, vds_factor: 2.0,  id_factor: 3.14, idc_factor: 0.637, pae_derating: 0.85, h2_dBc: -20, h3_dBc: -35, name: 'Class B'        },
  AB:    { eta_th: 0.70, eta_real: 0.64, vds_factor: 2.0,  id_factor: 2.5,  idc_factor: 0.75,  pae_derating: 0.82, h2_dBc: -25, h3_dBc: -40, name: 'Class AB'       },
  D:     { eta_th: 0.98, eta_real: 0.91, vds_factor: 1.0,  id_factor: 3.14, idc_factor: 0.637, pae_derating: 0.90, h2_dBc: -50, h3_dBc: -40, name: 'Class D'        },
  E:     { eta_th: 1.00, eta_real: 0.90, vds_factor: 3.562,id_factor: 2.862,idc_factor: 1.734, pae_derating: 0.92, h2_dBc: -35, h3_dBc: -55, name: 'Class E'        },
  F_inv: { eta_th: 1.00, eta_real: 0.92, vds_factor: 2.0,  id_factor: 3.14, idc_factor: 0.637, pae_derating: 0.93, h2_dBc: -40, h3_dBc: -30, name: 'Class F⁻¹'     },
};

const TRANSISTOR_PARAMS: Record<TransistorType, {
  typical_vdd: number; max_vdd: number; fmax_MHz: number;
  typical_gain_dB: number; vknee: number; name: string;
  series: string[];
}> = {
  LDMOS:      { typical_vdd: 50, max_vdd: 100,  fmax_MHz: 500,  typical_gain_dB: 17, vknee: 4, name: 'RF LDMOS', series: ['NXP BLF188XR', 'Wolfspeed CRF24010', 'STMicro PD84006L-E'] },
  GaN_HEMT:   { typical_vdd: 28, max_vdd: 65,   fmax_MHz: 6000, typical_gain_dB: 20, vknee: 3, name: 'GaN HEMT',  series: ['Wolfspeed CGHV1J070D', 'Qorvo QPD1050', 'Microsemi MAMG-001214-DIE'] },
  GaAs_pHEMT: { typical_vdd: 10, max_vdd: 12,   fmax_MHz: 20000,typical_gain_dB: 22, vknee: 1, name: 'GaAs pHEMT',series: ['Qorvo TGA2221-FL', 'MACOM MAAP-015036', 'Sumitomo SGM8062-02GD'] },
  SiC_MOSFET: { typical_vdd: 48, max_vdd: 120,  fmax_MHz: 100,  typical_gain_dB: 14, vknee: 5, name: 'SiC MOSFET',series: ['Wolfspeed C3M0025065D', 'ROHM SCT3080AL', 'STMicro SCT20N120'] },
};

export function designRFAmplifier(cfg: RFAmpConfig): RFAmpResult {
  const { paClass, transistorType, drainVoltage: Vdd, rfOutputPower: Pout,
          frequency: f, numParallelDevices: Np, numStages, targetGain_dB } = cfg;

  const cp = CLASS_PARAMS[paClass];
  const tp = TRANSISTOR_PARAMS[transistorType];
  const omega = 2 * Math.PI * f;

  // Power per device (single device in the final stage)
  const PperDevice = Pout / Np;

  // Optimal load impedance
  let Ropt: number;
  const Vknee = tp.vknee;
  if (paClass === 'E') {
    Ropt = 0.5768 * (Vdd - Vknee) ** 2 / PperDevice;
  } else if (paClass === 'D') {
    Ropt = (2 / Math.PI ** 2) * Vdd ** 2 / PperDevice;
  } else {
    // Class A/B/AB/F_inv
    Ropt = (Vdd - Vknee) ** 2 / (2 * PperDevice);
  }

  // Peak voltages & currents
  const Vds_pk = cp.vds_factor * Vdd;
  const Id_pk  = cp.id_factor  * PperDevice / Vdd;

  // Class E specific resonant elements (Sokal formulas)
  const classEshuntC = paClass === 'E' ? 0.2085 / (omega * Ropt) * 1e12 : 0;  // pF
  const classEseriesL = paClass === 'E' ? 1.1525 * Ropt / omega * 1e9 : 0;    // nH

  // Drain currents
  const Idc = cp.idc_factor * PperDevice / Vdd * Np;   // total final stage DC current

  // Efficiencies
  const eta_drain = cp.eta_real;
  const gain_linear = Math.pow(10, targetGain_dB / 10);
  const Pin_total = Pout / gain_linear;
  const Pdc = Pout / eta_drain;
  const pae = (Pout - Pin_total) / Pdc;

  // Transistor ratings needed
  const Vds_required = Vds_pk * 1.3;   // 30% safety margin
  const Id_required  = Id_pk  * 1.3;

  // ─── Internal PA output matching (Ropt → 50 Ω) ──────────────────────────
  // Low-pass L-network: series L at PA side, shunt C at 50Ω side
  const Q_match = Math.sqrt(50 / Ropt - 1);
  const XLint = Ropt * Q_match;             // series inductance reactance (PA side)
  const XCint = 50 / Q_match;              // shunt cap reactance (50Ω side)
  const Lint_nH = XLint / omega * 1e9;
  const Cint_pF = 1 / (omega * XCint) * 1e12;

  // Harmonic levels (class-dependent, degrades with Ropt mismatch)
  const h2 = cp.h2_dBc;
  const h3 = cp.h3_dBc;

  // Stage power breakdown
  const stagePower: number[] = [];
  for (let s = numStages; s >= 1; s--) {
    stagePower.unshift(Pout / Math.pow(gain_linear, numStages - s));
  }

  // Transistor suggestion
  const parts = tp.series;
  const transistorPart = parts[0] + ` (Vdd=${Vdd}V, f=${(f/1e6).toFixed(2)}MHz, Pout≥${Math.ceil(PperDevice*1.5)}W)`;

  const Pdissipation = Pdc - Pout;

  return {
    optimalLoadR_per_device: Ropt,
    drainEfficiency: cp.eta_th,
    realEfficiency: eta_drain,
    powerAddedEfficiency: Math.max(0, pae),
    dcCurrentTotal: Idc,
    peakVoltage_Vds: Vds_pk,
    peakCurrent_Id: Id_pk * Np,
    classEshuntC_pF: classEshuntC,
    classEseriesL_nH: classEseriesL,
    inputPower_W: Pin_total,
    stagePower_W: stagePower,
    internalMatchNetworkL_nH: Lint_nH,
    internalMatchNetworkC_pF: Cint_pF,
    harmonicLevel_2f_dBc: h2,
    harmonicLevel_3f_dBc: h3,
    transistorPartSuggestion: transistorPart,
    vdsMaxRating: Math.ceil(Vds_required / 50) * 50,
    idMaxRating: Math.ceil(Id_required * Np * 2 / 5) * 5,
    powerDissipation: Pdissipation,
  };
}

// ─── Pulsing System Design ────────────────────────────────────────────────

export function designPulsing(cfg: PulsingConfig): PulsingResult {
  const { pulseFrequency_Hz: fpulse, dutyCycle: dc, modulationMethod: mod,
          desiredRiseTime_us: tr_target, rfPower_W: Pout,
          dcBusVoltage: Vdc, bulkCapacitance_uF: C_uF,
          matchingNetworkQ: Q_net, stallPower_W: Pstall } = cfg;

  const T_us = 1e6 / fpulse;
  const ton_us = T_us * dc;
  const toff_us = T_us * (1 - dc);

  // Rise time limited by matching network bandwidth
  // t_r (10–90%) ≈ 2.2 × Q / (π × f₀) = 2.2 × Q / (π × f)
  // But also limited by modulation method
  let tr_inherent_us: number;
  let tf_inherent_us: number;
  let gatingNote: string[] = [];
  let gateR = 0, isoCap = 0;

  switch (mod) {
    case 'gate_bias':
      // Gate bias switching: rise time set by gate RC + network settling
      // t_r_gate = 5 × R_gate × C_gate ≈ fast (<500 ns)
      // But RF envelope settles over Q/f time
      tr_inherent_us = Math.max(tr_target, (2.2 * Q_net) / (Math.PI * (cfg.frequency_Hz || 13.56e6) / 1e6) * 1000);
      tf_inherent_us = tr_inherent_us * 1.1;
      gateR = 10;  // Ω typical RF gate resistor
      isoCap = 100; // pF DC block cap
      gatingNote = [
        'Gate bias modulation: fastest method, <1 µs envelope rise',
        `Use ${gateR} Ω gate resistor to prevent oscillation`,
        'Requires isolated DC bias supply or transformer-coupled control',
        'Add 100 pF RF bypass cap on gate bias line',
      ];
      break;
    case 'driver_enable':
      tr_inherent_us = Math.max(tr_target, 0.5);
      tf_inherent_us = tr_inherent_us;
      gatingNote = [
        'Driver enable/disable: moderate speed, 0.5–5 µs typical',
        'Simple: ENABLE pin on driver IC (e.g. ADP2384, THS3491)',
        'No PA re-biasing required — safest for transistor',
        'Add output filter to absorb switching transient',
      ];
      break;
    case 'dc_bus_switch':
      tr_inherent_us = Math.max(tr_target, 10);
      tf_inherent_us = tr_inherent_us * 1.5;
      gatingNote = [
        'DC bus switch: slowest (10–100 µs), lowest switching loss',
        'Use synchronous buck or half-bridge MOSFET switch',
        'Bulk capacitor droop limits minimum achievable rise time',
        'Best for high-power (>3 kW) pulsed systems',
      ];
      break;
    case 'envelope_amp':
      tr_inherent_us = Math.max(tr_target, 0.2);
      tf_inherent_us = tr_inherent_us;
      gatingNote = [
        'Envelope amplifier: fastest possible, <200 ns, shaped pulse edges',
        'Enables arbitrary waveform: sine ramp, trapezoidal, arbitrary',
        'High cost: requires wideband linear envelope amp (e.g. Apex PA341)',
        'Eliminates overshoot — optimal for process-sensitive applications',
      ];
      break;
    default:
      tr_inherent_us = tr_target;
      tf_inherent_us = tr_target;
  }

  // Overshoot estimate
  const overshoot = mod === 'envelope_amp' ? 0 : mod === 'gate_bias' ? 8 : 3;

  // Voltage droop during pulse
  // ΔV = I_dc × t_on / C_bulk   (first-order)
  const I_dc = Pout / Vdc;
  const C_F = C_uF * 1e-6;
  const ton_s = ton_us * 1e-6;
  const droop_V = I_dc * ton_s / C_F;
  const droop_pct = (droop_V / Vdc) * 100;

  // Plasma ignition delay estimate
  // Re-ignition (plasma was on previously): 5–20 µs
  // Cold start: 100 µs – 5 ms
  const ignDelay = 15; // µs typical for re-ignition

  // Minimum stable pulse width (must be >> plasma response time)
  const minOn_us = Math.max(ignDelay * 3, tr_inherent_us * 5, 20);
  const minOff_us = Math.max(tf_inherent_us * 5, 10);

  // Energy in bulk cap during off phase: E = 0.5 × C × V²
  const capEnergy_mJ = 0.5 * C_F * Vdc ** 2 * 1e3;

  return {
    pulsePeriod_us: T_us,
    onTime_us: ton_us,
    offTime_us: toff_us,
    achievableRiseTime_us: tr_inherent_us,
    achievableFallTime_us: tf_inherent_us,
    plasmaResponseDelay_us: ignDelay,
    overshoot_pct: overshoot,
    peakPower_W: Pout,
    avgPower_W: Pout * dc + Pstall * (1 - dc),
    voltageDropDuringPulse_pct: droop_pct,
    gatingComponentSuggestion:
      mod === 'gate_bias' ? 'Isolated MOSFET gate driver (e.g., IXDD414, UCC27532)' :
      mod === 'driver_enable' ? 'RF driver with ENABLE pin (e.g., ADL5330, THS3491)' :
      mod === 'dc_bus_switch' ? 'High-current MOSFET (e.g., IPT007N06N, IPW65R019CFD)' :
                                'Wideband envelope amplifier (e.g., Apex PA341, ADI ADA4870)',
    gateResistor_Ohm: gateR,
    isolationCapacitor_pF: isoCap,
    minStablePulseWidth_us: minOn_us,
    modulationNotes: gatingNote,
  };
}

// ─── Arc Detection Design ─────────────────────────────────────────────────

export function designArcDetection(cfg: ArcDetectConfig): ArcDetectResult {
  const { vswr_threshold, rfPower_W: Pout, couplingFactor_dB: C_dB,
          detectionMethod, protectionLevel, maxRecoveriesPerSec,
          consecutiveFaultThreshold } = cfg;

  // Reflection coefficient at VSWR threshold
  const gamma_th = (vswr_threshold - 1) / (vswr_threshold + 1);
  const Pref_th = Pout * gamma_th ** 2;

  // Coupler port voltage at full forward power (50Ω port after coupler)
  const couplingLinear = Math.pow(10, C_dB / 20);   // voltage coupling ratio
  const Vfwd_main = Math.sqrt(2 * 50 * Pout);        // V pk (main line)
  const Vfwd_port = Vfwd_main * Math.abs(couplingLinear);   // V pk at coupler port
  const Vfwd_rms = Vfwd_port / Math.SQRT2;

  // Comparator set point for reflected power threshold
  const Vcomp_threshold = Vfwd_rms * gamma_th;

  // Detection latency chain
  const chain: { stage: string; delay_ns: number }[] = [
    { stage: 'Directional coupler propagation', delay_ns: 5 },
    { stage: 'Schottky envelope detector', delay_ns: 50 },
    { stage: 'Video filter RC (20 MHz BW)', delay_ns: 8 },
    { stage: 'Fast comparator (e.g. LT1016)', delay_ns: 10 },
    { stage: 'Logic gate / latch', delay_ns: 5 },
    { stage: 'Optocoupler / galvanic isolation', delay_ns: 200 },
    { stage: 'Gate driver shutdown', delay_ns: 100 },
    { stage: 'PA drain current collapse', delay_ns: 200 },
  ];
  if (detectionMethod === 'voltage_collapse' || detectionMethod === 'combined') {
    chain.push({ stage: 'Voltage sense comparator', delay_ns: 15 });
  }
  if (detectionMethod === 'dI_dt' || detectionMethod === 'combined') {
    chain.push({ stage: 'Current derivative detector', delay_ns: 30 });
  }
  const totalNs = chain.reduce((a, s) => a + s.delay_ns, 0);

  // Arc energy during detection window
  // E = Pfwd × t_detection (approximate — worst case all power goes to arc)
  const arcEnergy_uJ = Pout * (totalNs * 1e-9) * 1e6;

  // Recovery parameters based on protection level
  let blanking_us: number, recovery_us: number, ramp_kWpms: number, holdoff_ms: number;
  switch (protectionLevel) {
    case 'basic':
      blanking_us = 50;  recovery_us = 100;  ramp_kWpms = 5;  holdoff_ms = 100;  break;
    case 'enhanced':
      blanking_us = 150; recovery_us = 500;  ramp_kWpms = 1;  holdoff_ms = 500;  break;
    case 'process_safe':
      blanking_us = 500; recovery_us = 2000; ramp_kWpms = 0.2;holdoff_ms = 2000; break;
  }

  // Detector diode: must handle Vfwd_port level and recover quickly
  const detDiode = Vfwd_rms > 5 ? 'HSMS-2850 (SMS detector series) + 10 dB attenuator pad'
                                 : 'HSMS-2852 Schottky (Vf=150mV, recovery 1ns)';
  const filterCap_pF = Math.round(1e12 / (2 * Math.PI * 20e6 * 50)); // 20 MHz video BW

  const notes: string[] = [
    `Detection threshold: VSWR ${vswr_threshold.toFixed(1)} → |Γ| = ${gamma_th.toFixed(3)} → ${Pref_th.toFixed(0)} W reflected`,
    `Comparator input: ${Vcomp_threshold.toFixed(3)} V rms (reflected port of coupler)`,
    `Total response time: ${(totalNs / 1000).toFixed(2)} µs — arc energy ≈ ${arcEnergy_uJ.toFixed(1)} µJ`,
    protectionLevel === 'process_safe'
      ? 'Process-safe mode: slow ramp-up avoids plasma re-strike damage'
      : 'Use hardware arc latch — do not rely on software for detection loop',
    `Hard fault after ${consecutiveFaultThreshold} consecutive arcs in ${(1000/maxRecoveriesPerSec).toFixed(0)} ms window`,
    'Install over-temperature interlock on dummy load / termination',
  ];

  return {
    reflectionCoeffThreshold: gamma_th,
    reflectedPowerThreshold_W: Pref_th,
    couplerForwardVoltage_V: Vfwd_rms,
    comparatorThreshold_V: Vcomp_threshold,
    responseChain: chain,
    totalDetectionTime_us: totalNs / 1000,
    recommendedBlankingTime_us: blanking_us,
    recommendedRecoveryDelay_us: recovery_us,
    powerRampRate_kWpms: ramp_kWpms,
    hardFaultHoldoff_ms: holdoff_ms,
    comparatorIC: 'LT1016CS8 (7 ns, 5V) or TLV3502 (7 ns, 1.8–5.5V)',
    detectorDiode: detDiode,
    filterCapacitor_pF: filterCap_pF,
    arcEnergyPerEvent_uJ: arcEnergy_uJ,
    protectionNotes: notes,
  };
}

// ─── Directional Coupler Design ────────────────────────────────────────────

export function designDirectionalCoupler(cfg: CouplerConfig): CouplerResult {
  const { topology, frequency_Hz: f, rfPower_W: P, systemImpedance: Z0,
          couplingFactor_dB: C_dB, targetDirectivity_dB: D_target } = cfg;

  const couplingLinear = Math.pow(10, C_dB / 20);   // |k| < 1
  const k = Math.abs(couplingLinear);

  const Vfwd_port_rms = Math.sqrt(P * Z0) * k;       // V rms at coupled port
  const Pfwd_port = P * k * k;                         // W at coupled port

  let result: Partial<CouplerResult> = {
    couplingFactor_dB: C_dB,
    directivity_dB: D_target,
    forwardPortPower_W: Pfwd_port,
    forwardPortVoltage_Vrms: Vfwd_port_rms,
    diodeDetectorSuggestion: 'HSMS-2850 zero-bias Schottky, matched pair ΔVf < 2 mV',
    videoFilterSuggestion: `${Math.round(1e12 / (2 * Math.PI * 10e6 * 50))} pF ceramic (10 MHz video BW)`,
  };

  if (topology === 'transformer') {
    // Toroidal transformer coupler
    const N = Math.round(1 / k);                      // primary turns (1-turn secondary)
    const N2 = 1;
    const coreType = f < 5e6
      ? 'Fair-Rite #75 / Amidon FT50-75 ferrite toroid (1–30 MHz)'
      : f < 30e6
      ? 'Fair-Rite #61 / Amidon FT50-61 (10–200 MHz)'
      : 'Fair-Rite #43 or #67 (> 50 MHz)';
    const R_termination = Z0;   // 50 Ω termination on reverse port

    const il = -20 * Math.log10(Math.sqrt(1 - k * k));   // approximate insertion loss

    result = {
      ...result,
      insertionLoss_dB: il,
      powerRating_W: P * 2,   // transformer can handle much more than coupled power
      bandwidth_pct: 80,       // wide bandwidth due to ferrite
      primaryTurns: N,
      secondaryTurns: N2,
      corePartSuggestion: coreType,
      terminationResistor_Ohm: R_termination,
      coupledLength_mm: 0,
      evenModeZ_Ohm: 0, oddModeZ_Ohm: 0, gapWidth_mm: 0, lineWidth_mm: 0,
      substrateNote: 'N/A (transformer type)',
    };
  } else if (topology === 'coupled_line') {
    // Quarter-wave coupled microstrip / stripline
    const Z0e = Z0 * Math.sqrt((1 + k) / (1 - k));
    const Z0o = Z0 * Math.sqrt((1 - k) / (1 + k));
    const lambda = 3e8 / (f * 1.5);     // approx in PCB (εr≈3 → vp = c/√3 ≈ 1.5)
    const length_mm = (lambda / 4) * 1000;
    const gapW = Z0 > 0 ? 0.1 + (Z0e - Z0) / 100 : 0.1;   // rough estimate, mm
    const lineW = 3.0;                                         // 50Ω on FR4, ~3mm
    const il = 0.15;

    result = {
      ...result,
      insertionLoss_dB: il,
      powerRating_W: 200,      // limited by trace current
      bandwidth_pct: 20,        // narrower than transformer
      primaryTurns: 0, secondaryTurns: 0,
      corePartSuggestion: 'N/A (PCB coupled-line)',
      terminationResistor_Ohm: Z0,
      coupledLength_mm: length_mm,
      evenModeZ_Ohm: Z0e,
      oddModeZ_Ohm: Z0o,
      gapWidth_mm: gapW,
      lineWidth_mm: lineW,
      substrateNote: 'Rogers RO4350B (εr=3.66) recommended; length adjusted for velocity factor',
    };
  } else {
    // Bridge / Wheatstone coupler
    const il = 0.1;
    result = {
      ...result,
      insertionLoss_dB: il,
      powerRating_W: P,
      bandwidth_pct: 50,
      primaryTurns: 0, secondaryTurns: 0,
      corePartSuggestion: 'N/A',
      terminationResistor_Ohm: Z0,
      coupledLength_mm: 0,
      evenModeZ_Ohm: 0, oddModeZ_Ohm: 0, gapWidth_mm: 0, lineWidth_mm: 0,
      substrateNote: 'Use dual-matched transformer implementation',
    };
  }

  return result as CouplerResult;
}

// ─── PLL / Control System Design ──────────────────────────────────────────

export function designControl(cfg: ControlConfig): ControlResult {
  const { freqControlMethod, frequency_Hz: f, powerControlBandwidth_Hz: bw,
          targetAccuracy_pct } = cfg;

  const f_MHz = f / 1e6;

  let pllRef: number, N: number, lockTime: number, phaseNoise: number, vcoRange: number;
  let ctrl: string;

  if (freqControlMethod === 'fixed_crystal') {
    pllRef = f_MHz;   N = 1;
    lockTime = 0;   phaseNoise = -135;   vcoRange = 0;
    ctrl = 'Crystal oscillator (TCXO or OCXO), no PLL required';
  } else if (freqControlMethod === 'vcxo_adj') {
    pllRef = f_MHz;   N = 1;
    lockTime = 50;   phaseNoise = -130;   vcoRange = 0.01;
    ctrl = 'VCXO with analog control voltage, ±0.01% tuning range';
  } else {
    // PLL synthesiser
    pllRef = Math.round(f_MHz / 10) > 0 ? Math.round(f_MHz / 10) : 1;  // 1–2 MHz ref typical
    N = Math.round(f_MHz / pllRef);
    const bwPll = 50e3;  // 50 kHz loop bandwidth
    lockTime = Math.round(1e6 / bwPll * 10) / 10;  // ≈ 200 µs
    phaseNoise = -120;  // at 1 kHz offset, typical integer-N
    vcoRange = 5;       // MHz tuning range
    ctrl = `Integer-N PLL: f_ref = ${pllRef} MHz, N = ${N}`;
  }

  // Power control PID gains (simple tuning based on bandwidth)
  const omega_c = 2 * Math.PI * bw;
  const Kp = omega_c * 0.5;
  const Ki = omega_c ** 2 * 0.1;
  const Kd = 0.05 / omega_c;

  const settlingTime = 3 / (2 * Math.PI * bw) * 1000;  // ms

  const adcBits = targetAccuracy_pct < 0.1 ? 16 : targetAccuracy_pct < 0.5 ? 14 : 12;
  const dacBits = adcBits;

  const mcu = bw > 10000
    ? 'STM32H743 (480 MHz Cortex-M7) or TI TMS320F28379D DSP'
    : 'STM32G474 (170 MHz, 5× ADC) or Microchip dsPIC33C';

  return {
    pllReferenceFreq_MHz: pllRef,
    pllDividerN: N,
    vcoTuningRange_MHz: vcoRange,
    pllLockTime_us: lockTime,
    phaseNoise_dBcAt1kHz: phaseNoise,
    loopFilterBandwidth_kHz: 50,
    powerLoopPidGains: { kp: Kp, ki: Ki, kd: Kd },
    settlingTime_ms: settlingTime,
    steadyStateError_pct: targetAccuracy_pct,
    adcBits,
    dacBits,
    microcontrollerSuggestion: mcu,
    interlocks: [
      'VSWR over-threshold (hardware comparator, <2 µs)',
      'PA junction temperature (NTC thermistor, <10 µs)',
      'DC bus under/over-voltage (analog window comparator)',
      'Reflected power exceeding 10% for >100 ms (software watchdog)',
      'Forward power exceeding setpoint by >20% (hardware OCP)',
      'Cabinet door/interlock switch (safety relay, 24 V)',
      'Coolant flow / temperature (if liquid cooled)',
    ],
  };
}
