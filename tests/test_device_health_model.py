"""Pure aggregate classification tests, no running HA required."""
import importlib.util
from pathlib import Path
from types import SimpleNamespace as Obj

path = Path(__file__).parents[1] / 'custom_components/ha_device_health/model.py'
spec = importlib.util.spec_from_file_location('device_health_model', path)
model = importlib.util.module_from_spec(spec)
spec.loader.exec_module(model)

def test_missing_is_not_zero_and_problem_is_tristate():
    assert model.classify({'d': object()}, {}, {}) == (None, None, None)
    entries = {'binary_sensor.link': Obj(device_id='d')}
    states = {'binary_sensor.link': Obj(state='off', attributes={'device_class': 'connectivity'})}
    assert model.classify({'d': object()}, entries, states) == (1, None, True)
    states['binary_sensor.link'].state = 'unavailable'
    assert model.classify({'d': object()}, entries, states) == (None, None, None)

def test_multiple_links_and_batteries_count_devices():
    entries = {key: Obj(device_id='d') for key in ('binary_sensor.link', 'device_tracker.router', 'sensor.one_battery', 'sensor.two_battery')}
    states = {'binary_sensor.link': Obj(state='off', attributes={'device_class': 'connectivity'}),
              'device_tracker.router': Obj(state='home', attributes={'source_type': 'router'}),
              'sensor.one_battery': Obj(state='10', attributes={'device_class': 'battery', 'unit_of_measurement': '%'}),
              'sensor.two_battery': Obj(state='19', attributes={'device_class': 'battery', 'unit_of_measurement': '%'})}
    assert model.classify({'d': object()}, entries, states) == (0, 1, True)
    states['sensor.one_battery'].attributes['unit_of_measurement'] = 'V'
    states['sensor.two_battery'].state = '21'
    assert model.classify({'d': object()}, entries, states) == (0, 0, False)


def test_unregistered_battery_and_invalid_readings():
    states = {'sensor.remote_battery': Obj(state='12', attributes={'unit_of_measurement': '%'}),
              'sensor.voltage_battery': Obj(state='1', attributes={'unit_of_measurement': 'V'})}
    assert model.classify({}, {}, states) == (None, 1, True)
    states['sensor.remote_battery'].state = 'unknown'
    assert model.classify({}, {}, states) == (None, None, None)
