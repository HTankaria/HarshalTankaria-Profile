# 13.56 MHz Plasma Impedance Simulator — v0.1

Floating-point **golden reference model** for a future FPGA plasma impedance
analyzer:

```
VI sensor -> high-speed ADC -> FPGA [ I/Q demod -> calibration -> R + jX ] -> (future) match prediction -> C1/C2
```

v0.1 covers only the measurement path up to R + jX. No AI, no matching
network, no Raspberry Pi code, no HDL.

## Quick start (Windows / VS Code, Python 3.12)

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m pytest
python main.py
```

`main.py` prints the report and writes to `output/`:
`v_waveform.png`, `i_waveform.png`, `vi_overlay.png`, `error_vs_window.png`,
`window_study.csv` (`demo_output.txt` is a saved copy of the console report).

## Modules

| File | Role |
|---|---|
| `config.py` | Constants (f0 = 13.56 MHz, Fs = 108.48 MSPS = 8 f0), `ADCConfig`, `VISensorConfig`, convention docs |
| `plasma.py` | `PlasmaLoad`: R, X, Z, \|Z\|, phase, Γ |
| `rf_source.py` | `RFSource` -> `OperatingPoint` (RMS phasors V, I and v(t), i(t)) for a power P |
| `vi_sensor.py` | `VISensor`: ideal by default; gain error, V/I phase error, skew, noise, DC offset, harmonics, clipping all wired in |
| `adc.py` | `ADC`: ideal sampling + N-bit quantization with saturation |
| `impedance_estimator.py` | `IQDemodulator` (8-entry LO LUT) and `ImpedanceEstimator` |
| `calibration.py` | `CalibrationCoefficients`: nominal and single-standard (e.g. 50 Ω) calibration |
| `chain.py` | `MeasurementChain`: wires load -> source -> sensor -> ADC -> estimator (shared by demo and tests) |
| `main.py` | Demo, window study, plots |

## Conventions (tested)

* Phasors are **RMS**, engineering `exp(+jωt)`: `x(t) = √2·Re{X·e^{jωt}}`.
* Voltage is the phase reference: `v(t) = V_pk·cos(ωt)`, `I = V / Z`, so
  `i(t) = I_pk·cos(ωt − ∠Z)`.
* `I_rms = √(P/R)`, `V_rms = |Z|·I_rms`, peak = √2·RMS.
* **X < 0 capacitive -> current leads; X > 0 inductive -> current lags.**
  For 18 − j32 Ω the current leads by 60.64° (12.42 ns).

### I/Q demodulation

With `θ_n = 2π f0 n / Fs` (absolute sample index n):

```
I = +(√2/N) Σ x[n] cos θ_n
Q = −(√2/N) Σ x[n] sin θ_n        <- the minus sign is what keeps X's sign right
X̂ = I + jQ                        (RMS phasor)
Z = K · V̂ / Î,   K = Gi / Gv      (calibration)
```

For an integer number of RF cycles the 2f0 image term cancels exactly, so the
ideal estimate is exact for **any** window ≥ 1 cycle. At Fs = 8 f0 the LO
LUT only contains {0, ±1, ±1/√2}. The critical path uses only MACs, one complex
constant multiply and one complex divide. No FFT and no trig: `atan2` is used
only to report phase.

Tests that guard the sign convention: all-quadrant demodulator phase test,
18 ± j32 Ω mirror test at every window length, an explicit "conjugated
demodulator gives −X" check, and a swapped V/I channel check.

## v0.1 results (default case 18 − j32 Ω, 1 kW)

| Window | Samples | Time | Ideal float \|ΔR\|, \|ΔX\| | 14-bit ADC ΔR / ΔX | 14-bit + 0.2 mV noise, RMS ΔR / ΔX |
|---|---|---|---|---|---|
| 1 cycle | 8 | 73.75 ns | ≤ 1e-14 Ω | −3.3e-3 / +4.4e-3 Ω | 3.1e-2 / 3.2e-2 Ω |
| 2 cycles | 16 | 147.5 ns | ≤ 1e-14 Ω | same | 2.2e-2 / 2.1e-2 Ω |
| 4 cycles | 32 | 295.0 ns | ≤ 1e-14 Ω | same | 1.5e-2 / 1.6e-2 Ω |
| 8 cycles | 64 | 590.0 ns | ≤ 1e-14 Ω | same | 1.1e-2 / 1.1e-2 Ω |
| 12 cycles | 96 | 885.0 ns | ≤ 1e-14 Ω | same | 9.0e-3 / 8.9e-3 Ω |

Things to know when reading this table:

1. **Ideal coherent case:** errors are at floating-point round-off
   (≤ 4e-14 Ω across all five test loads and all windows).
2. **14-bit, coherent, no noise:** the error is the same for every window.
   With Fs = 8 f0 exactly, the quantization error pattern repeats every cycle,
   so a longer window does not average it out. Getting averaging gain needs
   noise or dither, or a non-integer Fs/f0 relationship.
3. **With noise (random RF phase, 2000 trials):** the error falls as
   1/√N (12 cycles vs 1 cycle: 3.47× better, theory √12 = 3.46).
4. Fs = 8 f0 makes the window immune to DC offset and harmonics 2–6, but the
   **7th and 9th harmonics alias onto f0** (there is a test for this). An
   anti-alias filter must suppress them in hardware.
5. A single 50 Ω standard calibration removes V/I gain error, V/I phase error
   and fixed channel skew together (tested). Absolute V/I scaling (power)
   still needs Gv from a separate calibration.

## Latency budget (for later)

1 µs = 13.56 RF cycles = 108.5 ADC samples = 200 clocks at 200 MHz. A 12-cycle
window (885 ns) leaves about 115 ns for the pipeline (accumulate, calibrate,
divide).
