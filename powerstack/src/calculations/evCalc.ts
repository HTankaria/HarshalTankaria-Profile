// ─── EV Charger Calculations ─────────────────────────────────────────────────

import type {
  EVStandardConfig, EVStandardResult,
  PFCConfig, PFCResult,
  DCDCConfig, DCDCResult,
  EVThermalConfig, EVThermalResult,
  EVReport,
  SwitchTech,
} from '../types/ev';

// ─── Power level map ─────────────────────────────────────────────────────────

const POWER_LEVEL_KW: Record<string, number> = {
  L1: 1.44, L2_7kW: 7.2, L2_11kW: 11, L2_22kW: 22,
  DCFC_50kW: 50, DCFC_150kW: 150, DCFC_350kW: 350, HPC_500kW: 500,
};

const VOUT_RANGE: Record<string, [number, number]> = {
  L1: [120, 240], L2_7kW: [200, 500], L2_11kW: [200, 500], L2_22kW: [200, 500],
  DCFC_50kW: [200, 920], DCFC_150kW: [200, 920], DCFC_350kW: [200, 1000], HPC_500kW: [400, 1000],
};

// ─── Step 1 — EV Standard & Architecture ─────────────────────────────────────

export function calcEVStandard(cfg: EVStandardConfig): EVStandardResult {
  const power_kW = POWER_LEVEL_KW[cfg.powerLevel] ?? 50;
  const vRange = VOUT_RANGE[cfg.powerLevel] ?? [200, 920];
  const vNom = cfg.vehicleArch === '800V' ? 800 : 400;
  const iMax = Math.round((power_kW * 1000) / vRange[0]);

  // DC bus voltage — intermediate stage
  let dcBus_V = 800;
  if (cfg.vehicleArch === '800V') dcBus_V = 1000;
  if (power_kW <= 22) dcBus_V = 400; // AC charger — no DC bus

  // Switch tech recommendation
  let sw: SwitchTech = 'SiC_MOSFET';
  if (power_kW <= 22) sw = cfg.vehicleArch === '800V' ? 'SiC_MOSFET' : 'Si_IGBT';
  if (power_kW >= 350) sw = 'SiC_MOSFET';

  // Weight estimate (kg) — rough
  const weight = power_kW <= 22 ? 5 + power_kW * 0.6
    : power_kW <= 150 ? 30 + power_kW * 0.4
    : 80 + power_kW * 0.3;

  // Efficiency
  const eff = power_kW <= 22 ? 0.93
    : power_kW <= 150 ? 0.95
    : 0.97;

  const standards800v = cfg.vehicleArch === '800V' ? [
    'SAE J3400 (NACS) — supports 800V natively',
    'CCS Combo 1/2 — limited to 920 V charging',
    'ISO 15118-20 Power Delivery Message (PDM)',
    'CHAdeMO 3.0 — up to 900 V/600 A',
    'UL 9741 Bidirectional EVSE (if V2G)',
  ] : [];

  const connectorPinout = cfg.standard === 'NACS'
    ? 'NACS: 2-pin power (L+/L−) + signal pin + PE; max 1000 V / 500 A DC'
    : cfg.standard === 'CCS1'
    ? 'CCS1: J1772 5-pin AC + 2 DC pins (DC+/DC−); max 1000 V / 500 A'
    : cfg.standard === 'CCS2'
    ? 'CCS2: Type 2 7-pin AC + 2 DC pins; max 1000 V / 500 A'
    : cfg.standard === 'CHADEMO'
    ? 'CHAdeMO: separate DC connector; 10-pin; max 1000 V / 400 A'
    : cfg.standard === 'GB_T'
    ? 'GB/T: 9-pin DC connector; max 1000 V / 250 A'
    : 'J1772 AC: 5-pin; max 240 V / 80 A';

  const protocolNote = cfg.bidirectional
    ? 'ISO 15118-20 required for V2G/V2H. CLLC bidirectional topology recommended.'
    : 'ISO 15118-2/20 (Plug & Charge). Unidirectional LLC topology sufficient.';

  const notes800v: string[] = cfg.vehicleArch === '800V' ? [
    `800 V architecture enables ${(iMax / 2).toFixed(0)} A vs ${iMax} A at 400 V for same power — halves cable losses`,
    'Requires SiC MOSFET (1200 V rated) throughout power chain',
    '2-stage conversion (PFC→DC bus→CLLC) or direct single-stage totem-pole PFC with boost to 800 V',
    'Porsche Taycan / Hyundai Ioniq 6 style: native 800 V onboard charger',
    cfg.acInputPhases === 1
      ? 'Single-phase AC limits 800 V charge benefit — 3-phase input strongly recommended'
      : '3-phase AC input maximises 800 V charging speed advantage',
  ] : [];

  return {
    maxOutputPower_kW: power_kW * cfg.simultaneousPorts,
    outputVoltageRange: vRange,
    maxOutputCurrent_A: iMax,
    dcBusVoltage_V: dcBus_V,
    connectorPinout,
    protocolNote,
    switchTechRequired: sw,
    isolationRequired: power_kW > 22 || cfg.bidirectional,
    approxEfficiency: eff,
    weightEstimate_kg: Math.round(weight * cfg.simultaneousPorts),
    standards: standards800v.length ? standards800v : [
      'IEC 61851-1 — General EV charging requirements',
      'IEC 62196 — EV connector & vehicle inlet',
      'SAE J1772 — AC charging interface',
      'UL 2202 — EV charging equipment',
    ],
    arch800vNotes: notes800v,
  };
}

