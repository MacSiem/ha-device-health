from homeassistant.components.binary_sensor import BinarySensorDeviceClass, BinarySensorEntity
from .native import Aggregate

async def async_setup_entry(hass, entry, async_add_entities):
    async_add_entities([Problem(hass, entry, 'problem')])

class Problem(Aggregate, BinarySensorEntity):
    _attr_device_class = BinarySensorDeviceClass.PROBLEM
    @property
    def is_on(self):
        return self.values()[2]
