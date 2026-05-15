// ─── AI / GPU Rack Power Calculations ────────────────────────────────────────

import type {
  RackConfig, RackConfigResult,
  BusConfig, BusResult,
  DCDCStagesConfig, DCDCStagesResult, StageResult,
  ThermalConfig, ThermalResult,
  AIRackReport,
} from '../types/aiRack';

// ─── GPU TDP Database ─────────────────────────────────────────────────────────

const GPU_TDP: Record<string, { tdp: number; name: string }> = {
  H100_SXM5: { tdp: 700,  name: 'NVIDIA H100 SXM5' },
  H200_SXM:  { tdp: 1000, name: 'NVIDIA H200 SXM' },
  B100_SXM:  { tdp: 700,  name: 'NVIDIA B100 SXM' },
  B200_SXM:  { tdp: 1000, name: 'NVIDIA B200 SXM' },
  A100_SXM4: { tdp: 400,  name: 'NVIDIA A100 SXM4' },
  MI300X:    { tdp: 750,  name: 'AMD MI300X' },
  CUSTOM:    { tdp: 0,    name: 'Custom GPU' },
};

const RACK_U: Record<string, number> = {
  OCP_V3: 48, OCP_V2: 42, EIA_42U: 42, OCP_21INC: 21,
};

const REDUNDANCY_FACTOR: Record<string, number> = {
  'N+1': 1.1, 'N+N': 1.5, '2N': 2.0,
};

// ─── Step 1 — Rack Configuration ─────────────────────────────────────────────

export function calcRackConfig(cfg: RackConfig): RackConfigResult {
  const gpuDb = GPU_TDP[cfg.gpuModel] ?? GPU_TDP.H100_SXM5;
  const gpuTdp = cfg.gpuModel === 'CUSTOM' ? cfg.customGpuTdp_W : gpuDb.tdp;

  const totalGpu_kW   = (gpuTdp * cfg.gpusPerRack) / 1000;
  const totalCpu_kW   = (cfg.cpuTdpPerNode_W * cfg.cpuNodesPerRack) / 1000;
  const overhead_kW   = (cfg.networkSwitch_W + cfg.cpuNodesPerRack * 50 + 500) / 1000; // fans, mgmt, misc
  const totalIT_kW    = totalGpu_kW + totalCpu_kW + overhead_kW;
  const redFactor     = REDUNDANCY_FACTOR[cfg.redundancyMode] ?? 1.1;
  const peak_kW       = totalIT_kW * redFactor;

  // PSU sizing — each PSU at 80% load for reliability
  const psuRating_kW  = cfg.busVoltage_V === 48
    ? (totalIT_kW > 80 ? 10 : 5)    // OCP-style 5kW or 10kW
    : 30;                             // 380V DC bus = higher power PSU
  const psusReq       = Math.ceil(peak_kW / (psuRating_kW * 0.8));

  const rackU         = RACK_U[cfg.rackStandard] ?? 42;
  const density       = totalIT_kW / rackU;

  return {
    gpuTdp_W: gpuTdp,
    totalGpuPower_kW:   Math.round(totalGpu_kW   * 10) / 10,
    totalCpuPower_kW:   Math.round(totalCpu_kW   * 10) / 10,
    overheadPower_kW:   Math.round(overhead_kW   * 10) / 10,
    totalITPower_kW:    Math.round(totalIT_kW    * 10) / 10,
    peakPower_kW:       Math.round(peak_kW       * 10) / 10,
    psusRequired:       psusReq,
    psuRating_kW,
    gpuModel_name:      gpuDb.name,
    rackU_height:       rackU,
    powerDensity_kWperU: Math.round(density * 100) / 100,
  };
}

// ─── Step 2 — 48 V OCP Bus ────────────────────────────────────────────────────

