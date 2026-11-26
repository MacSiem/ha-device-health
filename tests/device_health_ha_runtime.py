"""Disposable HA runtime scenario. Run in official HA container with /config mounted."""
import asyncio
import contextlib
import json
import os
import shutil
from pathlib import Path
import subprocess
import sys
import time

import aiohttp

BASE = 'http://127.0.0.1:8123'
CLIENT = BASE + '/'

async def main():
    shutil.copytree('/source/integration', '/config/custom_components/ha_device_health')
    shutil.copytree('/source/fixture', '/config/custom_components/device_health_fixture')
    Path('/config/configuration.yaml').write_text('default_config:\nlogger:\n  default: warning\n')
    process = subprocess.Popen([sys.executable, '-m', 'homeassistant', '--config', '/config'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        async with aiohttp.ClientSession() as session:
            for _ in range(180):
                if process.poll() is not None:
                    raise RuntimeError('Home Assistant stopped during startup')
                try:
                    async with session.get(BASE + '/api/onboarding') as response:
                        if response.status == 200:
                            break
                except aiohttp.ClientError:
                    pass
                await asyncio.sleep(1)
            else:
                raise RuntimeError('Home Assistant startup timed out')
            async def request(method, path, *, expected=200, **kwargs):
                async with session.request(method, BASE + path, **kwargs) as resp:
                    text = await resp.text()
                    if resp.status != expected:
                        raise AssertionError(f'{method} {path}: {resp.status} {text[:500]}')
                    return json.loads(text) if text else None
            user = await request('POST', '/api/onboarding/users', json={'client_id': CLIENT, 'name': 'QA', 'username': 'deviceqa', 'password': 'throwaway-local-only', 'language': 'en'})
            token = await request('POST', '/auth/token', data={'grant_type': 'authorization_code', 'code': user['auth_code'], 'client_id': CLIENT})
            headers = {'Authorization': 'Bearer ' + token['access_token']}
            flow = await request('POST', '/api/config/config_entries/flow', json={'handler': 'ha_device_health', 'show_advanced_options': True}, headers=headers)
            assert flow['type'] == 'create_entry', flow
            entry_id = flow['result']['entry_id']
            async def set_global(enabled):
                options = await request('POST', '/api/config/config_entries/options/flow', json={'handler': entry_id}, headers=headers)
                assert options['type'] == 'form', options
                result = await request('POST', f"/api/config/config_entries/options/flow/{options['flow_id']}", json={'global_aggregates': enabled}, headers=headers)
                assert result['type'] == 'create_entry', result
            states = await request('GET', '/api/states', headers=headers)
            assert not any(x['entity_id'].startswith(('sensor.device_health_', 'binary_sensor.device_health_')) for x in states)
            await set_global(True)
            async with session.ws_connect(BASE + '/api/websocket') as ws:
                await ws.receive_json()
                await ws.send_json({'type': 'auth', 'access_token': token['access_token']})
                assert (await ws.receive_json())['type'] == 'auth_ok'
                sequence = 0
                async def command(kind, **payload):
                    nonlocal sequence
                    sequence += 1
                    await ws.send_json({'id': sequence, 'type': kind, **payload})
                    while True:
                        result = await ws.receive_json()
                        if result.get('id') == sequence:
                            return result
                # Options saves schedule a reload; wait for the new setup to
                # complete before inspecting its resource on older HA versions.
                for _ in range(30):
                    resources = await command('lovelace/resources/list')
                    assert resources['success'], resources
                    owned_resources = [item for item in resources['result'] if 'ha-device-health.js' in item['url']]
                    if len(owned_resources) == 1 and owned_resources[0]['url'].startswith('/ha_device_health/'):
                        break
                    await asyncio.sleep(1)
                assert len(owned_resources) == 1 and owned_resources[0]['url'].startswith('/ha_device_health/'), resources
                async with session.get(BASE + owned_resources[0]['url']) as response:
                    assert response.status == 200, response.status
                    served = await response.read()
                assert served == Path('/source/integration/www/ha-device-health.js').read_bytes()
                for _ in range(30):
                    states = (await command('get_states'))['result']
                    found = {x['entity_id']: x['state'] for x in states if x['entity_id'].startswith(('sensor.device_health_', 'binary_sensor.device_health_'))}
                    if len(found) == 3:
                        break
                    await asyncio.sleep(1)
                assert len(found) == 3, found
                assert all(value == 'unknown' for value in found.values()), found
                original_ids = set(found)
                await set_global(False)
                for _ in range(30):
                    states = (await command('get_states'))['result']
                    if not original_ids.intersection(x['entity_id'] for x in states):
                        break
                    await asyncio.sleep(1)
                assert not original_ids.intersection(x['entity_id'] for x in states)
                await set_global(True)
                for _ in range(30):
                    states = (await command('get_states'))['result']
                    if original_ids.issubset(x['entity_id'] for x in states):
                        break
                    await asyncio.sleep(1)
                assert original_ids.issubset(x['entity_id'] for x in states)
                access = await command('ha_device_health/access')
                assert access['success'] and access['result']['entry_id'] == entry_id and access['result']['status'] == 'active', access
                caps = await command('ha_device_health/capabilities', entry_id=entry_id)
                assert caps['success'] and caps['result']['can_manage'], caps
                get = await command('ha_device_health/policy/get', entry_id=entry_id)
                assert get['success'] and get['result']['revision'] == 0, get
                policy = {'schema': 1, 'features': {'diagnostics': {'read': {'mode': 'admin'}}}}
                put = await command('ha_device_health/policy/set', entry_id=entry_id, policy=policy, revision=0)
                assert put['success'] and put['result']['revision'] == 1, put
                conflict = await command('ha_device_health/policy/set', entry_id=entry_id, policy=policy, revision=0)
                assert not conflict['success'] and conflict['error']['code'] == 'conflict', conflict
                await request('POST', f'/api/config/config_entries/entry/{entry_id}/reload', headers=headers)
                get = await command('ha_device_health/policy/get', entry_id=entry_id)
                assert get['success'] and get['result']['policy'] == policy and get['result']['revision'] == 1, get
                resources = await command('lovelace/resources/list')
                ours = [item for item in resources['result'] if 'ha-device-health.js' in item['url']]
                assert len(ours) == 1, resources
                edited = await command('lovelace/resources/update', resource_id=ours[0]['id'], url='/local/community/ha-device-health/ha-device-health.js', res_type='module')
                assert edited['success'], edited
                await request('POST', f'/api/config/config_entries/entry/{entry_id}/reload', headers=headers)
                resources = await command('lovelace/resources/list')
                ours = [item for item in resources['result'] if 'ha-device-health.js' in item['url']]
                assert len(ours) == 1 and ours[0]['url'] == '/local/community/ha-device-health/ha-device-health.js', resources

                fixture = await request('POST', '/api/config/config_entries/flow', json={'handler': 'device_health_fixture'}, headers=headers)
                assert fixture['type'] == 'create_entry', fixture
                for _ in range(10):
                    if Path('/config/qa_fixture.json').exists():
                        break
                    await asyncio.sleep(1)
                fixture_data = json.loads(Path('/config/qa_fixture.json').read_text())
                async def aggregates(expected):
                    for _ in range(20):
                        states = (await command('get_states'))['result']
                        found = {x['entity_id']: x['state'] for x in states if x['entity_id'].startswith(('sensor.device_health_', 'binary_sensor.device_health_'))}
                        if sorted(found.values()) == sorted(expected):
                            return
                        await asyncio.sleep(.25)
                    raise AssertionError(f'aggregate states: {found} expected {expected}')
                await aggregates(['0', '0', 'off'])
                await request('POST', '/api/states/' + fixture_data['link'], headers=headers, json={'state': 'off', 'attributes': {'device_class': 'connectivity'}}, expected=200)
                await request('POST', '/api/states/' + fixture_data['battery'], headers=headers, json={'state': '10', 'attributes': {'device_class': 'battery', 'unit_of_measurement': '%'}}, expected=200)
                await aggregates(['1', '1', 'on'])
                async def role(token_name):
                    child = await session.ws_connect(BASE + '/api/websocket')
                    await child.receive_json()
                    await child.send_json({'type': 'auth', 'access_token': fixture_data[token_name]})
                    assert (await child.receive_json())['type'] == 'auth_ok'
                    return child
                async def child_command(child, msg):
                    await child.send_json(msg)
                    while True:
                        result = await child.receive_json()
                        if result.get('id') == msg['id']:
                            return result
                async with contextlib.AsyncExitStack() as stack:
                    ordinary = await role('ordinary')
                    stack.push_async_callback(ordinary.close)
                    restricted = await role('restricted')
                    stack.push_async_callback(restricted.close)
                    ordinary_access = await child_command(ordinary, {'id': 1, 'type': 'ha_device_health/access'})
                    assert ordinary_access['success'] and ordinary_access['result']['features']['diagnostics']['read'] is False and 'entry_id' not in ordinary_access['result'], ordinary_access
                    restricted_access = await child_command(restricted, {'id': 1, 'type': 'ha_device_health/access'})
                    assert restricted_access['success'] and restricted_access['result']['features']['diagnostics']['read'] is False, restricted_access
                    for child in (ordinary, restricted):
                        denied = await child_command(child, {'id': 2, 'type': 'ha_device_health/policy/get', 'entry_id': entry_id})
                        assert not denied['success'], denied
                        denied = await child_command(child, {'id': 3, 'type': 'ha_device_health/policy/set', 'entry_id': entry_id, 'policy': policy, 'revision': 1})
                        assert not denied['success'], denied
                    normal = await child_command(ordinary, {'id': 4, 'type': 'ha_device_health/access/subscribe'})
                    assert normal['success'], normal
                    default = {'schema': 1, 'features': {}}
                    update = await command('ha_device_health/policy/set', entry_id=entry_id, policy=default, revision=1)
                    assert update['success'], update
                    event = await asyncio.wait_for(ordinary.receive_json(), 5)
                    assert event == {'id': 4, 'type': 'event', 'event': {'changed': True}}, event
                    allowed = await child_command(ordinary, {'id': 5, 'type': 'ha_device_health/access'})
                    assert allowed['success'] and allowed['result']['features']['diagnostics']['read'] is True, allowed
                    denied = await child_command(restricted, {'id': 4, 'type': 'ha_device_health/access'})
                    assert denied['success'] and denied['result']['features']['diagnostics']['read'] is False, denied
                    states = await child_command(restricted, {'id': 5, 'type': 'get_states'})
                    restricted_ids = {state['entity_id'] for state in states['result']}
                    assert fixture_data['link'] in restricted_ids and fixture_data['battery'] not in restricted_ids, restricted_ids
                    revoke = await command('ha_device_health/policy/set', entry_id=entry_id, policy=policy, revision=2)
                    assert revoke['success'], revoke
                    event = await asyncio.wait_for(ordinary.receive_json(), 5)
                    assert event['event'] == {'changed': True}, event
                    revoked = await child_command(ordinary, {'id': 6, 'type': 'ha_device_health/access'})
                    assert revoked['result']['features']['diagnostics']['read'] is False, revoked
                print('PASS: config, native unknown/zero/positive, admin/ordinary/restricted WS, native entity filter, denial, subscription, revoke, revision/conflict and reload', flush=True)
    finally:
        process.terminate()
        try:
            process.wait(timeout=20)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
        log = Path('/config/home-assistant.log')
        if log.exists():
            lines = [line for line in log.read_text(errors='replace').splitlines() if 'ha_device_health' in line or 'Traceback' in line]
            if lines:
                print('HA relevant log:', '\n'.join(lines[-20:]), flush=True)

asyncio.run(main())
