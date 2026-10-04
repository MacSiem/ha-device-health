const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');

function fixture() {
  const dom = new JSDOM('', { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
  dom.window.eval(readFileSync(join(__dirname, '..', 'ha-device-health.js'), 'utf8'));
  const card = dom.window.document.createElement('ha-device-health');
  card._registryLoadedAt = Date.now();
  card._deviceRegistry = new Map([
    ['missing', { id: 'missing', name: 'QA Missing model', connections: [['mac', '00:11:22:33:44:55']] }],
    ['authored', { id: 'authored', name: 'QA Authored model', model: 'device', connections: [['zigbee', 'QA']] }],
  ]);
  const calls = [];
  const hass = { language: 'en', states: {}, callWS: (...args) => { calls.push(args); throw Error('Unexpected WS'); } };
  card.hass = hass;
  return { dom, card, hass, calls };
}

test('absent-model label translates while preserving authored model and registry data', () => {
  const { dom, card, hass, calls } = fixture();
  try {
    const registry = JSON.stringify(Array.from(card._deviceRegistry));
    const before = JSON.stringify(card._getDevices());
    card.hass = { ...hass, language: 'pl' };
    const rows = Array.from(card.shadowRoot.querySelectorAll('.device-table tbody tr'));
    const missing = rows.find(row => row.cells[0].textContent === 'QA Missing model');
    const authored = rows.find(row => row.cells[0].textContent === 'QA Authored model');
    assert.equal(missing.cells[1].textContent, 'Urządzenie');
    assert.equal(authored.cells[1].textContent, 'device');
    assert.equal(JSON.stringify(Array.from(card._deviceRegistry)), registry);
    assert.equal(JSON.stringify(card._getDevices()), before);
    card.hass = hass;
    assert.equal(calls.length, 0);
  } finally { dom.window.close(); }
});

test('unknown device status translates without turning absence of entity state into offline health', () => {
  const { dom, card, hass, calls } = fixture();
  try {
    card.hass = { ...hass, language: 'pl' };
    assert.equal(card.shadowRoot.querySelector('.status-unknown').textContent, 'BRAK STANU ENCJI');
    assert.equal(card._getDevices()[0].status, 'unknown');
    assert.equal(card.shadowRoot.querySelector('.status-offline'), null);
    card.hass = hass;
    assert.equal(card.shadowRoot.querySelector('.status-unknown').textContent, 'NO ENTITY STATE');
    assert.equal(calls.length, 0);
  } finally { dom.window.close(); }
});

test('network group headings and Other summary translate without reclassifying connection evidence', () => {
  const { dom, card, hass, calls } = fixture();
  try {
    const original = JSON.stringify(card._getNetworkDevices());
    card._activeTab = 'network'; card._render();
    card.hass = { ...hass, language: 'pl' };
    assert.deepEqual(Array.from(card.shadowRoot.querySelectorAll('.section-title'), row => row.textContent), ['Sieć: Inne', 'Sieć: Zigbee']);
    assert.match(card.shadowRoot.querySelector('.network-stats').textContent, /Inne Urządzenia/);
    assert.equal(JSON.stringify(card._getNetworkDevices()), original);
    card.hass = hass;
    assert.deepEqual(Array.from(card.shadowRoot.querySelectorAll('.section-title'), row => row.textContent), ['Other Network', 'Zigbee Network']);
    assert.equal(calls.length, 0);
  } finally { dom.window.close(); }
});

test('regional Polish HA locale uses the same card translations as its editor', () => {
  const { dom, card, hass } = fixture();
  try {
    card.hass = { ...hass, language: 'pl-PL' };
    assert.equal(card.shadowRoot.querySelector('.tab-btn').textContent, 'Urządzenia');
    assert.equal(card.shadowRoot.querySelector('.card-header').textContent, 'Zdrowie Urządzeń');
  } finally { dom.window.close(); }
});
