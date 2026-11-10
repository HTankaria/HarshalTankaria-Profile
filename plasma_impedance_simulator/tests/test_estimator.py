"""Impedance estimator accuracy + I/Q sign-convention tests."""

import math

import numpy as np
import pytest

from adc import ADC
from calibration import CalibrationCoefficients
from chain import MeasurementChain, samples_for_cycles
from config import (ADCConfig, MEASUREMENT_WINDOWS_CYCLES, RF_FREQUENCY_HZ,
                    SAMPLE_RATE_HZ, VISensorConfig)
from impedance_estimator import IQDemodulator
from plasma import PlasmaLoad
from rf_source import RFSource

TEST_LOADS = [(50, 0), (18, -32), (18, 32), (5, -100), (80, 40)]


# ---------------------------------------------------------------- demodulator
def test_demodulator_recovers_known_phasor():
    d = IQDemodulator(RF_FREQUENCY_HZ, SAMPLE_RATE_HZ)
    x_true = 3.0 * np.exp(1j * math.radians(37.0))
    n = np.arange(16)
    x = math.sqrt(2) * np.real(x_true * np.exp(1j * 2 * np.pi * n / 8))
    assert d.demodulate(x) == pytest.approx(x_true, abs=1e-12)


@pytest.mark.parametrize("phi_deg", [0, 45, 90, 135, 180, -45, -90, -135])
def test_iq_sign_convention_all_quadrants(phi_deg):
    """cos(wt + phi) must demodulate to angle +phi (Q = -sum x sin)."""
    d = IQDemodulator(RF_FREQUENCY_HZ, SAMPLE_RATE_HZ)
    n = np.arange(8)
    x = math.sqrt(2) * np.cos(2 * np.pi * n / 8 + math.radians(phi_deg))
    assert d.demodulate(x) == pytest.approx(np.exp(1j * math.radians(phi_deg)), abs=1e-12)


def test_start_index_keeps_absolute_phase():
    d = IQDemodulator(RF_FREQUENCY_HZ, SAMPLE_RATE_HZ)
    n = np.arange(3, 3 + 8)
    x = math.sqrt(2) * np.cos(2 * np.pi * n / 8 + 0.3)
    assert np.angle(d.demodulate(x, start_index=3)) == pytest.approx(0.3)


def test_lut_matches_direct_lo():
    d = IQDemodulator(RF_FREQUENCY_HZ, SAMPLE_RATE_HZ)
    assert d.samples_per_cycle == 8
    n = np.arange(100)
    c, s = d.lo(n)
    np.testing.assert_allclose(c, np.cos(2 * np.pi * n / 8), atol=1e-12)
    np.testing.assert_allclose(s, np.sin(2 * np.pi * n / 8), atol=1e-12)
    # 8-point LUT holds only {0, +/-1, +/-1/sqrt2}: exact zeros, no round-off.
    assert set(np.round(np.abs(d.cos_lut), 12)) == {0.0, 1.0, round(1 / math.sqrt(2), 12)}
    assert d.cos_lut[2] == 0.0 and d.sin_lut[4] == 0.0


# ------------------------------------------------------- ideal reconstruction
@pytest.mark.parametrize("r,x", TEST_LOADS)
@pytest.mark.parametrize("cycles", MEASUREMENT_WINDOWS_CYCLES)
def test_ideal_unquantized_reconstruction(r, x, cycles):
    chain = MeasurementChain(quantize=False)
    est = chain.measure(PlasmaLoad(r, x), samples_for_cycles(cycles, SAMPLE_RATE_HZ))
    assert est.resistance == pytest.approx(r, abs=1e-9)
    assert est.reactance == pytest.approx(x, abs=1e-9)
    assert est.magnitude == pytest.approx(math.hypot(r, x), abs=1e-9)
    assert est.phase_deg == pytest.approx(math.degrees(math.atan2(x, r)), abs=1e-9)
    assert est.power_w == pytest.approx(1000.0, rel=1e-12)


@pytest.mark.parametrize("r,x", TEST_LOADS)
def test_ideal_reconstruction_with_arbitrary_start_phase(r, x):
    chain = MeasurementChain(source=RFSource(phase_offset_rad=1.234), quantize=False)
    for start in (0, 1, 5, 13):
        est = chain.measure(PlasmaLoad(r, x), 16, start_index=start)
        assert est.impedance == pytest.approx(complex(r, x), abs=1e-9)


@pytest.mark.parametrize("r,x", TEST_LOADS)
def test_14bit_quantized_reconstruction(r, x):
    """14-bit ADC, default sensor scaling: error stays well under 0.5 %."""
    chain = MeasurementChain(quantize=True)
    for cycles in MEASUREMENT_WINDOWS_CYCLES:
        est = chain.measure(PlasmaLoad(r, x), samples_for_cycles(cycles, SAMPLE_RATE_HZ))
        z = complex(r, x)
        assert abs(est.impedance - z) / abs(z) < 5e-3
        assert est.phase_deg == pytest.approx(math.degrees(math.atan2(x, r)), abs=0.2)


# --------------------------------------------- inductive/capacitive sign trap
@pytest.mark.parametrize("cycles", MEASUREMENT_WINDOWS_CYCLES)
def test_inductive_vs_capacitive_not_swapped(cycles):
    chain = MeasurementChain(quantize=True)
    n = samples_for_cycles(cycles, SAMPLE_RATE_HZ)
    cap = chain.measure(PlasmaLoad(18, -32), n)
    ind = chain.measure(PlasmaLoad(18, 32), n)
    assert cap.reactance < -30 and cap.phase_deg < 0
    assert ind.reactance > 30 and ind.phase_deg > 0


