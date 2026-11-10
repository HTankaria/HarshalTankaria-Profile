"""Plasma load model: Zp = R + jX (single-frequency, linear, v0.1)."""

from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass(frozen=True)
class PlasmaLoad:
    """Linear plasma load at the RF fundamental.

    Attributes:
        resistance: R in ohm (must be > 0 for power delivery).
        reactance:  X in ohm (X < 0 capacitive, X > 0 inductive).
    """

    resistance: float
    reactance: float

    def __post_init__(self) -> None:
        if not self.resistance > 0.0:
            raise ValueError("PlasmaLoad.resistance must be > 0 ohm")

    @property
    def impedance(self) -> complex:
        """Complex impedance Z = R + jX [ohm]."""
        return complex(self.resistance, self.reactance)

    @property
    def magnitude(self) -> float:
        """|Z| [ohm]."""
        return abs(self.impedance)

    @property
    def phase_rad(self) -> float:
        """angle(Z) in radians (positive = inductive)."""
        return math.atan2(self.reactance, self.resistance)

    @property
    def phase_deg(self) -> float:
        """angle(Z) in degrees (positive = inductive)."""
        return math.degrees(self.phase_rad)

    @property
    def is_capacitive(self) -> bool:
        return self.reactance < 0.0

    @property
    def is_inductive(self) -> bool:
        return self.reactance > 0.0

    def reflection_coefficient(self, z0: float = 50.0) -> complex:
        """Gamma = (Z - Z0) / (Z + Z0) for a real reference impedance."""
        z = self.impedance
        return (z - z0) / (z + z0)

    def __str__(self) -> str:
        return format_impedance(self.impedance)


def format_impedance(z: complex, digits: int = 3) -> str:
    """Format Z as 'R + jX ohm' / 'R - jX ohm'."""
    sign = "+" if z.imag >= 0 else "-"
    return f"{z.real:.{digits}f} {sign} j{abs(z.imag):.{digits}f} ohm"
