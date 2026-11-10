"""Central configuration for the 13.56 MHz plasma impedance simulator (v0.1).

All quantities are SI units. Phasors are RMS phasors unless stated otherwise.

Sign / phase conventions (used consistently across every module)
-----------------------------------------------------------------
* Time-domain ↔ phasor mapping:   x(t) = sqrt(2) * Re{ X * exp(+j*w*t) }
  i.e. engineering convention, exp(+jwt), RMS phasor X.
* Voltage is the phase reference: V = V_rms ∠ phi0 (phi0 = 0 by default),
  so v(t) = V_peak * cos(w*t + phi0).
* Load impedance Z = R + jX = V / I.
  - X > 0  -> inductive  -> current LAGS voltage   (angle(I) < angle(V))
  - X < 0  -> capacitive -> current LEADS voltage  (angle(I) > angle(V))
* Impedance phase angle(Z) = angle(V) - angle(I), in degrees, in (-90, +90]
  for any passive load (R >= 0).
"""

from __future__ import annotations

from dataclasses import dataclass, field

RF_FREQUENCY_HZ: float = 13.56e6
SAMPLES_PER_CYCLE: int = 8
SAMPLE_RATE_HZ: float = RF_FREQUENCY_HZ * SAMPLES_PER_CYCLE  # 108.48 MSPS

DEFAULT_R_OHM: float = 18.0
DEFAULT_X_OHM: float = -32.0
DEFAULT_POWER_W: float = 1000.0

# Measurement windows to evaluate, in RF cycles.
MEASUREMENT_WINDOWS_CYCLES: tuple[int, ...] = (1, 2, 4, 8, 12)

# Future real-time target (documentation only in v0.1).
TARGET_LATENCY_S: float = 1e-6
HYPOTHETICAL_FPGA_CLOCK_HZ: float = 200e6


@dataclass(frozen=True)
class ADCConfig:
    """ADC parameters. Bipolar input range is [-full_scale_v, +full_scale_v]."""

    resolution_bits: int = 14
    sample_rate_hz: float = SAMPLE_RATE_HZ
    full_scale_v: float = 1.0

    @property
    def lsb_v(self) -> float:
        """Size of one LSB in volts (2*FS / 2**bits)."""
        return 2.0 * self.full_scale_v / (2 ** self.resolution_bits)


@dataclass(frozen=True)
class VISensorConfig:
    """VI sensor front-end parameters.

    The ideal sensor maps line voltage/current to ADC-input volts:
        v_out = v_line * voltage_ratio            [V/V]
        i_out = i_line * current_transimpedance   [V/A]

    The defaults put 3000 V peak and 30 A peak at the ADC full scale (1 V),
    which covers every test load at 1 kW with headroom (worst case 5-j100 ohm:
    ~2002 V peak, ~20 A peak).

    All non-ideality fields default to 0 (ideal). They are implemented so that
    later versions can exercise the estimator / calibration against them.
    """

    voltage_ratio: float = 1.0 / 3000.0
    current_transimpedance: float = 1.0 / 30.0

    # --- Non-idealities (all zero == ideal sensor) ---
    voltage_gain_error: float = 0.0          # fractional, e.g. 0.01 = +1 %
    current_gain_error: float = 0.0          # fractional
    vi_phase_error_deg: float = 0.0          # extra phase on I channel at f0
    current_skew_s: float = 0.0              # I channel delayed by this time
    voltage_noise_rms_v: float = 0.0         # Gaussian noise at sensor output
    current_noise_rms_v: float = 0.0
    voltage_dc_offset_v: float = 0.0
    current_dc_offset_v: float = 0.0
    # Harmonics: {order: (relative amplitude vs fundamental, phase_deg)}
    voltage_harmonics: dict[int, tuple[float, float]] = field(default_factory=dict)
    current_harmonics: dict[int, tuple[float, float]] = field(default_factory=dict)
    # Analog clipping level at sensor output (None = no clipping).
    clip_level_v: float | None = None
