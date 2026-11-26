"""Guide an administrator through the legacy Dashboard resource migration."""

import voluptuous as vol

from homeassistant.components.repairs import RepairsFlow

from . import frontend


class LegacyCardResourceFlow(RepairsFlow):
    """Check the resource collection after the administrator removes the old copy."""

    async def async_step_init(self, user_input=None):
        errors = {}
        if user_input is not None:
            result = await frontend.async_register_card(self.hass)
            if result == "migration_required":
                errors["base"] = "legacy_resource_remains"
            elif result == "manual_required":
                errors["base"] = "resources_unavailable"
            else:
                return self.async_create_entry(title="", data={})
        return self.async_show_form(step_id="init", data_schema=vol.Schema({}), errors=errors)


async def async_create_fix_flow(hass, issue_id, data):
    """Create the repair flow; HA restricts Repairs to administrators."""
    return LegacyCardResourceFlow()
