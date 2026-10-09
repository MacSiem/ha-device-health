const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');

const before = '2026-09-27T00:00:00Z';
const later = '2026-09-27T00:01:00Z';
const state = (entity_id, value, attributes = {}, last_changed = before) =>
  ({ entity_id, state: value, attributes, last_changed, last_updated: last_changed });
function setup(states) {
  const dom = new JSDOM('', { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
  dom.window.eval(readFileSync(join(__dirname, '..', 'ha-device-health.js'), 'utf8'));
  const card = dom.window.document.createElement('ha-device-health');
  card.setConfig({ show_support: false, offline_alert_minutes: 0 });
  dom.window.document.body.append(card);
  card._registryStatus = 'ready'; card._registryLoadedAt = Date.now(); card._throttleMs = 0;
  card._deviceRegistry = new Map([['qa', { id: 'qa', name: 'QA router' }]]);
  card._entityRegistry = new Map(states.map(s => [s.entity_id, { device_id: 'qa' }]));
  const hass = { language: 'en', user: { id: 'qa-admin', is_admin: true }, states: Object.fromEntries(states.map(s => [s.entity_id, s])) };
  card.hass = hass;
  return { dom, card, hass, update: next => { card.hass = { ...hass, states: Object.fromEntries(next.map(s => [s.entity_id, s])) }; } };
}

test('router disconnect updates visible status, starts a physical incident and recovers on home', () => {
  const tracker = state('device_tracker.qa_router', 'not_home', { source_type: 'router' });
  const { dom, card, update } = setup([tracker]);
  try {
    assert.equal(card._getDevices()[0].status, 'offline');
    assert.equal(card._getDevices()[0].offlineSince, before);
    assert.equal(card.shadowRoot.querySelector('.status-badge').textContent, 'OFFLINE');
    assert.equal(card._alerts.some(a => a.type === 'offline'), true);
    update([{ ...tracker, state: 'home' }]);
    assert.equal(card.shadowRoot.querySelector('.status-badge').textContent, 'ONLINE');
    assert.equal(card._getDevices()[0].offlineSince, null);
    assert.equal(card._alerts.some(a => a.type === 'offline'), false);
  } finally { dom.window.close(); }
});

test('GPS absence and ordinary switch off do not indicate disconnection', () => {
  const { dom, card } = setup([state('device_tracker.qa_gps', 'not_home', { source_type: 'gps' }), state('switch.qa', 'off')]);
  try { assert.equal(card._getDevices()[0].status, 'online'); assert.equal(card._alerts.length, 0); }
  finally { dom.window.close(); }
});

test('connection trackers support current tracking_type and do not invent a timestamp', () => {
  const { dom, card } = setup([state('device_tracker.qa', 'not_home', { tracking_type: 'connection' }, 'invalid')]);
  try { assert.equal(card._getDevices()[0].status, 'offline'); assert.equal(card._getDevices()[0].offlineSince, null); assert.equal(card._alerts.length, 0); }
  finally { dom.window.close(); }
});

test('positive physical connection wins conflicting evidence; all disconnected links use the last drop', () => {
  const tracker = state('device_tracker.qa', 'not_home', { source_type: 'router' });
  const connectivity = state('binary_sensor.qa_connection', 'on', { device_class: 'connectivity' }, later);
  const { dom, card, update } = setup([tracker, connectivity]);
  try {
    assert.equal(card._getDevices()[0].status, 'online'); assert.equal(card._getDevices()[0].offlineSince, null);
    update([{ ...tracker, state: 'home' }, { ...connectivity, state: 'off' }]);
    assert.equal(card._getDevices()[0].status, 'online');
    update([tracker, { ...connectivity, state: 'off' }]);
    assert.equal(card._getDevices()[0].status, 'offline'); assert.equal(card._getDevices()[0].offlineSince, later);
  } finally { dom.window.close(); }
});

test('unknown and unavailable router states preserve honest health without false offline alerts', () => {
  for (const value of ['unknown', 'unavailable']) {
    const { dom, card } = setup([state('device_tracker.qa', value, { source_type: 'router' })]);
    try { assert.equal(card._getDevices()[0].status, 'unavailable'); assert.equal(card._getDevices()[0].offlineSince, null); assert.equal(card._alerts.some(a => a.type === 'offline'), false); }
    finally { dom.window.close(); }
  }
});

test('damaged first signal never hides a valid sibling reading in either entity order', () => {
  for (const broken of ['unavailable', 'unknown', 'invalid', '', ' ', null, true, [], {}]) {
    for (const reverse of [false, true]) {
      const readings = [state('sensor.qa_signal_bad', broken, { ssid: 'QA', rssi: -95 }), state('sensor.qa_rssi_good', '-60')];
      const { dom, card } = setup(reverse ? readings.reverse() : readings);
      try { assert.equal(card._getNetworkDevices().WiFi[0].rssi, -60, String(broken)); assert.equal(card._alerts.some(a => a.type === 'signal_weak'), false); }
      finally { dom.window.close(); }
    }
  }
});

test('attribute fallback produces a visible weak signal and ordinary attribute recovery clears the alert', () => {
  const signal = state('sensor.qa_signal', 'unavailable', { ssid: 'QA' });
  const source = state('sensor.qa_router', 'online', { rssi: 'invalid', signal_strength: '-95' });
  const { dom, card, update } = setup([signal, source]);
  try {
    card.setActiveTab('network');
    assert.equal(card._getNetworkDevices().WiFi[0].rssi, -95);
    assert.equal(card.shadowRoot.textContent.includes('-95 dBm'), true);
    assert.equal(card._alerts.some(a => a.type === 'signal_weak'), true);
    update([signal, { ...source, attributes: { ...source.attributes, signal_strength: -55 } }]);
    assert.equal(card.shadowRoot.textContent.includes('-55 dBm'), true);
    assert.equal(card._alerts.some(a => a.type === 'signal_weak'), false);
  } finally { dom.window.close(); }
});

test('invalid RSSI scalars yield unknown, never fabricated zero or a weak signal', () => {
  for (const value of [null, undefined, '', ' ', true, false, [], [-95], {}, 'unknown', 'unavailable', 'invalid', Infinity, 0, 55]) {
    const { dom, card } = setup([state('sensor.qa_signal', 'unavailable', { ssid: 'QA', rssi: value, signal_strength: value })]);
    try { assert.equal(card._getNetworkDevices().WiFi[0].rssi, null, String(value)); assert.equal(card._alerts.some(a => a.type === 'signal_weak'), false); }
    finally { dom.window.close(); }
  }
});