// ─── Step 2 — PFC ─────────────────────────────────────────────────────────────

export function calcPFC(cfg: PFCConfig): PFCResult {
  const omega = 2 * Math.PI * cfg.acFrequency;
  const Vin_pk = cfg.acInputVoltage * Math.SQRT2;
  const P = cfg.totalPower_kW * 1000;

  // Input RMS current
  const Irms = P / (cfg.powerFactor * cfg.acInputVoltage * (cfg.acInputPhases === 3 ? Math.sqrt(3) : 1));

  // DC bus voltage
  const Vbus = cfg.targetDCBus_V;

  // Boost inductor — CCM critical inductance
  // L = Vin_pk * (Vbus - Vin_pk) / (Vbus * fsw * ΔIL), ΔIL = 30% Irms
  const fsw = cfg.switchFrequency_kHz * 1e3;
  const dIL = 0.3 * Irms * Math.sqrt(2);
  const L_uH = cfg.topology === 'vienna_3ph'
    ? (Vin_pk * (Vbus - Vin_pk)) / (Vbus * fsw * dIL) * 1e6 / 3 // 3 inductors
    : (Vin_pk * (Vbus - Vin_pk)) / (Vbus * fsw * dIL) * 1e6;

  // Peak switch current
  const Isw_pk = Irms * Math.sqrt(2) * 1.5;

  // THD estimate
  const thd = cfg.topology === 'vienna_3ph' ? 2.5
    : cfg.topology === 'bridgeless_totem_pole' ? 3.0
    : 5.0;

  // Filter cap: C = I/(2πf_ripple * ΔV), ΔV = 1% Vbus
  const C_uF = (Irms) / (2 * omega * 0.01 * Vbus) * 1e6;

  // Losses
  const rdson = cfg.topology === 'bridgeless_totem_pole' ? 0.012
    : cfg.topology === 'vienna_3ph' ? 0.015
    : 0.025;
  const condLoss = Irms * Irms * rdson * (cfg.acInputPhases === 3 ? 6 : 2);
  const swLoss = 0.5 * Isw_pk * Isw_pk * 2e-9 * fsw * (cfg.acInputPhases === 3 ? 3 : 1);
  const totalLoss = condLoss + swLoss;

  // Part suggestion
  const switchSuggestion = cfg.topology === 'bridgeless_totem_pole'
    ? (P > 50000 ? 'STMicro SiC STPSC30H065DI (650 V / 30 A) or Wolfspeed C3M0030090K (900 V / 30 A)'
      : 'GaN Systems GS66516T (650 V / 60 A) for 1-phase < 20 kW')
    : cfg.topology === 'vienna_3ph'
    ? 'Infineon IPP60R080P7 (600 V Si) per leg; diode bridge: IXYS DSS2x101-0045B'
    : 'Infineon IPP65R065C7 (650 V / 30 A Si-CoolMOS) + STPS30L60 boost diode';

  const eff = 1 - totalLoss / P;

  return {
    dcBusVoltage_V: Vbus,
    boostInductance_uH: Math.round(L_uH * 10) / 10,
    switchCurrentPeak_A: Math.round(Isw_pk * 10) / 10,
    inputCurrentTHD_pct: thd,
    inputCurrentRms_A: Math.round(Irms * 10) / 10,
    pfcSwitchSuggestion: switchSuggestion,
    bridgeOrSwitchLoss_W: Math.round(totalLoss),
    filterCapacitance_uF: Math.round(C_uF),
    filterCapVoltageRating_V: Math.round(Vbus * 1.2),
    efficiency_pct: Math.round(eff * 1000) / 10,
    topology: cfg.topology === 'vienna_3ph' ? 'Vienna 3-Phase Rectifier'
      : cfg.topology === 'bridgeless_totem_pole' ? 'Bridgeless Totem-Pole PFC'
      : 'Boost PFC',
  };
}

