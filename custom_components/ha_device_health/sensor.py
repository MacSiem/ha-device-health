from homeassistant.components.sensor import SensorEntity, SensorStateClass
from .native import Aggregate

async def async_setup_entry(hass, entry, async_add_entities):
    async_add_entities([Count(hass, entry, 'offline', 0), Count(hass, entry, 'low_battery', 1)])

class Count(Aggregate, SensorEntity):
    _attr_native_unit_of_measurement = 'devices'
    _attr_state_class = SensorStateClass.MEASUREMENT
    def __init__(self, hass, entry, key, index):
        super().__init__(hass, entry, key)
        self.index = index
    @property
    def native_value(self):
        return self.values()[self.index]
