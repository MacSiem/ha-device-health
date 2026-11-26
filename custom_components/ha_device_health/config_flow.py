"""Device Health configuration and privacy options."""
import voluptuous as vol

from homeassistant.config_entries import ConfigFlow, OptionsFlow
from .const import CONF_GLOBAL_AGGREGATES, DOMAIN


class DeviceHealthFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input=None):
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()
        return self.async_create_entry(title="Device Health", data={})

    @staticmethod
    def async_get_options_flow(config_entry):
        return DeviceHealthOptionsFlow(config_entry)


class DeviceHealthOptionsFlow(OptionsFlow):
    def __init__(self, config_entry):
        # Use a separate attribute: newer HA exposes a read-only config_entry.
        self._options_entry = config_entry

    async def async_step_init(self, user_input=None):
        # HA's options-flow HTTP endpoints require an authenticated admin on
        # both initiation and submission. HA does not pass an actor in context.
        if user_input is not None:
            return self.async_create_entry(title="", data={
                **self._options_entry.options,
                CONF_GLOBAL_AGGREGATES: user_input[CONF_GLOBAL_AGGREGATES],
            })
        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema({vol.Required(
                CONF_GLOBAL_AGGREGATES,
                default=self._options_entry.options.get(CONF_GLOBAL_AGGREGATES) is True,
            ): bool}),
        )
