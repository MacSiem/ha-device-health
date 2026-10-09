const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');

function setup() {
  const dom = new JSDOM('', { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
  dom.window.eval(readFileSync(join(__dirname, '..', 'ha-device-health.js'), 'utf8'));
  const card = dom.window.document.createElement('ha-device-health');
  card.setConfig({ show_support: false });
  dom.window.document.body.append(card);
  const hass = { language: 'en', user: { id: 'qa-admin', is_admin: true }, connection: {}, states: {} };
  return { dom, card, hass };
}
const registry = (type, name = 'QA plug') => type === 'config/device_registry/list'
  ? [{ id: 'qa-plug', name }] : [{ entity_id: 'sensor.qa_battery', device_id: 'qa-plug' }];

test('failed registry read shows unavailable counts and permits immediate explicit retry', async () => {
  const { dom, card, hass } = setup();
  let failed = true;
  hass.callWS = async ({ type }) => {
    if (failed) throw new Error('QA unavailable');
    return registry(type);
  };
  try {
    card.hass = hass; await card._registryLoading;
    const notice = card.shadowRoot.querySelector('.registry-notice');
    assert.ok(notice, 'registry error must be visible');
    assert.match(notice.textContent, /Could not load/);
    assert.match(card.shadowRoot.querySelector('.stats').textContent, /Total Devices: —/);
    failed = false;
    card.shadowRoot.querySelector('.registry-retry').click();
    await card._registryLoading;
    assert.equal(card.shadowRoot.querySelector('.registry-notice'), null);
    assert.equal(card.shadowRoot.querySelector('.device-table tbody td').textContent, 'QA plug');
    assert.match(card.shadowRoot.querySelector('.stats').textContent, /Total Devices: 1/);
  } finally { dom.window.close(); }
});

test('late registry response cannot reveal a previous session in the new account', async () => {
  const { dom, card, hass } = setup();
  const finish = [];
  hass.callWS = ({ type }) => new Promise(resolve => finish.push(() => resolve(registry(type, 'QA previous session'))));
  try {
    card.hass = hass;
    const oldPending = card._registryLoading;
    // Allow the fake server to receive both requests before switching accounts.
    await Promise.resolve();
    card.hass = { ...hass, user: { id: 'qa-household', is_admin: false }, connection: {},
      callWS: async () => [] };
    const newPending = card._registryLoading;
    for (const resolve of finish) resolve();
    await Promise.all([oldPending, newPending]);
    assert.equal(card.shadowRoot.textContent.includes('QA previous session'), false);
    assert.match(card.shadowRoot.querySelector('.stats').textContent, /Total Devices: 0/);
  } finally { for (const resolve of finish) resolve(); dom.window.close(); }
});

test('changing sessions immediately removes existing registry names and alert history', async () => {
  const { dom, card, hass } = setup();
  try {
    hass.states = { 'sensor.qa_battery': { entity_id: 'sensor.qa_battery', state: '5',
      last_changed: '2026-09-27T00:00:00Z', attributes: { device_class: 'battery', unit_of_measurement: '%' } } };
    hass.callWS = async ({ type }) => registry(type, 'QA private name');
    card.hass = hass; await card._registryLoading;
    assert.equal(card._alertHistory.length > 0, true);
    card.hass = { ...hass, user: { id: 'qa-household', is_admin: false }, connection: {}, states: {},
      callWS: async () => [] };
    assert.equal(card.shadowRoot.textContent.includes('QA private name'), false);
    assert.equal(card._alertHistory.length, 0);
    await card._registryLoading;
  } finally { dom.window.close(); }
});

test('disconnect discards a pending registry response and reconnect obtains current data', { timeout: 5000 }, async () => {
  const { dom, card, hass } = setup();
  const finish = [];
  hass.callWS = ({ type }) => new Promise(resolve => finish.push(() => resolve(registry(type, 'QA old connection'))));
  try {
    card.hass = hass; const oldPending = card._registryLoading;
    await Promise.resolve(); card.remove();
    for (const resolve of finish) resolve(); await oldPending;
    // HA supplies current hass before attaching a reconstructed card.
    card.hass = { ...hass, callWS: async ({ type }) => registry(type, 'QA current connection') };
    dom.window.document.body.append(card);
    await card._registryLoading;
    const text = card.shadowRoot.querySelector('.device-table').textContent;
    assert.equal(text.includes('QA old connection'), false);
    assert.equal(text.includes('QA current connection'), true);
  } finally { for (const resolve of finish) resolve(); dom.window.close(); }
});


test('a native registry event refreshes device names without a state change or reload', async () => {
  const { dom, card, hass } = setup();
  const events = new Map();
  let name = 'QA original name';
  hass.connection.subscribeEvents = async (callback, type) => {
    events.set(type, callback);
    return () => events.delete(type);
  };
  hass.callWS = async ({ type }) => registry(type, name);
  try {
    card.hass = hass; await card._registryLoading;
    assert.equal(card.shadowRoot.querySelector('.device-table tbody td').textContent, 'QA original name');
    name = 'QA renamed device';
    events.get('device_registry_updated')?.({ event_type: 'device_registry_updated' });
    await card._registryLoading;
    assert.equal(card.shadowRoot.querySelector('.device-table tbody td').textContent, 'QA renamed device');
    card.remove();
    assert.equal(events.size, 0);
  } finally { dom.window.close(); }
});

test('a card assigned hass before attachment subscribes when connected and reacts without another hass assignment',async()=>{
 const dom=new JSDOM('',{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/'});
 dom.window.eval(readFileSync(join(__dirname,'..','ha-device-health.js'),'utf8'));
 const card=dom.window.document.createElement('ha-device-health');card.setConfig({show_support:false});
 const events=new Map();let name='QA before attachment';
 const hass={language:'en',user:{id:'qa',is_admin:true},states:{},connection:{subscribeEvents:async(callback,type)=>{events.set(type,callback);return()=>events.delete(type);}},callWS:async({type})=>registry(type,name)};
 try{
  card.hass=hass;dom.window.document.body.append(card);await card._registryLoading;await Promise.resolve();
  assert.equal(events.has('device_registry_updated'),true);
  name='QA after attachment';events.get('device_registry_updated')?.({event_type:'device_registry_updated'});await card._registryLoading;
  assert.equal(card.shadowRoot.querySelector('.device-table tbody td').textContent,name);
 }finally{dom.window.close();}
});
