"""Digital I/Q demodulation and R + jX estimation.

FPGA-friendly critical path (no FFT, no transcendental functions):

    ADC samples x[n]
      -> multiply by LO tables cos(theta_n), sin(theta_n)  (8-entry LUT when
         Fs = 8 f0: values in {0, +/-1, +/-1/sqrt2})
      -> accumulate over N samples (integer number of RF cycles)
      -> complex calibration multiply
      -> complex divide  Z = V / I  (one reciprocal of |I|^2)

Demodulation convention (matches exp(+jwt) phasors, see config.py):

    theta_n = 2*pi*f0*n/Fs                     (n = absolute sample index)
    I_x = +(sqrt2/N) * sum x[n] cos(theta_n)
    Q_x = -(sqrt2/N) * sum x[n] sin(theta_n)
    X_hat = I_x + j Q_x                        (RMS phasor)

Proof for x[n] = sqrt2 |X| cos(theta_n + phi):
    sum x cos = (N/sqrt2) |X| cos(phi)   ->  I_x = |X| cos(phi)
    sum x sin = -(N/sqrt2) |X| sin(phi)  ->  Q_x = |X| sin(phi)
The double-frequency image term (1/N) sum exp(-2j theta_n) is exactly zero
when the window is an integer number of RF cycles and Fs/f0 > 2.

The minus sign on Q is what makes an inductive load (current lagging) come out
with X > 0. Dropping it flips the sign of every reactance; tests catch this.

atan2 (for the phase output) is reporting-only and not in the R+jX path.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

from calibration import CalibrationCoefficients

SQRT2 = math.sqrt(2.0)


@dataclass(frozen=True)
class ImpedanceEstimate:
    voltage_phasor: complex   # RMS, calibrated (line volts)
    current_phasor: complex   # RMS, calibrated (line amps)
    n_samples: int

    @property
    def impedance(self) -> complex:
        return self.voltage_phasor / self.current_phasor

    @property
    def resistance(self) -> float:
        return self.impedance.real

    @property
    def reactance(self) -> float:
        return self.impedance.imag

    @property
    def magnitude(self) -> float:
        return abs(self.impedance)

    @property
    def phase_deg(self) -> float:
        return math.degrees(math.atan2(self.reactance, self.resistance))

    @property
    def power_w(self) -> float:
        """Delivered real power Re{V I*} [W]."""
        return (self.voltage_phasor * self.current_phasor.conjugate()).real


class IQDemodulator:
    """Single-bin coherent I/Q demodulator with precomputed LO tables."""

    def __init__(self, rf_frequency_hz: float, sample_rate_hz: float) -> None:
        if sample_rate_hz <= 2.0 * rf_frequency_hz:
            raise ValueError("Fs must exceed 2*f0")
        self.rf_frequency_hz = rf_frequency_hz
        self.sample_rate_hz = sample_rate_hz
        ratio = sample_rate_hz / rf_frequency_hz
        # Integer samples/cycle -> LO is an exact periodic LUT.
        self.samples_per_cycle: int | None = (
            int(round(ratio)) if abs(ratio - round(ratio)) < 1e-9 else None
        )
        if self.samples_per_cycle is not None:
            k = np.arange(self.samples_per_cycle)
            th = 2.0 * np.pi * k / self.samples_per_cycle
            # Snap round-off (e.g. cos(pi/2) = 6e-17) to exact 0, as a ROM would.
            self.cos_lut = np.where(np.abs(np.cos(th)) < 1e-12, 0.0, np.cos(th))
            self.sin_lut = np.where(np.abs(np.sin(th)) < 1e-12, 0.0, np.sin(th))

    def lo(self, n: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        """cos/sin LO values at absolute sample indices n."""
        if self.samples_per_cycle is not None:
            idx = np.mod(n, self.samples_per_cycle)
            return self.cos_lut[idx], self.sin_lut[idx]
        th = 2.0 * np.pi * self.rf_frequency_hz * n / self.sample_rate_hz
        return np.cos(th), np.sin(th)

    def window_is_coherent(self, n_samples: int) -> bool:
        cycles = n_samples * self.rf_frequency_hz / self.sample_rate_hz
        return abs(cycles - round(cycles)) < 1e-9 and round(cycles) >= 1

    def demodulate(self, x: np.ndarray, start_index: int = 0) -> complex:
        """Return RMS phasor of the f0 component of x (see module docstring)."""
        x = np.asarray(x, dtype=float)
        n = start_index + np.arange(x.size)
        c, s = self.lo(n)
        scale = SQRT2 / x.size
        i_acc = scale * float(np.dot(x, c))
        q_acc = -scale * float(np.dot(x, s))
        return complex(i_acc, q_acc)


class ImpedanceEstimator:
    """ADC volts (V and I channels) -> calibrated R + jX."""

    def __init__(self, demodulator: IQDemodulator,
                 calibration: CalibrationCoefficients) -> None:
        self.demod = demodulator
        self.calibration = calibration

    def estimate(self, v_samples: np.ndarray, i_samples: np.ndarray,
                 start_index: int = 0) -> ImpedanceEstimate:
        if len(v_samples) != len(i_samples):
            raise ValueError("V and I sample windows must have equal length")
        v_raw = self.demod.demodulate(v_samples, start_index)
        i_raw = self.demod.demodulate(i_samples, start_index)
        v, i = self.calibration.apply(v_raw, i_raw)
        return ImpedanceEstimate(voltage_phasor=v, current_phasor=i,
                                 n_samples=len(v_samples))