// ─── Step 3 — DC-DC Converter ─────────────────────────────────────────────────

export function calcDCDC(cfg: DCDCConfig): DCDCResult {
  const P = cfg.outputPower_kW * 1000;
  const Vin = cfg.primaryVoltage_V;
  const Vout_nom = cfg.outputVoltageNom_V;
  const fsw = cfg.switchFrequency_kHz * 1e3;
  const omega_sw = 2 * Math.PI * fsw;

  // Turns ratio
  const n = Vin / (2 * Vout_nom);

  // Resonant frequency — target slightly above fsw for LLC
  const fr_kHz = cfg.switchFrequency_kHz * 1.05;
  const omega_r = 2 * Math.PI * fr_kHz * 1e3;

  // AC equivalent resistance at output
  const Iout = P / Vout_nom;
  const Rac = (8 * n * n * Vout_nom) / (Math.PI * Math.PI * Iout);

  // Q factor: 0.3–0.5 for robust ZVS
  const Q = cfg.topology === 'LLC' ? 0.35
    : cfg.topology === 'CLLC_BIDIR' ? 0.40
    : 0.45;

  // Resonant inductance: Lr = Q * Rac / omega_r
  const Lr_uH = (Q * Rac) / omega_r * 1e6;

  // Resonant capacitance: Cr = 1 / (omega_r^2 * Lr)
  const Cr_nF = 1 / (omega_r * omega_r * Lr_uH * 1e-6) * 1e9;

  // Magnetising inductance: Lm = 4..8 * Lr for good gain
  const m = 5; // Lm/Lr ratio
  const Lm_uH = m * Lr_uH;

  // Quality factor check
  const Qeff = (omega_r * Lr_uH * 1e-6) / Rac;

  // Voltage stress on primary switches
  const Vsw_pri = Vin; // full-bridge: Vin; half-bridge: Vin/2
  const Isw_pri = P / (0.95 * Vin) * 1.5; // peak with ZVS margin

  // Secondary
  const Vsw_sec = Vout_nom * 2 + 50; // SR diode / MOSFET
  const Isw_sec = Iout * 1.5;

  // Switch suggestions
  const suggestPrimary = cfg.switchTech === 'SiC_MOSFET'
    ? (Vin > 700 ? 'Wolfspeed C3M0032120K (1200 V, 32 mΩ) SiC MOSFET x4'
      : 'Infineon IMW120R045M1 (1200 V SiC) x4 half-bridge')
    : cfg.switchTech === 'GaN_HEMT'
    ? 'EPC EPC2302 (200 V GaN) or GaN Systems GS66508T (650 V)'
    : 'Infineon IKQ50N120CS6 Si IGBT (1200 V, 50 A) x4';

  const suggestSecondary = cfg.vehicleArch === '800V'
    ? 'Wolfspeed C3M0016120K (1200 V, 16 mΩ) SiC MOSFET sync rect x4'
    : 'Infineon IPP023N10N5 (100 V Si MOSFET) synchronous rect x4';

  // Efficiency estimate
  const eff = cfg.switchTech === 'SiC_MOSFET' ? 97.5
    : cfg.switchTech === 'GaN_HEMT' ? 98.2
    : 95.0;

  const fRange: [number, number] = [fr_kHz * 0.85, fr_kHz * 1.2];

  const designNotes: string[] = [
    `Turns ratio n = ${n.toFixed(2)} — adjust tap to fine-tune Vout range`,
    `ZVS achieved for Iload > ${(Iout * 0.15).toFixed(1)} A (dead-time = ${(2 * Lm_uH * 1e-6 * Iout / Vin * 1e9).toFixed(0)} ns)`,
    cfg.topology === 'CLLC_BIDIR'
      ? 'CLLC: mirror Lr/Cr on secondary for symmetric V2G — secondary Lr2 = Lr/n², Cr2 = Cr×n²'
      : 'LLC: single resonant tank; secondary uses synchronous rectification (SR)',
    cfg.vehicleArch === '800V'
      ? '800 V output — ensure secondary SiC device rating ≥ 1200 V (2× output + margin)'
      : '400 V output — 650 V rated SiC or 600 V Si MOSFET acceptable for SR',
    `Transformer: E65/32/27 ferrite core (N87/3C95); Np = ${Math.ceil(Vsw_pri * 0.35 / (2 * cfg.switchFrequency_kHz * 1000 * 0.00023))} turns, Ns = ${Math.ceil(Vout_nom * 0.35 / (cfg.switchFrequency_kHz * 1000 * 0.00023))} turns`,
  ];

  return {
    turnsRatio: Math.round(n * 100) / 100,
    resonantFrequency_kHz: Math.round(fr_kHz * 10) / 10,
    resonantInductance_uH: Math.round(Lr_uH * 100) / 100,
    resonantCapacitance_nF: Math.round(Cr_nF * 10) / 10,
    magnetisingInductance_uH: Math.round(Lm_uH * 10) / 10,
    qualityFactor: Math.round(Qeff * 1000) / 1000,
    primarySwitchVoltage_V: Math.round(Vsw_pri),
    primarySwitchCurrent_A: Math.round(Isw_pri * 10) / 10,
    secondarySwitchVoltage_V: Math.round(Vsw_sec),
    secondarySwitchCurrent_A: Math.round(Isw_sec * 10) / 10,
    primarySwitchSuggestion: suggestPrimary,
    secondarySwitchSuggestion: suggestSecondary,
    transformerTurnsNote: `Np:Ns = ${Math.round(n * 2)}:2 (half-bridge effective turns ratio ${n.toFixed(2)})`,
    estimatedEfficiency_pct: eff,
    frequencyRange_kHz: [Math.round(fRange[0] * 10) / 10, Math.round(fRange[1] * 10) / 10],
    designNotes,
  };
}

