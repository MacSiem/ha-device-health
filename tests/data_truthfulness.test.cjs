const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');
function setup() {
  const dom = new JSDOM('', {runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/'});
  dom.window.eval(readFileSync(join(__dirname,'..','ha-device-health.js'),'utf8'));
  const card=dom.window.document.createElement('ha-device-health');
  card.setConfig({show_support:false});dom.window.document.body.append(card);
  card._throttleMs=0;
  return {dom,card};
}
const state=(value,attributes)=>({state:value,attributes,last_changed:'2026-09-27T00:00:00Z'});
test('successful empty registries still report real unlinked states',async()=>{
 const {dom,card}=setup();
 try {
  card.hass={language:'en',user:{id:'qa',is_admin:true},connection:{},callWS:async()=>[],states:{'sensor.qa_temperature':state('25',{})}};
  await card._registryLoading;
  assert.equal(card._getDevices().length,0);
  assert.equal(card._unlinkedEntityCount(),1);
  assert.match(card.shadowRoot.querySelector('.stats').textContent,/Entities without a registered device: 1/);
 }finally{dom.window.close();}
});
test('battery device_class discovers levels without naming assumptions while percent humidity stays excluded',()=>{
 const {dom,card}=setup();
 try {
  card.hass={language:'en',user:{id:'qa',is_admin:true},states:{
   'sensor.qa_charge':state('25.5',{device_class:'battery',unit_of_measurement:'%'}),
   'sensor.qa_humidity':state('25.5',{device_class:'humidity',unit_of_measurement:'%'})}};
  const readings=card._getBatteryDevices();
  assert.equal(readings.length,1);assert.equal(readings[0].id,'sensor.qa_charge');assert.equal(readings[0].level,25.5);
  const payload=card._buildBackgroundAutomationPayloads();assert.equal(payload.automations[0].payload.trigger[0].entity_id.includes('sensor.qa_charge'),true);
 }finally{dom.window.close();}
});
test('a malformed battery value never becomes a measurement or alert',()=>{
 const {dom,card}=setup();
 try{
  card.hass={language:'en',user:{id:'qa',is_admin:true},states:{'sensor.qa_battery':state('8 invalid',{device_class:'battery',unit_of_measurement:'%'})}};
  assert.equal(card._getBatteryDevices().length,0);assert.equal(card._alerts.some(x=>x.type.startsWith('battery_')),false);
 }finally{dom.window.close();}
});
test('decimal battery above the critical threshold remains a warning with its exact reading',()=>{
 const {dom,card}=setup();
 try{
  card.hass={language:'en',user:{id:'qa',is_admin:true},states:{'sensor.qa_battery':state('10.9',{device_class:'battery',unit_of_measurement:'%'})}};
  assert.equal(card._getBatteryDevices()[0].level,10.9);assert.equal(card._alerts[0].type,'battery_warning');
 }finally{dom.window.close();}
});
