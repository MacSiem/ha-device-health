"""Disposable test fixture. Never install outside isolated QA."""
import json
from pathlib import Path
from homeassistant.auth.const import GROUP_ID_USER
from homeassistant.auth.models import Group
from homeassistant.helpers import device_registry as dr, entity_registry as er

async def async_setup_entry(hass, entry):
    device = dr.async_get(hass).async_get_or_create(config_entry_id=entry.entry_id, identifiers={('device_health_fixture', 'one')}, name='QA device')
    registry = er.async_get(hass)
    link = registry.async_get_or_create('binary_sensor', 'device_health_fixture', 'link', config_entry=entry, device_id=device.id, suggested_object_id='qa_link')
    battery = registry.async_get_or_create('sensor', 'device_health_fixture', 'battery', config_entry=entry, device_id=device.id, suggested_object_id='qa_battery')
    hass.states.async_set(link.entity_id, 'on', {'device_class': 'connectivity'})
    hass.states.async_set(battery.entity_id, '75', {'device_class': 'battery', 'unit_of_measurement': '%'})
    ordinary = await hass.auth.async_create_user('QA ordinary', group_ids=[GROUP_ID_USER])
    restricted = await hass.auth.async_create_user('QA restricted')
    restricted.groups = [Group(name='QA limited', policy={'entities': {'entity_ids': {link.entity_id: {'read': True}}}})]
    result = {'link': link.entity_id, 'battery': battery.entity_id}
    for name, user in [('ordinary', ordinary), ('restricted', restricted)]:
        token = await hass.auth.async_create_refresh_token(user, client_id='http://127.0.0.1:8123/')
        result[name] = hass.auth.async_create_access_token(token)
        result[name + '_id'] = user.id
    await hass.async_add_executor_job(Path(hass.config.path('qa_fixture.json')).write_text, json.dumps(result))
    return True
