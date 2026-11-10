"""VI sensor model: line v(t), i(t) -> two analog voltages for the ADC.

v0.1 runs ideal by default, but every non-ideality listed in VISensorConfig is
already wired in so it can be switched on in later studies:

    v_out(t) = kv (1+ev) [ v_line(t) + harmonics ] + dc_v + n_v(t)
    i_out(t) = ki (1+ei) [ i_line(t - skew) rotated by phase_err + harmonics ]
               + dc_i + n_i(t)
    then optional symmetric clipping at +/- clip_level_v.

Harmonic amplitudes are relative to that channel's fundamental peak.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

from config import VISensorConfig
from rf_source import OperatingPoint, phasor_to_waveform


@dataclass(frozen=True)
class SensorOutput:
    t: np.ndarray
    v_out: np.ndarray  # volts at ADC input (voltage channel)
    i_out: np.ndarray  # volts at ADC input (current channel)


class VISensor:
    """Voltage/current pickoff in front of the ADC."""

    def __init__(self, config: VISensorConfig | None = None,
                 rng: np.random.Generator | None = None) -> None:
        self.config = config or VISensorConfig()
        self.rng = rng or np.random.default_rng()

    # Nominal (design) complex gains at the fundamental: what an ideal
    # calibration would divide out. Includes known gain/phase errors only so
    # that tests can construct an "oracle" calibration if desired.
    @property
    def nominal_voltage_gain(self) -> float:
        return self.config.voltage_ratio

    @property
    def nominal_current_gain(self) -> float:
        return self.config.current_transimpedance

    def measure(self, op: OperatingPoint, t: np.ndarray) -> SensorOutput:
        c = self.config
        t = np.asarray(t, dtype=float)
        w = op.omega

        v_ph = op.voltage_phasor
        i_ph = op.current_phasor * np.exp(1j * math.radians(c.vi_phase_error_deg))
        t_i = t - c.current_skew_s

        v = phasor_to_waveform(v_ph, w, t)
        i = phasor_to_waveform(i_ph, w, t_i)
        v = v + _harmonics(v_ph, w, t, c.voltage_harmonics)
        i = i + _harmonics(i_ph, w, t_i, c.current_harmonics)

        v_out = c.voltage_ratio * (1.0 + c.voltage_gain_error) * v + c.voltage_dc_offset_v
        i_out = c.current_transimpedance * (1.0 + c.current_gain_error) * i + c.current_dc_offset_v

        if c.voltage_noise_rms_v > 0.0:
            v_out = v_out + self.rng.normal(0.0, c.voltage_noise_rms_v, t.shape)
        if c.current_noise_rms_v > 0.0:
            i_out = i_out + self.rng.normal(0.0, c.current_noise_rms_v, t.shape)

        if c.clip_level_v is not None:
            v_out = np.clip(v_out, -c.clip_level_v, c.clip_level_v)
            i_out = np.clip(i_out, -c.clip_level_v, c.clip_level_v)

        return SensorOutput(t=t, v_out=v_out, i_out=i_out)


def _harmonics(fund_rms: complex, omega: float, t: np.ndarray,
               spec: dict[int, tuple[float, float]]) -> np.ndarray:
    """Sum of harmonics, each phase-referenced to the fundamental's phase*k."""
    out = np.zeros_like(t)
    for k, (rel_amp, phase_deg) in spec.items():
        ph = rel_amp * abs(fund_rms) * np.exp(1j * (k * np.angle(fund_rms) + math.radians(phase_deg)))
        out = out + phasor_to_waveform(ph, k * omega, t)
    return out
