"""The options flow works on old HA and with a read-only new-HA property."""
import importlib.util
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


class Flow:
    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__()

    def async_show_form(self, **kwargs):
        return {"type": "form", **kwargs}

    def async_create_entry(self, **kwargs):
        return {"type": "create_entry", **kwargs}


class OptionsWithReadOnlyProperty(Flow):
    @property
    def config_entry(self):
        raise AssertionError("flow must use the explicit entry on every HA version")


class Required:
    def __init__(self, name, default):
        self.name, self.default = name, default


class OptionsCompatTest(unittest.IsolatedAsyncioTestCase):
    async def test_form_and_save_preserve_options_for_both_ha_contracts(self):
        for base in (Flow, OptionsWithReadOnlyProperty):
            mods = {n: types.ModuleType(n) for n in ("homeassistant", "homeassistant.config_entries", "voluptuous", "device_test", "device_test.const")}
            mods['device_test'].__path__ = []
            mods['device_test.const'].DOMAIN = 'ha_device_health'
            mods['device_test.const'].CONF_GLOBAL_AGGREGATES = 'global_aggregates'
            mods['homeassistant.config_entries'].ConfigFlow = Flow
            mods['homeassistant.config_entries'].OptionsFlow = base
            mods['voluptuous'].Required = Required
            mods['voluptuous'].Schema = lambda schema: schema
            spec = importlib.util.spec_from_file_location('device_test.config_flow', ROOT / 'custom_components/ha_device_health/config_flow.py')
            module = importlib.util.module_from_spec(spec)
            with patch.dict(sys.modules, mods):
                spec.loader.exec_module(module)
                entry = types.SimpleNamespace(options={'global_aggregates': False, 'future': 'keep'})
                flow = module.DeviceHealthFlow.async_get_options_flow(entry)
                form = await flow.async_step_init()
                self.assertEqual(form['type'], 'form')
                self.assertFalse(next(iter(form['data_schema'])).default)
                result = await flow.async_step_init({'global_aggregates': True})
                self.assertEqual(result['data'], {'global_aggregates': True, 'future': 'keep'})
