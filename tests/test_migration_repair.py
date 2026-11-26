"""Exercise the admin repair's check and retry behavior."""
import importlib.util
import json
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


class Flow:
    def async_show_form(self, **kwargs):
        return {"type": "form", **kwargs}

    def async_create_entry(self, **kwargs):
        return {"type": "create_entry", **kwargs}


class RepairTest(unittest.IsolatedAsyncioTestCase):
    async def test_repair_requires_confirm_and_checks_each_retry(self):
        modules = {name: types.ModuleType(name) for name in (
            "homeassistant", "homeassistant.components", "homeassistant.components.repairs",
            "voluptuous", "repair_test", "repair_test.frontend",
        )}
        modules["repair_test"].__path__ = []
        modules["homeassistant.components.repairs"].RepairsFlow = Flow
        modules["voluptuous"].Schema = lambda schema: schema
        results = iter(["migration_required", "manual_required", "resource"])
        calls = []

        async def register(hass):
            calls.append(hass)
            return next(results)

        modules["repair_test.frontend"].async_register_card = register
        spec = importlib.util.spec_from_file_location(
            "repair_test.repairs", ROOT / "custom_components/ha_device_health/repairs.py")
        repair = importlib.util.module_from_spec(spec)
        with patch.dict(sys.modules, modules):
            spec.loader.exec_module(repair)
            flow = await repair.async_create_fix_flow(None, "legacy_card_resource", None)
            flow.hass = object()
            self.assertEqual((await flow.async_step_init())["type"], "form")
            self.assertEqual(calls, [])
            self.assertEqual((await flow.async_step_init({}))["errors"]["base"], "legacy_resource_remains")
            self.assertEqual((await flow.async_step_init({}))["errors"]["base"], "resources_unavailable")
            self.assertEqual((await flow.async_step_init({}))["type"], "create_entry")
            self.assertEqual(len(calls), 3)

    def test_localized_repair_has_all_flow_messages(self):
        for language in ("en", "pl"):
            data = json.loads((ROOT / f"custom_components/ha_device_health/translations/{language}.json").read_text())
            issue = data["issues"]["legacy_card_resource"]
            self.assertTrue(issue["title"])
            self.assertTrue(issue["fix_flow"]["step"]["init"]["description"])
            self.assertEqual(set(issue["fix_flow"]["error"]), {"legacy_resource_remains", "resources_unavailable"})
