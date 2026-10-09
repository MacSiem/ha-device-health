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
    assert.deepEqual(services, [['automation', 'reload']]);
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
    assert.deepEqual(services, [['automation', 'reload']]);
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
    assert.match(card.shadowRoot.textContent, /QA denied/);
    card._hass.callApi = async (...args) => { posts.push(args); };
    await card._createBackgroundAlertAutomations();
    assert.equal(posts.length, 4);
    assert.deepEqual(services, [['automation', 'reload']]);
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
    assert.match(card.shadowRoot.textContent, /QA reload denied/);
    assert.deepEqual(services, [['automation', 'reload']]);
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
    card._hass.callApi = async () => { throw { message: '<img src=x onerror=alert(1)>' }; };
    await card._createBackgroundAlertAutomations();
    assert.equal(card.shadowRoot.querySelector('.automation-results img'), null, 'known error text remains escaped');
  } finally { finish(); dom.window.close(); }
});
