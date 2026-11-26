"""Policy API. The existing dashboard remains the resource authority for its data."""
import asyncio
import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect, async_dispatcher_send
from .const import DOMAIN

ACCESS_SIGNAL = f"{DOMAIN}_access_changed"
from .feature_access import default_feature_access, effective_feature_capabilities, validate_feature_access

async def actor(hass, connection):
    uid = getattr(getattr(connection, 'user', None), 'id', None)
    user = await hass.auth.async_get_user(uid) if uid else None
    if not user or not user.is_active:
        raise PermissionError('unauthorized')
    return user

async def read_policy(data):
    raw = await data['store'].async_load()
    if raw is None:
        return {'policy': default_feature_access(), 'revision': 0}
    if (type(raw) is not dict or set(raw) != {'policy', 'revision'} or type(raw['revision']) is not int or raw['revision'] < 0):
        raise ValueError('invalid_policy')
    return {'policy': validate_feature_access(raw['policy']), 'revision': raw['revision']}

def entry_data(hass, entry_id):
    data = hass.data[DOMAIN][entry_id]
    if 'lock' not in data:
        data['lock'] = asyncio.Lock()
    return data

async def access_snapshot(hass, connection):
    """Project only current actor capabilities; no policy or user IDs escape."""
    user = await actor(hass, connection)
    entries = hass.data[DOMAIN]
    if not entries:
        return {'status': 'absent', 'revision': None, 'features': {}, 'can_manage': user.is_admin}
    if len(entries) != 1:
        raise ValueError('ambiguous_entries')
    entry_id, data = next(iter(entries.items()))
    data = entry_data(hass, entry_id)
    async with data['lock']:
        policy = await read_policy(data)
        user = await actor(hass, connection)
        if hass.data[DOMAIN].get(entry_id) is not data:
            raise PermissionError('entry_unloaded')
        features = effective_feature_capabilities(policy['policy'], user_id=user.id,
            is_active=user.is_active, is_admin=user.is_admin)
        for ops in features.values():
            for operation in ops:
                native = 'control' if operation == 'execute' else 'read'
                ops[operation] = ops[operation] and user.permissions.access_all_entities(native)
        result = {'status': 'active', 'revision': policy['revision'], 'features': features, 'can_manage': user.is_admin}
        if user.is_admin:
            result['entry_id'] = entry_id
        return result

@websocket_api.websocket_command({vol.Required('type'): f'{DOMAIN}/access'})
@websocket_api.async_response
async def access(hass, connection, msg):
    try:
        connection.send_result(msg['id'], await access_snapshot(hass, connection))
    except (PermissionError, ValueError, KeyError):
        connection.send_error(msg['id'], 'unauthorized', 'Access denied or invalid configuration')

@websocket_api.websocket_command({vol.Required('type'): f'{DOMAIN}/access/subscribe'})
@websocket_api.async_response
async def subscribe_access(hass, connection, msg):
    try:
        await actor(hass, connection)
    except PermissionError:
        connection.send_error(msg['id'], 'unauthorized', 'Access denied')
        return
    subscription_id = msg['id']
    async def forward():
        try:
            await actor(hass, connection)
            if subscription_id in connection.subscriptions:
                connection.send_event(subscription_id, {'changed': True})
        except PermissionError:
            return
    @callback
    def changed():
        hass.async_create_task(forward())
    connection.subscriptions[subscription_id] = async_dispatcher_connect(hass, ACCESS_SIGNAL, changed)
    connection.send_result(subscription_id)

@websocket_api.websocket_command({vol.Required('type'): f'{DOMAIN}/capabilities', vol.Required('entry_id'): str})
@websocket_api.async_response
async def capabilities(hass, connection, msg):
    try:
        data = entry_data(hass, msg['entry_id'])
        async with data['lock']:
            policy = await read_policy(data)
            user = await actor(hass, connection)
            if hass.data[DOMAIN].get(msg['entry_id']) is not data:
                raise PermissionError('entry_unloaded')
            caps = effective_feature_capabilities(policy['policy'], user_id=user.id, is_active=user.is_active, is_admin=user.is_admin)
            # A global aggregate requires all-entity access, not just one permitted entity.
            for ops in caps.values():
                for operation in ops:
                    native = 'control' if operation == 'execute' else 'read'
                    ops[operation] = ops[operation] and user.permissions.access_all_entities(native)
            connection.send_result(msg['id'], {'revision': policy['revision'], 'features': caps, 'can_manage': user.is_admin})
    except (PermissionError, ValueError, KeyError):
        connection.send_error(msg['id'], 'unauthorized', 'Access denied or invalid configuration')

@websocket_api.websocket_command({vol.Required('type'): f'{DOMAIN}/policy/get', vol.Required('entry_id'): str})
@websocket_api.async_response
async def get_policy(hass, connection, msg):
    try:
        data = entry_data(hass, msg['entry_id'])
        async with data['lock']:
            result = await read_policy(data)
            if not (await actor(hass, connection)).is_admin or hass.data[DOMAIN].get(msg['entry_id']) is not data:
                raise PermissionError()
            connection.send_result(msg['id'], result)
    except (PermissionError, ValueError, KeyError):
        connection.send_error(msg['id'], 'unauthorized', 'Access denied or invalid configuration')

@websocket_api.websocket_command({vol.Required('type'): f'{DOMAIN}/policy/set', vol.Required('entry_id'): str, vol.Required('policy'): dict, vol.Required('revision'): vol.All(int, vol.Range(min=0))})
@websocket_api.async_response
async def set_policy(hass, connection, msg):
    try:
        policy = validate_feature_access(msg['policy'])
        data = entry_data(hass, msg['entry_id'])
        async with data['lock']:
            current = await read_policy(data)
            if not (await actor(hass, connection)).is_admin or hass.data[DOMAIN].get(msg['entry_id']) is not data:
                raise PermissionError()
            if current['revision'] != msg['revision']:
                connection.send_error(msg['id'], 'conflict', 'Policy has changed')
                return
            result = {'policy': policy, 'revision': current['revision'] + 1}
            await data['store'].async_save(result)
            async_dispatcher_send(hass, ACCESS_SIGNAL)
            connection.send_result(msg['id'], {'revision': result['revision']})
    except (PermissionError, ValueError, KeyError):
        connection.send_error(msg['id'], 'unauthorized', 'Access denied or invalid configuration')

def register(hass):
    for command in (access, subscribe_access, capabilities, get_policy, set_policy):
        websocket_api.async_register_command(hass, command)
