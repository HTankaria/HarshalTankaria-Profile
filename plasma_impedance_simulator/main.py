"""Version 0.1 demo: 13.56 MHz plasma impedance simulator (golden reference).

Runs the default case (Z = 18 - j32 ohm, P = 1 kW), prints the estimate and a
window-length error study, writes a CSV and the plots to ./output/.

Three scenarios are evaluated for every window length:
  ideal    : float samples, no ADC                -> numerical floor
  adc14    : 14-bit quantization, coherent, phase 0 (deterministic)
  adc14+n  : 14-bit + Gaussian front-end noise + random RF start phase,
             Monte-Carlo RMS error (shows the 1/sqrt(N) averaging gain)
"""

from __future__ import annotations

import math
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

from chain import MeasurementChain, samples_for_cycles  # noqa: E402
from config import (ADCConfig, DEFAULT_POWER_W, DEFAULT_R_OHM, DEFAULT_X_OHM,  # noqa: E402
                    HYPOTHETICAL_FPGA_CLOCK_HZ, MEASUREMENT_WINDOWS_CYCLES,
                    RF_FREQUENCY_HZ, SAMPLE_RATE_HZ, VISensorConfig)
from impedance_estimator import ImpedanceEstimate  # noqa: E402
from plasma import PlasmaLoad, format_impedance  # noqa: E402
from rf_source import RFSource  # noqa: E402

OUTPUT_DIR = Path(__file__).resolve().parent / "output"
NOISE_RMS_V = 0.2e-3     # ~ -71 dBFS per channel, typical 14-bit ADC floor
MC_TRIALS = 2000

# Validated categorical palette (slots 1-3), text in neutral ink.
C_V, C_I, C_3 = "#2a78d6", "#eb6834", "#1baf7a"
INK, INK2, GRID = "#0b0b0b", "#52514e", "#e4e3df"


def errors(est: ImpedanceEstimate, load: PlasmaLoad) -> dict[str, float]:
    return {
        "R_err_ohm": est.resistance - load.resistance,
        "X_err_ohm": est.reactance - load.reactance,
        "mag_err_ohm": est.magnitude - load.magnitude,
        "phase_err_deg": est.phase_deg - load.phase_deg,
    }


def window_study(load: PlasmaLoad) -> pd.DataFrame:
    rows = []
    ideal = MeasurementChain(quantize=False)
    adc = MeasurementChain(quantize=True)
    rng = np.random.default_rng(2026)
    noisy_cfg = VISensorConfig(voltage_noise_rms_v=NOISE_RMS_V, current_noise_rms_v=NOISE_RMS_V)

    for cycles in MEASUREMENT_WINDOWS_CYCLES:
        n = samples_for_cycles(cycles, SAMPLE_RATE_HZ)
        base = {"cycles": cycles, "samples": n, "window_ns": n / SAMPLE_RATE_HZ * 1e9}
        rows.append(base | {"scenario": "ideal"} | errors(ideal.measure(load, n), load))
        rows.append(base | {"scenario": "adc14"} | errors(adc.measure(load, n), load))

        acc = {k: [] for k in ("R_err_ohm", "X_err_ohm", "mag_err_ohm", "phase_err_deg")}
        for _ in range(MC_TRIALS):
            src = RFSource(phase_offset_rad=rng.uniform(0, 2 * math.pi))
            ch = MeasurementChain(source=src, sensor_config=noisy_cfg, rng=rng)
            for k, v in errors(ch.measure(load, n), load).items():
                acc[k].append(v)
        rows.append(base | {"scenario": "adc14+noise (RMS)"}
                    | {k: float(np.sqrt(np.mean(np.square(v)))) for k, v in acc.items()})
    return pd.DataFrame(rows)


