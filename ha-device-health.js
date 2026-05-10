/* HA Tools split — ha-device-health v4.0.0 (2026-05-10) — single-tool standalone repo */
(function() {
'use strict';

// -- HA Tools Escape Function --
const _esc = window._haToolsEsc || (s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'));

// -- HA Tools Persistence (stub -- full impl in ha-tools-panel.js) --
window._haToolsPersistence = window._haToolsPersistence || { _cache: {}, _hass: null, setHass(h) { this._hass = h; }, async save(k, d) { try { localStorage.setItem('ha-device-health-' + k, JSON.stringify(d)); } catch(e) { console.debug('[ha-device-health] caught:', e); } }, async load(k) { try { const r = localStorage.getItem('ha-device-health-' + k); return r ? JSON.parse(r) : null; } catch(e) { return null; } }, loadSync(k) { try { const r = localStorage.getItem('ha-device-health-' + k); return r ? JSON.parse(r) : null; } catch(e) { return null; } } };

/* ===== HA Tools split — inline shared infrastructure ===== */
// Bento Design System CSS (inline copy — keeps tool standalone)
if (typeof window !== 'undefined' && !window.HAToolsBentoCSS) {
  window.HAToolsBentoCSS = `
/* ═══════════════════════════════════════════════
   HA Tools — Bento Design System v1.0
   ═══════════════════════════════════════════════ */

/* ── CSS Custom Properties ───────────────────── */
:host {
  /* Primary palette */
  --bento-primary: #3B82F6;
  --bento-primary-hover: #2563EB;
  --bento-primary-light: rgba(59, 130, 246, 0.08);
  --bento-success: #10B981;
  --bento-success-light: rgba(16, 185, 129, 0.08);
  --bento-error: #EF4444;
  --bento-error-light: rgba(239, 68, 68, 0.08);
  --bento-warning: #F59E0B;
  --bento-warning-light: rgba(245, 158, 11, 0.08);

  /* Theme — maps to HA theme vars with light fallbacks */
  --bento-bg: var(--primary-background-color, #F8FAFC);
  --bento-card: var(--card-background-color, #FFFFFF);
  --bento-border: var(--divider-color, #E2E8F0);
  --bento-text: var(--primary-text-color, #1E293B);
  --bento-text-secondary: var(--secondary-text-color, #64748B);
  --bento-text-muted: var(--disabled-text-color, #94A3B8);

  /* Radii */
  --bento-radius-xs: 6px;
  --bento-radius-sm: 10px;
  --bento-radius-md: 16px;

  /* Shadows */
  --bento-shadow-sm: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06);
  --bento-shadow-md: 0 4px 12px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.04);
  --bento-shadow-lg: 0 8px 25px rgba(0,0,0,0.06), 0 4px 10px rgba(0,0,0,0.04);

  /* Transition */
  --bento-transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  /* Typography */
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  display: block;
  color: var(--bento-text);
}

/* ── Dark mode ───────────────────────────────── */
@media (prefers-color-scheme: dark) {
  :host {
    --bento-bg: var(--primary-background-color, #1a1a2e);
    --bento-card: var(--card-background-color, #16213e);
    --bento-border: var(--divider-color, #2a2a4a);
    --bento-text: var(--primary-text-color, #e0e0e0);
    --bento-text-secondary: var(--secondary-text-color, #a0a0b0);
    --bento-text-muted: var(--disabled-text-color, #6a6a7a);
    --bento-shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
    --bento-shadow-md: 0 4px 12px rgba(0,0,0,0.4);
    --bento-primary-light: rgba(59,130,246,0.15);
    --bento-success-light: rgba(16,185,129,0.15);
    --bento-error-light: rgba(239,68,68,0.15);
    --bento-warning-light: rgba(245,158,11,0.15);
    color-scheme: dark !important;
  }
  .card, .card-container, .main-card, .exporter-card, .security-card, .reports-card, .storage-card, .chore-card, .cry-card, .backup-card, .network-card, .sentence-card, .energy-card, .panel-card {
    background: var(--bento-card) !important; color: var(--bento-text) !important; border-color: var(--bento-border) !important;
  }
  input, select, textarea { background: var(--bento-bg); color: var(--bento-text); border-color: var(--bento-border); }
  .stat, .stat-card, .summary-card, .metric-card, .kpi-card, .health-card { background: var(--bento-bg); border-color: var(--bento-border); }
  .tab-content, .section { color: var(--bento-text); }
  table th { background: var(--bento-bg); color: var(--bento-text-secondary); border-color: var(--bento-border); }
  table td { color: var(--bento-text); border-color: var(--bento-border); }
  tr:hover td { background: rgba(59,130,246,0.08); }
  .empty-state, .no-data { color: var(--bento-text-secondary); }
  .schedule-section, .settings-section, .detail-panel, .details, .device-detail { background: var(--bento-bg); border-color: var(--bento-border); }
  .addon-list, .content-item { background: rgba(255,255,255,0.05); }
  .chart-container { background: var(--bento-bg); border-color: var(--bento-border); }
  pre, code { background: #1e293b !important; color: #e2e8f0 !important; }
}

/* ── Reset ───────────────────────────────────── */
* { box-sizing: border-box; }

/* ── Main Card Wrapper ───────────────────────── */
.card {
  background: var(--bento-card);
  border: 1px solid var(--bento-border);
  border-radius: var(--bento-radius-md);
  box-shadow: var(--bento-shadow-sm);
  color: var(--bento-text);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* ── Header ──────────────────────────────────── */
.header {
  padding: 16px 20px 0;
  display: flex;
  align-items: center;
  gap: 10px;
}
.header-icon { font-size: 22px; }
.header-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--bento-text);
}
.header-badge {
  margin-left: auto;
  background: var(--bento-border);
  color: var(--bento-text-secondary);
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 20px;
  font-weight: 500;
}
.content { padding: 16px 20px 20px; }

/* ── Tabs (Bento unified) ────────────────────── */
.tabs, .tab-bar, .tab-nav, .tab-header {
  display: flex !important;
  gap: 4px !important;
  border-bottom: 2px solid var(--bento-border, var(--divider-color, #334155)) !important;
  padding: 0 4px !important;
  margin-bottom: 20px !important;
  overflow-x: auto !important; overflow-y: hidden !important; -webkit-overflow-scrolling: touch !important;
  flex-wrap: nowrap !important;
}
.tab, .tab-btn, .tab-button, .dtab {
  padding: 10px 18px !important;
  border: none !important;
  background: transparent !important;
  cursor: pointer !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  font-family: 'Inter', sans-serif !important;
  color: var(--bento-text-secondary, var(--secondary-text-color, #94A3B8)) !important;
  border-bottom: 2px solid transparent !important;
  margin-bottom: -2px !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
  white-space: nowrap !important;
  border-radius: 0 !important;
  flex: none !important;
}
.tab:hover, .tab-btn:hover, .tab-button:hover, .dtab:hover {
  color: var(--bento-primary, #3B82F6) !important;
  background: rgba(59, 130, 246, 0.08) !important;
}
.tab.active, .tab-btn.active, .tab-button.active, .dtab.active {
  color: var(--bento-primary, #3B82F6) !important;
  border-bottom-color: var(--bento-primary, #3B82F6) !important;
  background: rgba(59, 130, 246, 0.04) !important;
  font-weight: 600 !important;
}

/* ── Tab content animation ───────────────────── */
.tab-content {
  display: block;
}
.tab-content.active {
  animation: bentoFadeIn 0.3s ease-out;
}
@keyframes bentoFadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Stat / KPI cards ────────────────────────── */
.stat-card, .stat-item, .metric-card, .kpi-card {
  background: var(--bento-card, var(--card-background-color, #1E293B)) !important;
  border: 1px solid var(--bento-border, var(--divider-color, #334155)) !important;
  border-radius: var(--bento-radius-sm, 10px) !important;
  padding: 16px !important;
  text-align: center !important;
  transition: var(--bento-transition);
}
.stat-card:hover, .stat-item:hover, .metric-card:hover, .kpi-card:hover {
  box-shadow: var(--bento-shadow-md);
}
.stat-icon { font-size: 20px; margin-bottom: 4px; }
.stat-value, .stat-val, .metric-value, .kpi-val {
  font-size: 22px;
  font-weight: 700;
  color: var(--bento-text);
}
.stat-label, .stat-lbl, .metric-label, .kpi-lbl {
  font-size: 11px;
  color: var(--bento-text-secondary);
  margin-top: 2px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
}

/* ── Overview grid (2×2 stat layout) ─────────── */
.overview-grid, .stats-grid, .summary-grid, .stat-cards, .kpi-grid, .metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 16px;
}

/* ── Section headers ─────────────────────────── */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: var(--bento-text-secondary);
  text-transform: uppercase;
  letter-spacing: .5px;
  margin: 12px 0 8px;
}

/* ── Loading / Empty / Info ──────────────────── */
.loading-bar {
  height: 3px;
  background: linear-gradient(90deg, var(--bento-primary), transparent);
  border-radius: 2px;
  animation: bentoLoad 1s infinite;
  margin-bottom: 8px;
}
@keyframes bentoLoad { 0% { background-position: 0; } 100% { background-position: 200px; } }

.empty-state, .no-data, .no-results {
  text-align: center;
  color: var(--bento-text-secondary);
  padding: 32px 16px;
  font-size: 13px;
  background: var(--bento-bg);
  border-radius: var(--bento-radius-sm);
}
.info-note, .tip-box {
  font-size: 12px;
  color: var(--bento-text-secondary);
  background: var(--bento-bg);
  border-radius: var(--bento-radius-sm);
  padding: 8px 10px;
  border-left: 3px solid var(--bento-primary);
  margin-top: 8px;
}
.last-updated {
  font-size: 11px;
  color: var(--bento-text-muted);
  text-align: right;
  margin-top: 8px;
}

/* ── Buttons ─────────────────────────────────── */
.refresh-btn {
  background: var(--bento-border);
  border: none;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 11px;
  color: var(--bento-text-secondary);
  cursor: pointer;
  font-weight: 500;
  transition: var(--bento-transition);
}
.refresh-btn:hover { background: var(--bento-primary); color: white; }

.toggle-btn, .action-btn {
  background: var(--bento-primary);
  border: none;
  border-radius: 6px;
  padding: 5px 12px;
  font-size: 12px;
  color: white;
  cursor: pointer;
  font-weight: 500;
  transition: var(--bento-transition);
}
.toggle-btn:hover, .action-btn:hover { opacity: .85; }

.send-btn, .btn-primary {
  width: 100%;
  background: var(--bento-primary);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--bento-transition);
}
.send-btn:hover, .btn-primary:hover {
  background: var(--bento-primary-hover);
  transform: translateY(-1px);
}
.send-btn:active, .btn-primary:active { transform: translateY(0); }
.send-btn:disabled, .btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* ── Badges / Status ─────────────────────────── */
.badge, .status-badge, .tag, .chip {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  display: inline-block;
}
.badge-ok, .badge-success { background: var(--bento-success-light); color: var(--bento-success); }
.badge-er, .badge-error   { background: var(--bento-error-light);   color: var(--bento-error); }
.badge-warn, .badge-warning { background: var(--bento-warning-light); color: var(--bento-warning); }
.badge-info { background: var(--bento-primary-light); color: var(--bento-primary); }

/* ── Count badges (inline) ───────────────────── */
.count-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
}
.error-badge { background: rgba(239,68,68,0.13); color: var(--bento-error); }
.warn-badge  { background: rgba(245,158,11,0.13); color: var(--bento-warning); }
.info-badge  { background: rgba(59,130,246,0.13); color: var(--bento-primary); }
.ok-badge    { background: rgba(16,185,129,0.13); color: var(--bento-success); }

/* ── Tables ───────────────────────────────────── */
table { width: 100%; border-collapse: separate; border-spacing: 0; }
th {
  background: var(--bento-bg);
  color: var(--bento-text-secondary);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 10px 14px;
  text-align: left;
  border-bottom: 2px solid var(--bento-border);
}
td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--bento-border);
  color: var(--bento-text);
  font-size: 13px;
}
tr:hover td { background: var(--bento-primary-light); }

/* ── Forms / Inputs ──────────────────────────── */
input, select, textarea {
  padding: 8px 12px;
  border: 1.5px solid var(--bento-border);
  border-radius: var(--bento-radius-xs);
  background: var(--bento-card);
  color: var(--bento-text);
  font-size: 13px;
  font-family: 'Inter', sans-serif;
  transition: var(--bento-transition);
  outline: none;
}
input:focus, select:focus, textarea:focus {
  border-color: var(--bento-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* ── Code blocks ─────────────────────────────── */
code {
  background: var(--bento-border);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 12px;
}
pre {
  background: #1e293b;
  color: #e2e8f0;
  padding: 12px;
  border-radius: 8px;
  font-size: 12px;
  overflow-x: auto;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

/* ── Grid layouts ────────────────────────────── */
.schedule-grid, .send-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.schedule-card, .send-card, .info-card {
  background: var(--bento-bg);
  border: 1px solid var(--bento-border);
  border-radius: var(--bento-radius-sm);
  padding: 14px;
}

/* ── Log entries ─────────────────────────────── */
.log-entry {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 4px 6px;
  padding: 8px;
  border-radius: var(--bento-radius-sm);
  margin-bottom: 4px;
  font-size: 12px;
  min-width: 0;
  overflow: hidden;
}
.error-entry { background: var(--bento-error-light); border: 1px solid rgba(239,68,68,0.13); }
.warn-entry  { background: var(--bento-warning-light); border: 1px solid rgba(245,158,11,0.13); }
.log-time { color: var(--bento-text-muted); flex-shrink: 0; }
.log-domain {
  font-weight: 600;
  flex-shrink: 1;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-all;
}
.error-domain { color: var(--bento-error); }
.warn-domain  { color: var(--bento-warning); }
.log-msg {
  color: var(--bento-text-secondary);
  flex-basis: 100%;
  word-break: break-word;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  min-width: 0;
}

/* ── Send status ─────────────────────────────── */
.send-status {
  padding: 10px 14px;
  border-radius: var(--bento-radius-sm);
  margin-top: 12px;
  font-size: 13px;
  font-weight: 500;
  text-align: center;
}
.send-status.sending { background: var(--bento-primary-light); color: var(--bento-primary); }
.send-status.success { background: var(--bento-success-light); color: var(--bento-success); }
.send-status.error   { background: var(--bento-error-light);   color: var(--bento-error); }

/* ── Scrollbar ───────────────────────────────── */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--bento-border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--bento-text-muted); }

/* ── Animations ──────────────────────────────── */
@keyframes bentoSpin { to { transform: rotate(360deg); } }
@keyframes bentoPulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }

/* ── Mobile — 768 px ─────────────────────────── */
@media (max-width: 768px) {
  .content { padding: 12px; }
  .tabs { flex-wrap: nowrap !important; overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; gap: 2px !important; }
  .tab, .tab-button, .tab-btn { padding: 6px 10px !important; font-size: 12px !important; white-space: nowrap !important; }
  .overview-grid, .stats-grid, .summary-grid, .stat-cards, .kpi-grid, .metrics-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .stat-value, .stat-val, .kpi-val, .metric-val { font-size: 18px !important; }
  .stat-label, .stat-lbl, .kpi-lbl, .metric-lbl { font-size: 10px !important; }
  .send-grid, .schedule-grid { grid-template-columns: 1fr; }
  .log-entry { flex-wrap: wrap; gap: 2px 6px; }
  .log-domain { max-width: 60%; font-size: 11px; }
  .log-msg { flex-basis: 100%; max-width: 100%; overflow-wrap: anywhere; font-size: 11px; }
  pre { white-space: pre-wrap; word-break: break-all; max-width: calc(100vw - 80px); overflow-x: auto; }
  .panels, .board { flex-direction: column; }
  .column { min-width: unset; }
  h2 { font-size: 18px; }
  h3 { font-size: 15px; }
}

/* ── Mobile — 480 px ─────────────────────────── */
@media (max-width: 480px) {
  .tabs { gap: 1px !important; }
  .tab, .tab-button, .tab-btn { padding: 5px 8px !important; font-size: 11px !important; }
  .overview-grid, .stats-grid, .summary-grid { grid-template-columns: 1fr 1fr; }
  .stat-value, .stat-val, .kpi-val { font-size: 16px !important; }
}
`;
}
// XSS escape singleton (idempotent)
if (typeof window !== 'undefined') {
  window._haToolsEsc = window._haToolsEsc || (function(){
    var MAP = {};
    MAP[String.fromCharCode(38)] = '&amp;';
    MAP[String.fromCharCode(60)] = '&lt;';
    MAP[String.fromCharCode(62)] = '&gt;';
    MAP[String.fromCharCode(34)] = '&quot;';
    MAP[String.fromCharCode(39)] = '&#39;';
    return function(s){ return typeof s === 'string' ? s.replace(/[&<>"']/g, function(c){ return MAP[c]; }) : (s == null ? '' : s); };
  })();
}
// Universal donate footer injector — guarantees the support box appears
// on every split-tool card regardless of internal render state.
if (typeof window !== 'undefined' && !window.__haToolsSplitDonateInjector) {
  window.__haToolsSplitDonateInjector = true;
  var SPLIT_TAGS = ['ha-purge-cache','ha-yaml-checker','ha-data-exporter','ha-baby-tracker','ha-chore-tracker','ha-energy-optimizer','ha-energy-insights','ha-energy-email','ha-log-email','ha-smart-reports','ha-network-map','ha-trace-viewer','ha-automation-analyzer','ha-storage-monitor','ha-backup-manager','ha-security-check','ha-device-health','ha-sentence-manager','ha-encoding-fixer','ha-entity-renamer','ha-frigate-privacy','ha-vacuum-water-monitor'];
  var DONATE_HTML = ''
    + '<div class="donate-section" data-source="ha-tools-split-injector">'
    + '  <div class="donate-text">'
    + '    <h3>❤️ Support HA Tools Development</h3>'
    + '    <p>If this tool makes your Home Assistant life easier, consider supporting the project. Every coffee motivates further development!</p>'
    + '  </div>'
    + '  <div class="donate-buttons">'
    + '    <a class="donate-btn coffee" href="https://buymeacoffee.com/macsiem" target="_blank" rel="noopener noreferrer">☕ Buy Me a Coffee</a>'
    + '    <a class="donate-btn paypal" href="https://www.paypal.com/donate/?hosted_button_id=Y967H4PLRBN8W" target="_blank" rel="noopener noreferrer">💳 PayPal</a>'
    + '  </div>'
    + '</div>';
  function deepFindAll(tag, root) {
    var out = [];
    (function walk(node){
      if (!node || !node.querySelectorAll) return;
      var children = node.querySelectorAll('*');
      for (var i = 0; i < children.length; i++) {
        var c = children[i];
        if (c.tagName && c.tagName.toLowerCase() === tag) out.push(c);
        if (c.shadowRoot) walk(c.shadowRoot);
      }
    })(root || document);
    return out;
  }
  function injectAll() {
    SPLIT_TAGS.forEach(function(tag){
      deepFindAll(tag).forEach(function(el){
        // panel_custom auto-init: HA assigns hass/panel/narrow but does not always call setConfig.
        // Many split tools gate their first render on setConfig. Call it whenever the element
        // is mounted but still has no config — this naturally retries on the next poll if
        // the first attempt fails (e.g. setConfig depends on hass which has not arrived yet).
        if (typeof el.setConfig === 'function' && !el.config && !el._config) {
          try { el.setConfig({ type: 'custom:' + tag, title: tag }); } catch(e) {}
        }
        if (!el.shadowRoot) return;
        if (el.shadowRoot.querySelector('.donate-section')) return;
        var target = el.shadowRoot.querySelector('.card, .card-container, .main-card, [class$="-card"]') || el.shadowRoot.firstElementChild || el.shadowRoot;
        try { target.insertAdjacentHTML('beforeend', DONATE_HTML); } catch(e) {}
      });
    });
  }
  // Run immediately, then aggressive MutationObserver for late mounts + view switches.
  injectAll();
  setTimeout(injectAll, 250);
  setTimeout(injectAll, 1000);
  setTimeout(injectAll, 3000);
  // MutationObserver catches every new node anywhere in the DOM, including shadow root attachments
  // that are deferred until the user navigates to a view.
  try {
    var obs = new MutationObserver(function(muts){
      // Debounce: schedule a microtask injection
      if (window.__haToolsDonateScheduled) return;
      window.__haToolsDonateScheduled = true;
      setTimeout(function(){ window.__haToolsDonateScheduled = false; injectAll(); }, 100);
    });
    obs.observe(document.body, { childList: true, subtree: true });
  } catch(e) {}
  // Also re-inject on hash/path change (Lovelace view switches)
  window.addEventListener('hashchange', function(){ setTimeout(injectAll, 200); });
  window.addEventListener('popstate', function(){ setTimeout(injectAll, 200); });
  // Backup interval (every 3s for first 5min — handles cases where MutationObserver missed events)
  var pollCount = 0;
  var pollInterval = setInterval(function(){
    injectAll();
    if (++pollCount >= 100) clearInterval(pollInterval);
  }, 3000);
}
/* ============================================================ */

class HADeviceHealth extends HTMLElement {
  constructor() {
    super();
    this._lang = (navigator.language || '').startsWith('pl') ? 'pl' : 'en';
    this.attachShadow({ mode: "open" });
    this._toolId = this.tagName.toLowerCase().replace('ha-', '');
    this._config = {};
    this._hass = null;
    this._activeTab = "devices";
    this._deviceFilter = "all";
    this._searchQuery = "";
    this._groupByDomain = false;
    this._sortBy = "name";
    this._batterySortBy = "level";
    this._alerts = [];
    this._alertHistory = [];
    this._acknowledgedAlerts = new Set();
    this._lastUpdate = Date.now();
    this._currentPage = 1;
    this._pageSize = 15;
    // Separate pagination for each tab
    this._batteryPage = 1;
    this._batteryPageSize = 15;
    this._networkPage = 1;
    this._networkPageSize = 15;
    this._alertsPage = 1;
    this._alertsPageSize = 15;
    // Throttle control
    this._renderScheduled = false;
    this._firstRender = true;
    this._throttleMs = 5000;
    this._lastRenderTime = 0;
    this._cachedStateHash = '';
    // DOM optimization
    this._domBuilt = false;
    this._scrollPosition = 0;
    this._tabsScroll = 0;
  }

  static get _translations() {
    return {
      en: {
        deviceHealth: "Device Health",
        devices: "Devices",
        batteries: "Batteries",
        network: "Network",
        alerts: "Alerts",
        searchDevices: "Search devices...",
        all: "All",
        online: "Online",
        offline: "Offline",
        unavailable: "Unavailable",
        toggleGrouping: "Toggle Grouping",
        totalDevices: "Total Devices",
        availability: "Availability",
        name: "Name",
        type: "Type",
        status: "Status",
        lastSeen: "Last Seen",
        uptime: "Uptime",
        levelWorstFirst: "Level (Worst First)",
        batteryHealthSummary: "Battery Health Summary",
        deviceNeedAttention: "device(s) need attention",
        lastChanged: "Last changed",
        networkDevices: "Devices",
        signalStrengthDist: "Signal Strength Distribution",
        activeAlerts: "Active Alerts",
        noActiveAlerts: "No active alerts",
        alertHistory: "Alert History (Last 20)",
        dismiss: "Dismiss",
        page: "Page",
        of: "of",
        itemsPerPage: "Items per page",
        previous: "Previous",
        next: "Next",
      },
      pl: {
        deviceHealth: "Zdrowie Urządzeń",
        devices: "Urządzenia",
        batteries: "Baterie",
        network: "Sieć",
        alerts: "Alerty",
        searchDevices: "Szukaj urządzeń...",
        all: "Wszystkie",
        online: "Online",
        offline: "Offline",
        unavailable: "Niedostępne",
        toggleGrouping: "Przełącz Grupowanie",
        totalDevices: "Razem Urządzeń",
        availability: "Dostępność",
        name: "Nazwa",
        type: "Typ",
        status: "Status",
        lastSeen: "Ostatnio Widziane",
        uptime: "Czas Pracy",
        levelWorstFirst: "Poziom (Najgorsze Pierwsze)",
        batteryHealthSummary: "Podsumowanie Zdrowia Baterii",
        deviceNeedAttention: "urządzenie(ń) wymaga uwagi",
        lastChanged: "Ostatnio zmienione",
        networkDevices: "Urządzenia",
        signalStrengthDist: "Rozkład Siły Sygnału (dBm)",
        activeAlerts: "Aktywne Alerty",
        noActiveAlerts: "Brak aktywnych alertów",
        alertHistory: "Historia Alertów (Ostatnie 20)",
        dismiss: "Odrzuć",
        page: "Strona",
        of: "z",
        itemsPerPage: "Elementów na stronie",
        previous: "Poprzednia",
        next: "Następna",
      },
    };
  }

  _t(key) {
    const lang = this._hass?.language || 'en';
    const T = HADeviceHealth._translations;
    return (T[lang] || T['en'])[key] || T['en'][key] || key;
  }

  setConfig(config) {
    this._config = {
      title: "Device Health",
      battery_warning: 30,
      battery_critical: 10,
      offline_alert_minutes: 60,
      ...config,
    };
    // Load persisted UI state
    try {
      const _saved = localStorage.getItem('ha-tools-device-health-settings');
      if (_saved) {
        const _s = JSON.parse(_saved);
        if (_s._activeTab) this._activeTab = _s._activeTab;
      }
    } catch(e) { console.debug('[ha-device-health] caught:', e); }
  }

  _computeStateHash() {
    // Build a lightweight hash from device tracker states only
    if (!this._hass || !this._hass.states) return '';
    const keys = Object.keys(this._hass.states).filter(k => k.startsWith('device_tracker.') || k.startsWith('sensor.') && (k.includes('battery') || k.includes('signal') || k.includes('rssi')));
    let h = '';
    for (const k of keys) {
      const s = this._hass.states[k];
      h += k + ':' + s.state + ':' + (s.last_changed || '') + '|';
    }
    return h;
  }

  set hass(hass) {
    if (hass?.language) this._lang = hass.language.startsWith('pl') ? 'pl' : 'en';
    this._hass = hass;
    if (window._haToolsPersistence) window._haToolsPersistence.setHass(hass);
    if (this._firstRender) {
      this._firstRender = false;
      this._cachedStateHash = this._computeStateHash();
      this._generateAlerts();
      this._render();
      return;
    }
    // Check if relevant state actually changed
    const newHash = this._computeStateHash();
    if (newHash === this._cachedStateHash) return;
    this._cachedStateHash = newHash;
    // Throttle: only re-render every _throttleMs
    const now = Date.now();
    if (now - this._lastRenderTime < this._throttleMs) {
      if (!this._renderScheduled) {
        this._renderScheduled = true;
        setTimeout(() => {
          this._renderScheduled = false;
          this._generateAlerts();
          if (this._domBuilt) {
            this._updateContent();
          } else {
            this._render();
          }
        }, this._throttleMs - (now - this._lastRenderTime));
      }
      return;
    }
    this._generateAlerts();
    if (this._domBuilt) {
      this._updateContent();
    } else {
      this._render();
    }
  }

  _sanitize(s) { try { return decodeURIComponent(escape(s)); } catch(e) { return s; } }

  _update() {
    this._generateAlerts();
    this._render();
  }

  _getDevices() {
    const devices = [];

    if (!this._hass || !this._hass.states) {
      return this._getDemoDevices();
    }

    const states = this._hass.states;
    const seenEntities = new Set();

    // Collect device_tracker entities
    Object.keys(states).forEach((entityId) => {
      if (entityId.startsWith("device_tracker.")) {
        const state = states[entityId];
        seenEntities.add(entityId);
        devices.push({
          id: entityId,
          name: this._formatEntityName(entityId),
          type: "device_tracker",
          status: state.state === "home" ? "online" : state.state === "not_home" ? "offline" : "unavailable",
          lastSeen: state.attributes.last_seen || state.last_changed,
          uptime: this._calculateUptime(state.last_changed),
          domain: "device_tracker",
        });
      }
    });

    // Collect switch/light/sensor devices
    Object.keys(states).forEach((entityId) => {
      const domain = entityId.split(".")[0];
      if (["switch", "light", "climate", "sensor"].includes(domain) && !entityId.includes("_battery") && !entityId.includes("_signal")) {
        const state = states[entityId];
        seenEntities.add(entityId);
        const isAvailable = state.state !== "unavailable" && state.state !== "unknown";
        devices.push({
          id: entityId,
          name: this._sanitize(state.attributes.friendly_name || this._formatEntityName(entityId)),
          type: domain,
          status: !isAvailable ? "unavailable" : state.state === "off" || state.state === "unknown" ? "offline" : "online",
          lastSeen: state.last_changed,
          uptime: this._calculateUptime(state.last_changed),
          domain: domain,
        });
      }
    });

    return devices.length > 0 ? devices : this._getDemoDevices();
  }

  _getBatteryDevices() {
    const batteries = [];

    if (!this._hass || !this._hass.states) {
      return this._getDemoBatteries();
    }

    const states = this._hass.states;

    Object.keys(states).forEach((entityId) => {
      if (entityId.includes("_battery") || entityId.includes("battery_level")) {
        const state = states[entityId];
        const level = parseInt(state.state);

        if (!isNaN(level)) {
          batteries.push({
            id: entityId,
            name: this._sanitize(state.attributes.friendly_name || this._formatEntityName(entityId)),
            level: level,
            lastChanged: state.last_changed,
            device: this._sanitize(state.attributes.device_name || this._extractDeviceName(entityId)),
          });
        }
      }
    });

    return batteries.length > 0 ? batteries : this._getDemoBatteries();
  }

  _getNetworkDevices() {
    const networks = {};

    if (!this._hass || !this._hass.states) {
      return this._getDemoNetworks();
    }

    const states = this._hass.states;

    // Method 1: Find entities with signal/rssi in entity ID
    Object.keys(states).forEach((entityId) => {
      if (entityId.includes("_signal") || entityId.includes("signal_strength") || entityId.includes("rssi")) {
        const state = states[entityId];
        const rssi = parseInt(state.state);
        if (!isNaN(rssi)) {
          const protocol = this._detectProtocol(entityId);
          if (!networks[protocol]) networks[protocol] = [];
          networks[protocol].push({
            id: entityId,
            name: this._sanitize(state.attributes.friendly_name || this._formatEntityName(entityId)),
            rssi: rssi,
            device: this._sanitize(state.attributes.device_name || this._extractDeviceName(entityId)),
          });
        }
      }
    });

    // Method 2: Find entities with network ATTRIBUTES (mac, ip, ssid, rssi)
    Object.entries(states).forEach(([entityId, state]) => {
      const a = state.attributes || {};
      const mac = a.mac || a.mac_address || a.host_mac || '';
      const ip = a.ip || a.ip_address || a.local_ip || '';
      const ssid = a.essid || a.ssid || a.wifi_name || '';
      const rssi = a.rssi || a.signal_strength || a.wifi_signal;
      const connType = a.connection_type || (a.is_wired ? 'ethernet' : (ssid ? 'wifi' : ''));

      if (mac || ip || ssid || (rssi !== undefined && rssi !== null)) {
        const protocol = connType === 'ethernet' ? 'Ethernet' : (ssid ? 'WiFi' : this._detectProtocol(entityId));
        if (!networks[protocol]) networks[protocol] = [];
        // Avoid duplicates
        if (!networks[protocol].find(d => d.id === entityId)) {
          networks[protocol].push({
            id: entityId,
            name: this._sanitize(a.friendly_name || this._formatEntityName(entityId)),
            rssi: typeof rssi === 'number' ? rssi : null,
            device: this._sanitize(a.device_name || a.friendly_name || this._extractDeviceName(entityId)),
            mac: mac,
            ip: ip,
            ssid: ssid,
            connectionType: connType
          });
        }
      }
    });

    // Method 3: Add device_tracker entities with source_type 'router' (network-connected devices)
    Object.entries(states).forEach(([entityId, state]) => {
      if (entityId.startsWith('device_tracker.') && state.attributes.source_type === 'router') {
        const a = state.attributes;
        const protocol = 'WiFi';
        if (!networks[protocol]) networks[protocol] = [];
        if (!networks[protocol].find(d => d.id === entityId)) {
          networks[protocol].push({
            id: entityId,
            name: this._sanitize(a.friendly_name || this._formatEntityName(entityId)),
            rssi: a.rssi || null,
            device: this._sanitize(a.friendly_name || this._extractDeviceName(entityId)),
            mac: a.mac || '',
            ip: a.ip || '',
            ssid: a.essid || a.ssid || '',
            connectionType: 'wifi'
          });
        }
      }
    });

    // Method 4: Include ALL device_tracker entities (they represent network devices)
    Object.entries(states).forEach(([entityId, state]) => {
      if (entityId.startsWith('device_tracker.')) {
        const a = state.attributes || {};
        const protocol = a.source_type === 'router' ? 'WiFi' :
                         a.source_type === 'bluetooth' ? 'Bluetooth' :
                         a.source_type === 'bluetooth_le' ? 'BLE' : 'Network';
        if (!networks[protocol]) networks[protocol] = [];
        if (!networks[protocol].find(d => d.id === entityId)) {
          networks[protocol].push({
            id: entityId,
            name: this._sanitize(a.friendly_name || this._formatEntityName(entityId)),
            rssi: typeof a.rssi === 'number' ? a.rssi : null,
            device: this._sanitize(a.friendly_name || this._extractDeviceName(entityId)),
            mac: a.mac || a.mac_address || '',
            ip: a.ip || a.ip_address || '',
            ssid: a.essid || a.ssid || '',
            connectionType: a.source_type || ''
          });
        }
      }
    });

    return Object.keys(networks).length > 0 ? networks : this._getDemoNetworks();
  }

  _getDemoDevices() {
    return [
      { id: "device_tracker.phone", name: "Mobile Phone", type: "device_tracker", status: "online", lastSeen: new Date(Date.now() - 300000).toISOString(), uptime: "5 days", domain: "device_tracker" },
      { id: "light.living_room", name: "Living Room Light", type: "light", status: "online", lastSeen: new Date(Date.now() - 60000).toISOString(), uptime: "30 days", domain: "light" },
      { id: "switch.kitchen", name: "Kitchen Switch", type: "switch", status: "online", lastSeen: new Date(Date.now() - 120000).toISOString(), uptime: "30 days", domain: "switch" },
      { id: "climate.bedroom", name: "Bedroom Thermostat", type: "climate", status: "offline", lastSeen: new Date(Date.now() - 3600000).toISOString(), uptime: "15 days", domain: "climate" },
      { id: "sensor.garage", name: "Garage Sensor", type: "sensor", status: "unavailable", lastSeen: new Date(Date.now() - 86400000).toISOString(), uptime: "2 days", domain: "sensor" },
    ];
  }

  _getDemoBatteries() {
    return [
      { id: "sensor.phone_battery", name: "Mobile Phone Battery", level: 78, lastChanged: new Date(Date.now() - 300000).toISOString(), device: "Mobile Phone" },
      { id: "sensor.watch_battery", name: "Smart Watch Battery", level: 45, lastChanged: new Date(Date.now() - 7200000).toISOString(), device: "Smart Watch" },
      { id: "sensor.remote_battery", name: "Remote Control Battery", level: 22, lastChanged: new Date(Date.now() - 86400000).toISOString(), device: "Remote Control" },
      { id: "sensor.sensor1_battery", name: "Hallway Sensor Battery", level: 8, lastChanged: new Date(Date.now() - 172800000).toISOString(), device: "Hallway Sensor" },
      { id: "sensor.keypad_battery", name: "Door Keypad Battery", level: 35, lastChanged: new Date(Date.now() - 3600000).toISOString(), device: "Door Keypad" },
    ];
  }

  _getDemoNetworks() {
    return {
      "WiFi": [
        { id: "sensor.phone_signal", name: "Mobile Phone", rssi: -45, device: "Mobile Phone" },
        { id: "sensor.laptop_signal", name: "Laptop", rssi: -62, device: "Laptop" },
        { id: "sensor.tv_signal", name: "Smart TV", rssi: -75, device: "Smart TV" },
      ],
      "Zigbee": [
        { id: "sensor.light1_signal", name: "Bulb 1", rssi: -68, device: "Bulb 1" },
        { id: "sensor.light2_signal", name: "Bulb 2", rssi: -72, device: "Bulb 2" },
      ],
      "Z-Wave": [
        { id: "sensor.lock_signal", name: "Door Lock", rssi: -58, device: "Door Lock" },
      ],
    };
  }

  _generateAlerts() {
    this._alerts = [];
    const now = Date.now();
    const offlineThreshold = this._config.offline_alert_minutes * 60 * 1000;
    const batteryWarning = this._config.battery_warning;
    const batteryCritical = this._config.battery_critical;

    // Device offline alerts
    this._getDevices().forEach((device) => {
      if (device.status === "offline" && (now - new Date(device.lastSeen).getTime()) > offlineThreshold) {
        this._addAlert("offline", device.name, device.id, "critical");
      } else if (device.status === "unavailable") {
        this._addAlert("unavailable", device.name, device.id, "warning");
      }
    });

    // Battery alerts
    this._getBatteryDevices().forEach((battery) => {
      if (battery.level <= batteryCritical) {
        this._addAlert("battery_critical", battery.name, battery.id, "critical");
      } else if (battery.level <= batteryWarning) {
        this._addAlert("battery_warning", battery.name, battery.id, "warning");
      }
    });

    // Signal strength alerts
    const networks = this._getNetworkDevices();
    Object.keys(networks).forEach((protocol) => {
      networks[protocol].forEach((device) => {
        if (device.rssi < -85) {
          this._addAlert("signal_weak", device.name, device.id, "warning");
        }
      });
    });
  }

  _addAlert(type, name, id, severity) {
    const alertId = `${type}_${id}`;
    if (!this._acknowledgedAlerts.has(alertId)) {
      this._alerts.push({ type, name, id, severity, timestamp: new Date().toISOString() });
      this._alertHistory.unshift({ type, name, id, severity, timestamp: new Date().toISOString() });
      if (this._alertHistory.length > 20) this._alertHistory.pop();
    }
  }

  _calculateUptime(lastChanged) {
    const diff = Date.now() - new Date(lastChanged).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days} days`;
    if (hours > 0) return `${hours} hours`;
    return `${Math.floor(diff / (1000 * 60))} minutes`;
  }

  _formatEntityName(entityId) {
    return entityId.split(".")[1].split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  }

  _extractDeviceName(entityId) {
    const parts = entityId.split(".")[1].replace(/_battery|_signal|_battery_level|_rssi/g, "").split("_");
    return parts.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  }

  _detectProtocol(entityId) {
    if (entityId.includes("zigbee")) return "Zigbee";
    if (entityId.includes("zwave")) return "Z-Wave";
    return "WiFi";
  }

  _getStatusColor(status) {
    const colors = { online: "#10B981", offline: "#EF4444", unavailable: "#94A3B8" };
    return colors[status] || "#94A3B8";
  }

  _getBatteryColor(level) {
    if (level < 10) return "#EF4444";
    if (level < 30) return "#F59E0B";
    return "#10B981";
  }

  _getSignalColor(rssi) {
    if (rssi > -50) return "#10B981";
    if (rssi > -70) return "#3B82F6";
    if (rssi > -80) return "#F59E0B";
    return "#EF4444";
  }

  _render() {
    if (!this._hass) return;
    this._lastRenderTime = Date.now();
    // Save scroll positions before rebuild
    const oldList = this.shadowRoot.querySelector('[data-device-list]');
    if (oldList) {
      this._scrollPosition = oldList.scrollTop || 0;
    }
    const oldTabs = this.shadowRoot.querySelector('.tabs');
    if (oldTabs) {
      this._tabsScroll = oldTabs.scrollLeft || 0;
    }
    const style = `
      
/* ===== BENTO DESIGN SYSTEM (local fallback) ===== */

:host {
  --bento-primary: #3B82F6;
  --bento-primary-hover: #2563EB;
  --bento-primary-light: rgba(59, 130, 246, 0.08);
  --bento-success: #10B981;
  --bento-success-light: rgba(16, 185, 129, 0.08);
  --bento-error: #EF4444;
  --bento-error-light: rgba(239, 68, 68, 0.08);
  --bento-warning: #F59E0B;
  --bento-warning-light: rgba(245, 158, 11, 0.08);
  --bento-bg: var(--primary-background-color, #F8FAFC);
  --bento-card: var(--card-background-color, #FFFFFF);
  --bento-border: var(--divider-color, #E2E8F0);
  --bento-text: var(--primary-text-color, #1E293B);
  --bento-text-secondary: var(--secondary-text-color, #64748B);
  --bento-text-muted: var(--disabled-text-color, #94A3B8);
  --bento-radius-xs: 6px;
  --bento-radius-sm: 10px;
  --bento-radius-md: 16px;
  --bento-shadow-sm: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06);
  --bento-shadow-md: 0 4px 12px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.04);
  --bento-shadow-lg: 0 8px 25px rgba(0,0,0,0.06), 0 4px 10px rgba(0,0,0,0.04);
  --bento-transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

:host {
        --pc: var(--bento-primary);
        --ec: var(--bento-error);
        --wc: var(--bento-warning);
        --sc: var(--bento-success);
        --bg: var(--bento-bg);
        --cbg: var(--bento-card);
        --tc: var(--bento-text);
        --ts: var(--bento-text-secondary);
        --dc: var(--bento-border);
        --hov: rgba(59, 130, 246, 0.04);
        --sel: rgba(59, 130, 246, 0.08);
        --radius: var(--bento-radius-md);
        --radius-sm: var(--bento-radius-sm);
        --radius-xs: var(--bento-radius-xs);
        --shadow: var(--bento-shadow-sm);
        --shadow-md: var(--bento-shadow-md);
        --tr: var(--bento-transition);
        display: block;
        color-scheme: light dark;
      }

      * { box-sizing: border-box; }

      .card {
        background: var(--cbg);
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        padding: 20px;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        min-height: 500px;
        color: var(--tc);
        overflow: visible;
        min-width: 0;
      }

      .card-header {
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 16px;
        color: var(--tc);
      }

      .tabs {
        display: flex;
        gap: 4px;
        border-bottom: 2px solid var(--dc);
        margin-bottom: 16px;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }

      .tab-btn {
        padding: 10px 16px;
        cursor: pointer;
        color: var(--ts);
        border: none;
        background: none;
        font-size: 13px;
        font-weight: 500;
        font-family: inherit;
        border-bottom: 2px solid transparent;
        margin-bottom: -2px;
        transition: var(--tr);
      }

      .tab-btn.active {
        color: var(--pc) !important;
        background: var(--cbg) !important;
        border-bottom-color: var(--pc);
      }

      .tab-btn:hover {
        color: var(--tc);
        background: var(--hov);
        border-radius: var(--radius-xs) var(--radius-xs) 0 0;
      }

      .tab-content {
        display: none;
      }

      .tab-content.active {
        display: block;
      }

      .controls {
        display: flex;
        gap: 10px;
        margin-bottom: 14px;
        flex-wrap: wrap;
        align-items: center;
      }

      .control-group {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
      }

      input[type="text"], select {
        padding: 7px 12px;
        border: 1.5px solid var(--dc);
        border-radius: var(--radius-xs);
        font-size: 13px;
        font-family: inherit;
        background: var(--cbg);
        color: var(--tc);
        transition: var(--tr);
        outline: none;
        box-sizing: border-box;
      }

      select {
        width: auto;
        max-width: 100%;
      }

      input[type="text"]:focus, select:focus {
        border-color: var(--pc);
        box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
      }

      input[type="text"]::placeholder {
        color: var(--ts);
      }

      button {
        padding: 7px 14px;
        border: 1.5px solid var(--dc);
        background: var(--cbg);
        color: var(--tc);
        border-radius: var(--radius-xs);
        cursor: pointer;
        font-size: 13px;
        font-family: inherit;
        font-weight: 500;
        transition: var(--tr);
      }

      button:hover {
        background: var(--hov);
        border-color: var(--pc);
      }

      button.active {
        background: var(--pc);
        color: white;
        border-color: var(--pc);
      }

      .status-badge {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
        color: white;
        letter-spacing: 0.3px;
      }

      .status-online { background: var(--sc); }
      .status-offline { background: var(--ec); }
      .status-unavailable { background: #94A3B8; }

      .table-wrapper {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        margin-bottom: 0;
      }

      .device-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 0;
      }

      .device-table th {
        text-align: left;
        padding: 10px 12px;
        border-bottom: 2px solid var(--dc);
        font-weight: 600;
        font-size: 12px;
        color: var(--ts);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        background: var(--bg);
        cursor: pointer;
        user-select: none;
      }

      .device-table th:hover {
        background: var(--dc);
      }

      .device-table td {
        padding: 10px 12px;
        border-bottom: 1px solid var(--dc);
        color: var(--tc);
        font-size: 13px;
      }

      .device-table tr:hover td {
        background: var(--hov);
      }

      .stats {
        padding: 10px 14px;
        background: var(--bg);
        border: 1px solid var(--dc);
        border-radius: var(--radius-xs);
        margin-bottom: 14px;
        font-size: 13px;
        color: var(--ts);
        font-weight: 500;
      }

      .battery-grid {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 0;
      }

      .battery-card {
        display: flex;
        align-items: center;
        gap: 12px;
        border: 1.5px solid var(--dc);
        border-radius: var(--radius-sm);
        padding: 8px 12px;
        transition: var(--tr);
        background: var(--cbg);
        min-height: 50px;
      }

      .battery-card:hover {
        box-shadow: var(--shadow-md);
        border-color: var(--pc);
      }

      .battery-icon {
        font-size: 20px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
      }

      .battery-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .battery-name {
        font-size: 13px;
        font-weight: 500;
        color: var(--tc);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .battery-label {
        font-size: 11px;
        color: var(--ts);
      }

      .battery-right {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }

      .battery-bar {
        width: 60px;
        height: 6px;
        background: var(--dc);
        border-radius: 3px;
        overflow: hidden;
        flex-shrink: 0;
      }

      .battery-fill {
        height: 100%;
        border-radius: 3px;
        transition: var(--tr);
      }

      .battery-percent {
        font-size: 13px;
        font-weight: 600;
        min-width: 35px;
        text-align: right;
      }

      .network-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 12px;
        margin-bottom: 16px;
      }

      .network-stat {
        border: 1.5px solid var(--dc);
        border-radius: var(--radius-sm);
        padding: 14px;
        text-align: center;
        background: var(--cbg);
        transition: var(--tr);
      }

      .network-stat:hover {
        border-color: var(--pc);
        box-shadow: var(--shadow);
      }

      .network-stat-value {
        font-size: 24px;
        font-weight: 700;
        color: var(--pc);
      }

      .network-stat-label {
        font-size: 12px;
        color: var(--ts);
        margin-top: 4px;
      }

      .rssi-bar {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 6px 0;
        padding: 8px 12px;
        background: var(--bg);
        border: 1px solid var(--dc);
        border-radius: var(--radius-xs);
      }

      .rssi-value {
        min-width: 60px;
        font-weight: 600;
        font-size: 13px;
      }

      .rssi-indicator {
        flex: 1;
        height: 6px;
        background: var(--dc);
        border-radius: 3px;
        overflow: hidden;
      }

      .rssi-fill {
        height: 100%;
        border-radius: 3px;
        transition: var(--tr);
      }

      .alert-item {
        padding: 12px 14px;
        border-left: 4px solid;
        border-radius: var(--radius-xs);
        margin-bottom: 8px;
        background: var(--bg);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .alert-critical { border-color: var(--ec); }
      .alert-warning { border-color: var(--wc); }
      .alert-info { border-color: var(--pc); }

      .alert-text { flex: 1; }

      .alert-type {
        font-weight: 600;
        font-size: 11px;
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }

      .alert-time {
        font-size: 11px;
        color: var(--ts);
      }

      .alert-actions {
        display: flex;
        gap: 8px;
      }

      .alert-dismiss {
        padding: 4px 10px;
        font-size: 12px;
        background: var(--ec);
        color: white;
        border: none;
        border-radius: var(--radius-xs);
        cursor: pointer;
        font-family: inherit;
        font-weight: 500;
        transition: var(--tr);
      }

      .alert-dismiss:hover {
        opacity: 0.85;
      }

      canvas {
        width: 100%;
        height: 250px;
        max-height: 300px;
        border: 1px solid var(--dc);
        border-radius: var(--radius-xs);
        margin-bottom: 16px;
        display: block;
      }

      .empty-state {
        text-align: center;
        padding: 40px 16px;
        color: var(--ts);
        font-size: 14px;
      }

      .pagination {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 10px;
        margin-top: 16px;
        padding: 14px 0 0;
        border-top: 1px solid var(--dc);
      }

      .pagination-btn {
        padding: 6px 14px;
        border: 1.5px solid var(--dc);
        background: var(--cbg);
        color: var(--tc);
        border-radius: var(--radius-xs);
        cursor: pointer;
        font-size: 13px;
        font-family: inherit;
        font-weight: 500;
        transition: var(--tr);
      }

      .pagination-btn:hover:not(:disabled) {
        background: var(--pc);
        color: white;
        border-color: var(--pc);
      }

      .pagination-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .pagination-info {
        font-size: 13px;
        color: var(--ts);
        min-width: 100px;
        text-align: center;
        font-weight: 500;
      }

      .page-size-selector {
        padding: 7px 12px;
        border: 1.5px solid var(--dc);
        border-radius: var(--radius-xs);
        font-size: 13px;
        font-family: inherit;
        background: var(--cbg);
        color: var(--tc);
        cursor: pointer;
        transition: var(--tr);
        width: auto;
        max-width: 200px;
      }

      .page-size-selector:hover {
        border-color: var(--pc);
      }

      .section-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--tc);
        margin: 20px 0 10px;
      }

      
        .tabs, .tab-bar { scrollbar-width: thin; scrollbar-color: var(--bento-border, #E2E8F0) transparent; }
        .tabs::-webkit-scrollbar, .tab-bar::-webkit-scrollbar { height: 4px; }
        .tabs::-webkit-scrollbar-track, .tab-bar::-webkit-scrollbar-track { background: transparent; }
        .tabs::-webkit-scrollbar-thumb, .tab-bar::-webkit-scrollbar-thumb { background: var(--bento-border, #E2E8F0); border-radius: 4px; }
@media (max-width: 768px) {
        .device-grid { grid-template-columns: 1fr !important; }
        .battery-card { min-height: 55px; }
        .battery-right { flex-wrap: wrap; gap: 6px; }
        .device-table { font-size: 11px; }
        .device-table td, .device-table th { padding: 6px 4px; font-size: 11px; }
        .device-table th:nth-child(2), .device-table td:nth-child(2) { display: none; }
        .device-table th:nth-child(5), .device-table td:nth-child(5) { display: none; }
        .controls { flex-wrap: wrap; gap: 8px; }
        .control-group { min-width: 0; }
        h2 { font-size: 18px !important; }
      }
    `;

    const devices = this._getDevices();
    const batteries = this._getBatteryDevices();
    const networks = this._getNetworkDevices();
    const online = devices.filter((d) => d.status === "online").length;
    const availability = ((online / devices.length) * 100).toFixed(1);

    const batteryNeedingAttention = batteries.filter((b) => b.level < this._config.battery_warning).length;

    let html = `
      <div class="card">
        <div class="card-header">${_esc(this._config.title)}</div>
        <div class="tabs">
          <button class="tab-btn ${this._activeTab === "devices" ? "active" : ""}" data-tab="devices">${this._t('devices')}</button>
          <button class="tab-btn ${this._activeTab === "batteries" ? "active" : ""}" data-tab="batteries">${this._t('batteries')}</button>
          <button class="tab-btn ${this._activeTab === "network" ? "active" : ""}" data-tab="network">${this._t('network')}</button>
          <button class="tab-btn ${this._activeTab === "alerts" ? "active" : ""}" data-tab="alerts">${this._t('alerts')}</button>
        
        <!-- Support / Donation -->
        <div class="donate-section" data-source="ha-tools-split">
          <div class="donate-text">
            <h3>❤️ ${this._lang === 'pl' ? 'Wesprzyj rozwój HA Tools' : 'Support HA Tools Development'}</h3>
            <p>${this._lang === 'pl' ? 'Jeśli to narzędzie ułatwia Ci życie z Home Assistant, rozważ wsparcie projektu. Każda kawa motywuje do dalszego rozwoju!' : 'If this tool makes your Home Assistant life easier, consider supporting the project. Every coffee motivates further development!'}</p>
          </div>
          <div class="donate-buttons">
            <a class="donate-btn coffee" href="https://buymeacoffee.com/macsiem" target="_blank" rel="noopener noreferrer">☕ Buy Me a Coffee</a>
            <a class="donate-btn paypal" href="https://www.paypal.com/donate/?hosted_button_id=Y967H4PLRBN8W" target="_blank" rel="noopener noreferrer">💳 PayPal</a>
          </div>
        </div>
        </div>
    `;

    // Devices Tab
    if (this._activeTab === "devices") {
      const filteredDevices = devices.filter(
        (d) => (this._deviceFilter === "all" || d.status === this._deviceFilter) &&
                d.name.toLowerCase().includes(this._searchQuery.toLowerCase())
      );

      // Reset to page 1 when search/filter changes
      const totalPages = Math.ceil(filteredDevices.length / this._pageSize) || 1;
      if (this._currentPage > totalPages) {
        this._currentPage = 1;
      }

      const startIdx = (this._currentPage - 1) * this._pageSize;
      const endIdx = startIdx + this._pageSize;
      const paginatedDevices = filteredDevices.slice(startIdx, endIdx);

      html += `
        <div class="tab-content active">
          <div class="controls">
            <div class="control-group">
              <input type="text" class="search-box" placeholder="${this._t('searchDevices')}" value="${this._searchQuery}">
            </div>
            <div class="control-group">
              <select class="filter-status">
                <option value="all" ${this._deviceFilter === 'all' ? 'selected' : ''}>${this._t('all')}</option>
                <option value="online" ${this._deviceFilter === 'online' ? 'selected' : ''}>${this._t('online')}</option>
                <option value="offline" ${this._deviceFilter === 'offline' ? 'selected' : ''}>${this._t('offline')}</option>
                <option value="unavailable" ${this._deviceFilter === 'unavailable' ? 'selected' : ''}>${this._t('unavailable')}</option>
              </select>
            </div>
            <div class="control-group">
              <button class="toggle-grouping ${this._groupByDomain ? 'active' : ''}">${this._t('toggleGrouping')}</button>
            </div>
            <div class="control-group">
              <span style="font-size:12px;color:var(--ts);white-space:nowrap;">Show:</span>
              <select class="page-size-selector" data-tab="devices">
                ${[15,30,50,100].map(n => `<option value="${n}" ${this._pageSize === n ? 'selected' : ''}>${n}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="stats">
            ${this._t('totalDevices')}: ${devices.length} | ${this._t('online')}: ${online} | ${this._t('availability')}: ${availability}%
          </div>
          <div class="table-wrapper">
          <table class="device-table">
            <thead>
              <tr>
                <th data-sort="name">${this._t('name')}</th>
                <th>${this._t('type')}</th>
                <th>${this._t('status')}</th>
                <th>${this._t('lastSeen')}</th>
                <th>${this._t('uptime')}</th>
              </tr>
            </thead>
            <tbody>
              ${paginatedDevices
                .map(
                  (device) =>
                    `<tr>
                      <td>${_esc(device.name)}</td>
                      <td>${_esc(device.type)}</td>
                      <td><span class="status-badge status-${device.status}">${device.status.toUpperCase()}</span></td>
                      <td>${new Date(device.lastSeen).toLocaleString()}</td>
                      <td>${_esc(device.uptime)}</td>
                    </tr>`
                )
                .join("")}
            </tbody>
          </table>
          </div>
          <div class="pagination">
            <button class="pagination-btn pagination-prev" ${this._currentPage === 1 ? 'disabled' : ''}>${this._t('previous')}</button>
            <span class="pagination-info">${this._t('page')} ${this._currentPage} ${this._t('of')} ${totalPages}</span>
            <button class="pagination-btn pagination-next" ${this._currentPage === totalPages ? 'disabled' : ''}>${this._t('next')}</button>
          </div>
        </div>
      `;
    }

    // Batteries Tab
    if (this._activeTab === "batteries") {
      const batteryDevicesByHealth = [...batteries].sort((a, b) => {
        if (this._batterySortBy === "level") return a.level - b.level;
        if (this._batterySortBy === "name") return a.name.localeCompare(b.name);
        return 0;
      });

      const batteryTotalPages = Math.ceil(batteryDevicesByHealth.length / this._batteryPageSize) || 1;
      if (this._batteryPage > batteryTotalPages) this._batteryPage = 1;
      const batteryStart = (this._batteryPage - 1) * this._batteryPageSize;
      const paginatedBatteries = batteryDevicesByHealth.slice(batteryStart, batteryStart + this._batteryPageSize);

      html += `
        <div class="tab-content active">
          <div class="controls">
            <div class="control-group">
              <select class="battery-sort" style="width: auto; max-width: 200px; margin-right: 4px;">
                <option value="level" ${this._batterySortBy === 'level' ? 'selected' : ''}>${this._t('levelWorstFirst')}</option>
                <option value="name" ${this._batterySortBy === 'name' ? 'selected' : ''}>${this._t('name')}</option>
              </select>
            </div>
            <div class="control-group">
              <span style="font-size:12px;color:var(--ts);white-space:nowrap;">Show:</span>
              <select class="page-size-selector" data-tab="batteries">
                ${[15,30,50,100].map(n => `<option value="${n}" ${this._batteryPageSize === n ? 'selected' : ''}>${n}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="stats">
            ${this._t('batteryHealthSummary')}: ${batteryNeedingAttention} ${this._t('deviceNeedAttention')}
          </div>
          <div class="battery-grid">
            ${paginatedBatteries
              .map(
                (battery) => {
                  const color = this._getBatteryColor(battery.level);
                  return `
                    <div class="battery-card">
                      <div class="battery-icon">🔋</div>
                      <div class="battery-info">
                        <div class="battery-name">${_esc(battery.name)}</div>
                        <div class="battery-label">${this._t('lastChanged')}: ${new Date(battery.lastChanged).toLocaleDateString()}</div>
                      </div>
                      <div class="battery-right">
                        <div class="battery-bar">
                          <div class="battery-fill" style="width: 100%; background: ${color};"></div>
                        </div>
                        <div class="battery-percent" style="color: ${color};">${battery.level}%</div>
                      </div>
                    </div>
                  `;
                }
              )
              .join("")}
          </div>
          ${batteryDevicesByHealth.length > this._batteryPageSize ? `
          <div class="pagination">
            <button class="pagination-btn bat-prev" ${this._batteryPage === 1 ? 'disabled' : ''}>${this._t('previous')}</button>
            <span class="pagination-info">${this._t('page')} ${this._batteryPage} ${this._t('of')} ${batteryTotalPages}</span>
            <button class="pagination-btn bat-next" ${this._batteryPage === batteryTotalPages ? 'disabled' : ''}>${this._t('next')}</button>
          </div>` : ''}
        </div>
      `;
    }

    // Network Tab
    if (this._activeTab === "network") {
      const protocolCounts = {};
      let totalNetDevices = 0;
      const allNetDevices = [];
      Object.keys(networks).forEach((protocol) => {
        protocolCounts[protocol] = networks[protocol].length;
        totalNetDevices += networks[protocol].length;
        networks[protocol].forEach(d => allNetDevices.push({ ...d, protocol }));
      });

      const netTotalPages = Math.ceil(allNetDevices.length / this._networkPageSize) || 1;
      if (this._networkPage > netTotalPages) this._networkPage = 1;
      const netStart = (this._networkPage - 1) * this._networkPageSize;
      const paginatedNet = allNetDevices.slice(netStart, netStart + this._networkPageSize);

      html += `
        <div class="tab-content active">
          <div class="controls">
            <div class="control-group">
              <span style="font-size:12px;color:var(--ts);white-space:nowrap;">Show:</span>
              <select class="page-size-selector" data-tab="network">
                ${[15,30,50,100].map(n => `<option value="${n}" ${this._networkPageSize === n ? 'selected' : ''}>${n}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="network-stats">
      `;

      Object.keys(protocolCounts).forEach((protocol) => {
        html += `
          <div class="network-stat">
            <div class="network-stat-value">${protocolCounts[protocol]}</div>
            <div class="network-stat-label">${protocol} ${this._t('networkDevices')}</div>
          </div>
        `;
      });

      html += `
          </div>
          <canvas id="signal-chart" width="400" height="250"></canvas>
      `;

      // Group paginated devices by protocol for display
      let lastProto = '';
      paginatedNet.forEach((device) => {
        if (device.protocol !== lastProto) {
          lastProto = device.protocol;
          html += `<div class="section-title">${_esc(device.protocol)} Network</div>`;
        }
        const hasRssi = device.rssi !== null && device.rssi !== undefined && !isNaN(device.rssi);
        const color = hasRssi ? this._getSignalColor(device.rssi) : '#94a3b8';
        const strength = hasRssi ? Math.max(0, Math.min(100, ((device.rssi + 100) / 50) * 100)) : 0;

        // Build detail line with MAC/IP/SSID
        const details = [];
        if (device.mac) details.push('<code style="font-size:11px;background:var(--bg);padding:2px 6px;border-radius:3px;">' + _esc(device.mac) + '</code>');
        if (device.ip) details.push('IP: ' + _esc(device.ip));
        if (device.ssid) details.push('\u{1F4F6} ' + _esc(device.ssid));
        if (device.connectionType) details.push(_esc(device.connectionType));

        html += `
          <div style="margin-bottom: 10px; padding: 8px; border: 1px solid var(--dc); border-radius: 8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <span style="font-size:13px;font-weight:600;color:var(--tc);">${_esc(device.name)}</span>
              ${hasRssi ? '<span style="font-size:12px;color:' + color + ';font-weight:500;">' + device.rssi + ' dBm</span>' : ''}
            </div>
            ${details.length > 0 ? '<div style="font-size:11px;color:var(--ts);display:flex;flex-wrap:wrap;gap:6px;margin-bottom:4px;">' + details.join(' &middot; ') + '</div>' : ''}
            ${hasRssi ? '<div class="rssi-bar"><div class="rssi-indicator"><div class="rssi-fill" style="width:' + strength + '%;background:' + color + ';"></div></div></div>' : ''}
          </div>
        `;
      });

      if (allNetDevices.length > this._networkPageSize) {
        html += `
          <div class="pagination">
            <button class="pagination-btn net-prev" ${this._networkPage === 1 ? 'disabled' : ''}>${this._t('previous')}</button>
            <span class="pagination-info">${this._t('page')} ${this._networkPage} ${this._t('of')} ${netTotalPages}</span>
            <button class="pagination-btn net-next" ${this._networkPage === netTotalPages ? 'disabled' : ''}>${this._t('next')}</button>
          </div>
        `;
      }

      html += `
        </div>
      `;
    }

    // Alerts Tab
    if (this._activeTab === "alerts") {
      const alertStart = (this._alertsPage - 1) * this._alertsPageSize;
      const alertEnd = alertStart + this._alertsPageSize;
      const paginatedAlerts = this._alerts.slice(alertStart, alertEnd);
      const alertTotalPages = Math.ceil(this._alerts.length / this._alertsPageSize) || 1;

      html += `
        <div class="tab-content active">
          <div class="controls">
            <div class="control-group">
              <span style="font-size: 13px; color: var(--ts);">${this._t('pageSize')}:</span>
              <select class="page-size-selector" data-tab="alerts">
                <option value="10" ${this._alertsPageSize === 10 ? 'selected' : ''}>10</option>
                <option value="15" ${this._alertsPageSize === 15 ? 'selected' : ''}>15</option>
                <option value="20" ${this._alertsPageSize === 20 ? 'selected' : ''}>20</option>
                <option value="30" ${this._alertsPageSize === 30 ? 'selected' : ''}>30</option>
              </select>
            </div>
          </div>
          <div class="stats">
            ${this._t('activeAlerts')}: ${this._alerts.length}
          </div>
      `;

      if (this._alerts.length === 0) {
        html += `<div class="empty-state">${this._t('noActiveAlerts')}</div>`;
      } else {
        paginatedAlerts.forEach((alert) => {
          const alertId = `${alert.type}_${alert.id}`;
          html += `
            <div class="alert-item alert-${alert.severity}">
              <div class="alert-text">
                <div class="alert-type">${_esc(alert.type.toUpperCase().replace(/_/g, " "))}</div>
                <div>${_esc(alert.name)}</div>
                <div class="alert-time">${new Date(alert.timestamp).toLocaleString()}</div>
              </div>
              <div class="alert-actions">
                <button class="alert-dismiss" data-alert-id="${alertId}">${this._t('dismiss')}</button>
              </div>
            </div>
          `;
        });

        if (this._alerts.length > this._alertsPageSize) {
          html += `
            <div class="pagination">
              <button class="pagination-btn alert-prev" ${this._alertsPage === 1 ? 'disabled' : ''}>${this._t('previous')}</button>
              <span class="pagination-info">${this._t('page')} ${this._alertsPage} ${this._t('of')} ${alertTotalPages}</span>
              <button class="pagination-btn alert-next" ${this._alertsPage === alertTotalPages ? 'disabled' : ''}>${this._t('next')}</button>
            </div>
          `;
        }
      }

      html += `
        <div class="section-title">${this._t('alertHistory')}</div>
        ${this._alertHistory
          .slice(0, 20)
          .map(
            (alert) =>
              `<div style="padding: 8px 12px; border-left: 3px solid; border-color: ${alert.severity === "critical" ? "var(--ec)" : alert.severity === "warning" ? "var(--wc)" : "var(--pc)"}; margin-bottom: 4px; border-radius: var(--radius-xs); background: var(--bg);">
                <div style="font-size: 12px; font-weight: 500; color: var(--tc);">${_esc(alert.type.replace(/_/g, ' '))} — ${_esc(alert.name)}</div>
                <div style="font-size: 11px; color: var(--ts); margin-top: 2px;">${new Date(alert.timestamp).toLocaleString()}</div>
              </div>`
          )
          .join("")}
      </div>
        </div>
      `;
    }

    // Mark DOM as built after content is set
    const restoreScroll = !this._domBuilt;
    this.shadowRoot.innerHTML = `<style>${window.HAToolsBentoCSS || ""}
/* === Support / Donation Section (HA Tools split) === */
.donate-section { margin: 20px 0 4px; padding: 18px 20px;  background: var(--donate-bg, linear-gradient(135deg, #fff5f5 0%, #fff0f6 50%, #f8f0ff 100%));  border: 1px solid var(--donate-border, #f3d3e0); border-radius: var(--bento-radius-md, 16px);  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px; }
.donate-section h3 { margin: 0 0 6px; font-size: 15px; color: var(--donate-heading, #be185d); }
.donate-section p  { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--donate-text, #6b21a8); }
.donate-buttons { display: flex; gap: 8px; flex-wrap: wrap; }
.donate-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px;  font-weight: 600; font-size: 12.5px; text-decoration: none; transition: transform .15s ease, box-shadow .15s ease; }
.donate-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(0,0,0,0.08); }
.donate-btn.coffee { background: #FFDD00; color: #000; border: 1px solid #e6c700; }
.donate-btn.paypal { background: #0070ba; color: #fff; border: 1px solid #005ea6; }
@media (prefers-color-scheme: dark) {  .donate-section { background: linear-gradient(135deg, #2a1525 0%, #1e1530 50%, #251530 100%); border-color: #4a3555; }  .donate-section h3 { color: #f0c0d8; }  .donate-section p  { color: #d4a0b8; }  .donate-btn.coffee { background: #b8a100; color: #fff; border-color: #8a7a00; }  .donate-btn.paypal { background: #005a96; color: #e0f0ff; border-color: #004a7a; } }
@media (max-width: 600px) {  .donate-section { flex-direction: column; text-align: center; padding: 16px; }  .donate-buttons { justify-content: center; } }

${style}

@media (prefers-color-scheme: dark) {
  :host {
    --bento-bg: var(--primary-background-color, #1a1a2e);
    --bento-card: var(--card-background-color, #16213e);
    --bento-text: var(--primary-text-color, #e2e8f0);
    --bento-text-secondary: var(--secondary-text-color, #94a3b8);
    --bento-border: var(--divider-color, #334155);
    --bento-shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
    --bento-shadow-md: 0 4px 12px rgba(0,0,0,0.4);
  }
}
/* === DARK MODE ADDED - old comment below === */

        /* === MOBILE FIX === */
        @media (max-width: 768px) {
          .tabs { flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; gap: 2px; }
          .tab-btn, .tab-button, .tab-btn { padding: 6px 10px; font-size: 12px; white-space: nowrap; }
          .card, .card-container { padding: 14px; }
          .stats, .stats-grid, .summary-grid, .stat-cards, .kpi-grid, .metrics-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .stat-val, .kpi-val, .metric-val { font-size: 18px; }
          .stat-lbl, .kpi-lbl, .metric-lbl { font-size: 10px; }
          .panels, .board { flex-direction: column; }
          .column { min-width: unset; }
          h2 { font-size: 18px; }
          h3 { font-size: 15px; }
        }
        @media (max-width: 480px) {
          .tabs { gap: 1px; }
          .tab-btn, .tab-button, .tab-btn { padding: 5px 8px; font-size: 11px; }
          .stats, .stats-grid, .summary-grid, .stat-cards, .kpi-grid, .metrics-grid { grid-template-columns: 1fr 1fr; }
          .stat-val, .kpi-val, .metric-val { font-size: 16px; }
        }

</style>${html}`
    this._attachEventListeners();
    this._drawSignalChart();

    // Restore scroll positions after DOM rebuild
    requestAnimationFrame(() => {
      const list = this.shadowRoot.querySelector('[data-device-list]');
      if (list && this._scrollPosition) list.scrollTop = this._scrollPosition;
      const tabs = this.shadowRoot.querySelector('.tabs');
      if (tabs && this._tabsScroll) tabs.scrollLeft = this._tabsScroll;
    });

    // Mark DOM as built and restore scroll position
    this._domBuilt = true;
    if (restoreScroll && this._scrollPosition > 0) {
      const list = this.shadowRoot.querySelector('[data-device-list]');
      if (list) {
        setTimeout(() => { list.scrollTop = this._scrollPosition; }, 0);
      }
    }
  }

  _updateContent() {
    // Incremental update: refresh data without rebuilding entire DOM
    // This preserves scroll position and tab state
    if (!this._hass || !this._domBuilt) return;
    this._lastRenderTime = Date.now();

    // Update alert count if visible
    const alertCount = this.shadowRoot.querySelector('[data-alert-count]');
    if (alertCount) {
      alertCount.textContent = this._alerts.length;
    }

    // Update device count if visible
    const deviceCount = this.shadowRoot.querySelector('[data-device-count]');
    if (deviceCount) {
      const devices = Object.values(this._hass.states).filter(s => s.entity_id.includes('device_tracker'));
      deviceCount.textContent = devices.length;
    }

    // For now, if active tab content changes significantly, re-render
    // This is a safe fallback - in production, you'd implement per-tab update methods
    const tabContent = this.shadowRoot.querySelector('[data-tab-content]');
    if (tabContent && this._activeTab === 'devices') {
      // Light update: just refresh the device list without full re-render
      // TODO: implement incremental device list updates
      return;
    }

    // If updates are significant, fall back to full render to avoid bugs
    // But with throttling in place, this won't happen often
    this._render();
  }

  _attachEventListeners() {
    const tabs = this.shadowRoot.querySelectorAll(".tab-btn");
    tabs.forEach((tab) => {
      tab.addEventListener("click", (e) => {
        this._activeTab = e.target.dataset.tab;
        try { localStorage.setItem('ha-tools-device-health-settings', JSON.stringify({ _activeTab: this._activeTab })); } catch(e) { console.debug('[ha-device-health] caught:', e); }
        history.replaceState(null, '', location.pathname + '#' + this._toolId + '/' + this._activeTab);
        this._render();
      });
    });

    const searchBox = this.shadowRoot.querySelector(".search-box");
    if (searchBox) {
      searchBox.addEventListener("input", (e) => {
        this._searchQuery = e.target.value;
        this._render();
      });
    }

    const filterStatus = this.shadowRoot.querySelector(".filter-status");
    if (filterStatus) {
      filterStatus.addEventListener("change", (e) => {
        this._deviceFilter = e.target.value;
        this._render();
      });
    }

    const toggleGrouping = this.shadowRoot.querySelector(".toggle-grouping");
    if (toggleGrouping) {
      toggleGrouping.addEventListener("click", () => {
        this._groupByDomain = !this._groupByDomain;
        this._render();
      });
    }

    const batterySort = this.shadowRoot.querySelector(".battery-sort");
    if (batterySort) {
      batterySort.addEventListener("change", (e) => {
        this._batterySortBy = e.target.value;
        this._render();
      });
    }

    const dismissButtons = this.shadowRoot.querySelectorAll(".alert-dismiss");
    dismissButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const alertId = e.target.dataset.alertId;
        this._acknowledgedAlerts.add(alertId);
        this._update();
      });
    });

    const sortHeaders = this.shadowRoot.querySelectorAll(".device-table th[data-sort]");
    sortHeaders.forEach((header) => {
      header.addEventListener("click", (e) => {
        const sortBy = e.target.dataset.sort;
        if (this._sortBy === sortBy) {
          this._sortBy = "";
        } else {
          this._sortBy = sortBy;
        }
        this._render();
      });
    });

    // Page size selectors (per tab)
    this.shadowRoot.querySelectorAll(".page-size-selector").forEach(sel => {
      sel.addEventListener("change", (e) => {
        const tab = e.target.dataset.tab;
        const val = parseInt(e.target.value);
        if (tab === 'devices') { this._pageSize = val; this._currentPage = 1; }
        else if (tab === 'batteries') { this._batteryPageSize = val; this._batteryPage = 1; }
        else if (tab === 'network') { this._networkPageSize = val; this._networkPage = 1; }
        else if (tab === 'alerts') { this._alertsPageSize = val; this._alertsPage = 1; }
        this._render();
      });
    });

    // Devices pagination
    const prevBtn = this.shadowRoot.querySelector(".pagination-prev");
    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        if (this._currentPage > 1) { this._currentPage--; this._render(); }
      });
    }

    const nextBtn = this.shadowRoot.querySelector(".pagination-next");
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        const filteredDevices = this._getDevices().filter(
          (d) => (this._deviceFilter === "all" || d.status === this._deviceFilter) &&
                  d.name.toLowerCase().includes(this._searchQuery.toLowerCase())
        );
        const totalPages = Math.ceil(filteredDevices.length / this._pageSize) || 1;
        if (this._currentPage < totalPages) { this._currentPage++; this._render(); }
      });
    }

    // Battery pagination
    const batPrev = this.shadowRoot.querySelector(".bat-prev");
    if (batPrev) {
      batPrev.addEventListener("click", () => {
        if (this._batteryPage > 1) { this._batteryPage--; this._render(); }
      });
    }
    const batNext = this.shadowRoot.querySelector(".bat-next");
    if (batNext) {
      batNext.addEventListener("click", () => {
        const batteries = this._getBatteryDevices();
        const tp = Math.ceil(batteries.length / this._batteryPageSize) || 1;
        if (this._batteryPage < tp) { this._batteryPage++; this._render(); }
      });
    }

    // Network pagination
    const netPrev = this.shadowRoot.querySelector(".net-prev");
    if (netPrev) {
      netPrev.addEventListener("click", () => {
        if (this._networkPage > 1) { this._networkPage--; this._render(); }
      });
    }
    const netNext = this.shadowRoot.querySelector(".net-next");
    if (netNext) {
      netNext.addEventListener("click", () => {
        const networks = this._getNetworkDevices();
        let total = 0;
        Object.values(networks).forEach(arr => total += arr.length);
        const tp = Math.ceil(total / this._networkPageSize) || 1;
        if (this._networkPage < tp) { this._networkPage++; this._render(); }
      });
    }

    // Alerts pagination
    const alertPrev = this.shadowRoot.querySelector(".alert-prev");
    if (alertPrev) {
      alertPrev.addEventListener("click", () => {
        if (this._alertsPage > 1) { this._alertsPage--; this._render(); }
      });
    }
    const alertNext = this.shadowRoot.querySelector(".alert-next");
    if (alertNext) {
      alertNext.addEventListener("click", () => {
        const tp = Math.ceil(this._alerts.length / this._alertsPageSize) || 1;
        if (this._alertsPage < tp) { this._alertsPage++; this._render(); }
      });
    }
  }

  _drawSignalChart() {
    const canvas = this.shadowRoot.querySelector("#signal-chart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const networks = this._getNetworkDevices();
    const allDevices = [];
    Object.keys(networks).forEach((protocol) => {
      networks[protocol].forEach((device) => {
        allDevices.push({ rssi: device.rssi, protocol });
      });
    });

    if (allDevices.length === 0) return;

    const width = rect.width;
    const height = rect.height;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Draw axes
    ctx.strokeStyle = "#E2E8F0";
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Create histogram
    const bins = 10;
    const histogram = new Array(bins).fill(0);
    const minRssi = -100;
    const maxRssi = -30;
    const binWidth = (maxRssi - minRssi) / bins;

    allDevices.forEach((device) => {
      const binIndex = Math.floor((device.rssi - minRssi) / binWidth);
      if (binIndex >= 0 && binIndex < bins) {
        histogram[binIndex]++;
      }
    });

    const maxCount = Math.max(...histogram);
    const barWidth = chartWidth / bins;

    // Draw bars
    ctx.fillStyle = "#3B82F6";
    histogram.forEach((count, i) => {
      const barHeight = (count / maxCount) * chartHeight;
      const x = padding + i * barWidth;
      const y = height - padding - barHeight;
      ctx.fillRect(x, y, barWidth * 0.9, barHeight);
    });

    // Draw labels
    ctx.fillStyle = "#64748B";
    ctx.font = "12px Inter, sans-serif";
    ctx.textAlign = "center";
    for (let i = 0; i <= bins; i++) {
      const rssi = minRssi + i * binWidth;
      const x = padding + i * barWidth;
      ctx.fillText(rssi.toFixed(0), x, height - padding + 20);
    }

    ctx.textAlign = "left";
    ctx.fillText(this._t('signalStrengthDist'), padding, padding - 10);
  }

  static getConfigElement() {
    const element = document.createElement("ha-device-health-editor");
    return element;
  }

  getCardSize() { return 6; }

  static getStubConfig() {
    return {
      type: "custom:ha-device-health",
      title: "Device Health",
      battery_warning: 30,
      battery_critical: 10,
      offline_alert_minutes: 60,
    };
  }

  disconnectedCallback() {
    // Clear render scheduling flag to prevent orphaned setTimeout calls
    this._renderScheduled = false;
  }

  setActiveTab(tabId) {
    this._activeTab = tabId;
    this._render();
  }
}

if (!customElements.get('ha-device-health')) customElements.define("ha-device-health", HADeviceHealth);


// Auto-load HA Tools Panel (if not already registered)
if (!customElements.get('ha-tools-panel')) {
  const _currentScript = document.currentScript?.src || '';
  const _baseUrl = _currentScript.substring(0, _currentScript.lastIndexOf('/') + 1);
  if (_baseUrl) {
    const _s = document.createElement('script');
    _s.src = _baseUrl + 'ha-tools-panel.js';
    document.head.appendChild(_s);
  }
}

class HaDeviceHealthEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
  }
  setConfig(config) {
    this._config = { ...config };
    this._render();
  }
  _dispatch() {
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true }));
  }
  _render() {
    this.shadowRoot.innerHTML = `
      <style>
            :host { display:block; padding:16px; }
            h3 { margin:0 0 16px; font-size:15px; font-weight:600; color:var(--bento-text, var(--primary-text-color,#1e293b)); }
            input { outline:none; transition:border-color .2s; }
            input:focus { border-color:var(--bento-primary, var(--primary-color,#3b82f6)); }
        </style>
      <h3>Device Health</h3>
            <div style="margin-bottom:12px;">
              <label style="display:block;font-weight:500;margin-bottom:4px;font-size:13px;">Title</label>
              <input type="text" id="cf_title" value="${_esc(this._config?.title || 'Device Health')}"
                style="width:100%;padding:8px 12px;border:1px solid var(--divider-color,#e2e8f0);border-radius:8px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#1e293b);font-size:14px;box-sizing:border-box;">
            </div>
            <div style="margin-bottom:12px;">
              <label style="display:block;font-weight:500;margin-bottom:4px;font-size:13px;">Battery warning %</label>
              <input type="text" id="cf_battery_warning" value="${_esc(this._config?.battery_warning || '30')}"
                style="width:100%;padding:8px 12px;border:1px solid var(--divider-color,#e2e8f0);border-radius:8px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#1e293b);font-size:14px;box-sizing:border-box;">
            </div>
            <div style="margin-bottom:12px;">
              <label style="display:block;font-weight:500;margin-bottom:4px;font-size:13px;">Battery critical %</label>
              <input type="text" id="cf_battery_critical" value="${_esc(this._config?.battery_critical || '10')}"
                style="width:100%;padding:8px 12px;border:1px solid var(--divider-color,#e2e8f0);border-radius:8px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#1e293b);font-size:14px;box-sizing:border-box;">
            </div>
    `;
        const f_title = this.shadowRoot.querySelector('#cf_title');
        if (f_title) f_title.addEventListener('input', (e) => {
          this._config = { ...this._config, title: e.target.value };
          this._dispatch();
        });
        const f_battery_warning = this.shadowRoot.querySelector('#cf_battery_warning');
        if (f_battery_warning) f_battery_warning.addEventListener('input', (e) => {
          this._config = { ...this._config, battery_warning: e.target.value };
          this._dispatch();
        });
        const f_battery_critical = this.shadowRoot.querySelector('#cf_battery_critical');
        if (f_battery_critical) f_battery_critical.addEventListener('input', (e) => {
          this._config = { ...this._config, battery_critical: e.target.value };
          this._dispatch();
        });
  }
  connectedCallback() { this._render(); }
}
if (!customElements.get('ha-device-health-editor')) { customElements.define('ha-device-health-editor', HaDeviceHealthEditor); }

})();

window.customCards = window.customCards || [];
window.customCards.push({ type: 'ha-device-health', name: 'Device Health', description: 'Monitor device health, battery levels and connectivity', preview: false });
