const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');
// Actual Core compressed history fixture, with synthetic entities only.
const start = Date.parse('2026-10-05T00:00:00Z'), end = start + 7 * 86400000;
const sample = (s, offset = 1, a = { device_class: 'battery', unit_of_measurement: '%' }) => ({ s, a, lu: start / 1000 + offset });
const fixture = { 'sensor.qa_battery': [sample('0'), sample('unavailable', 2), sample('25', 3)], 'binary_sensor.qa_link': [sample('off', 4, {device_class:'connectivity'})] };
function setup({ role = true, version = '2026.10.1', call } = {}) {
 const dom = new JSDOM('', { runScripts:'dangerously', pretendToBeVisual:true, url:'http://localhost/' });
 dom.window.Date.now = () => end; // Stable Recorder query window, including reopen equivalence.
 dom.window.eval(readFileSync(join(__dirname,'..','ha-device-health.js'),'utf8'));
 const card = dom.window.document.createElement('ha-device-health'); card.setConfig({show_support:false});
 dom.window.document.body.append(card); card._registryLoadedAt = Date.now(); card._registryStatus = 'ready'; card._throttleMs = 0;
 card._deviceRegistry = new Map([['qa-one',{id:'qa-one',name:'Synthetic device one'}],['qa-two',{id:'qa-two',name:'Synthetic device two'}]]);
 card._entityRegistry = new Map([['sensor.qa_battery',{device_id:'qa-one'}],['binary_sensor.qa_link',{device_id:'qa-one'}],['sensor.qa_other',{device_id:'qa-two'}]]);
 const listeners = new Map();
 const connection = {connected:true, addEventListener(t,fn){listeners.set(t,fn);},removeEventListener(t,fn){if(listeners.get(t)===fn)listeners.delete(t);}};
 const calls=[];
 const hass = {language:'en',user:{id:'qa-user',is_admin:role},config:{version,time_zone:'Europe/Warsaw'},connection,
  states:{'sensor.qa_battery':{state:'25',attributes:{device_class:'battery',unit_of_measurement:'%'}},'binary_sensor.qa_link':{state:'on',attributes:{device_class:'connectivity'}},'sensor.qa_other':{state:'on',attributes:{}}},
  callWS:async message=>{
   // Preserve existing registry reads on identity changes; only history uses the deferred fixture.
   if(message.type==='config/entity_registry/list')return [{entity_id:'sensor.qa_battery',device_id:'qa-one'},{entity_id:'binary_sensor.qa_link',device_id:'qa-one'},{entity_id:'sensor.qa_other',device_id:'qa-two'}];
   if(message.type==='config/device_registry/list')return [{id:'qa-one',name:'Synthetic device one'},{id:'qa-two',name:'Synthetic device two'}];
   assert.equal(message.type,'history/history_during_period','History must never write or control HA');
   calls.push(message);return call ? call(message) : fixture;
  }};
 card.hass=hass; card._historyDevice='qa-one'; card._syncHistoryContext?.();
 return {dom,card,hass,calls,listeners};
}
const context = { start, end, entityIds:['sensor.qa_battery','binary_sensor.qa_link'] };
const plain = value => JSON.parse(JSON.stringify(value));
test('Core compressed records keep zero, timestamp, source, units and measured link separately',()=>{
 const {dom,card}=setup();try{
  const p=card._historyProject(fixture,context);
  const zero=p.rows.find(x=>x.kind==='battery'&&x.value===0);
  assert.equal(zero.utc,'2026-10-05T00:00:01.000Z');assert.equal(zero.unit,'%');assert.equal(zero.entityId,'sensor.qa_battery');
  assert.equal(p.rows.some(x=>x.kind==='reported_unavailable'),true);
  assert.equal(p.rows.some(x=>x.kind==='connection'&&x.state==='off'),true);
  assert.equal(p.coverage,'unknown'); assert.equal(p.retention,'unknown'); assert.equal(p.rows.some(x=>/uptime|offline/.test(x.kind)),false);
 }finally{dom.window.close();}
});
test('rejects malformed response and unrequested entity; missing records stay unknown',()=>{
 const {dom,card}=setup();try{
  for(const raw of [null,[],true,'bad',{'sensor.qa_battery':{s:'50'}}]) assert.throws(()=>card._historyProject(raw,context));
  const p=card._historyProject({'sensor.qa_other':[sample('100')],'sensor.qa_battery':[]},context);
  assert.equal(p.rows.length,0);assert.equal(p.missing.length,2);assert.equal(p.coverage,'unknown');
 }finally{dom.window.close();}
});
test('malformed scalar, units, historical attributes and timestamps never create measurements',()=>{
 const {dom,card}=setup();try{
  const bad=[sample(''),sample(' '),sample(true),sample(null),sample('8 invalid'),sample('Infinity'),sample('101'),sample('-1'),sample('30',1,{device_class:'humidity',unit_of_measurement:'%'}),sample('30',1,{device_class:'battery'}),sample('30',1,{device_class:'battery',unit_of_measurement:'°C'}),{...sample('30'),lu:'2026-10-05T00:00:01Z'},{...sample('30'),lu:NaN},{...sample('30'),lu:(start-1)/1000},{...sample('30'),lu:(end+1)/1000}];
  const p=card._historyProject({'sensor.qa_battery':bad},context);
  assert.equal(p.rows.filter(x=>x.kind==='battery').length,0); assert.ok(p.invalid>0);
  const valid=card._historyProject({'sensor.qa_battery':[sample('3.1',1,{device_class:'battery',unit_of_measurement:'V'})]},context);
  assert.equal(valid.rows.find(x=>x.kind==='battery').unit,'V');
 }finally{dom.window.close();}
});
test('quiet intervals do not invent gaps and duplicate actual UTC records are removed',()=>{
 const {dom,card}=setup();try{
  const p=card._historyProject({'sensor.qa_battery':[sample('0'),sample('0'),sample('0',6*86400)]},context);
  assert.equal(p.rows.filter(x=>x.kind==='battery').length,2);
  assert.equal(p.rows.some(x=>x.kind==='gap'),false); assert.equal(p.first,'2026-10-05T00:00:01.000Z');
  assert.equal(p.last,'2026-10-11T00:00:00.000Z');
 }finally{dom.window.close();}
});
test('DST display retains two distinct UTC instants and ISO identity',()=>{
 const {dom,card}=setup();try{
  const a=Date.parse('2026-10-25T00:30:00Z'),b=Date.parse('2026-10-25T01:30:00Z');
  const p=card._historyProject({'sensor.qa_battery':[{s:'50',a:{device_class:'battery',unit_of_measurement:'%'},lu:a/1000},{s:'49',a:{device_class:'battery',unit_of_measurement:'%'},lu:b/1000}]},{start:a-1,end:b+1,entityIds:['sensor.qa_battery']});
  assert.equal(p.rows.filter(x=>x.kind==='battery').length,2);assert.notEqual(p.rows[0].utc,p.rows.at(-1).utc);
  assert.match(card._historyDate(a),/2026/);
 }finally{dom.window.close();}
});
test('bounded projection advertises truncation and does not silently summarize records',()=>{
 const {dom,card}=setup();try{
  const raw={'sensor.qa_battery':Array.from({length:2500},(_,i)=>sample(String(i%100),i+1))};
  const p=card._historyProject(raw,context); assert.equal(p.rows.length,2400);assert.equal(p.capped,true);assert.equal(p.coverage,'unknown');
 }finally{dom.window.close();}
});
test('explicit read coalesces and sends real scoped Core request without HA writes',async()=>{
 let release;const {dom,card,calls}=setup({call:()=>new Promise(r=>release=r)});try{
  const pending=card._loadDeviceHistory(); assert.equal(card._loadDeviceHistory(),pending); await Promise.resolve();
  assert.equal(calls.length,1);const request=calls[0];
  assert.equal(request.type,'history/history_during_period');assert.deepEqual(plain(request.entity_ids),['binary_sensor.qa_link','sensor.qa_battery']);
  assert.equal(request.include_start_time_state,false);assert.equal(request.significant_changes_only,false);assert.equal(request.minimal_response,false);assert.equal(request.no_attributes,false);
  assert.equal(Date.parse(request.end_time)-Date.parse(request.start_time),86400001);
  card._cancelDeviceHistory('not_checked',true);release({});await pending;
  assert.equal(card._historyResult,null);assert.equal(calls.length,1);
 }finally{dom.window.close();}
});
test('device/range/account/role/source changes reject late data without automatic retry',async()=>{
 for(const change of ['device','range','account','role','source','registry','device_removed']){
  let release;const {dom,card,hass,calls}=setup({call:()=>new Promise(r=>release=r)});try{
   const pending=card._loadDeviceHistory();await Promise.resolve();
   if(change==='device')card._historyDevice='qa-two';
   if(change==='range')card._historyDays=30;
   if(change==='account')card.hass={...hass,user:{id:'qa-next',is_admin:true}};
   if(change==='role')card.hass={...hass,user:{id:'qa-user',is_admin:false}};
   if(change==='source')card._entityRegistry.delete('sensor.qa_battery');
   if(change==='registry')card._registryEpoch++;
   if(change==='device_removed')card._deviceRegistry.delete('qa-one');
   release(fixture);await pending;assert.equal(card._historyResult,null,change);assert.equal(calls.length,1);
  }finally{dom.window.close();}
 }
});
test('typed ready, offline and disconnect never run automatic history reads',async()=>{
 const {dom,card,hass,calls,listeners}=setup();try{
  for(const connected of [false,undefined,'true']){hass.connection.connected=connected;await card._loadDeviceHistory();assert.equal(calls.length,0);}
  hass.connection.connected=true;dom.window.dispatchEvent(new dom.window.Event('offline'));await card._loadDeviceHistory();assert.equal(calls.length,0);
  dom.window.dispatchEvent(new dom.window.Event('online'));assert.equal(calls.length,0);
  listeners.get('disconnected')?.();assert.equal(calls.length,0);assert.equal(card._historyState,'offline');
  listeners.get('ready')?.();assert.equal(calls.length,0);
 }finally{dom.window.close();}
});
test('deadline prevents late publish and cannot launch more unresolved wire calls',async()=>{
 let release;const {dom,card,calls}=setup({call:()=>new Promise(r=>release=r)});try{
  card._historyDeadlineMs=5;const pending=card._loadDeviceHistory();await new Promise(r=>dom.window.setTimeout(r,15));
  assert.equal(card._historyState,'timeout');assert.equal(card._loadDeviceHistory(),pending);assert.equal(calls.length,1);
  release(fixture);await pending;assert.equal(card._historyResult,null);assert.equal(card._historyWire,null);
 }finally{dom.window.close();}
});
test('explicit error states sanitize private messages, no-data ambiguous ACL, legacy ordinary denied locally',async()=>{
 for(const [code,state] of [['unknown_command','unsupported'],['unauthorized','denied'],['unknown_error','error']]){
  const {dom,card}=setup({call:async()=>{throw {code,message:'PRIVATE_SERVER_DETAILS'};}});try{await card._loadDeviceHistory();assert.equal(card._historyState,state);assert.equal(card.shadowRoot.textContent.includes('PRIVATE_SERVER_DETAILS'),false);}finally{dom.window.close();}
 }
 const {dom,card,calls}=setup({role:false,version:'2025.6.0'});try{await card._loadDeviceHistory();assert.equal(card._historyState,'unsupported');assert.equal(calls.length,0);}finally{dom.window.close();}
});
test('refetch after reopening gives same persisted rows and leaves alerts/options intact',async()=>{
 const get=()=>setup({call:async m=>({'sensor.qa_battery':fixture['sensor.qa_battery'].filter(row=>row.lu*1000>Date.parse(m.start_time)&&row.lu*1000<Date.parse(m.end_time))})});
 const first=get();let before;try{const settings=plain(first.card._config);await first.card._loadDeviceHistory();before=plain(first.card._historyResult.rows);assert.deepEqual(plain(first.card._config),settings);assert.ok(first.card.shadowRoot.querySelector('.background-alerts-generate')===null||first.card._hass.user.is_admin);}finally{first.dom.window.close();}
 const second=get();try{await second.card._loadDeviceHistory();assert.deepEqual(plain(second.card._historyResult.rows),before);assert.equal(second.card._historyResult.rows.find(x=>x.kind==='battery').value,0);}finally{second.dom.window.close();}
});
test('Chart and Data render equal projection IDs, selection detail, PL/EN and 44px focus controls',()=>{
 const {dom,card}=setup();try{
  card._historyResult=card._historyProject(fixture,context);card._historyState='partial';card._render();
  const chartIds=[...card.shadowRoot.querySelectorAll('[data-history-row]')].map(n=>n.dataset.historyRow);
  card.shadowRoot.querySelector('[data-history-view="data"]').click();
  const dataIds=[...card.shadowRoot.querySelectorAll('[data-history-row]')].map(n=>n.dataset.historyRow);
  assert.deepEqual(dataIds,chartIds);card.shadowRoot.querySelector('[data-history-row]').click();
  assert.match(card.shadowRoot.querySelector('.history-inspector').textContent,/2026-10-05/);
  card._lang='pl';card._render();assert.match(card.shadowRoot.querySelector('.device-history').textContent,/Historia|historia|historii/);
  assert.match(card.shadowRoot.querySelector('style').textContent,/\.history-controls[\s\S]*min-height:\s*44px/);
 }finally{dom.window.close();}
});
test('strict Core SQL boundaries retain an actual sample exactly on a slice edge',async()=>{
 let boundary;
 const {dom,card,calls}=setup({call:async message=>{
  if(boundary===undefined)boundary=Date.parse(message.end_time);
  const time=boundary;
  return time>Date.parse(message.start_time)&&time<Date.parse(message.end_time)
   ? {'sensor.qa_battery':[{s:'0',a:{device_class:'battery',unit_of_measurement:'%'},lu:time/1000}]} : {};
 }});
 try{await card._loadDeviceHistory();assert.equal(calls.length,7);assert.equal(card._historyResult.rows.filter(x=>x.kind==='battery'&&x.time===boundary).length,1);}finally{dom.window.close();}
});
test('historical named battery fallback uses recorded percent units; hexadecimal state is not numeric',()=>{
 const {dom,card}=setup();try{
  const p=card._historyProject({'sensor.qa_battery':[sample('0',1,{unit_of_measurement:'%'}),sample('0x10',2)]},context);
  assert.equal(p.rows.filter(x=>x.kind==='battery').length,1);assert.equal(p.rows.find(x=>x.kind==='battery').value,0);
 }finally{dom.window.close();}
});
test('connection disconnect event is authoritative until typed ready; cleanup removes all listeners',async()=>{
 const {dom,card,calls,listeners}=setup();try{
  listeners.get('disconnected')();await card._loadDeviceHistory();assert.equal(calls.length,0);
  listeners.get('ready')();assert.equal(calls.length,0);
  card.remove();assert.equal(listeners.size,0);assert.equal(card._historyResult,null);
 }finally{dom.window.close();}
});

