const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');

function setup() {
  const dom = new JSDOM('', { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
  dom.window.eval(readFileSync(join(__dirname, '..', 'ha-device-health.js'), 'utf8'));
  const card = dom.window.document.createElement('ha-device-health');
  card._activeTab = 'alerts';
  const posts = [], services = [];
  let finish;
  const pending = new Promise(resolve => { finish = resolve; });
  card._registryLoadedAt = Date.now();
  card.hass = { language: 'en', user: { id: 'qa-admin', is_admin: true }, states: {},
    callApi: async (...args) => { posts.push(args); if (posts.length === 1) await pending; },
    callService: async (...args) => { services.push(args); } };
  card._backgroundAlertDialog = { errors: [], automations: [
    { id: 'qa_battery', entityId: 'automation.qa_battery', label: 'Battery', payload: { alias: 'QA battery' } },
    { id: 'qa_offline', entityId: 'automation.qa_offline', label: 'Offline', payload: { alias: 'QA offline' } }
  ] };
  return { dom, card, posts, services, finish };
}

test('a second create while HA is pending does not duplicate automation writes', async () => {
  const { dom, card, posts, services, finish } = setup();
  try {
    const first = card._createBackgroundAlertAutomations();
    const second = card._createBackgroundAlertAutomations();
    assert.equal(posts.length, 1);
    finish(); await Promise.all([first, second]);
    assert.deepEqual(posts.map(p => p[1]), ['config/automation/config/qa_battery', 'config/automation/config/qa_offline']);
    assert.deepEqual(services.map(args => [args[0], args[1], {...args[2]}, args[3], args[4]]), [['automation', 'reload', {}, undefined, false]]);
  } finally { finish(); dom.window.close(); }
});

for (const change of ['role lost', 'different administrator']) {
  test(`${change} during a pending write stops subsequent writes and discards stale results`, async () => {
    const { dom, card, posts, services, finish } = setup();
    try {
      const first = card._createBackgroundAlertAutomations();
      card.hass = { ...card._hass, user: change === 'role lost'
        ? { id: 'qa-admin', is_admin: false } : { id: 'qa-other', is_admin: true } };
      finish(); await first;
      assert.equal(posts.length, 1);
      assert.deepEqual(services, []);
      assert.equal(card._backgroundAlertDialog, null);
      assert.equal(card._backgroundAlertResult, null);
    } finally { finish(); dom.window.close(); }
  });
}

test('ordinary HA and language updates preserve an authorized pending operation', async () => {
  const { dom, card, posts, services, finish } = setup();
  try {
    const first = card._createBackgroundAlertAutomations();
    card.hass = { ...card._hass, language: 'pl', user: { id: 'qa-admin', is_admin: true } };
    finish(); await first;
    assert.equal(posts.length, 2);
    assert.deepEqual(services.map(args => [args[0], args[1], {...args[2]}, args[3], args[4]]), [['automation', 'reload', {}, undefined, false]]);
    assert.equal(card._backgroundAlertDialog.creating, false);
    assert.equal(card._backgroundAlertResult.results.every(r => r.ok), true);
  } finally { finish(); dom.window.close(); }
});

test('losing and regaining admin before a reply never resumes the cancelled operation', async () => {
  const { dom, card, posts, services, finish } = setup();
  try {
    const first = card._createBackgroundAlertAutomations();
    const hass = card._hass;
    card.hass = { ...hass, user: { id: 'qa-admin', is_admin: false } };
    card.hass = hass;
    finish(); await first;
    assert.equal(posts.length, 1);
    assert.deepEqual(services, []);
    assert.equal(card._backgroundAlertDialog, null);
    card._openBackgroundAutomationDialog();
    assert.ok(card._backgroundAlertDialog);
    assert.equal(card._backgroundAlertDialog.creating, undefined);
  } finally { finish(); dom.window.close(); }
});

test('failed writes report failures, skip reload and permit a successful retry', async () => {
  const { dom, card, posts, services, finish } = setup();
  try {
    card._hass.callApi = async (...args) => { posts.push(args); throw Error('QA denied'); };
    await card._createBackgroundAlertAutomations();
    assert.equal(posts.length, 2);
    assert.deepEqual(services, []);
    assert.equal(card._backgroundAlertDialog.creating, false);
    assert.equal(card._backgroundAlertResult.results.every(r => !r.ok), true);
    assert.doesNotMatch(card.shadowRoot.textContent, /QA denied/);
    assert.equal(card._backgroundAlertResult.code, 'unconfirmed');
    card._hass.callApi = async (...args) => { posts.push(args); };
    await card._createBackgroundAlertAutomations();
    assert.equal(posts.length, 4);
    assert.deepEqual(services.map(args => [args[0], args[1], {...args[2]}, args[3], args[4]]), [['automation', 'reload', {}, undefined, false]]);
    assert.equal(card._backgroundAlertResult.results.every(r => r.ok), true);
  } finally { finish(); dom.window.close(); }
});

test('partial success and reload failure stay truthful and release the pending guard', async () => {
  const { dom, card, posts, services, finish } = setup();
  try {
    card._hass.callApi = async (...args) => {
      posts.push(args);
      if (args[1] === 'config/automation/config/qa_offline') throw Error('QA offline denied');
    };
    card._hass.callService = async (...args) => { services.push(args); throw Error('QA reload denied'); };
    await card._createBackgroundAlertAutomations();
    assert.deepEqual(Array.from(card._backgroundAlertResult.results,r=>r.ok), [true,false]);
    assert.equal(card._backgroundAlertResult.reload.ok, false);
    assert.doesNotMatch(card.shadowRoot.textContent, /QA reload denied/);
    assert.equal(card._backgroundAlertResult.code, 'unconfirmed');
    assert.deepEqual(services.map(args => [args[0], args[1], {...args[2]}, args[3], args[4]]), [['automation', 'reload', {}, undefined, false]]);
    card._hass.callService = async (...args) => { services.push(args); };
    await card._createBackgroundAlertAutomations();
    assert.equal(posts.length, 4);
    assert.equal(services.length, 2);
    assert.equal(card._backgroundAlertResult.reload.ok, true);
  } finally { finish(); dom.window.close(); }
});

for (const change of ['disconnect', 'disconnect and reconnect', 'same-user connection replacement']) {
  test(`${change} during a pending write stops subsequent writes and discards stale results`, async () => {
    const { dom, card, posts, services, finish } = setup();
    try {
      dom.window.document.body.append(card);
      const first = card._createBackgroundAlertAutomations();
      if (change.startsWith('disconnect')) {
        card.remove();
        if (change === 'disconnect and reconnect') dom.window.document.body.append(card);
      } else card.hass = { ...card._hass, connection: {} };
      finish(); await first;
      assert.equal(posts.length, 1);
      assert.deepEqual(services, []);
      assert.equal(card._backgroundAlertDialog, null);
      assert.equal(card._backgroundAlertResult, null);
    } finally { finish(); dom.window.close(); }
  });
}

test('connection replacement clears a preview built from the previous session', () => {
 const {dom,card,finish}=setup();
 try {
  dom.window.document.body.append(card);
  const before=card._backgroundAlertDialog;
  assert.ok(before);
  card.hass={...card._hass,connection:{}};
  assert.equal(card._backgroundAlertDialog,null);
  assert.equal(card._backgroundAlertResult,null);
 } finally {finish();dom.window.close();}
});


test('HA structured HTTP errors show a useful status and never stringify an object', async () => {
  const { dom, card, finish } = setup();
  try {
    card._hass.callApi = async () => { throw { error: 'request_failed', status_code: 500, body: null }; };
    await card._createBackgroundAlertAutomations();
    const results = card._backgroundAlertResult.results;
    assert.equal(results.every(r => r.ok === false), true);
    assert.equal(results.every(r => /HTTP 500/.test(r.message)), true);
    assert.equal(results.some(r => r.message.includes('[object Object]')), false);
    card.hass = { ...card._hass, language: 'pl' };
    assert.match(card.shadowRoot.querySelector('.automation-dialog-results').textContent, /Żądanie Home Assistant nie powiodło się \(HTTP 500\)/);
    card._hass.callApi = async () => { throw { message: '<img src=x onerror=alert(1)>' }; };
    await card._createBackgroundAlertAutomations();
    assert.ok(!card.shadowRoot.querySelector('.automation-dialog').textContent.includes('<img src=x onerror=alert(1)>'));
    assert.equal(card.shadowRoot.querySelector('.automation-dialog img'), null, 'raw error content is omitted');
  } finally { finish(); dom.window.close(); }
});

for (const language of ['en', 'pl']) {
  for (const scenario of [
    {name:'all writes and reload accepted', code:'success'},
    {name:'second write explicitly denied', fail:1, error:{status_code:403,message:'RAW_PRIVATE'}, code:'partial', row:'error'},
    {name:'all writes explicitly denied', fail:'all', error:{code:'unauthorized',message:'RAW_PRIVATE'}, code:'error', row:'error'},
    {name:'second write transport unknown', fail:1, error:Error('RAW_PRIVATE'), code:'unconfirmed', row:'unconfirmed'},
    {name:'server may have written before HTTP500', fail:'all', error:{status_code:500,body:{message:'RAW_PRIVATE'}}, code:'unconfirmed', row:'unconfirmed'},
    {name:'string transport error', fail:'all', error:'RAW_PRIVATE', code:'unconfirmed', row:'unconfirmed'},
    {name:'reload explicitly denied after both writes', reloadError:{code:'unauthorized',message:'RAW_PRIVATE'}, code:'partial', reloadCode:'error'},
    {name:'reload response lost after both writes', reloadError:{message:'RAW_PRIVATE'}, code:'unconfirmed', reloadCode:'unconfirmed'},
    {name:'empty preview performs no operations', empty:true, code:'no_data'},
  ]) {
    test(`${language}: ${scenario.name} has truthful durable W4 result`,async()=>{
      const {dom,card,posts,services,finish}=setup();
      try {
        card.hass={...card._hass,language};
        if(scenario.empty)card._backgroundAlertDialog.automations=[];
        card._hass.callApi=async(...args)=>{const index=posts.length;posts.push(args);if(scenario.fail==='all'||scenario.fail===index)throw scenario.error;};
        card._hass.callService=async(...args)=>{services.push(args);if(scenario.reloadError)throw scenario.reloadError;};
        await card._createBackgroundAlertAutomations();
        const result=card._backgroundAlertResult;
        assert.equal(result.code,scenario.code);
        if(scenario.row)assert.ok(result.results.some(r=>r.code===scenario.row));
        if(scenario.reloadCode)assert.equal(result.reload.code,scenario.reloadCode);
        const container=card.shadowRoot.querySelector('.automation-dialog-results');
        assert.equal(container.querySelector('[data-background-result]').dataset.backgroundResult,scenario.code);
        const label={success:['Success','Sukces'],partial:['Partial','Częściowo'],unconfirmed:['Unconfirmed','Niepotwierdzony'],error:['Error','Błąd'],no_data:['No data','Brak danych']}[scenario.code][language==='pl'?1:0];
        assert.ok(container.textContent.includes(label));
        assert.doesNotMatch(card.shadowRoot.textContent,/RAW_PRIVATE/);
        assert.doesNotMatch(JSON.stringify(result),/RAW_PRIVATE/);
        assert.equal(posts.length,scenario.empty?0:2,'no automatic retries');
        assert.equal(services.length,scenario.empty||scenario.fail==='all'?0:1);
        if(services.length)assert.equal(services[0][4],false,'native HA error toast cannot leak raw service errors');
        card._backgroundAlertDialog=null;card._render();
        assert.equal(card.shadowRoot.querySelector('.automation-result-summary [data-background-result]').dataset.backgroundResult,scenario.code);
        const alternate=language==='en'?'pl':'en';card.hass={...card._hass,language:alternate};
        assert.equal(card._backgroundAlertResult,result,'locale changes do not lose results or repeat writes');
      }finally{finish();dom.window.close();}
    });
  }
}

test('pending writes show Not checked and retain one in-flight operation',async()=>{
  const {dom,card,posts,finish}=setup();
  try {
    const first=card._createBackgroundAlertAutomations();
    const during=card.shadowRoot.querySelector('.automation-dialog-results [data-background-result]')?.dataset.backgroundResult;
    const repeated=card._createBackgroundAlertAutomations();
    finish();await Promise.all([first,repeated]);
    assert.equal(during,'not_checked');assert.equal(posts.length,2);assert.equal(card._backgroundAlertResult.code,'success');
  }finally{finish();dom.window.close();}
});
