const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');

test('940 unrelated sensors never inflate Wi-Fi or turn BLE into Wi-Fi', () => {
  const dom = new JSDOM('', { runScripts: 'dangerously', url: 'http://localhost/' });
  try {
    dom.window.eval(readFileSync(join(__dirname, '..', 'ha-device-health.js'), 'utf8'));
    const card = dom.window.document.createElement('ha-device-health');
    const states = {};
    for (let i = 0; i < 940; i++) {
      states[`sensor.unrelated_${i}`] = {
        entity_id: `sensor.unrelated_${i}`, state: String(i), last_changed: '2026-09-27T00:00:00Z',
        attributes: { ip: `192.0.2.${i % 250}` },
      };
    }
    states['sensor.wifi_signal'] = { entity_id: 'sensor.wifi_signal', state: '-61', last_changed: 'now', attributes: { friendly_name: 'Router RSSI', ssid: 'Home' } };
    states['device_tracker.ble_tag'] = { entity_id: 'device_tracker.ble_tag', state: 'home', last_changed: 'now', attributes: { source_type: 'bluetooth_le' } };
    states['device_tracker.unknown'] = { entity_id: 'device_tracker.unknown', state: 'home', last_changed: 'now', attributes: { source_type: 'router' } };
    card._hass = { states };
    card._entityRegistry = new Map([
      ['sensor.wifi_signal', { device_id: 'wifi1' }],
      ['device_tracker.ble_tag', { device_id: 'ble1' }],
      ['device_tracker.unknown', { device_id: 'unknown1' }],
    ]);
    card._deviceRegistry = new Map([
      ['wifi1', { id: 'wifi1', name: 'Router', connections: [['mac', '00:11:22:33:44:55']] }],
      ['ble1', { id: 'ble1', name: 'BLE Tag', connections: [['bluetooth', 'AA:BB:CC:DD:EE:FF']] }],
      ['unknown1', { id: 'unknown1', name: 'Unknown Tracker', connections: [['mac', '11:22:33:44:55:66']] }],
    ]);

    const networks = card._getNetworkDevices();
    assert.deepEqual(Array.from(networks.WiFi || [], item => item.id), ['wifi1']);
    assert.deepEqual(Array.from(networks.BLE || [], item => item.id), ['ble1']);
    assert.deepEqual(Array.from(networks.Other || [], item => item.id), ['unknown1']);
    assert.equal(card._getDevices().length, 3);
    assert.equal(card._unlinkedEntityCount(), 940);
  } finally { dom.window.close(); }
});

test('registry device without entity state is unknown, not failed health', () => {
  const dom = new JSDOM('', { runScripts: 'dangerously', url: 'http://localhost/' });
  try {
    dom.window.eval(readFileSync(join(__dirname, '..', 'ha-device-health.js'), 'utf8'));
    const card = dom.window.document.createElement('ha-device-health');
    card._hass = { states: {} };
    card._deviceRegistry = new Map([['orphan', { id: 'orphan', name: 'No states yet' }]]);
    assert.equal(card._getDevices()[0].status, 'unknown');
  } finally { dom.window.close(); }
});

test('an explicit connectivity failure, not ordinary switch off, marks a device offline', () => {
  const dom = new JSDOM('', { runScripts: 'dangerously', url: 'http://localhost/' });
  try {
    dom.window.eval(readFileSync(join(__dirname, '..', 'ha-device-health.js'), 'utf8'));
    const card = dom.window.document.createElement('ha-device-health');
    card._hass = { states: {
      'switch.plug': { entity_id: 'switch.plug', state: 'off', last_changed: 'now', attributes: {} },
      'binary_sensor.plug_connection': { entity_id: 'binary_sensor.plug_connection', state: 'off', last_changed: 'now', attributes: { device_class: 'connectivity' } },
    } };
    card._entityRegistry = new Map([
      ['switch.plug', { device_id: 'plug' }],
      ['binary_sensor.plug_connection', { device_id: 'plug' }],
    ]);
    card._deviceRegistry = new Map([['plug', { id: 'plug', name: 'Plug' }]]);
    assert.equal(card._getDevices()[0].status, 'offline');
  } finally { dom.window.close(); }
});