test('finite voltage extremes stay inspectable without invalid chart coordinates',()=>{
 const {dom,card}=setup();try{
  card._historyResult=card._historyProject({'sensor.qa_battery':[sample('1e308',1,{device_class:'battery',unit_of_measurement:'V'})]},context);card._historyState='loaded';card._render();
  const mark=card.shadowRoot.querySelector('.history-battery-mark');assert.ok(Number.isFinite(parseFloat(mark.style.top)));mark.click();
  assert.match(card.shadowRoot.querySelector('.history-inspector').textContent,/1e\+308 V/);
 }finally{dom.window.close();}
});

test('hass assigned before mounting still binds authoritative connection events',async()=>{
 const {dom,card,hass,calls,listeners}=setup();try{
  card.remove();card.hass=hass;assert.equal(listeners.size,0);dom.window.document.body.append(card);
  assert.equal(typeof listeners.get('disconnected'),'function');listeners.get('disconnected')();
  await card._loadDeviceHistory();assert.equal(calls.length,0);assert.equal(card._historyState,'offline');
 }finally{dom.window.close();}
});
test('role groups and source classification changes clear already rendered private rows immediately',()=>{
 for(const change of ['groups','inactive','source']){
  const {dom,card,hass}=setup();try{
   card._historyResult=card._historyProject(fixture,context);card._historyState='loaded';card._render();
   assert.ok(card.shadowRoot.querySelector('[data-history-row]'));
   if(change==='groups')hass.user.group_ids=['qa-new-group'];
   if(change==='inactive')hass.user.is_active=false;
   if(change==='source')hass.states['sensor.qa_battery'].attributes.unit_of_measurement='V';
   card.hass=hass;assert.equal(card._historyResult,null,change);
   assert.equal(card.shadowRoot.querySelectorAll('[data-history-row]').length,0,change);
  }finally{dom.window.close();}
 }
});
test('verified ACL Core 2026.5.0 supports household; malformed or pre-floor versions do not',()=>{
 for(const [version,supported] of [['2026.5.0',true],['2026.6.0',true],['2026.10.0',true],['2026.4.0',false],['2026.5.0b1',false],['2026.5.0garbage',false],['2026.50.0',false],['2026.5.0.9',false]]){
  const {dom,card}=setup({role:false,version});try{assert.equal(card._historySupportState(),supported?null:'unsupported',version);}finally{dom.window.close();}
 }
});

