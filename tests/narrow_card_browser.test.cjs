const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
let chromium;try{({chromium}=require(process.env.DH_PLAYWRIGHT_CORE||'playwright-core'));}catch(_){}
const executablePath=process.env.DH_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const available=!!chromium && require('node:fs').existsSync(executablePath);
test('card responds to its own width across variants and tabs', {skip:!available,timeout:60000}, async()=>{
 const browser=await chromium.launch({headless:true,executablePath});
 try{const page=await browser.newPage({viewport:{width:1440,height:900}});await page.goto('about:blank');await page.addScriptTag({content:readFileSync('ha-device-health.js','utf8')});
 for(const [viewport,width,lang] of [[320,148,'en'],[390,183,'pl'],[320,320,'en'],[390,390,'pl'],[1280,148,'en'],[1280,500,'en'],[1280,1280,'en'],[1440,1440,'pl']]) for(const variant of ['full','compact','tile']){
  await page.setViewportSize({width:viewport,height:900});
  await page.evaluate(({width,variant,lang})=>{document.body.innerHTML='';const card=document.createElement('ha-device-health');card.style.width=width+'px';card.setConfig({variant,title:'Device Health Visual QA',show_support:false});document.body.append(card);card.hass={language:lang,user:{id:'qa',is_admin:true},connection:{connected:true},states:{'sensor.qa_battery':{entity_id:'sensor.qa_battery',state:'20',attributes:{device_class:'battery',unit_of_measurement:'%',friendly_name:'QA Battery Long Name'}}},areas:{kitchen:{area_id:'kitchen',name:'Kitchen'}},callWS:async ({type})=>type==='config/device_registry/list'?[{id:'qa-device',name:'QA Device With A Long Name',area_id:'kitchen'}]:type==='config/entity_registry/list'?[{entity_id:'sensor.qa_battery',device_id:'qa-device'}]:[]};},{width,variant,lang});
  await page.waitForTimeout(100);
  for(const tab of variant==='full'?['devices','batteries','network','alerts']:['simple']){
   if(tab!=='simple')await page.evaluate(tab=>document.querySelector('ha-device-health').setActiveTab(tab),tab);
   const result=await page.evaluate(()=>{const card=document.querySelector('ha-device-health'),root=card.shadowRoot;const outer=card.getBoundingClientRect();const elements=[...root.querySelectorAll('*')].filter(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0&&!e.closest('[hidden]')&&!e.closest('.table-wrapper')&&(r.left<outer.left-1||r.right>outer.right+1);});return {overflow:elements.map(e=>e.outerHTML.slice(0,250)).slice(0,12),title:(root.querySelector('.card-header')||root.querySelector('.simple-header strong'))?.getBoundingClientRect().width, area:root.querySelector('.area-control select')?.getBoundingClientRect().width,search:root.querySelector('.search-box')?.getBoundingClientRect().width};});
   assert.deepEqual(result.overflow,[],`${width} ${variant} ${tab} ${JSON.stringify(result)}`);assert.ok(result.title>50,`${width} ${variant} title`);if(tab==='devices') {assert.ok(result.area>=44);assert.ok(result.search>=70);}
  }
  if(variant!=='full'){await page.locator('ha-device-health').locator('.simple-open').click();assert.ok(await page.locator('ha-device-health').locator('.area-filter').isVisible());assert.ok(await page.locator('ha-device-health').locator('.simple-close').isVisible());}
 }
 }finally{await browser.close();}
});

test('served bundles stay byte-identical',()=>assert.deepEqual(readFileSync('ha-device-health.js'),readFileSync('custom_components/ha_device_health/www/ha-device-health.js')));
