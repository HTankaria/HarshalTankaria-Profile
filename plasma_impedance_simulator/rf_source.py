"""RF source: computes a physically consistent operating point for a load.

Given delivered power P and load Z = R + jX:
    I_rms = sqrt(P / R)            (all real power is dissipated in R)
    V_rms = |Z| * I_rms
    V     = V_rms ∠ phi0           (voltage is the phase reference)
    I     = V / Z                  (Ohm's law on RMS phasors)

Waveforms (engineering exp(+jwt) convention, see config.py):
    v(t) = sqrt(2) Re{V e^{jwt}} = V_peak cos(wt + phi0)
    i(t) = sqrt(2) Re{I e^{jwt}} = I_peak cos(wt + phi0 - angle(Z))
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

from config import DEFAULT_POWER_W, RF_FREQUENCY_HZ
from plasma import PlasmaLoad

SQRT2 = math.sqrt(2.0)


@dataclass(frozen=True)
class OperatingPoint:
    """RMS phasors of the line voltage/current at the load."""

    frequency_hz: float
    voltage_phasor: complex  # RMS
    current_phasor: complex  # RMS

    @property
    def v_rms(self) -> float:
        return abs(self.voltage_phasor)

    @property
    def i_rms(self) -> float:
        return abs(self.current_phasor)

    @property
    def v_peak(self) -> float:
        return SQRT2 * self.v_rms

    @property
    def i_peak(self) -> float:
        return SQRT2 * self.i_rms

    @property
    def impedance(self) -> complex:
        return self.voltage_phasor / self.current_phasor

    @property
    def complex_power(self) -> complex:
        """S = V * conj(I) [VA]; real part = delivered power."""
        return self.voltage_phasor * np.conj(self.current_phasor)

    @property
    def omega(self) -> float:
        return 2.0 * math.pi * self.frequency_hz

    def voltage(self, t: np.ndarray) -> np.ndarray:
        """Line voltage v(t) [V]."""
        return phasor_to_waveform(self.voltage_phasor, self.omega, t)

    def current(self, t: np.ndarray) -> np.ndarray:
        """Line current i(t) [A]."""
        return phasor_to_waveform(self.current_phasor, self.omega, t)


def phasor_to_waveform(x_rms: complex, omega: float, t: np.ndarray) -> np.ndarray:
    """x(t) = sqrt(2) * Re{X * exp(+j*omega*t)}."""
    t = np.asarray(t, dtype=float)
    return SQRT2 * np.real(x_rms * np.exp(1j * omega * t))


@dataclass(frozen=True)
class RFSource:
    """Ideal CW RF generator delivering a fixed real power into the load."""

    frequency_hz: float = RF_FREQUENCY_HZ
    power_w: float = DEFAULT_POWER_W
    phase_offset_rad: float = 0.0

    def operating_point(self, load: PlasmaLoad) -> OperatingPoint:
        if self.power_w <= 0.0:
            raise ValueError("power_w must be > 0")
        z = load.impedance
        i_rms = math.sqrt(self.power_w / load.resistance)
        v_rms = abs(z) * i_rms
        v = v_rms * complex(math.cos(self.phase_offset_rad), math.sin(self.phase_offset_rad))
        i = v / z
        return OperatingPoint(self.frequency_hz, v, i)