// ─── Step 4 — Thermal & Safety ────────────────────────────────────────────────

export function calcEVThermal(cfg: EVThermalConfig): EVThermalResult {
  const dT = cfg.targetJunctionTemp_C - cfg.ambientTemp_C;

  // Rth junction-to-case for the IGBT/MOSFET module ~0.3–0.5 K/W
  const Rth_jc = 0.4;
  // Cooling medium resistance
  let Rth_cs = 0;
  let flowRate = 0;
  let flowUnit = '';
  let coolingPower_W = 0;

  if (cfg.coolingMethod === 'forced_air') {
    // CFM = Q_W / (ρ·Cp·ΔT), ρCp for air ≈ 1200 J/m³/K
    const cfm = cfg.totalLoss_W / (1200 * (cfg.targetJunctionTemp_C - cfg.ambientTemp_C - 20)) * 2119;
    flowRate = Math.round(cfm * 10) / 10;
    flowUnit = 'CFM';
    Rth_cs = 0.15; // heatsink fin to air
    coolingPower_W = cfm / 2119 * 1200 * 60; // fan power estimate
  } else if (cfg.coolingMethod === 'liquid_glycol') {
    // L/min = Q_W / (ρ·Cp·ΔT), for 50% glycol ρCp ≈ 3400 J/kg/K, ρ = 1050 kg/m³
    const Cp_liq = 3400;
    const rho_liq = 1.05; // kg/L
    const dT_cool = 10; // coolant ΔT
    flowRate = Math.round(cfg.totalLoss_W / (Cp_liq * rho_liq * dT_cool) * 60 * 10) / 10;
    flowUnit = 'L/min';
    Rth_cs = 0.05;
    coolingPower_W = 50 + flowRate * 5; // pump + chiller approx
  } else {
    const dT_cool = 8;
    const Cp_direct = 4186;
    flowRate = Math.round(cfg.totalLoss_W / (Cp_direct * 1.0 * dT_cool) * 60 * 10) / 10;
    flowUnit = 'L/min';
    Rth_cs = 0.03;
    coolingPower_W = 80 + flowRate * 8;
  }

  const Rth_total = Rth_jc + Rth_cs;
  const Tcase = cfg.ambientTemp_C + cfg.totalLoss_W * Rth_cs;
  const thermalMargin = cfg.targetJunctionTemp_C - (cfg.ambientTemp_C + cfg.totalLoss_W * Rth_total);

  return {
    coolantFlowRate: flowRate,
    coolantFlowUnit: flowUnit,
    heatsinkRth_CperW: Math.round(Rth_cs * 1000) / 1000,
    caseTemp_C: Math.round(Tcase * 10) / 10,
    coolingPower_W: Math.round(coolingPower_W),
    thermalMargin_C: Math.round(thermalMargin * 10) / 10,
    enclosureIP: cfg.coolingMethod === 'liquid_glycol' || cfg.coolingMethod === 'liquid_direct'
      ? 'IP55 (liquid cooled chassis)' : 'IP54 (forced air)',
    safetyStandards: [
      'IEC 61851-23 — DC charger safety',
      'IEC 60664-1 — Insulation coordination',
      'UL 508C — Power conversion equipment',
      'IEC 62477-1 — Safety for power electronic converters',
    ],
    groundFaultNote: 'GFDI (Ground Fault Detection and Interruption): <300 mA trip threshold; isolated DC bus monitoring via ISO 7637',
  };
}

