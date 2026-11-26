"""Device Health lifecycle."""
import logging

from homeassistant.const import EVENT_STATE_CHANGED
from homeassistant.core import callback
from homeassistant.helpers import device_registry as dr, entity_registry as er
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.storage import Store
from .const import CONF_GLOBAL_AGGREGATES, DOMAIN, SIGNAL
from . import frontend, websocket_api

PLATFORMS = ["sensor", "binary_sensor"]
_LOGGER = logging.getLogger(__name__)

async def async_setup(hass, config):
    hass.data.setdefault(DOMAIN, {})
    websocket_api.register(hass)
    return True

async def async_setup_entry(hass, entry):
    await frontend.async_register_static(hass)
    await frontend.async_register_card(hass)
    store = Store(hass, 1, f"{DOMAIN}.{entry.entry_id}.access", private=True, atomic_writes=True)
    hass.data[DOMAIN][entry.entry_id] = {"store": store}
    @callback
    def changed(event):
        if event.event_type == EVENT_STATE_CHANGED:
            entity_id = event.data.get("entity_id", "")
            registry_entry = er.async_get(hass).async_get(entity_id)
            if registry_entry and registry_entry.config_entry_id == entry.entry_id:
                return
        async_dispatcher_send(hass, SIGNAL)
    for event in (EVENT_STATE_CHANGED, dr.EVENT_DEVICE_REGISTRY_UPDATED, er.EVENT_ENTITY_REGISTRY_UPDATED):
        entry.async_on_unload(hass.bus.async_listen(event, changed))
    entry.async_on_unload(entry.add_update_listener(_async_options_updated))
    hass.data[DOMAIN][entry.entry_id]["platforms_loaded"] = entry.options.get(CONF_GLOBAL_AGGREGATES) is True
    if hass.data[DOMAIN][entry.entry_id]["platforms_loaded"]:
        await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    else:
        # Clear any current states left by an older release; retain registry IDs
        # and Recorder history so a later opt-in uses the same unique IDs.
        for entity in er.async_entries_for_config_entry(er.async_get(hass), entry.entry_id):
            if entity.platform == DOMAIN and entity.unique_id in {
                f"{entry.entry_id}_offline", f"{entry.entry_id}_low_battery",
                f"{entry.entry_id}_problem",
            }:
                hass.states.async_remove(entity.entity_id)
    async_dispatcher_send(hass, websocket_api.ACCESS_SIGNAL)
    return True

async def _async_options_updated(hass, entry):
    await hass.config_entries.async_reload(entry.entry_id)

async def async_unload_entry(hass, entry):
    if hass.data[DOMAIN].get(entry.entry_id, {}).get("platforms_loaded") and not await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        return False
    try:
        await frontend.async_unregister_card(hass)
    except Exception:
        _LOGGER.warning("Device Health resource cleanup deferred until the next setup", exc_info=True)
    data = hass.data[DOMAIN].get(entry.entry_id)
    if data and 'lock' in data:
        async with data['lock']:
            hass.data[DOMAIN].pop(entry.entry_id, None)
    else:
        hass.data[DOMAIN].pop(entry.entry_id, None)
    async_dispatcher_send(hass, websocket_api.ACCESS_SIGNAL)
    return True

async def async_remove_entry(hass, entry):
    await Store(hass, 1, f"{DOMAIN}.{entry.entry_id}.access", private=True, atomic_writes=True).async_remove()
