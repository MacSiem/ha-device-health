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
  card.setConfig({ title: 'Device QA', show_support: true });
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

test('ordinary Polish locale translates first-run and support labels without losing the search draft', () => {
 const {dom,card,hass,calls}=fixture();
 try {
  const input=type(card,'QA locale'); input.focus();input.setSelectionRange(1,7,'backward');
  card.hass={...hass,language:'pl'};
  assert.match(card.shadowRoot.querySelector('.intro-headline').textContent,/baterii/);
  assert.equal(card.shadowRoot.querySelector('.intro-steps').children.length,3);
  assert.doesNotMatch(card.shadowRoot.querySelector('.intro-steps').textContent,/List devices|Filter by|Click device/);
  assert.equal(card.shadowRoot.querySelector('.intro-dismiss').getAttribute('aria-label'),'Zamknij instrukcję');
  assert.match(card.shadowRoot.querySelector('.donate-section a').textContent,/Dobrowolne wsparcie/);
  assert.equal(card.shadowRoot.querySelector('.support-dismiss').getAttribute('aria-label'),'Ukryj link wsparcia');
  selection(card,'QA locale');assert.equal(calls.length,0);
  card.hass=hass;
  assert.match(card.shadowRoot.querySelector('.intro-headline').textContent,/Device battery/);
  assert.equal(card.shadowRoot.querySelector('.intro-dismiss').getAttribute('aria-label'),'Dismiss');
  selection(card,'QA locale');
 } finally {dom.window.close();}
});

test('each read-only tab translates the page-size caption without changing its selection',()=>{
 const {dom,card,hass,calls}=fixture();
 try {
  for(const tab of ['devices','batteries','network']) {
   card._activeTab=tab;card._render();card.hass={...hass,language:'pl'};
   const select=card.shadowRoot.querySelector('.page-size-selector');
   assert.equal(select.previousElementSibling.textContent,'Pokaż:');assert.equal(select.value,'15');
   card.hass=hass;assert.equal(card.shadowRoot.querySelector('.page-size-selector').previousElementSibling.textContent,'Show:');
  }
  assert.equal(calls.length,0);
 } finally {dom.window.close();}
});

test('relative elapsed time follows card locale with unchanged elapsed values',()=>{
 const {dom,card,hass}=fixture();
 try {
  dom.window.Date.now=()=>Date.parse('2026-10-03T12:00:00Z');
  card.hass={...hass,language:'pl'};
  assert.equal(card._calculateUptime('2026-10-01T12:00:00Z'),'2 dni');
  assert.equal(card._calculateUptime('2026-10-03T09:00:00Z'),'3 godz.');
  assert.equal(card._calculateUptime('2026-10-03T11:55:00Z'),'5 min');
  card.hass=hass;assert.equal(card._calculateUptime('2026-10-01T12:00:00Z'),'2 days');
 } finally {dom.window.close();}
});

test('background alert section translates on ordinary locale updates without generating automations',()=>{
 const {dom,card,hass,calls}=fixture();
 try {
  card._activeTab='alerts';card._render();card.hass={...hass,language:'pl'};
  assert.equal(card.shadowRoot.querySelector('.background-alerts-title').textContent,'Alerty w tle (24/7)');
  assert.match(card.shadowRoot.querySelector('.background-alerts-note').textContent,/zamkniętym panelu/);
  assert.equal(card.shadowRoot.querySelector('.background-alerts-generate').textContent,'Generuj automatyzacje…');
  assert.match(card.shadowRoot.querySelector('.background-alerts-status').textContent,/nie utworzono/);
  card.hass=hass;assert.equal(card.shadowRoot.querySelector('.background-alerts-generate').textContent,'Generate automations…');
  assert.equal(calls.length,0);assert.equal(card._backgroundAlertDialog,null);
 } finally {dom.window.close();}
});