def print_report(load: PlasmaLoad, df: pd.DataFrame) -> None:
    op = RFSource().operating_point(load)
    n_ref = samples_for_cycles(max(MEASUREMENT_WINDOWS_CYCLES), SAMPLE_RATE_HZ)
    est = MeasurementChain(quantize=True).measure(load, n_ref)

    print("=" * 72)
    print(" 13.56 MHz Plasma Impedance Simulator - v0.1 (golden reference)")
    print("=" * 72)
    print(f"f0 = {RF_FREQUENCY_HZ / 1e6:.2f} MHz   Fs = {SAMPLE_RATE_HZ / 1e6:.2f} MSPS   "
          f"({SAMPLE_RATE_HZ / RF_FREQUENCY_HZ:.0f} samples/cycle)   "
          f"ADC {ADCConfig().resolution_bits}-bit")
    print(f"P = {DEFAULT_POWER_W:.0f} W   V = {op.v_rms:.2f} Vrms ({op.v_peak:.2f} Vpk)   "
          f"I = {op.i_rms:.4f} Arms ({op.i_peak:.4f} Apk)")
    print()
    print(f"Actual Z:     {format_impedance(load.impedance)}")
    print(f"Estimated Z:  {format_impedance(est.impedance, 4)}   "
          f"[14-bit ADC, {max(MEASUREMENT_WINDOWS_CYCLES)} cycles]")
    print(f"Magnitude:    {est.magnitude:.4f} ohm   (actual {load.magnitude:.4f})")
    print(f"Phase:        {est.phase_deg:+.4f} deg  (actual {load.phase_deg:+.4f})")
    print(f"Power:        {est.power_w:.2f} W")

    for scen in df["scenario"].unique():
        sub = df[df["scenario"] == scen]
        print()
        print(f"--- {scen} ---")
        print(f"{'Window':<10}{'Samples':>8}{'Time':>11}{'R Error':>13}{'X Error':>13}"
              f"{'|Z| Error':>13}{'Phase Err':>13}")
        for _, r in sub.iterrows():
            label = f"{r.cycles} cycle" + ("s" if r.cycles > 1 else "")
            print(f"{label:<10}{r.samples:>8d}{r.window_ns:>8.2f} ns"
                  f"{r.R_err_ohm:>13.3e}{r.X_err_ohm:>13.3e}"
                  f"{r.mag_err_ohm:>13.3e}{r.phase_err_deg:>13.3e}")
    print("\nErrors in ohm (R, X, |Z|) and degrees (phase).")
    clk = HYPOTHETICAL_FPGA_CLOCK_HZ
    print(f"Latency budget: 1 us = {RF_FREQUENCY_HZ * 1e-6:.2f} RF cycles = "
          f"{SAMPLE_RATE_HZ * 1e-6:.1f} ADC samples = {clk * 1e-6:.0f} clocks @ {clk / 1e6:.0f} MHz")


def _style(ax, title: str, xlabel: str, ylabel: str) -> None:
    ax.set_title(title, loc="left", color=INK, fontsize=11)
    ax.set_xlabel(xlabel, color=INK2)
    ax.set_ylabel(ylabel, color=INK2)
    ax.grid(True, color=GRID, linewidth=0.8)
    ax.tick_params(colors=INK2)
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    for s in ("left", "bottom"):
        ax.spines[s].set_color(GRID)


