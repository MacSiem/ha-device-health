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
        return DeviceHealthOptionsFlow()


class DeviceHealthOptionsFlow(OptionsFlow):
    async def async_step_init(self, user_input=None):
        # Resolve the authenticated actor again on submission, not just at flow start.
        user_id = self.context.get("user_id")
        user = await self.hass.auth.async_get_user(user_id) if user_id else None
        if not user or not user.is_active or not user.is_admin:
            return self.async_abort(reason="admin_required")
        if user_input is not None:
            return self.async_create_entry(title="", data={
                **self.config_entry.options,
                CONF_GLOBAL_AGGREGATES: user_input[CONF_GLOBAL_AGGREGATES],
            })
        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema({vol.Required(
                CONF_GLOBAL_AGGREGATES,
                default=self.config_entry.options.get(CONF_GLOBAL_AGGREGATES) is True,
            ): bool}),
        )
