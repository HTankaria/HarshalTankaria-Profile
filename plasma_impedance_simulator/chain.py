"""End-to-end measurement chain used by main.py and the tests.

    PlasmaLoad + RFSource -> VISensor -> ADC -> IQ demod -> calibration -> R+jX
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from adc import ADC
from calibration import CalibrationCoefficients
from config import ADCConfig, RF_FREQUENCY_HZ, VISensorConfig
from impedance_estimator import ImpedanceEstimate, ImpedanceEstimator, IQDemodulator
from plasma import PlasmaLoad
from rf_source import OperatingPoint, RFSource
from vi_sensor import VISensor


@dataclass
class MeasurementChain:
    source: RFSource = field(default_factory=RFSource)
    sensor_config: VISensorConfig = field(default_factory=VISensorConfig)
    adc_config: ADCConfig = field(default_factory=ADCConfig)
    quantize: bool = True
    calibration: CalibrationCoefficients | None = None
    rng: np.random.Generator = field(default_factory=lambda: np.random.default_rng(0))

    def __post_init__(self) -> None:
        self.sensor = VISensor(self.sensor_config, self.rng)
        self.adc = ADC(self.adc_config)
        self.demod = IQDemodulator(self.source.frequency_hz, self.adc_config.sample_rate_hz)
        cal = self.calibration or CalibrationCoefficients.nominal(self.sensor_config)
        self.estimator = ImpedanceEstimator(self.demod, cal)

    def acquire(self, load: PlasmaLoad, n_samples: int,
                start_index: int = 0) -> tuple[OperatingPoint, np.ndarray, np.ndarray]:
        """Return operating point and the V/I sample streams in ADC volts."""
        op = self.source.operating_point(load)
        t = self.adc.sample_times(n_samples, t0=start_index / self.adc_config.sample_rate_hz)
        out = self.sensor.measure(op, t)
        if self.quantize:
            return op, self.adc.quantize(out.v_out).volts, self.adc.quantize(out.i_out).volts
        return op, out.v_out, out.i_out

    def measure(self, load: PlasmaLoad, n_samples: int,
                start_index: int = 0) -> ImpedanceEstimate:
        _, v, i = self.acquire(load, n_samples, start_index)
        return self.estimator.estimate(v, i, start_index)


def samples_for_cycles(cycles: int, sample_rate_hz: float,
                       rf_frequency_hz: float = RF_FREQUENCY_HZ) -> int:
    n = cycles * sample_rate_hz / rf_frequency_hz
    if abs(n - round(n)) > 1e-9:
        raise ValueError("window is not an integer number of samples")
    return int(round(n))