def test_conjugated_demodulator_would_be_caught():
    """Sanity: flipping the Q sign mirrors X — confirm our estimate is NOT that."""
    chain = MeasurementChain(quantize=False)
    _, v, i = chain.acquire(PlasmaLoad(18, 32), 8)
    d = chain.demod
    wrong = d.demodulate(v).conjugate() / d.demodulate(i).conjugate()
    right = d.demodulate(v) / d.demodulate(i)
    k = chain.estimator.calibration.impedance_correction
    assert (k * right).imag == pytest.approx(32, abs=1e-9)
    assert (k * wrong).imag == pytest.approx(-32, abs=1e-9)


def test_swapped_v_i_channels_would_be_caught():
    chain = MeasurementChain(quantize=False)
    _, v, i = chain.acquire(PlasmaLoad(18, -32), 8)
    swapped = chain.estimator.estimate(i, v)
    assert swapped.impedance != pytest.approx(complex(18, -32), abs=1.0)


# ------------------------------------------------------- robustness features
def test_dc_offset_rejected_by_integer_cycle_window():
    cfg = VISensorConfig(voltage_dc_offset_v=0.05, current_dc_offset_v=-0.03)
    chain = MeasurementChain(sensor_config=cfg, quantize=False)
    est = chain.measure(PlasmaLoad(18, -32), 8)
    assert est.impedance == pytest.approx(complex(18, -32), abs=1e-9)


@pytest.mark.parametrize("k", [2, 3, 4, 5, 6])
def test_harmonics_2_to_6_rejected_at_8_samples_per_cycle(k):
    cfg = VISensorConfig(voltage_harmonics={k: (0.2, 30.0)},
                         current_harmonics={k: (0.3, -60.0)})
    chain = MeasurementChain(sensor_config=cfg, quantize=False)
    est = chain.measure(PlasmaLoad(18, -32), 8)
    assert est.impedance == pytest.approx(complex(18, -32), abs=1e-9)


def test_7th_harmonic_aliases_onto_fundamental():
    """Documented limitation: Fs = 8 f0 aliases harmonic 7 (and 9) onto f0."""
    cfg = VISensorConfig(current_harmonics={7: (0.1, 0.0)})
    chain = MeasurementChain(sensor_config=cfg, quantize=False)
    est = chain.measure(PlasmaLoad(18, -32), 8)
    assert abs(est.impedance - complex(18, -32)) > 0.1


def test_nominal_calibration_fails_with_sensor_errors_but_reference_cal_fixes():
    errs = VISensorConfig(voltage_gain_error=0.03, current_gain_error=-0.02,
                          vi_phase_error_deg=2.0, current_skew_s=150e-12)
    # Uncalibrated (nominal) -> visibly wrong
    raw = MeasurementChain(sensor_config=errs, quantize=False)
    assert abs(raw.measure(PlasmaLoad(18, -32), 16).impedance - complex(18, -32)) > 0.5

    # One-standard calibration against 50 ohm
    _, v, i = raw.acquire(PlasmaLoad(50, 0), 16)
    vm, im = raw.demod.demodulate(v), raw.demod.demodulate(i)
    gv = complex(errs.voltage_ratio * (1 + errs.voltage_gain_error))
    cal = CalibrationCoefficients.from_reference_load(vm, im, 50.0, gv)
    fixed = MeasurementChain(sensor_config=errs, quantize=False, calibration=cal)
    for r, x in TEST_LOADS:
        assert fixed.measure(PlasmaLoad(r, x), 16).impedance == pytest.approx(complex(r, x), abs=1e-9)


def test_noise_error_shrinks_with_window_length():
    cfg = VISensorConfig(voltage_noise_rms_v=2e-3, current_noise_rms_v=2e-3)
    chain = MeasurementChain(sensor_config=cfg, quantize=False,
                             rng=np.random.default_rng(1))
    z = complex(18, -32)

    def rms_err(cycles: int) -> float:
        n = samples_for_cycles(cycles, SAMPLE_RATE_HZ)
        e = [abs(chain.measure(PlasmaLoad(18, -32), n).impedance - z) for _ in range(400)]
        return float(np.sqrt(np.mean(np.square(e))))

    e1, e16 = rms_err(1), rms_err(16)
    assert e16 < e1 / 2.5  # ideal scaling sqrt(16) = 4


# ------------------------------------------------------------------- ADC
def test_adc_quantization_and_clipping():
    adc = ADC(ADCConfig(resolution_bits=14, full_scale_v=1.0))
    assert adc.code_min == -8192 and adc.code_max == 8191
    out = adc.quantize(np.array([0.0, 1.0 / 8192 * 0.49, 1.0 / 8192 * 0.51, 2.0, -2.0]))
    assert list(out.codes) == [0, 0, 1, 8191, -8192]
    assert out.clipped


def test_adc_error_bounded_by_half_lsb():
    adc = ADC()
    x = np.linspace(-0.99, 0.99, 10001)
    assert np.max(np.abs(adc.quantize(x).volts - x)) <= adc.config.lsb_v / 2 + 1e-15
    assert not adc.quantize(x).clipped


def test_default_loads_do_not_clip_adc():
    chain = MeasurementChain()
    for r, x in TEST_LOADS:
        _, v, i = chain.acquire(PlasmaLoad(r, x), 96)
        assert np.max(np.abs(v)) < 0.95 and np.max(np.abs(i)) < 0.95