export function calcBus(cfg: BusConfig): BusResult {
  const P = cfg.totalPower_kW * 1000;
  const Vbus = cfg.busVoltage_V;
  const totalI = P / Vbus;

  // Bus bar cross-section: J_max = 4 A/mm² for copper, 2.5 for aluminium
  const Jmax = cfg.conductorMaterial === 'copper' ? 4.0 : 2.5;
  const A_mm2 = totalI / Jmax;

  // Practical dimension: flat bar (width × thickness), aspect ratio ~5:1
  const thickness_mm = Math.ceil(Math.sqrt(A_mm2 / 5));
  const width_mm = Math.ceil(A_mm2 / thickness_mm);

  // Resistance: ρCu = 1.72e-8 Ω·m, ρAl = 2.82e-8 Ω·m
  const rho = cfg.conductorMaterial === 'copper' ? 1.72e-8 : 2.82e-8;
  const R_uOhm = (rho * cfg.busLength_m / (A_mm2 * 1e-6)) * 1e6;

  const Vdrop_mV  = totalI * R_uOhm * 1e-6 * 1000;
  const Ploss_W   = totalI * totalI * R_uOhm * 1e-6;

  // Bulk capacitor: C = I_bus * t_holdup / ΔV (allow 10% voltage droop)
  const C_mF = (totalI * cfg.holdupTime_ms * 1e-3) / (0.10 * Vbus) * 1e3;

  // Per-PSU current
  const Ipsu = totalI / cfg.psusInParallel;

  // PSU efficiency estimate
  const psuEff = cfg.psuTopology === 'LLC_PFC' ? 0.95
    : cfg.psuTopology === 'CLLC_BIDIR' ? 0.94
    : 0.96;

  const totalAC_kW  = (P / psuEff) / 1000;
  const Iac = totalAC_kW * 1000 / (cfg.acInputVoltage_V * Math.sqrt(3) * 0.99);

  // Bolt torque: M8 bolt → 15–25 N·m, M10 → 25–35 N·m
  const boltTorque = width_mm >= 80 ? 35 : width_mm >= 50 ? 25 : 15;

  const psSuggestion = cfg.psuTopology === 'LLC_PFC'
    ? `Delta Electronics DPS-5000AB (48 V / ${Math.round(Ipsu)} A, 5 kW, LLC+PFC, OCP 3.0)`
    : cfg.psuTopology === 'CLLC_BIDIR'
    ? `Bel Power Solutions SBB (48 V bidirectional, CLLC, V2G ready, OCP shelf)`
    : `Vicor ChiP BCM48BF480T300A00 (48 V / ${Math.round(Ipsu)} A, PSFB PFC)`;

  return {
    totalBusCurrent_A:      Math.round(totalI),
    busBarCrossSection_mm2: Math.round(A_mm2 * 10) / 10,
    busBarDimensions:       `${width_mm} mm × ${thickness_mm} mm flat bar`,
    busBarResistance_uOhm:  Math.round(R_uOhm * 10) / 10,
    busBarVoltageDrop_mV:   Math.round(Vdrop_mV * 10) / 10,
    busBarPowerLoss_W:      Math.round(Ploss_W),
    bulkCapacitance_mF:     Math.round(C_mF * 10) / 10,
    currentPerPSU_A:        Math.round(Ipsu),
    psuEfficiency:          psuEff,
    totalACInputPower_kW:   Math.round(totalAC_kW * 10) / 10,
    acInputCurrent_A:       Math.round(Iac * 10) / 10,
    psPartSuggestion:       psSuggestion,
    busBoltTorque_Nm:       boltTorque,
    connectionNote:         `Use ${cfg.conductorMaterial === 'copper' ? 'tinned copper' : 'tin-plated aluminium'} bus bars with silver-plated contact surfaces. Torque M${width_mm >= 80 ? 10 : 8} bolts to ${boltTorque} N·m. Apply conductive grease (Sanchem CC-100).`,
  };
}

// ─── Step 3 — DC-DC Converter Stages ─────────────────────────────────────────

function makeStage(
  name: string, Vin: number, Vout: number, P_W: number,
  fsw_kHz: number, phases: number, topology: string,
  switchSuggestion: string, eff_pct: number,
): StageResult {
  const Iout  = P_W / Vout;
  const Iin   = P_W / Vin;
  const Isw_pk = Iin * 1.5;

  // Inductor per phase: L = (Vin−Vout)×Vout / (Vin × ΔIL × fsw)
  const dIL = 0.3 * Iout / phases;
  const L_nH = ((Vin - Vout) * Vout) / (Vin * dIL * fsw_kHz * 1e3) * 1e9;

  // Output cap: bulk decoupling, ~100 µF per A for VRM
  const Cout_uF = Iout * 100;

  const ploss = P_W * (1 - eff_pct / 100);

  return {
    name, inputVoltage_V: Vin, outputVoltage_V: Vout,
    outputCurrent_A: Math.round(Iout),
    efficiency_pct: eff_pct,
    topology,
    switchCurrentPeak_A: Math.round(Isw_pk * 10) / 10,
    inductancePerPhase_nH: Math.round(L_nH),
    outputCapacitance_uF: Math.round(Cout_uF),
    powerLoss_W: Math.round(ploss),
    switchSuggestion,
  };
}

