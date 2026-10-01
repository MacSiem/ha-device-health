const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');

function panel() {
 const dom = new JSDOM('', {runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/'});
 dom.window.eval(readFileSync(join(__dirname,'..','ha-device-health.js'),'utf8'));
 const card=dom.window.document.createElement('ha-device-health');
 card._hass={states:{
  'sensor.qa_low_battery':{entity_id:'sensor.qa_low_battery',state:'10',attributes:{device_class:'battery',unit_of_measurement:'%'}},
  'sensor.qa_warn_battery':{entity_id:'sensor.qa_warn_battery',state:'25',attributes:{device_class:'battery',unit_of_measurement:'%'}}
 }};
 return {dom,card};
}

test('direct HA panel without Lovelace setConfig reports low batteries and both alert severities',()=>{
 const {dom,card}=panel();
 try {
  card._activeTab='batteries'; card._generateAlerts(); card._render();
  assert.match(card.shadowRoot.textContent,/Battery Health Summary:\s*2 device\(s\) need attention/);
  assert.deepEqual(Array.from(card._alerts,a=>a.severity),['critical','warning']);
 } finally {dom.window.close();}
});

test('Lovelace threshold overrides still apply and do not change a separately created panel',()=>{
 const {dom,card}=panel();
 try {
  card.setConfig({battery_warning:5,battery_critical:2});
  card._generateAlerts(); assert.equal(card._alerts.length,0);
  const another=dom.window.document.createElement('ha-device-health');another._hass=card._hass;another._generateAlerts();
  assert.deepEqual(Array.from(another._alerts,a=>a.severity),['critical','warning']);
 } finally {dom.window.close();}
});

for (const tab of ['batteries', 'network', 'alerts']) {
 test(`direct panel restores persisted ${tab} tab after recreation`,()=>{
  const {dom,card}=panel();
  try {
   dom.window.localStorage.setItem('ha-tools-device-health-settings',JSON.stringify({_activeTab:tab}));
   const restored=dom.window.document.createElement('ha-device-health');restored._hass=card._hass;restored._render();
   assert.equal(restored.shadowRoot.querySelector('.tab-btn.active').dataset.tab,tab);
  } finally {dom.window.close();}
 });
}

test('invalid and malformed saved tabs keep usable default Devices content',()=>{
 const {dom,card}=panel();
 try {
  for (const saved of ['{bad',JSON.stringify({_activeTab:'unknown'}),JSON.stringify({_activeTab:5})]) {
   dom.window.localStorage.setItem('ha-tools-device-health-settings',saved);
   const restored=dom.window.document.createElement('ha-device-health');restored._hass=card._hass;restored.setConfig({title:'QA'});restored._render();
   assert.equal(restored.shadowRoot.querySelector('.tab-btn.active')?.dataset.tab,'devices');
   assert.ok(restored.shadowRoot.querySelector('.search-box'));
  }
 } finally {dom.window.close();}
});
