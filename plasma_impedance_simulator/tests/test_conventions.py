"""Sign/phase convention tests: plasma, RF source, waveform generation."""

import math

import numpy as np
import pytest

from config import RF_FREQUENCY_HZ, SAMPLE_RATE_HZ, SAMPLES_PER_CYCLE
from plasma import PlasmaLoad, format_impedance
from rf_source import RFSource


def test_sample_rate_is_exactly_8_per_cycle():
    assert SAMPLE_RATE_HZ == pytest.approx(108.48e6, rel=0, abs=1e-3)
    assert SAMPLE_RATE_HZ / RF_FREQUENCY_HZ == SAMPLES_PER_CYCLE == 8


def test_plasma_properties():
    p = PlasmaLoad(18.0, -32.0)
    assert p.impedance == complex(18, -32)
    assert p.magnitude == pytest.approx(math.hypot(18, 32))
    assert p.phase_deg == pytest.approx(math.degrees(math.atan2(-32, 18)))
    assert p.is_capacitive and not p.is_inductive
    assert str(p) == "18.000 - j32.000 ohm"
    assert format_impedance(complex(18, 32)) == "18.000 + j32.000 ohm"


def test_plasma_rejects_nonpositive_resistance():
    with pytest.raises(ValueError):
        PlasmaLoad(0.0, 10.0)


def test_reflection_coefficient_against_scikit_rf():
    skrf = pytest.importorskip("skrf")
    for z in (complex(50, 0), complex(18, -32), complex(80, 40)):
        g_ref = skrf.network.z2s(np.array([[[z]]]), z0=50)[0, 0, 0]
        assert PlasmaLoad(z.real, z.imag).reflection_coefficient(50) == pytest.approx(g_ref)


@pytest.mark.parametrize("r,x", [(18, -32), (18, 32), (50, 0), (5, -100), (80, 40)])
def test_operating_point_power_and_ohms_law(r, x):
    op = RFSource(power_w=1000.0).operating_point(PlasmaLoad(r, x))
    assert op.i_rms == pytest.approx(math.sqrt(1000.0 / r))
    assert op.v_rms == pytest.approx(abs(complex(r, x)) * math.sqrt(1000.0 / r))
    assert op.complex_power.real == pytest.approx(1000.0)
    assert op.complex_power.imag == pytest.approx(x * op.i_rms ** 2)  # Q = X I^2
    assert op.impedance == pytest.approx(complex(r, x))
    assert op.v_peak == pytest.approx(math.sqrt(2) * op.v_rms)
    assert op.i_peak == pytest.approx(math.sqrt(2) * op.i_rms)


def test_voltage_waveform_is_vpeak_cos_wt():
    op = RFSource().operating_point(PlasmaLoad(18, -32))
    t = np.arange(64) / SAMPLE_RATE_HZ
    expected = op.v_peak * np.cos(2 * np.pi * RF_FREQUENCY_HZ * t)
    np.testing.assert_allclose(op.voltage(t), expected, atol=1e-9 * op.v_peak)


def _time_of_peak(fn, op) -> float:
    """Time of first positive peak within one period (fine grid)."""
    t = np.linspace(0, 1 / RF_FREQUENCY_HZ, 100_001)
    return t[np.argmax(fn(t))]


def test_capacitive_current_leads_voltage():
    op = RFSource().operating_point(PlasmaLoad(18, -32))
    # i(t) = Ipk cos(wt - angle Z), angle Z < 0 -> current peaks BEFORE v (t=0),
    # i.e. its peak in [0,T) is late in the period (wraps from negative time).
    lead = -math.radians(PlasmaLoad(18, -32).phase_deg)  # > 0
    assert np.angle(op.current_phasor) == pytest.approx(lead)
    t_pk = _time_of_peak(op.current, op)
    period = 1 / RF_FREQUENCY_HZ
    assert t_pk == pytest.approx(period - lead / (2 * np.pi * RF_FREQUENCY_HZ), abs=period * 1e-4)


def test_inductive_current_lags_voltage():
    op = RFSource().operating_point(PlasmaLoad(18, 32))
    lag = math.radians(PlasmaLoad(18, 32).phase_deg)  # > 0
    assert np.angle(op.current_phasor) == pytest.approx(-lag)
    t_pk = _time_of_peak(op.current, op)
    assert t_pk == pytest.approx(lag / (2 * np.pi * RF_FREQUENCY_HZ), abs=1e-4 / RF_FREQUENCY_HZ)


def test_waveforms_satisfy_instantaneous_power():
    op = RFSource().operating_point(PlasmaLoad(18, -32))
    t = np.arange(8 * 100) / SAMPLE_RATE_HZ
    p_avg = np.mean(op.voltage(t) * op.current(t))
    assert p_avg == pytest.approx(1000.0, rel=1e-12)