export function calcDCDCStages(cfg: DCDCStagesConfig): DCDCStagesResult {
  const P_W = cfg.totalLoadPower_kW * 1000;
  const stages: StageResult[] = [];

  if (cfg.conversionPath === '2stage_12V' || cfg.conversionPath === 'hybrid') {
    // Stage 1: 48V → 12V (LLC or PSFB)
    stages.push(makeStage(
      '48 V → 12 V Bus', 48, 12, P_W * 0.85, cfg.switchFrequency_kHz, 1,
      'LLC Full-Bridge',
      'Infineon ISC030N12NM6AG (120V/3mΩ SiC) x4 pri + x4 sec SR',
      97,
    ));
    // Stage 2: 12V → VRM (multi-phase buck)
    const gpuRailP = cfg.gpuCount * cfg.gpuTdp_W;
    stages.push(makeStage(
      `12 V → ${cfg.gpuVoltage_V} V GPU VRM (${cfg.vrmPhases}-ph)`,
      12, cfg.gpuVoltage_V, gpuRailP, cfg.switchFrequency_kHz * 4,
      cfg.vrmPhases, `${cfg.vrmPhases}-Phase Buck`,
      'MPS MP2971 GaN 80 V buck controller + MP6920 120 V GaN FET',
      88,
    ));
  }

  if (cfg.conversionPath === 'direct_48V_VRM' || cfg.conversionPath === 'hybrid') {
    const cpuRailP = P_W * 0.15;
    stages.push(makeStage(
      `48 V → ${cfg.cpuVoltage_V} V CPU Rail (${cfg.vrmPhases}-ph)`,
      48, cfg.cpuVoltage_V, cpuRailP, cfg.switchFrequency_kHz * 2,
      cfg.vrmPhases, `${cfg.vrmPhases}-Phase Buck (48V Direct VRM)`,
      'Monolithic Power Systems MPQ7920 (48V→1V single-stage) GaN',
      87,
    ));
  }

  const overallEff = stages.reduce((acc, s) => acc * s.efficiency_pct / 100, 1) * 100;
  const totalLoss_kW = stages.reduce((acc, s) => acc + s.powerLoss_W, 0) / 1000;
  const powerAtGPU_kW = P_W * (overallEff / 100) / 1000;

  // VRM ripple: ΔV = ΔIL / (C × fsw × phases)
  const vrmStage = stages[stages.length - 1];
  const dIL_vrm = 0.3 * (cfg.gpuCount * cfg.gpuTdp_W / cfg.gpuVoltage_V) / cfg.vrmPhases;
  const ripple_mV = (dIL_vrm / (vrmStage.outputCapacitance_uF * 1e-6 * cfg.switchFrequency_kHz * 1e3 * 4 * cfg.vrmPhases)) * 1000;

  // Load transient: ~1–5 µs for modern VRM
  const transient_us = 2.5;

  const designNotes = [
    cfg.conversionPath === 'direct_48V_VRM'
      ? '48V Direct VRM: eliminates 48V→12V stage — saves ~1.5% efficiency loss but requires high-voltage GaN VRM silicon'
      : '2-Stage 12V path: mature ecosystem; 48V→12V LLC at ~97% eff + 12V VRM at ~88% = 85% overall',
    `GPU power stage: ${cfg.gpuCount}× GPUs × ${cfg.gpuTdp_W} W = ${(cfg.gpuCount * cfg.gpuTdp_W / 1000).toFixed(1)} kW at rail`,
    `OCP 3.0 shelf: PSU delivers 48 V ± 0.5 V; shelf bus regulation must hold < 2% under dynamic GPU load`,
    `VRM ripple target: < 20 mV pp on GPU core rail — use ceramic output caps + 5 µH/ph inductor`,
    `Thermal design: VRM switching losses = ${Math.round(totalLoss_kW * 1000)} W → liquid-cooled cold plate recommended`,
  ];

  return {
    stages,
    overallEfficiency_pct: Math.round(overallEff * 10) / 10,
    totalConversionLoss_kW: Math.round(totalLoss_kW * 100) / 100,
    powerAtGPURail_kW: Math.round(powerAtGPU_kW * 10) / 10,
    vrmRipple_mV: Math.round(ripple_mV * 10) / 10,
    loadTransientResponse_us: transient_us,
    designNotes,
  };
}

