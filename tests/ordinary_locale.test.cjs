const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');

function fixture() {
  const dom = new JSDOM('', { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
  dom.window.eval(readFileSync(join(__dirname, '..', 'ha-device-health.js'), 'utf8'));
  const card = dom.window.document.createElement('ha-device-health');
  dom.window.document.body.append(card);
  card.setConfig({ title: 'Device QA', show_support: false });
  card._registryLoadedAt = Date.now();
  const calls = [];
  const hass = { language: 'en', user: { id: 'qa-admin', is_admin: true }, states: {
    'sensor.qa_battery': { entity_id: 'sensor.qa_battery', state: '10', attributes: {
      friendly_name: 'QA locale battery', device_class: 'battery', unit_of_measurement: '%'
    }, last_changed: '2026-10-03T00:00:00Z' }
  }, callWS: async (...args) => { calls.push(args); throw Error('Unexpected WS'); },
    callApi: async (...args) => { calls.push(args); throw Error('Unexpected API'); },
    callService: async (...args) => { calls.push(args); throw Error('Unexpected service'); }
  };
  card.hass = hass;
  return { dom, card, hass, calls };
}

function type(card, value) {
  const input = card.shadowRoot.querySelector('.search-box');
  input.focus(); input.value = value;
  input.dispatchEvent(new input.ownerDocument.defaultView.Event('input', { bubbles: true }));
  return card.shadowRoot.querySelector('.search-box');
}

function selection(card, value) {
  const input = card.shadowRoot.querySelector('.search-box');
  assert.equal(input.value, value);
  assert.equal(card.shadowRoot.activeElement, input);
  assert.deepEqual([input.selectionStart, input.selectionEnd, input.selectionDirection], [1, 7, 'backward']);
}

test('search input keeps focus after each typed character and filters with the complete draft', () => {
  const { dom, card, calls } = fixture();
  try {
    for (const value of ['Q', 'QA', 'QA locale']) {
      const input = type(card, value);
      assert.equal(card.shadowRoot.activeElement, input);
      assert.equal(input.value, value);
      assert.equal(card._searchQuery, value);
    }
    assert.equal(calls.length, 0);
  } finally { dom.window.close(); }
});

test('ordinary locale change with identical sensor hash translates immediately without losing draft or selection', () => {
  const { dom, card, hass, calls } = fixture();
  try {
    const input = type(card, 'QA locale'); input.focus(); input.setSelectionRange(1, 7, 'backward');
    const hash = card._cachedStateHash; const alerts = card._alerts;
    card.hass = { ...hass, language: 'pl' };
    assert.equal(card.shadowRoot.querySelector('.search-box').placeholder, 'Szukaj urządzeń...');
    selection(card, 'QA locale');
    assert.equal(card._cachedStateHash, hash); assert.equal(card._alerts, alerts);
    card.hass = hass;
    assert.equal(card.shadowRoot.querySelector('.search-box').placeholder, 'Search devices...');
    selection(card, 'QA locale');
    assert.equal(calls.length, 0);
  } finally { dom.window.close(); }
});

test('mutable role loss with identical sensor hash removes automation controls before any API or service', async () => {
  const { dom, card, hass, calls } = fixture();
  try {
    card._activeTab = 'alerts'; card._render();
    assert.ok(card.shadowRoot.querySelector('.background-alerts-generate'));
    hass.user.is_admin = false; card.hass = hass;
    assert.equal(card.shadowRoot.querySelector('.background-alerts-generate'), null);
    assert.equal(card._activeTab, 'alerts');
    await card._createBackgroundAlertAutomations();
    assert.equal(calls.length, 0);
  } finally { dom.window.close(); }
});

test('unknown role and later administrator regain update controls immediately while retaining the alert tab', () => {
  const { dom, card, hass, calls } = fixture();
  try {
    card._activeTab = 'alerts'; card._render();
    card.hass = { ...hass, user: undefined };
    assert.equal(card.shadowRoot.querySelector('.background-alerts-generate'), null);
    card.hass = hass;
    assert.ok(card.shadowRoot.querySelector('.background-alerts-generate'));
    assert.equal(card._activeTab, 'alerts');
    assert.equal(calls.length, 0);
  } finally { dom.window.close(); }
});

test('two ordinary locale updates remain independent and do not refresh unchanged sensor data', () => {
  const first = fixture(); const second = fixture();
  try {
    second.card.hass = { ...second.hass, language: 'pl', user: { id: 'qa-household', is_admin: false } };
    assert.equal(second.card.shadowRoot.querySelector('.search-box').placeholder, 'Szukaj urządzeń...');
    assert.equal(first.card.shadowRoot.querySelector('.search-box').placeholder, 'Search devices...');
    assert.equal(first.calls.length + second.calls.length, 0);
  } finally { first.dom.window.close(); second.dom.window.close(); }
});
