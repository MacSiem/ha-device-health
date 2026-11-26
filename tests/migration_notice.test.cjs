const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');

function setup(language = 'en', is_admin = true) {
  const dom = new JSDOM('', { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
  dom.window.eval(readFileSync(join(__dirname, '..', 'ha-device-health.js'), 'utf8'));
  const hass = { language, user: { id: 'test', is_admin }, connection: {}, states: {} };
  const mount = () => { const card = dom.window.document.createElement('ha-device-health'); card.setConfig({ show_support: false }); dom.window.document.body.append(card); card.hass = hass; return card; };
  return { dom, hass, mount };
}

test('administrators see localized notice with installation link and viewer does not', () => {
  for (const [lang, expected] of [['en', 'planned to move'], ['pl', 'Planowane jest przeniesienie']]) {
    const { dom, hass, mount } = setup(lang);
    try {
      const card = mount(); const notice = card.shadowRoot.querySelector('.migration-notice');
      assert.ok(notice.textContent.includes(expected));
      assert.equal(notice.querySelector('a').getAttribute('href'), 'https://github.com/MacSiem/ha-device-health#installation');
      card.hass = { ...hass, user: { ...hass.user, is_admin: false } };
      assert.equal(card.shadowRoot.querySelector('.migration-notice'), null);
    } finally { dom.window.close(); }
  }
});

test('dismissal survives updates, language change and card recreation', () => {
  const { dom, hass, mount } = setup();
  try {
    const card = mount(); card.shadowRoot.querySelector('.migration-dismiss').click();
    assert.equal(card.shadowRoot.querySelector('.migration-notice'), null);
    card.hass = { ...hass, language: 'pl', states: {} };
    assert.equal(card.shadowRoot.querySelector('.migration-notice'), null);
    card.remove();
    assert.equal(mount().shadowRoot.querySelector('.migration-notice'), null);
    assert.equal(dom.window.localStorage.getItem('ha-device-health-migration-notice-v1-dismissed'), '1');
  } finally { dom.window.close(); }
});
