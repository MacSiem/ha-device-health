const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');

function setup() {
  const dom = new JSDOM('', { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
  dom.window.eval(readFileSync(join(__dirname, '..', 'ha-device-health.js'), 'utf8'));
  const card = dom.window.document.createElement('ha-device-health');
  dom.window.document.body.append(card);
  card.setConfig({ title: 'QA devices', show_support: false, offline_alert_minutes: 1 });
  card._registryLoadedAt = Date.now(); card._throttleMs = 0;
  card._entityRegistry = new Map([
    ['binary_sensor.qa_connection', { device_id: 'qa-plug' }],
    ['sensor.qa_battery', { device_id: 'qa-plug' }],
    ['sensor.qa_second_battery', { device_id: 'qa-plug' }]
  ]);
  card._deviceRegistry = new Map([['qa-plug', { id: 'qa-plug', name: 'QA plug' }]]);
  const state = (id, value, attributes) => ({ entity_id: id, state: value, attributes,
    last_changed: '2026-09-27T00:00:00Z', last_updated: '2026-09-27T00:00:00Z' });
  const connection = state('binary_sensor.qa_connection', 'on', { device_class: 'connectivity', ssid: 'QA WiFi', rssi: -60 });
  const hass = { language: 'en', user: { id: 'qa-admin', is_admin: true }, states: { [connection.entity_id]: connection } };
  card.hass = hass;
  return { dom, card, hass, state };
}

test('ordinary connectivity update changes the visible device status without reloading the card', () => {
  const { dom, card, hass } = setup();
  try {
    assert.equal(card.shadowRoot.querySelector('.status-badge').textContent, 'ONLINE');
    const connection = { ...hass.states['binary_sensor.qa_connection'], state: 'off' };
    card.hass = { ...hass, states: { 'binary_sensor.qa_connection': connection } };
    assert.equal(card.shadowRoot.querySelector('.status-badge').textContent, 'OFFLINE');
    assert.equal(card._alerts.some(a => a.type === 'offline'), true);
  } finally { dom.window.close(); }
});

test('ordinary attribute update refreshes network signal and alert with unchanged last_changed', () => {
  const { dom, card, hass } = setup();
  try {
    card._activeTab = 'network'; card._render();
    assert.match(card.shadowRoot.textContent, /-60/);
    const old = hass.states['binary_sensor.qa_connection'];
    const connection = { ...old, last_updated: '2026-09-27T00:01:00Z', attributes: { ...old.attributes, rssi: -92 } };
    card.hass = { ...hass, states: { 'binary_sensor.qa_connection': connection } };
    assert.match(card.shadowRoot.textContent, /-92/);
    assert.equal(card._alerts.some(a => a.type === 'signal_weak'), true);
  } finally { dom.window.close(); }
});

test('a new unlinked entity updates the displayed unlinked count without inflating devices', () => {
  const { dom, card, hass, state } = setup();
  try {
    card.hass = { ...hass, states: { ...hass.states, 'sensor.qa_unrelated': state('sensor.qa_unrelated', '25', {}) } };
    assert.match(card.shadowRoot.textContent, /Entities without a registered device: 1/);
    assert.equal(card._getDevices().length, 1);
  } finally { dom.window.close(); }
});

test('two low battery entities for one physical device produce one worst-severity alert', () => {
  const { dom, card, hass, state } = setup();
  try {
    const attrs = { device_class: 'battery', unit_of_measurement: '%' };
    card.hass = { ...hass, states: { ...hass.states,
      'sensor.qa_battery': state('sensor.qa_battery', '20', attrs),
      'sensor.qa_second_battery': state('sensor.qa_second_battery', '5', attrs)
    } };
    const batteryAlerts = card._alerts.filter(a => a.type.startsWith('battery_'));
    assert.equal(batteryAlerts.length, 1);
    assert.equal(batteryAlerts[0].type, 'battery_critical');
    assert.equal(batteryAlerts[0].id, 'qa-plug');
    assert.equal(batteryAlerts[0].name, 'QA plug');
  } finally { dom.window.close(); }
});

test('continuous alert keeps one history entry while a real recovery and new fault creates another', () => {
  const { dom, card, hass, state } = setup();
  try {
    const low = { ...hass, states: { ...hass.states, 'sensor.qa_battery': state('sensor.qa_battery', '5', { device_class: 'battery', unit_of_measurement: '%' }) } };
    card.hass = low;
    const firstTime = card._alertHistory[0].timestamp;
    card.hass = { ...low, states: { ...low.states, 'sensor.qa_battery': { ...low.states['sensor.qa_battery'], state: '4', last_updated: '2026-09-27T00:02:00Z' } } };
    assert.equal(card._alertHistory.length, 1);
    assert.equal(card._alertHistory[0].timestamp, firstTime);
    card.hass = { ...low, states: { ...low.states, 'sensor.qa_battery': { ...low.states['sensor.qa_battery'], state: '80', last_updated: '2026-09-27T00:03:00Z' } } };
    assert.equal(card._alerts.length, 0);
    card.hass = low;
    assert.equal(card._alertHistory.length, 2);
  } finally { dom.window.close(); }
});
