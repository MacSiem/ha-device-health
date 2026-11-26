"""Native aggregate entities, updated on state and registry changes."""
from homeassistant.helpers import device_registry as dr, entity_registry as er
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity import DeviceInfo
from .const import DOMAIN, SIGNAL
from .model import classify

class Aggregate:
    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, hass, entry, key):
        self.hass = hass
        self._entry = entry
        self._attr_unique_id = f"{entry.entry_id}_{key}"
        self._attr_translation_key = key
        self._attr_device_info = DeviceInfo(identifiers={(DOMAIN, entry.entry_id)}, name="Device Health", manufacturer="MacSiem")

    async def async_added_to_hass(self):
        await super().async_added_to_hass()
        self.async_on_remove(async_dispatcher_connect(self.hass, SIGNAL, self.async_write_ha_state))

    def values(self):
        return classify(dr.async_get(self.hass).devices, er.async_get(self.hass).entities, {s.entity_id: s for s in self.hass.states.async_all()})