// ─── Step 4 — Thermal ─────────────────────────────────────────────────────────

export function calcRackThermal(cfg: ThermalConfig): ThermalResult {
  const P_W = cfg.totalHeatLoad_kW * 1000;
  const dT = cfg.targetExitTemp_C - cfg.inletTemp_C;

  // Air cooling: Q = ρ·Cp·V_dot·ΔT; ρCp_air ≈ 1200 J/m³/K at 1 atm
  const V_dot_m3s = P_W / (1200 * dT);
  const cfm = V_dot_m3s * 2119;
  const fanPower_W = cfm * 0.75; // ~0.75 W per CFM for server fans

  // Liquid cooling: Q = ρ·Cp·V_dot_L·ΔT; water ρCp ≈ 4.186 MJ/m³/K
  const dT_liq = Math.min(10, dT);
  const Vliq_Lpm = (P_W / (4186 * 1.0 * dT_liq)) * 60 * 1000;

  // CDU inlet pressure: 2–4 bar typical
  const pressureDrop = 2.5 + Vliq_Lpm * 0.015;

  // PUE
  let coolingPower_kW = 0;
  if (cfg.coolingArch === 'forced_air') {
    coolingPower_kW = (fanPower_W + P_W * 0.12) / 1000; // fans + CRAC/CRAH
  } else if (cfg.coolingArch === 'direct_liquid') {
    coolingPower_kW = P_W * 0.05 / 1000; // CDU pump ~5%
  } else if (cfg.coolingArch === 'rear_door_hx') {
    coolingPower_kW = P_W * 0.08 / 1000;
  } else {
    coolingPower_kW = P_W * 0.02 / 1000; // immersion — very low
  }

  const pue = (cfg.totalHeatLoad_kW + coolingPower_kW + 0.1) / cfg.totalHeatLoad_kW;
  const facilityPower = cfg.totalHeatLoad_kW * pue;

  // Hotspot temp — GPU junction
  const hotSpot = cfg.targetExitTemp_C + (cfg.gpuTdp_W / cfg.gpuCount) * 0.05; // Rth_hs ≈ 0.05 K/W per GPU
  const Rth_JA = (hotSpot - cfg.inletTemp_C) / cfg.gpuTdp_W;

  // CO2 & cost
  const kWhPerYear = facilityPower * 8760;
  const co2_tonnes = (kWhPerYear * 0.4) / 1000; // 400 g/kWh grid avg
  const costUSD = kWhPerYear * 0.08; // $0.08/kWh DC power

  // CDU recommendation
  const cdu = cfg.coolingArch === 'direct_liquid'
    ? (cfg.totalHeatLoad_kW > 100
        ? 'Vertiv Liebert DSE CDU — 200 kW (or 2× 100 kW) w/ EC pump, hot-water return up to 45 °C'
        : 'CoolIT Systems DCLC Rack CDU — 60–80 kW, 38 °C ASHRAE W4')
    : cfg.coolingArch === 'immersion'
    ? 'LiquidStack / GRC ICEraQ — 250 kW 2-phase immersion tank, 3M Novec 7100'
    : 'Stulz InRack CoolLoop rear-door HX — 30 kW per rack, chilled water';

  const descMap: Record<string, string> = {
    forced_air: `ASHRAE Class A3/A4 forced-air — ${Math.round(cfm)} CFM per rack, fan wall`,
    direct_liquid: `Direct Liquid Cooling (DLC) — ${Math.round(Vliq_Lpm)} L/min per rack, CDU manifold`,
    rear_door_hx: `Rear-Door HX — ${Math.round(Vliq_Lpm * 0.7)} L/min, passive heat exchange`,
    immersion: `2-Phase Immersion — FC fluid, no fans, PUE ≈ 1.03`,
  };

  const perServerFlow = cfg.coolingArch === 'direct_liquid'
    ? `${(Vliq_Lpm / cfg.gpuCount).toFixed(1)} L/min per GPU cold plate`
    : `${(cfm / (cfg.gpuCount + 2)).toFixed(0)} CFM per node`;

  return {
    airflowRequired_CFM:      Math.round(cfm),
    airflowRequired_m3s:      Math.round(V_dot_m3s * 1000) / 1000,
    fanPower_W:                Math.round(fanPower_W),
    coolantFlowRate_Lpm:       Math.round(Vliq_Lpm * 10) / 10,
    coolantInletPressure_kPa:  Math.round(pressureDrop * 100),
    pue:                       Math.round(pue * 100) / 100,
    totalFacilityPower_kW:     Math.round(facilityPower * 10) / 10,
    coolingPower_kW:           Math.round(coolingPower_kW * 10) / 10,
    hotSpotTemp_C:             Math.round(hotSpot * 10) / 10,
    thermalResistanceJA:       Math.round(Rth_JA * 1000) / 1000,
    coolingMethod_desc:        descMap[cfg.coolingArch] ?? '',
    perServerFlowRate:         perServerFlow,
    manifoldPressureDrop_kPa:  Math.round(pressureDrop * 100),
    co2PerYear_tonnes:         Math.round(co2_tonnes * 10) / 10,
    costPerYear_USD:           Math.round(costUSD),
    recommendedCDU:            cdu,
  };
}

