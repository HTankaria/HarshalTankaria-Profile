// Parses SimNEC .ssn (XML) files and extracts matching network topology.
// Element order in the file is LOAD → ... → GENERATOR (load to source).
// We reverse this for impedance calculations (source → load).

export interface ParsedElement {
  type: string;          // SERIES_IND | SHUNT_CAP | SERIES_CAP | LOAD | GENERATOR
  label: string;
  value: number;         // H for inductors, F for capacitors, ohms for load/gen
  valueKey: string;      // 'H', 'F', 'ohms', 'MHz'
  rangeMin: number;
  rangeMax: number;
  isVariable: boolean;   // doSweep=y means it's a tunable element
}

export interface ParsedNetwork {
  elements: ParsedElement[];  // load→generator order (as in file)
  freq_Hz: number;
  Z0: number;
  // Extracted topology
  L1_uH: number;   // series inductor, load side
  L2_uH: number;   // series inductor, generator side
  C1_nF: number;   // shunt capacitor, variable
  C1max_nF: number;
  C2_nF: number;   // series capacitor, variable
  C2max_nF: number;
}

// Handles SimNEC engineering notation: 20n, 1.5u, 2K, etc.
function parseVal(v: string): number {
  const s = v.trim();
  if (!s || s === '<none>') return 0;
  const m = s.match(/^([+-]?[\d.]+(?:[Ee][+-]?\d+)?)\s*([pnumkKMG]?)$/);
  if (!m) return parseFloat(s) || 0;
  const n = parseFloat(m[1]);
  const u: Record<string, number> = { p: 1e-12, n: 1e-9, u: 1e-6, m: 1e-3, k: 1e3, K: 1e3, M: 1e6, G: 1e9 };
  return n * (u[m[2]] ?? 1);
}

function getParam(el: Element, name: string): { val: number; sweepMin: number; sweepMax: number; isVar: boolean } {
  for (const p of Array.from(el.querySelectorAll(':scope > p'))) {
    const n = p.querySelector(':scope > n')?.textContent?.trim();
    if (n !== name) continue;
    const val = parseVal(p.querySelector(':scope > v')?.textContent ?? '0');
    const sp = p.querySelector('sweepParam');
    const doSweep = sp?.querySelector('doSweep')?.textContent?.trim() === 'y';
    const from = parseVal(sp?.querySelector('from')?.textContent ?? '0');
    const to   = parseVal(sp?.querySelector('to')?.textContent ?? '0');
    return { val, sweepMin: from, sweepMax: to, isVar: doSweep };
  }
  return { val: 0, sweepMin: 0, sweepMax: 0, isVar: false };
}

export function parseSsn(xmlText: string): ParsedNetwork {
  const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
  const rawEls = Array.from(doc.querySelectorAll('CIRCUIT > element'));

  const elements: ParsedElement[] = rawEls.map(el => {
    const type  = el.querySelector(':scope > type')?.textContent?.trim() ?? '';
    const label = el.querySelector(':scope > sweeperLabel')?.textContent?.trim() ?? '';

    let key = 'H';
    if (type === 'SHUNT_CAP' || type === 'SERIES_CAP') key = 'F';
    else if (type === 'LOAD') key = 'ohms';
    else if (type === 'GENERATOR') key = 'MHz';

    const { val, sweepMin, sweepMax, isVar } = getParam(el, key);
    return { type, label, value: val, valueKey: key, rangeMin: sweepMin, rangeMax: sweepMax, isVariable: isVar };
  });

  // Extract generator freq and Z0

  // Properly get freq and Z0
  let freq = 13.56e6, Z0 = 50;
  for (const el of rawEls) {
    const type = el.querySelector(':scope > type')?.textContent?.trim();
    if (type === 'GENERATOR') {
      const mhz = getParam(el, 'MHz');
      const zo  = getParam(el, 'Zo');
      if (mhz.val > 0) freq = mhz.val * 1e6;
      if (zo.val  > 0) Z0   = zo.val;
    }
  }

  // Map element types to topology roles
  // File order: LOAD → [series L1] → [shunt C1] → [series C2] → [series L2] → GENERATOR
  const seriesInds = elements.filter(e => e.type === 'SERIES_IND');
  const shuntCap   = elements.find(e => e.type === 'SHUNT_CAP');
  const seriesCap  = elements.find(e => e.type === 'SERIES_CAP');

  // L1 = first series ind (load side), L2 = second (generator side)
  const L1_uH  = (seriesInds[0]?.value ?? 0) * 1e6;
  const L2_uH  = (seriesInds[1]?.value ?? 0) * 1e6;
  const C1_nF  = (shuntCap?.value ?? 0) * 1e9;
  const C1max  = (shuntCap?.rangeMax ?? 20e-9) * 1e9;
  const C2_nF  = (seriesCap?.value ?? 0) * 1e9;
  const C2max  = (seriesCap?.rangeMax ?? 20e-9) * 1e9;

  return { elements, freq_Hz: freq, Z0, L1_uH, L2_uH, C1_nF, C1max_nF: C1max, C2_nF, C2max_nF: C2max };
}