def make_plots(load: PlasmaLoad, df: pd.DataFrame) -> list[Path]:
    OUTPUT_DIR.mkdir(exist_ok=True)
    chain = MeasurementChain(quantize=True)
    op = chain.source.operating_point(load)
    cycles = 2
    n = samples_for_cycles(cycles, SAMPLE_RATE_HZ)
    t_fine = np.linspace(0, cycles / RF_FREQUENCY_HZ, 1000)
    _, v_adc, i_adc = chain.acquire(load, n)
    t_s = chain.adc.sample_times(n)
    cfg = chain.sensor_config
    v_s = v_adc / cfg.voltage_ratio          # samples referred back to line
    i_s = i_adc / cfg.current_transimpedance
    paths = []

    def wave(fname, title, y_fine, y_s, color, ylabel):
        fig, ax = plt.subplots(figsize=(8, 3.6), dpi=150)
        ax.plot(t_fine * 1e9, y_fine, color=color, lw=2, label="analog")
        ax.plot(t_s * 1e9, y_s, "o", color=color, ms=8, mec="white", mew=2,
                label="ADC samples (8/cycle)")
        ax.legend(frameon=False, labelcolor=INK2)
        _style(ax, title, "time (ns)", ylabel)
        fig.tight_layout()
        p = OUTPUT_DIR / fname
        fig.savefig(p)
        plt.close(fig)
        paths.append(p)

    wave("v_waveform.png", f"Voltage v(t)  -  Vpk = {op.v_peak:.1f} V",
         op.voltage(t_fine), v_s, C_V, "voltage (V)")
    wave("i_waveform.png", f"Current i(t)  -  Ipk = {op.i_peak:.2f} A",
         op.current(t_fine), i_s, C_I, "current (A)")

    # Overlay: normalized to own peak so both share one axis.
    fig, ax = plt.subplots(figsize=(8, 3.6), dpi=150)
    ax.plot(t_fine * 1e9, op.voltage(t_fine) / op.v_peak, color=C_V, lw=2, label="v(t) / Vpk")
    ax.plot(t_fine * 1e9, op.current(t_fine) / op.i_peak, color=C_I, lw=2, label="i(t) / Ipk")
    lead_ns = -load.phase_rad / (2 * math.pi * RF_FREQUENCY_HZ) * 1e9
    ax.legend(frameon=False, labelcolor=INK2, ncol=2, loc="lower right",
              bbox_to_anchor=(1.0, 1.0), fontsize=9)
    _style(ax, f"V/I overlay  -  Z = {format_impedance(load.impedance, 0)}\n"
               f"current leads by {math.degrees(-load.phase_rad):.1f} deg ({lead_ns:.2f} ns)",
           "time (ns)", "normalized amplitude")
    fig.tight_layout()
    p = OUTPUT_DIR / "vi_overlay.png"
    fig.savefig(p)
    plt.close(fig)
    paths.append(p)

    # Error vs window: R and X in separate panels, |error|, log y.
    fig, axes = plt.subplots(1, 2, figsize=(10, 4), dpi=150, sharey=True)
    styles = {"adc14": (C_V, "o-", "14-bit ADC, coherent"),
              "adc14+noise (RMS)": (C_I, "s-", f"14-bit + {NOISE_RMS_V*1e3:.1f} mV noise (RMS of {MC_TRIALS})"),
              "ideal": (C_3, "^-", "ideal float")}
    for ax, col, name in zip(axes, ("R_err_ohm", "X_err_ohm"), ("R", "X")):
        for scen, (c, m, lbl) in styles.items():
            sub = df[df["scenario"] == scen]
            y = np.maximum(np.abs(sub[col].to_numpy()), 1e-16)
            ax.semilogy(sub["window_ns"], y, m, color=c, lw=2, ms=8, mec="white", mew=2, label=lbl)
        ax.set_xticks(df["window_ns"].unique())
        ax.set_xticklabels([f"{c}\n{t:.0f} ns" for c, t in
                            zip(MEASUREMENT_WINDOWS_CYCLES, df["window_ns"].unique())], fontsize=8)
        _style(ax, f"|{name} error| vs measurement window", "RF cycles / window time", "|error| (ohm)")
    axes[0].annotate("exact 0 drawn at 1e-16", xy=(0.02, 0.02), xycoords="axes fraction",
                     fontsize=7, color=INK2)
    axes[0].legend(frameon=False, labelcolor=INK2, fontsize=8, loc="center right")
    fig.tight_layout()
    p = OUTPUT_DIR / "error_vs_window.png"
    fig.savefig(p)
    plt.close(fig)
    paths.append(p)
    return paths


def main() -> None:
    load = PlasmaLoad(DEFAULT_R_OHM, DEFAULT_X_OHM)
    df = window_study(load)
    print_report(load, df)
    OUTPUT_DIR.mkdir(exist_ok=True)
    df.to_csv(OUTPUT_DIR / "window_study.csv", index=False)
    for p in make_plots(load, df):
        print(f"saved {p.relative_to(Path(__file__).resolve().parent)}")


if __name__ == "__main__":
    main()