// ─── Step 5 — Report ─────────────────────────────────────────────────────────

export function calcEVReport(
  pfcEff: number,
  dcdcEff: number,
  power_kW: number,
  loss_kW: number,
  vehicleArch: '400V' | '800V',
): EVReport {
  const overall = (pfcEff / 100) * (dcdcEff / 100) * 100;
  const feasible = overall > 92;
  const score = Math.min(100, Math.round(overall - 50) * 2);

  const kWhPerYear = power_kW * 8760 * 0.7; // 70% utilisation
  const cost = kWhPerYear * 0.12;
  const co2Saved = ((kWhPerYear * 200) / 1000).toFixed(0); // 200 g/kWh grid emission avoided vs ICE

  return {
    feasible,
    feasibilityScore: score,
    overallEfficiency_pct: Math.round(overall * 10) / 10,
    totalPowerLoss_kW: Math.round(loss_kW * 10) / 10,
    co2Saved_kgPerYear: co2Saved,
    costEstimate_USD: Math.round(cost),
    bomHighlights: [
      { item: 'Primary SiC MOSFET (LLC H-bridge)', spec: '1200 V / 30 A, SiC', cost: 18 },
      { item: 'Secondary SiC SR MOSFET', spec: '1200 V / 45 A, SiC', cost: 22 },
      { item: 'PFC inductor (nanocrystalline core)', spec: `${Math.round(power_kW * 2)} µH / ${Math.round(power_kW * 4)} A`, cost: 35 },
      { item: 'Resonant inductor', spec: 'Planar ER64, 20 µH', cost: 28 },
      { item: 'Resonant capacitor', spec: '100 nF / 1200 V film', cost: 12 },
      { item: 'Isolation transformer', spec: 'E65 ferrite, 100 kHz', cost: 55 },
      { item: 'DC bus capacitor', spec: `4700 µF / ${vehicleArch === '800V' ? 1000 : 600} V electrolytic`, cost: 40 },
    ],
    risks: [
      { severity: 'medium', text: 'Derating required at ambient > 45 °C — liquid cooling preferred for >150 kW' },
      { severity: vehicleArch === '800V' ? 'low' : 'medium', text: vehicleArch === '800V' ? '800 V architecture: SiC switches well-suited; monitor SiC short-circuit robustness' : 'Si IGBT at high frequency: verify turn-off losses vs temperature' },
      { severity: 'low', text: 'EMI: add common-mode choke on AC input + Y-caps (4.7 nF) to PE on DC output for conducted emissions' },
      { severity: 'low', text: 'ISO 15118-20 V2G handshake requires UL-listed bidirectional charger — plan for re-certification cost' },
    ],
    complianceList: [
      'IEC 61851-1, -23 (EV charging station)', 'SAE J1772 / J3400',
      'ISO 15118-2, -20 (Plug & Charge)', 'UL 2202 / UL 991',
      'IEC 62196 (connectors)', 'FCC Part 15 Class A (EMI)',
      vehicleArch === '800V' ? 'CHAdeMO 3.0 (900 V)' : 'CCS Combo 1/2',
    ],
    arch800vAdvantages: vehicleArch === '800V' ? [
      'Halved cable current → thinner, lighter cables (e.g., 200 A vs 400 A at same 80 kW)',
      'Lower I²R losses in cable: 75% reduction vs 400 V',
      'SiC MOSFET efficiency advantage: 97–98.5% vs 94–96% Si IGBT',
      'Charge time: ~20 min for 10–80% (350+ kW capable)',
      'Weight reduction: ~15 kg lighter than equivalent 400 V DC system',
    ] : [],
    generatedAt: new Date().toISOString(),
  };
}
