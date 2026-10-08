const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');
function setup() {
 const dom=new JSDOM('',{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/'});
 dom.window.eval(readFileSync(join(__dirname,'..','ha-device-health.js'),'utf8'));
 const card=dom.window.document.createElement('ha-device-health');card.setConfig({show_support:false});dom.window.document.body.append(card);card._throttleMs=0;
 return {dom,card};
}
const battery=v=>({state:v,attributes:{device_class:'battery',unit_of_measurement:'%'},last_changed:'2026-09-27T00:00:00Z'});
test('battery summary counts physical devices while retaining individual readings and unlinked sensors',()=>{
 const {dom,card}=setup();
 try {
  card._entityRegistry=new Map([['sensor.qa_battery_a',{device_id:'qa-device'}],['sensor.qa_battery_b',{device_id:'qa-device'}]]);
  card._deviceRegistry=new Map([['qa-device',{id:'qa-device',name:'QA physical device'}]]);card._activeTab='batteries';
  card.hass={language:'en',user:{id:'qa',is_admin:true},states:{'sensor.qa_battery_a':battery('5'),'sensor.qa_battery_b':battery('20'),'sensor.qa_unlinked_battery':battery('8')}};
  assert.equal(card.shadowRoot.querySelectorAll('.battery-card').length,3);
  assert.match(card.shadowRoot.querySelector('.stats').textContent,/2 device\(s\) need attention/);
  assert.equal(card._alerts.filter(x=>x.type.startsWith('battery_')).length,2);
 }finally{dom.window.close();}
});
test('battery warning boundary is counted consistently in the summary and alerts',()=>{
 const {dom,card}=setup();
 try{
  card._activeTab='batteries';card.hass={language:'en',user:{id:'qa',is_admin:true},states:{'sensor.qa_battery':battery('30')}};
  assert.equal(card._alerts[0].type,'battery_warning');
  assert.match(card.shadowRoot.querySelector('.stats').textContent,/1 device\(s\) need attention/);
 }finally{dom.window.close();}
});
test('generated background thresholds preserve an explicitly configured zero',()=>{
 const {dom,card}=setup();
 try{
  card.setConfig({battery_warning:0,offline_alert_minutes:0});
  card._hass={states:{'sensor.qa_battery':battery('80'),'switch.qa_plug':{state:'on',attributes:{}}}};
  const generated=card._buildBackgroundAutomationPayloads();assert.equal(generated.errors.length,0);
  assert.equal(generated.automations[0].payload.trigger[0].below,0);
  assert.equal(generated.automations[1].payload.trigger[0].for.minutes,0);
 }finally{dom.window.close();}
});
test('missing and invalid generator thresholds keep the documented fallback',()=>{
 const {dom,card}=setup();
 try{
  for(const value of [undefined,null,'',' ','invalid',-1]){
   card._config.battery_warning=value;assert.equal(card._getConfigNumber('battery_warning',30),30);
  }
 }finally{dom.window.close();}
});
