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

test('open automation preview translates ordinary locale without rebuilding or changing its YAML or payloads',()=>{
 const {dom,card,hass,calls}=fixture();
 try {
  hass.states['sensor.qa_connection']={entity_id:'sensor.qa_connection',state:'on',attributes:{friendly_name:'QA connection'}};
  card._activeTab='alerts';card._render();card.shadowRoot.querySelector('.background-alerts-generate').click();
  const dialog=card._backgroundAlertDialog;const yaml=dialog.yaml;const payload=JSON.stringify(dialog.automations);
  assert.ok(yaml.includes('persistent_notification.create'));
  card.hass={...hass,language:'pl'};
  assert.equal(card.shadowRoot.querySelector('.automation-dialog-title').textContent,'Alerty w tle (24/7)');
  assert.equal(card.shadowRoot.querySelector('.automation-dialog').getAttribute('aria-label'),'Podgląd automatyzacji Device Health');
  assert.equal(card.shadowRoot.querySelector('.automation-dialog-cancel').textContent,'Anuluj');
  assert.equal(card.shadowRoot.querySelector('.automation-dialog-create').textContent,'Utwórz');
  assert.match(card.shadowRoot.querySelector('.automation-yaml-label').textContent,/Podgląd YAML/);
  assert.match(card.shadowRoot.querySelector('.automation-preview-grid').textContent,/Wyzwalacz/);
  assert.equal(card.shadowRoot.querySelector('.automation-yaml-preview').value,yaml);
  assert.equal(card._backgroundAlertDialog,dialog);assert.equal(JSON.stringify(dialog.automations),payload);
  card.hass=hass;assert.equal(card.shadowRoot.querySelector('.automation-dialog-cancel').textContent,'Cancel');
  assert.equal(card.shadowRoot.querySelector('.automation-yaml-preview').value,yaml);assert.equal(calls.length,0);
 } finally {dom.window.close();}
});

test('retained preview warnings and unavailable-input errors translate without changing their model or limits',()=>{
 const {dom,card,hass,calls}=fixture();
 try {
  hass.states={};
  for(let i=0;i<151;i++)hass.states['sensor.qa_battery_'+i]={entity_id:'sensor.qa_battery_'+i,state:'10',attributes:{device_class:'battery',unit_of_measurement:'%'}};
  card.hass=hass;card._activeTab='alerts';card._render();card.shadowRoot.querySelector('.background-alerts-generate').click();
  const dialog=card._backgroundAlertDialog;assert.equal(dialog.batteryEntityCount,150);const warnings=JSON.stringify(dialog.warnings);const errors=JSON.stringify(dialog.errors);
  card.hass={...hass,language:'pl'};
  assert.match(card.shadowRoot.querySelector('.automation-dialog-warnings').textContent,/Wykryto 151.*150/);
  assert.match(card.shadowRoot.querySelector('.automation-dialog-errors').textContent,/Nie wykryto monitorowanych encji/);
  assert.equal(card.shadowRoot.querySelector('.automation-dialog-create').disabled,true);
  assert.equal(JSON.stringify(dialog.warnings),warnings);assert.equal(JSON.stringify(dialog.errors),errors);assert.equal(calls.length,0);
 } finally {dom.window.close();}
});

test('current and historical alert labels and timestamps follow card locale without changing stored alert identity',()=>{
 const {dom,card,hass,calls}=fixture();
 try {
  const alert={type:'battery_critical',name:'QA authored name',id:'qa_battery',severity:'critical',timestamp:'2026-10-03T00:00:00Z'};
  card._alerts=[alert];card._alertHistory=[alert];card._activeTab='alerts';card._render();
  card.hass={...hass,language:'pl'};
  assert.equal(card.shadowRoot.querySelector('.alert-type').textContent,'KRYTYCZNY POZIOM BATERII');
  assert.match(card.shadowRoot.querySelector('.alert-time').textContent,/3\.10\.2026/);
  assert.doesNotMatch(card.shadowRoot.textContent,/battery critical/);
  assert.equal(card._alerts[0],alert);assert.equal(card._alertHistory[0],alert);
  card.hass=hass;assert.equal(card.shadowRoot.querySelector('.alert-type').textContent,'BATTERY CRITICAL');
  assert.equal(calls.length,0);
 } finally {dom.window.close();}
});

test('existing background creation results translate at render time while preserving server error details',()=>{
 const {dom,card,hass,calls}=fixture();
 try {
  const results=[{label:'Battery alert',ok:true,message:'Created automation ha_device_health_battery_alert.'},{label:'Offline alert',ok:false,message:'Failed to create automation ha_device_health_offline_alert: QA network detail'}];
  card._backgroundAlertResult={results,reload:{ok:false,message:'automation.reload failed: QA reload detail'}};card._activeTab='alerts';card._render();
  card.hass={...hass,language:'pl'};const text=card.shadowRoot.querySelector('.automation-result-summary').textContent;
  assert.match(text,/Alert baterii/);assert.match(text,/Utworzono automatyzację ha_device_health_battery_alert/);
  assert.match(text,/Nie udało się utworzyć automatyzacji ha_device_health_offline_alert: QA network detail/);
  assert.match(text,/QA reload detail/);assert.equal(card._backgroundAlertResult.results,results);assert.equal(calls.length,0);
 } finally {dom.window.close();}
});
