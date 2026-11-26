"""Exercise frontend resource ownership and preservation of HACS resources."""

import importlib.util
import sys
import types
import unittest
from copy import deepcopy
from pathlib import Path
from unittest.mock import patch

SOURCE = Path(__file__).resolve().parents[1] / "custom_components/ha_device_health/frontend.py"


class Store:
    def __init__(self, hass, version, key, **kwargs):
        self.hass = hass
        self.key = key

    async def async_load(self):
        return deepcopy(self.hass.storage.get(self.key))

    async def async_save(self, data):
        self.hass.storage[self.key] = deepcopy(data)


class Resources:
    def __init__(self, items=()):
        self.items = list(items)
        self.loaded = True
        self.next_id = 1

    def async_items(self):
        return self.items

    async def async_create_item(self, data):
        item = {"id": str(self.next_id), "url": data["url"], "type": data["res_type"]}
        self.next_id += 1
        self.items.append(item)
        return item

    async def async_update_item(self, item_id, data):
        item = next(item for item in self.items if item["id"] == item_id)
        item.update(url=data["url"], type=data["res_type"])
        return item

    async def async_delete_item(self, item_id):
        self.items[:] = [item for item in self.items if item["id"] != item_id]


def load_frontend():
    modules = {
        name: types.ModuleType(name)
        for name in (
            "homeassistant", "homeassistant.components", "homeassistant.components.frontend",
            "homeassistant.components.http", "homeassistant.core",
            "homeassistant.helpers", "homeassistant.helpers.storage",
        )
    }
    modules["homeassistant.components"].frontend = modules["homeassistant.components.frontend"]
    modules["homeassistant.components.http"].StaticPathConfig = object
    modules["homeassistant.core"].CoreState = types.SimpleNamespace(stopping="stopping")
    modules["homeassistant.core"].HomeAssistant = object
    modules["homeassistant.helpers.storage"].Store = Store
    spec = importlib.util.spec_from_file_location("device_health_frontend_test", SOURCE)
    module = importlib.util.module_from_spec(spec)
    with patch.dict(sys.modules, modules):
        spec.loader.exec_module(module)
    return module


class FrontendDeliveryTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.frontend = load_frontend()
        self.resources = Resources()
        self.hass = types.SimpleNamespace(
            data={"lovelace": types.SimpleNamespace(resources=self.resources)},
            storage={}, state="running",
        )

    async def test_create_restart_and_remove_only_owned_resource(self):
        self.assertEqual(await self.frontend.async_register_card(self.hass), "resource")
        self.assertEqual(await self.frontend.async_register_card(self.hass), "resource")
        self.assertEqual(len(self.resources.items), 1)
        self.assertEqual(self.resources.items[0]["url"], "/ha_device_health/ha-device-health.js?v=5.3.0")
        await self.frontend.async_unregister_card(self.hass)
        self.assertEqual(self.resources.items, [])

    async def test_existing_hacs_url_is_not_adopted_or_deleted(self):
        existing = {"id": "hacs", "url": "/hacsfiles/ha-device-health/ha-device-health.js?hacstag=123", "type": "module"}
        self.resources.items.append(existing.copy())
        self.assertEqual(await self.frontend.async_register_card(self.hass), "existing_resource")
        await self.frontend.async_unregister_card(self.hass)
        self.assertEqual(self.resources.items, [existing])

    async def test_user_edit_after_creation_is_preserved(self):
        await self.frontend.async_register_card(self.hass)
        self.resources.items[0]["url"] = "/local/ha-device-health.js"
        await self.frontend.async_unregister_card(self.hass)
        self.assertEqual(self.resources.items[0]["url"], "/local/ha-device-health.js")


if __name__ == "__main__":
    unittest.main()
