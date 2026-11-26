from homeassistant.config_entries import ConfigFlow

class Flow(ConfigFlow, domain='device_health_fixture'):
    async def async_step_user(self, user_input=None):
        return self.async_create_entry(title='QA fixture', data={})
