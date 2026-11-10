"""ADC model: ideal sample-and-hold followed by uniform mid-tread quantization.

Two's-complement style code range: [-2**(N-1), 2**(N-1) - 1].
Inputs outside the range saturate (clip) at the end codes.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from config import ADCConfig


@dataclass(frozen=True)
class ADCOutput:
    codes: np.ndarray     # integer codes (int32)
    volts: np.ndarray     # codes * LSB, i.e. reconstructed input volts
    clipped: bool         # True if any sample hit an end code by saturation


class ADC:
    def __init__(self, config: ADCConfig | None = None) -> None:
        self.config = config or ADCConfig()

    @property
    def code_min(self) -> int:
        return -(2 ** (self.config.resolution_bits - 1))

    @property
    def code_max(self) -> int:
        return 2 ** (self.config.resolution_bits - 1) - 1

    def sample_times(self, n_samples: int, t0: float = 0.0) -> np.ndarray:
        """Sample instants t_n = t0 + n / Fs."""
        return t0 + np.arange(n_samples) / self.config.sample_rate_hz

    def quantize(self, x_volts: np.ndarray) -> ADCOutput:
        lsb = self.config.lsb_v
        raw = np.round(np.asarray(x_volts, dtype=float) / lsb)
        clipped = bool(np.any(raw < self.code_min) or np.any(raw > self.code_max))
        codes = np.clip(raw, self.code_min, self.code_max).astype(np.int32)
        return ADCOutput(codes=codes, volts=codes.astype(float) * lsb, clipped=clipped)
