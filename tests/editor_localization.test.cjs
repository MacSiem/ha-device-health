const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');

function fixture() {
  const dom = new JSDOM('', { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
  dom.window.eval(readFileSync(join(__dirname, '..', 'ha-device-health.js'), 'utf8'));
  return dom;
}

test('editor ordinary locale changes labels while retaining authored draft, caret and config events', () => {
  const dom = fixture();
  try {
    const editor = dom.window.document.createElement('ha-device-health-editor');
    editor.setConfig({ title: 'My authored title', battery_warning: 0, battery_critical: 2, show_support: false });
    dom.window.document.body.append(editor);
    const events = [];
    editor.addEventListener('config-changed', event => events.push(JSON.stringify(event.detail.config)));
    editor.hass = { language: 'en' };
    const input = editor.shadowRoot.querySelector('#cf_title');
    input.focus(); input.value = 'Draft <img> {id} $&';
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    input.setSelectionRange(2, 7, 'backward');
    const config = JSON.stringify(editor._config);
    editor.hass = { language: 'pl' };
    assert.deepEqual(Array.from(editor.shadowRoot.querySelectorAll('label'), x => x.textContent), ['Tytuł', 'Ostrzeżenie baterii (%)', 'Krytyczny poziom baterii (%)']);
    const retained = editor.shadowRoot.querySelector('#cf_title');
    assert.equal(retained.value, 'Draft <img> {id} $&');
    assert.equal(editor.shadowRoot.activeElement, retained);
    assert.deepEqual([retained.selectionStart, retained.selectionEnd, retained.selectionDirection], [2, 7, 'backward']);
    assert.equal(editor.shadowRoot.querySelector('#cf_battery_warning').value, '0');
    assert.equal(JSON.stringify(editor._config), config);
    assert.equal(events.length, 1);
    assert.equal(editor.shadowRoot.querySelector('img'), null);
    for (const label of editor.shadowRoot.querySelectorAll('label')) assert.ok(editor.shadowRoot.querySelector('#' + label.htmlFor));
    editor.hass = { language: 'en' };
    assert.equal(editor.shadowRoot.querySelector('label').textContent, 'Title');
    assert.equal(JSON.stringify(editor._config), config);
    assert.equal(events.length, 1);
  } finally { dom.window.close(); }
});

test('unconfigured panel and fresh stub follow HA locale without rewriting explicitly authored titles', () => {
  const dom = fixture();
  try {
    const card = dom.window.document.createElement('ha-device-health');
    card._registryLoadedAt = Date.now();
    card.hass = { language: 'pl', states: {} };
    assert.equal(card.shadowRoot.querySelector('.card-header').textContent, 'Zdrowie Urządzeń');
    card.setConfig(card.constructor.getStubConfig());
    assert.equal(card.shadowRoot.querySelector('.card-header').textContent, 'Zdrowie Urządzeń');
    card.hass = { language: 'en', states: {} };
    assert.equal(card.shadowRoot.querySelector('.card-header').textContent, 'Device Health');
    card.setConfig({ title: 'Device Health' });
    card.hass = { language: 'pl', states: {} };
    assert.equal(card.shadowRoot.querySelector('.card-header').textContent, 'Device Health');
    card.setConfig({ title: '<img src=x> {name} $&' });
    assert.equal(card.shadowRoot.querySelector('.card-header').textContent, '<img src=x> {name} $&');
    assert.equal(card.shadowRoot.querySelector('.card-header img'), null);
  } finally { dom.window.close(); }
});

test('editor initializes Polish labels and empty title placeholder without inserting a translated config value', () => {
  const dom = fixture();
  try {
    const editor = dom.window.document.createElement('ha-device-health-editor');
    editor.hass = { language: 'pl' }; editor.setConfig({ battery_warning: 30 });
    dom.window.document.body.append(editor);
    const input = editor.shadowRoot.querySelector('#cf_title');
    assert.equal(input.value, '');
    assert.equal(input.placeholder, 'Zdrowie Urządzeń');
    assert.equal(Object.hasOwn(editor._config, 'title'), false);
    assert.equal(editor.shadowRoot.querySelector('h3').textContent, 'Zdrowie Urządzeń');
  } finally { dom.window.close(); }
});
