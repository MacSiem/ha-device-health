const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { JSDOM } = require('jsdom');

function capabilities(revision = 0) {
  return {status:'active',revision,can_manage:true,entry_id:'qa-entry',features:{
    diagnostics:{visible:true,read:true}, history:{visible:true,read:true},
    actions:{visible:true,read:true,execute:true}}};
}
function setup({integration = true, admin = true} = {}) {
  const dom = new JSDOM('', {runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/'});
  const intervals = new Map();
  let nextInterval = 0;
  dom.window.setInterval = (callback, milliseconds) => { assert.equal(milliseconds, 10000); intervals.set(++nextInterval, callback); return nextInterval; };
  dom.window.clearInterval = id => intervals.delete(id);
  dom.window.eval(readFileSync('ha-device-health.js','utf8'));
  const card = dom.window.document.createElement('ha-device-health');
  card.setConfig({type:'custom:ha-device-health',show_support:false});
  dom.window.document.body.append(card);
  let access = capabilities();
  let onAccess;
  let subscribeError;
  let historyResolve;
  const calls = [];
  const connection = {connected:true, addEventListener(){}, removeEventListener(){},
    subscribeMessage: async (callback, message) => {
      assert.equal(message.type,'ha_device_health/access/subscribe');
      if (subscribeError) throw subscribeError;
      onAccess = callback;
      return () => { onAccess = null; };
    }};
  const hass = {language:'en',user:{id:'qa-user',is_admin:admin},connection,
    config:{version:'2026.11.3',components:integration?['ha_device_health','history']:['history']},
    states:{'sensor.qa_battery':{state:'25',attributes:{device_class:'battery',unit_of_measurement:'%'}}},
    async callWS(message) {
      calls.push(message);
      if (message.type === 'ha_device_health/access') {
        if (access instanceof Error) throw access;
        return access;
      }
      if (message.type === 'config/entity_registry/list') return [{entity_id:'sensor.qa_battery',device_id:'qa-device'}];
      if (message.type === 'config/device_registry/list') return [{id:'qa-device',name:'QA Device'}];
      if (message.type === 'ha_device_health/policy/get') return {policy:{schema:1,features:{}},revision:0};
      if (message.type === 'ha_device_health/policy/set') return {revision:1};
      if (message.type === 'history/history_during_period') return new Promise(resolve => {historyResolve = resolve;});
      throw Error('unexpected command');
    }};
  return {dom,card,hass,calls,setAccess:value=>{access=value;},setSubscribeError:value=>{subscribeError=value;},
    notify:()=>onAccess?.({changed:true}),finishHistory:value=>historyResolve?.(value),
    tickPolling:()=>[...intervals.values()].forEach(callback=>callback()), intervalCount:()=>intervals.size,
    flush:()=>new Promise(resolve=>dom.window.setTimeout(resolve,20))};
}

test('dashboard without integration preserves legacy access',async()=>{
  const q=setup({integration:false});try {q.card.hass=q.hass;await q.flush();assert.ok(q.card.shadowRoot.querySelector('.tabs'));assert.equal(q.calls.some(call=>call.type==='ha_device_health/access'),false);} finally {q.dom.window.close();}
});
test('active integration fails closed on subscription or access errors',async()=>{
  for(const where of ['subscription','access']) {
    const q=setup();try {
      if(where==='subscription')q.setSubscribeError(Error('unauthorized'));else q.setAccess(Error('unauthorized'));
      q.card.hass=q.hass;await q.flush();
      assert.equal(q.card._accessMode,'error');assert.equal(q.card.shadowRoot.querySelector('.tabs'),null);
      assert.equal(q.calls.some(call=>call.type==='config/entity_registry/list'),false);
    } finally {q.dom.window.close();}
  }
});
test('explicitly absent entry preserves dashboard behavior',async()=>{
  const q=setup();try {q.setAccess({status:'absent'});q.card.hass=q.hass;await q.flush();assert.equal(q.card._accessMode,'absent');assert.ok(q.card.shadowRoot.querySelector('.tabs'));} finally {q.dom.window.close();}
});
test('separate feature gates hide history and administrator action',async()=>{
  const q=setup();try {
    const access=capabilities();access.features.history.visible=false;access.features.actions.execute=false;q.setAccess(access);
    q.card.hass=q.hass;await q.flush();assert.equal(q.card.shadowRoot.querySelector('.device-history'),null);
    q.card._activeTab='alerts';q.card._render();assert.equal(q.card.shadowRoot.querySelector('.background-alerts-generate'),null);
    q.card._openBackgroundAutomationDialog();assert.equal(q.card._backgroundAlertDialog,null);
  } finally {q.dom.window.close();}
});
test('policy change during history read clears content and rejects the late result',async()=>{
  const q=setup();try {
    q.card.hass=q.hass;await q.flush();q.card._historyDevice='qa-device';q.card._syncHistoryContext();
    const pending=q.card._loadDeviceHistory();await q.flush();
    const changed=capabilities(1);changed.features.history.read=false;q.setAccess(changed);q.notify();await q.flush();
    q.finishHistory({'sensor.qa_battery':[{s:'25',lu:Date.now()/1000}]});await pending;
    assert.equal(q.card._historyResult,null);assert.match(q.card.shadowRoot.querySelector('.device-history').textContent,/access denied/i);
  } finally {q.dom.window.close();}
});
test('admin changes policy with revision while household cannot open editor',async()=>{
  const q=setup();try {
    q.card.hass=q.hass;await q.flush();q.card.shadowRoot.querySelector('.access-manage').click();await q.flush();
    const field=q.card.shadowRoot.querySelector('[data-access-rule="history-read"]');field.value='selected_users';
    q.card.shadowRoot.querySelector('[data-access-users="history-read"]').value='household-id';
    q.card.shadowRoot.querySelector('.access-save').click();await q.flush();
    const write=q.calls.find(call=>call.type==='ha_device_health/policy/set');
    assert.equal(write.entry_id,'qa-entry');assert.equal(write.revision,0);assert.equal(write.policy.features.history.read.mode,'selected_users');assert.equal(write.policy.features.history.read.user_ids[0],'household-id');
  } finally {q.dom.window.close();}
  const u=setup({admin:false});try {
    const access=capabilities();access.can_manage=false;delete access.entry_id;u.setAccess(access);u.card.hass=u.hass;await u.flush();assert.equal(u.card.shadowRoot.querySelector('.access-manage'),null);await u.card._openAccessManagement();assert.equal(u.calls.some(call=>call.type==='ha_device_health/policy/get'),false);
  } finally {u.dom.window.close();}
});
test('revoked action while a write is pending stops subsequent writes and reload',async()=>{
  const q=setup();try {
    let release;let writes=0;let reloads=0;
    q.hass.callApi=()=>{writes++;return new Promise(resolve=>{release=resolve;});};
    q.hass.callService=async()=>{reloads++;};
    q.card.hass=q.hass;await q.flush();
    q.card._backgroundAlertDialog={automations:[{id:'one',entityId:'automation.one',payload:{},label:'One'},{id:'two',entityId:'automation.two',payload:{},label:'Two'}],errors:[]};
    const pending=q.card._createBackgroundAlertAutomations();await q.flush();assert.equal(writes,1);
    const changed=capabilities(2);changed.features.actions.execute=false;q.setAccess(changed);q.notify();await q.flush();
    release();await pending;assert.equal(writes,1);assert.equal(reloads,0);assert.equal(q.card._backgroundAlertResult,null);
  } finally {q.dom.window.close();}
});
test('new account cannot receive late history from prior account',async()=>{
  const q=setup();try {
    q.card.hass=q.hass;await q.flush();q.card._historyDevice='qa-device';q.card._syncHistoryContext();
    const pending=q.card._loadDeviceHistory();await q.flush();
    const denied=capabilities(2);denied.can_manage=false;delete denied.entry_id;denied.features.diagnostics.read=false;q.setAccess(denied);
    q.card.hass={...q.hass,user:{id:'other-user',is_admin:false}};await q.flush();
    q.finishHistory({'sensor.qa_battery':[{s:'25',lu:Date.now()/1000}]});await pending;
    assert.equal(q.card._historyResult,null);assert.equal(q.card.shadowRoot.textContent.includes('QA Device'),false);
  } finally {q.dom.window.close();}
});

test('native access revocation without an event is refreshed once per connection and clears cached rows',async()=>{
  const q=setup();try {
    q.card.hass=q.hass;await q.flush();
    const second=q.dom.window.document.createElement('ha-device-health');second.setConfig({type:'custom:ha-device-health',show_support:false});q.dom.window.document.body.append(second);second.hass=q.hass;await q.flush();
    assert.equal(q.intervalCount(),1);
    const before=q.calls.filter(call=>call.type==='ha_device_health/access').length;
    const changed=capabilities();changed.features.diagnostics.read=false;q.setAccess(changed);q.tickPolling();await q.flush();
    const after=q.calls.filter(call=>call.type==='ha_device_health/access').length;
    assert.equal(after-before,1);assert.equal(q.card.shadowRoot.textContent.includes('QA Device'),false);assert.equal(second.shadowRoot.textContent.includes('QA Device'),false);
    assert.equal(q.card.shadowRoot.querySelector('.tabs'),null);assert.equal(second.shadowRoot.querySelector('.tabs'),null);
    q.card.remove();assert.equal(q.intervalCount(),1);second.remove();assert.equal(q.intervalCount(),0);
  } finally {q.dom.window.close();}
});
