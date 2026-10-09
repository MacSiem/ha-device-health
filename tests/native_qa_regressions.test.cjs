const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');

function setup() {
  const dom = new JSDOM('', { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
  dom.window.eval(readFileSync(join(__dirname, '..', 'ha-device-health.js'), 'utf8'));
  const card = dom.window.document.createElement('ha-device-health');
  card.setConfig({ show_support: false }); dom.window.document.body.append(card);
  const state = value => ({ state: value, attributes: { device_class: 'battery', unit_of_measurement: '%' } });
  const hass = { language: 'en', user: { id: 'qa-admin', is_admin: true }, connection: {}, states: {
    'sensor.qa_battery_primary': { entity_id: 'sensor.qa_battery_primary', ...state('10.9') },
    'sensor.qa_battery_secondary': { entity_id: 'sensor.qa_battery_secondary', ...state('30') },
    'switch.qa_plug': { entity_id: 'switch.qa_plug', state: 'on', attributes: {} }
  } };
  return { dom, card, hass };
}
const records = type => type === 'config/device_registry/list' ? [{ id: 'qa-device', name: 'QA device' }]
  : ['primary', 'secondary'].map(suffix => ({ entity_id: 'sensor.qa_battery_' + suffix, device_id: 'qa-device' }));
function preview(card, hass) {
  card.hass = hass; card.setActiveTab('alerts');
  card.shadowRoot.querySelector('.background-alerts-generate').click();
}
function key(dom, el, value, shiftKey = false) {
  const event = new dom.window.KeyboardEvent('keydown', { key: value, shiftKey, bubbles: true, cancelable: true });
  el.dispatchEvent(event); return event;
}

test('delayed initial registry read records only one physical battery incident, with no transient entity history', async () => {
  const { dom, card, hass } = setup(); const finish = [];
  hass.callWS = ({ type }) => new Promise(resolve => finish.push(() => resolve(records(type))));
  try {
    card.hass = hass; const pending = card._registryLoading; await Promise.resolve();
    assert.equal(card._alertHistory.length, 0, 'identity is unknown until both registries arrive');
    for (const resolve of finish) resolve(); await pending;
    assert.equal(card._alertHistory.length, 1); assert.equal(card._alertHistory[0].id, 'qa-device');
    const timestamp = card._alertHistory[0].timestamp;
    card._acknowledgedAlerts.add('battery_warning_qa-device');
    card.hass = { ...hass, states: { ...hass.states, 'sensor.qa_battery_primary': { ...hass.states['sensor.qa_battery_primary'], state: '11' } } };
    card._generateAlerts();
    assert.equal(card._alerts.length, 0); assert.equal(card._alertHistory.length, 1);
    assert.equal(card._alertHistory[0].timestamp, timestamp);
  } finally { for (const resolve of finish) resolve(); dom.window.close(); }
});

test('failed initial registry read creates no false unlinked history, then successful empty registry permits real independent readings', async () => {
  const { dom, card, hass } = setup(); let failed = true;
  hass.callWS = async () => { if (failed) throw Error('QA registry failure'); return []; };
  try {
    card.hass = hass; await card._registryLoading;
    assert.equal(card._alertHistory.length, 0, 'failed lookup cannot establish independent identity');
    failed = false; await card._loadRegistries(true);
    assert.equal(card._alertHistory.length, 2);
    assert.deepEqual(Array.from(card._alertHistory, a => a.id).sort(), ['sensor.qa_battery_primary', 'sensor.qa_battery_secondary']);
  } finally { dom.window.close(); }
});

test('automation preview focuses its cancel action and cancellation returns focus to the generator', () => {
  const { dom, card, hass } = setup();
  try {
    preview(card, hass);
    assert.equal(card.shadowRoot.activeElement, card.shadowRoot.querySelector('.automation-dialog-cancel'));
    card.shadowRoot.querySelector('.automation-dialog-cancel').click();
    assert.equal(card.shadowRoot.querySelector('.automation-dialog'), null);
    assert.equal(card.shadowRoot.activeElement, card.shadowRoot.querySelector('.background-alerts-generate'));
  } finally { dom.window.close(); }
});

test('automation modal wraps Tab at both ends and Escape closes it without reaching background controls', () => {
  const { dom, card, hass } = setup();
  try {
    preview(card, hass);
    const first = card.shadowRoot.querySelector('.automation-yaml-preview');
    const last = card.shadowRoot.querySelector('.automation-dialog-create');
    first.focus(); assert.equal(key(dom, first, 'Tab', true).defaultPrevented, true);
    assert.equal(card.shadowRoot.activeElement, last);
    assert.equal(key(dom, last, 'Tab').defaultPrevented, true); assert.equal(card.shadowRoot.activeElement, first);
    assert.equal(key(dom, first, 'Escape').defaultPrevented, true);
    assert.equal(card.shadowRoot.querySelector('.automation-dialog'), null);
    assert.equal(card.shadowRoot.activeElement, card.shadowRoot.querySelector('.background-alerts-generate'));
  } finally { dom.window.close(); }
});

test('ordinary preview locale redraw preserves YAML keyboard focus and selection; pending creation cannot be cancelled by Escape', () => {
  const { dom, card, hass } = setup();
  try {
    preview(card, hass); const yaml = card.shadowRoot.querySelector('.automation-yaml-preview');
    yaml.focus(); yaml.setSelectionRange(3, 18, 'backward');
    card.hass = { ...hass, language: 'pl' };
    const next = card.shadowRoot.querySelector('.automation-yaml-preview');
    assert.equal(card.shadowRoot.activeElement, next);
    assert.deepEqual([next.selectionStart, next.selectionEnd, next.selectionDirection], [3, 18, 'backward']);
    card._backgroundAlertDialog.creating = true; card._render();
    const pending = card.shadowRoot.querySelector('.automation-yaml-preview');
    key(dom, pending, 'Escape'); assert.ok(card.shadowRoot.querySelector('.automation-dialog'));
    assert.equal(card.shadowRoot.querySelector('.automation-dialog-cancel').disabled, true);
  } finally { dom.window.close(); }
});


test('battery colors use configured thresholds and include their boundaries, including explicit zero', () => {
  const { dom, card, hass } = setup();
  try {
    card.setConfig({ battery_warning: 50, battery_critical: 20 }); card.hass = hass;
    assert.equal(card._getBatteryColor(20), '#EF4444');
    assert.equal(card._getBatteryColor(50), '#F59E0B');
    assert.equal(card._getBatteryColor(51), '#10B981');
    card.setConfig({ battery_warning: 0, battery_critical: 0 });
    assert.equal(card._getBatteryColor(0), '#EF4444');
    assert.equal(card._getBatteryColor(1), '#10B981');
  } finally { dom.window.close(); }
});

test('invalid configured thresholds use the same documented fallback in card summary, alerts and generated automations', () => {
  const { dom, card, hass } = setup();
  try {
    for (const value of [undefined, null, '', ' ', 'invalid', -1]) {
      card.setConfig({ battery_warning: value, battery_critical: value, offline_alert_minutes: value });
      card.hass = hass; card._generateAlerts(); card.setActiveTab('batteries');
      assert.equal(card._alerts.length, 2, String(value));
      assert.equal(card._alerts.every(a => a.type === 'battery_warning'), true, String(value));
      assert.match(card.shadowRoot.querySelector('.stats').textContent, /2 device\(s\) need attention/);
      const generated = card._buildBackgroundAutomationPayloads();
      assert.equal(generated.automations[0].payload.trigger[0].below, 30);
      assert.equal(generated.automations[1].payload.trigger[0].for.minutes, 60);
    }
  } finally { dom.window.close(); }
});

test('editing thresholds updates the active alerts immediately without waiting for a sensor change', () => {
  const { dom, card, hass } = setup();
  try {
    card.hass = hass; assert.equal(card._alerts.length, 2);
    card.setConfig({ battery_warning: 0, battery_critical: 0 });
    assert.equal(card._alerts.length, 0);
    card.setConfig({ battery_warning: 30, battery_critical: 10 });
    assert.equal(card._alerts.length, 2);
  } finally { dom.window.close(); }
});


test('physical battery summary and alert count stay unknown while the initial registry identity is loading', async () => {
  const { dom, card, hass } = setup(); const finish = [];
  hass.callWS = ({ type }) => new Promise(resolve => finish.push(() => resolve(records(type))));
  try {
    card.setActiveTab('batteries'); card.hass = hass;
    const pending = card._registryLoading; await Promise.resolve();
    assert.equal(card.shadowRoot.querySelectorAll('.battery-card').length, 2, 'readings themselves are already available');
    assert.match(card.shadowRoot.querySelector('.stats').textContent, /— device\(s\) need attention/);
    card.setActiveTab('alerts');
    assert.match(card.shadowRoot.querySelector('.stats').textContent, /Active Alerts: —/);
    for (const resolve of finish) resolve(); await pending;
    assert.equal(card._alertHistory.length, 1);
    card.setActiveTab('batteries');
    assert.match(card.shadowRoot.querySelector('.stats').textContent, /1 device\(s\) need attention/);
  } finally { for (const resolve of finish) resolve(); dom.window.close(); }
});


test('device name sorting orders every registry record, reverses through a keyboard-accessible button, and preserves the page on ordinary updates', async () => {
  const { dom, card, hass } = setup();
  const devices = Array.from({ length: 20 }, (_, index) => ({ id: 'device_' + index, name: 'Device ' + String(20 - index).padStart(2, '0') }));
  const entities = devices.map(device => ({ entity_id: 'sensor.' + device.id, device_id: device.id }));
  hass.states = Object.fromEntries(entities.map(entity => [entity.entity_id, { entity_id: entity.entity_id, state: 'on', attributes: {} }]));
  hass.callWS = async ({ type }) => type === 'config/device_registry/list' ? devices : entities;
  const names = () => Array.from(card.shadowRoot.querySelectorAll('.device-table tbody tr'), row => row.querySelector('td').textContent.trim());
  try {
    card.hass = hass; await card._registryLoading; card.setActiveTab('devices');
    assert.equal(names()[0], 'Device 01', 'initial name order is alphabetical, not registry insertion order');
    assert.equal(card.shadowRoot.querySelector('.stats').textContent.includes('Total Devices: 20'), true);
    card.shadowRoot.querySelector('.pagination-next').click();
    assert.equal(names()[0], 'Device 16');
    const sort = card.shadowRoot.querySelector('th[data-sort="name"] button');
    assert.ok(sort, 'sorting must be reachable using a native keyboard-accessible button');
    sort.focus(); sort.click();
    assert.equal(card.shadowRoot.activeElement, card.shadowRoot.querySelector('th[data-sort="name"] button'), 'keyboard focus returns to the recreated sorting button');
    assert.equal(names()[0], 'Device 20');
    assert.equal(card.shadowRoot.querySelector('th[data-sort="name"]').getAttribute('aria-sort'), 'descending');
    card.shadowRoot.querySelector('.pagination-next').click();
    assert.deepEqual(names(), ['Device 05', 'Device 04', 'Device 03', 'Device 02', 'Device 01']);
    card.hass = { ...hass, states: { ...hass.states, 'sensor.device_0': { ...hass.states['sensor.device_0'], state: 'off' } } };
    card._update();
    assert.equal(card.shadowRoot.querySelector('.pagination-info').textContent.includes('2'), true);
    assert.deepEqual(names(), ['Device 05', 'Device 04', 'Device 03', 'Device 02', 'Device 01']);
    assert.equal(card.shadowRoot.querySelector('.stats').textContent.includes('Total Devices: 20'), true);
  } finally { dom.window.close(); }
});