test('clearing a private result also clears the stale-read marker',()=>{
 const {dom,card}=setup();try{
  card._historyResult=card._historyProject(fixture,context);card._historyState='loaded';card._render();
  card._cancelDeviceHistory('offline');assert.equal(card._historyStale,true);
  card._cancelDeviceHistory('not_checked',true);card._render();assert.equal(card._historyStale,false);
  assert.equal(card.shadowRoot.querySelector('.history-status strong'),null);
 }finally{dom.window.close();}
});
test('30-day read is explicit, exactly scoped, and still does not claim retained coverage',async()=>{
 const {dom,card,calls}=setup({call:async()=>({})});try{
  card._historyDays=30;card._syncHistoryContext();assert.equal(calls.length,0);await card._loadDeviceHistory();
  assert.equal(calls.length,30);assert.equal(card._historyResult.coverage,'unknown');assert.equal(card._historyResult.retention,'unknown');
  assert.equal(card._historyResult.end-card._historyResult.start,30*86400000);
  assert.equal(card._historyState,'no_data');
 }finally{dom.window.close();}
});

test('recorded episodes deduplicate repeated negative readings and close only at actual recovery',()=>{
 const {dom,card}=setup();try{
  const p=card._historyProject({'binary_sensor.qa_link':[sample('on',1,{device_class:'connectivity'}),sample('off',2,{device_class:'connectivity'}),sample('off',3,{device_class:'connectivity'}),sample('unavailable',4,{device_class:'connectivity'}),sample('on',5,{device_class:'connectivity'})]},context);
  const links=p.episodes.filter(x=>x.kind==='measured_connection');assert.equal(links.length,1);
  assert.equal(links[0].start,'2026-10-05T00:00:02.000Z');assert.equal(links[0].end,'2026-10-05T00:00:05.000Z');
  assert.equal(links[0].startEvidence,'recorded_transition');assert.equal(links[0].status,'recovery_recorded');assert.equal(links[0].observedSeconds,3);
  assert.equal(p.episodes.filter(x=>x.kind==='entity_availability').length,1);
 }finally{dom.window.close();}
});
test('first negative observation never invents an onset or recovery; quiet and empty are not incidents',()=>{
 const {dom,card}=setup();try{
  const p=card._historyProject({'sensor.qa_battery':[sample('unavailable',1),sample('unknown',2),sample('unavailable',3)]},context);
  assert.equal(p.episodes.length,1);assert.equal(p.episodes[0].startEvidence,'first_observation');assert.equal(p.episodes[0].end,null);
  assert.equal(p.episodes[0].observedSeconds,null);assert.equal(p.episodes[0].status,'recovery_unconfirmed');
  const quiet=card._historyProject({'sensor.qa_battery':[sample('20'),sample('19',6*86400)]},context);
  assert.equal(quiet.episodes.length,0);assert.equal(card._historyProject({},context).episodes.length,0);
 }finally{dom.window.close();}
});
test('episode identity and recovery survive pure reprojection and Chart/Data toggling without extra reads',()=>{
 const {dom,card,calls}=setup();try{
  const p=card._historyProject(fixture,context);assert.deepEqual(plain(card._historyProject(fixture,context).episodes),plain(p.episodes));
  card._historyResult=p;card._historyState='loaded';card._render();
  const before=card.shadowRoot.querySelector('.history-episodes').textContent;
  card.shadowRoot.querySelector('[data-history-view="data"]').click();
  assert.equal(card.shadowRoot.querySelector('.history-episodes').textContent,before);assert.equal(calls.length,0);
  assert.match(before,/Recovery recorded|Recovery unconfirmed/);
 }finally{dom.window.close();}
});

