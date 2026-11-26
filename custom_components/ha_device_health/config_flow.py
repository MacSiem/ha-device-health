"""One zero-configuration Device Health instance."""
from homeassistant.config_entries import ConfigFlow
from .const import DOMAIN

class DeviceHealthFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input=None):
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()
        return self.async_create_entry(title="Device Health", data={})
