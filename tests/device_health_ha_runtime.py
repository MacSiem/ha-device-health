"""Disposable HA runtime scenario. Run in official HA container with /config mounted."""
import asyncio
import contextlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time

import aiohttp

BASE = 'http://127.0.0.1:8123'
CLIENT = BASE + '/'

async def main():
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
                for _ in range(30):
                    states = (await command('get_states'))['result']
                    found = {x['entity_id']: x['state'] for x in states if x['entity_id'].startswith(('sensor.device_health_', 'binary_sensor.device_health_'))}
                    if len(found) == 3:
                        break
                    await asyncio.sleep(1)
                assert len(found) == 3, found
                assert all(value == 'unknown' for value in found.values()), found
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
                print('PASS: config flow, native unknown states, direct WS, policy revision/conflict and reload persistence', flush=True)
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
