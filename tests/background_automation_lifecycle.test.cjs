const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');

function setup() {
  const dom = new JSDOM('', { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
  dom.window.eval(readFileSync(join(__dirname, '..', 'ha-device-health.js'), 'utf8'));
  const card = dom.window.document.createElement('ha-device-health');
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
