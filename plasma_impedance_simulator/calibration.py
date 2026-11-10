"""Calibration: raw ADC-domain phasors -> line V / I phasors.

Model (per channel, at the RF fundamental):
    V_meas = Gv * V_line,    I_meas = Gi * I_line     (Gv, Gi complex)
so
    V_line = V_meas / Gv,    I_line = I_meas / Gi
    Z      = (V_meas / I_meas) * (Gi / Gv) = K * Z_raw

In hardware this is one complex constant multiply per channel (or one for Z),
which is why it sits after I/Q and before the divide in the FPGA path.

A complex Gv/Gi absorbs gain error, V/I phase error AND fixed channel skew
(skew is a pure phase at a single frequency). It cannot remove additive
errors (noise, crosstalk); DC offset is already rejected by the demodulator
over an integer number of cycles.
"""

from __future__ import annotations

from dataclasses import dataclass

from config import VISensorConfig


@dataclass(frozen=True)
class CalibrationCoefficients:
    voltage_gain: complex  # Gv: ADC volts per line volt
    current_gain: complex  # Gi: ADC volts per line amp

    @property
    def impedance_correction(self) -> complex:
        """K = Gi / Gv, so Z = K * V_meas / I_meas."""
        return self.current_gain / self.voltage_gain

    def apply(self, v_meas: complex, i_meas: complex) -> tuple[complex, complex]:
        return v_meas / self.voltage_gain, i_meas / self.current_gain

    @classmethod
    def nominal(cls, sensor: VISensorConfig) -> "CalibrationCoefficients":
        """Design-value calibration (ideal sensor; ignores error terms)."""
        return cls(complex(sensor.voltage_ratio), complex(sensor.current_transimpedance))

    @classmethod
    def from_reference_load(cls, v_meas: complex, i_meas: complex,
                            z_reference: complex,
                            voltage_gain: complex) -> "CalibrationCoefficients":
        """Single-standard calibration against a known load (e.g. 50 ohm).

        Only the ratio K = Gi/Gv is observable from one impedance standard, so
        Gv must be supplied (e.g. from a separate voltage/power calibration).
        """
        k = z_reference * i_meas / v_meas
        return cls(voltage_gain=voltage_gain, current_gain=k * voltage_gain)