test('source dates include later valid Recorder states omitted from the event projection',()=>{
 const {dom,card}=setup();try{
  const p=card._historyProject({'sensor.qa_temperature':[
   sample('20',1,{device_class:'temperature',unit_of_measurement:'°C'}),
   sample('21',3600,{device_class:'temperature',unit_of_measurement:'°C'}),
   sample('bad',8*86400,{device_class:'temperature'})
  ]},{start,end,entityIds:['sensor.qa_temperature']});
  assert.equal(p.rows.length,1,'unchanged availability still creates only one event');
  assert.equal(p.first,new Date(start+1000).toISOString());
  assert.equal(p.last,new Date(start+3600000).toISOString(),'last actual record is independent of event reduction');
  assert.equal(p.invalid,1);
 }finally{dom.window.close();}
});

test('battery episodes use configured percent threshold, keep gaps unconfirmed and ignore voltage',()=>{
 const {dom,card,calls}=setup();try{
  const raw={'sensor.qa_battery':[sample('80',1),sample('30',2),sample('20',3),sample('unavailable',4),sample('3',5,{device_class:'battery',unit_of_measurement:'V'}),sample('45',6),sample('0',7)]};
  const p=card._historyProject(raw,context);const episodes=p.episodes.filter(x=>x.kind==='battery_low');
  assert.equal(episodes.length,2);
  assert.equal(episodes[0].start,new Date(start+2000).toISOString());assert.equal(episodes[0].end,new Date(start+6000).toISOString());
  assert.equal(episodes[0].startEvidence,'recorded_transition');assert.equal(episodes[1].end,null);
  card._historyResult=p;card.setConfig({show_support:false,battery_warning:0,battery_critical:0});
  assert.equal(card._historyResult.episodes.filter(x=>x.kind==='battery_low').length,1);assert.equal(calls.length,0);
  card._historyEpisodesOpen=true;card._render();assert.match(card.shadowRoot.querySelector('.history-episodes').textContent,/0 %/);
  card._lang='pl';card._render();assert.match(card.shadowRoot.querySelector('.history-episodes').textContent,/Niski poziom baterii/);
 }finally{dom.window.close();}
});
test('instance identity change on the same connection clears cached and pending history',async()=>{
 for(const pending of [false,true]){
  let release;const {dom,card,hass}=setup({call:pending?()=>new Promise(r=>release=r):undefined});try{
   hass.config.instance_id='qa-one';card.hass=hass;card._historyDevice='qa-one';card._syncHistoryContext();
   card._historyResult=card._historyProject(fixture,context);card._historyState='loaded';
   const read=pending?card._loadDeviceHistory():null;await Promise.resolve();
   hass.config.instance_id='qa-two';card.hass=hass;assert.equal(card._historyResult,null);
   if(read){release(fixture);await read;assert.equal(card._historyResult,null);}
  }finally{dom.window.close();}
 }
});
