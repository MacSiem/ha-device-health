const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {JSDOM}=require('jsdom');
const tick=()=>new Promise(r=>setImmediate(r));
const flush=async()=>{for(let i=0;i<12;i++)await tick();};
test('real Device Health admin opens native placement, previews, saves and undoes',async()=>{
 const dom=new JSDOM('',{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/'}),w=dom.window;
 w.eval(readFileSync('ha-device-health.js','utf8'));
 const ha=w.document.createElement('home-assistant'),card=w.document.createElement('ha-device-health'); let owner;
 const clone=x=>JSON.parse(JSON.stringify(x)),original={views:[{type:'sections',sections:[{type:'grid',cards:[{type:'tile'}]}]}],other:'preserved'};let stored=clone(original);const calls=[];
 const hass={language:'en',user:{id:'admin',is_admin:true},connection:{connected:true},states:{},panels:{lovelace:{config:{mode:'storage'}}},callWS:async m=>{if(!m.type.startsWith('lovelace/'))return [];calls.push(m);if(m.type==='lovelace/dashboards/list')return [];if(m.type==='lovelace/config')return clone(stored);if(m.type==='lovelace/config/save'){stored=clone(m.config);return null;}}};
 ha.provideHass=e=>{e.hass=hass;};ha.addEventListener('show-dialog',e=>{owner=w.document.createElement(e.detail.dialogTag);ha.provideHass(owner);owner.showDialog(e.detail.dialogParams);ha.append(owner);});
 try{card.setConfig({variant:'full',future:{keep:true}});ha.append(card);w.document.body.append(ha);card.hass=hass;await flush();assert.equal(calls.length,0);card.shadowRoot.querySelector('[data-device-dashboard-add]').click();await flush();const select=owner.querySelector('[data-dashboard]');select.value='0';select.dispatchEvent(new w.Event('change',{bubbles:true}));await flush();const preview=owner.querySelector('[data-preview] ha-device-health');assert.ok(preview);assert.equal(preview.preview,true);assert.equal(preview.shadowRoot.querySelector('[data-device-dashboard-add]'),null);owner.querySelector('[data-add]').click();await flush();assert.equal(stored.views[0].sections[0].cards.length,2);assert.equal(stored.views[0].sections[0].cards[1].future.keep,true);owner.querySelector('[data-undo]').click();await flush();assert.deepEqual(stored,original);hass.user.is_admin=false;card.hass=hass;assert.equal(card.shadowRoot.querySelector('[data-device-dashboard-add]'),null);}finally{owner?.closeDialog();card.remove();w.close();}
});