// ─── Step 5 — Report ─────────────────────────────────────────────────────────

export function calcAIRackReport(
  totalIT_kW: number,
  wallPower_kW: number,
  pue: number,
  overallEff_pct: number,
  gpuModel: string,
  coolingArch: string,
): AIRackReport {
  const annualEnergy_kWh = wallPower_kW * 8760;
  const annualCost = annualEnergy_kWh * 0.08;
  const annualCO2 = (annualEnergy_kWh * 0.4) / 1000;
  const feasible = overallEff_pct > 80 && pue < 1.5;
  const score = Math.max(0, Math.min(100, Math.round((overallEff_pct - 70) * 2)));

  return {
    feasible,
    feasibilityScore: score,
    totalITPower_kW: Math.round(totalIT_kW * 10) / 10,
    wallPower_kW: Math.round(wallPower_kW * 10) / 10,
    pue: Math.round(pue * 100) / 100,
    overallChainEfficiency_pct: Math.round(overallEff_pct * 10) / 10,
    annualEnergyCost_USD: Math.round(annualCost),
    annualCO2_tonnes: Math.round(annualCO2 * 10) / 10,
    ocp_compliance: true,
    risks: [
      { severity: 'high', text: `${gpuModel} rack power density > 100 kW/m² — standard CRAC cooling insufficient; liquid cooling mandatory` },
      { severity: 'medium', text: '48V bus current > 1000A — bus bar termination resistance critical; verify torque spec and contact resistance < 10 µΩ' },
      { severity: 'medium', text: 'OCP 3.0 shelf PSU hold-up < 20 ms — UPS/flywheel required for datacenter-class availability' },
      { severity: 'low', text: 'EMI: GPU switching noise on 48V bus — add 100 nF + 10 µF ceramic decoupling per GPU backplane connection' },
    ],
    bomHighlights: [
      { item: 'OCP v3 PSU (48V / 10 kW)', spec: 'Delta DPS-10000EB, LLC+PFC, 96% eff', estCost: 450 },
      { item: '48V Bus Bar (copper)', spec: '80×10 mm tin-plated, 1 m section', estCost: 120 },
      { item: '48V→12V LLC Brick', spec: 'Vicor DCM 48V→12V 400W, 97%', estCost: 85 },
      { item: 'GPU VRM Module (48V direct)', spec: 'MPS MP29816 48V 8-phase GaN VRM', estCost: 35 },
      { item: 'CDU (liquid cooling)', spec: 'Vertiv DSE 200 kW', estCost: 28000 },
      { item: 'Bulk Cap (48V holdup)', spec: '22 mF / 63 V electrolytic, 10× parallel', estCost: 200 },
    ],
    designNotes: [
      `Rack power: ${Math.round(totalIT_kW)} kW IT → ${Math.round(wallPower_kW)} kW wall (PUE ${pue.toFixed(2)})`,
      `OCP v3 power shelf: 12× 10 kW PSUs → ${120} kW available at 48 V nominal`,
      coolingArch === 'direct_liquid'
        ? 'DLC: GPU cold plate required; coordinate with NVIDIA / AMD reference cooling solution'
        : coolingArch === 'immersion'
        ? 'Immersion: select fluorocarbon-compatible PCB coating; 2-phase bath temp = 50 °C (Novec 7100 BP)'
        : 'Forced air: rear-to-front airflow; blanking panels mandatory for all empty U slots',
      'Power integrity: model 48V rail impedance — target Zbus < 1 mΩ from DC to 100 kHz',
      'OCP compliance: PSU must pass OCP Acceptance Test v2.0 — efficiency, hold-up, output regulation',
    ],
    generatedAt: new Date().toISOString(),
  };
}
