/* HA Tools split — ha-device-health v4.3.0 (2026-10-13) — single-tool standalone repo */
(function() {
'use strict';

// HA Tools v3: vendored inside each consumer's own closure, never a window API.
function createUiV3({ language = 'en' } = {}) {
  const pl = String(language).startsWith('pl');
  const states = {
    success: ['Success', 'Sukces', '✓'],
    partial: ['Partial', 'Częściowo', '½'],
    unconfirmed: ['Unconfirmed', 'Niepotwierdzony', '?'],
    error: ['Error', 'Błąd', '✕'],
    not_checked: ['Not checked', 'Nie sprawdzono', '–'],
    no_data: ['No data', 'Brak danych', '∅'],
  };
  const status = (value) => {
    const code = typeof value === 'string' && Object.hasOwn(states, value) ? value : 'not_checked';
    const row = states[code];
    return { code, label: row[pl ? 1 : 0], icon: row[2], countsAsSuccess: code === 'success' };
  };
  const statusHtml = (value) => {
    const result = status(value);
    return `<span class="ht-result-state ht-result-state--${result.code}" data-result-state="${result.code}"><span aria-hidden="true">${result.icon}</span> ${result.label}</span>`;
  };
  const css = `
.ht-result-state { display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border:1px solid currentColor;border-radius:6px;font-size:12px;line-height:1.4;white-space:normal; }
.ht-result-state--success { color:#237b3d;background:rgba(35,123,61,.10); }
.ht-result-state--partial { color:#966400;background:rgba(150,100,0,.10); }
.ht-result-state--unconfirmed { color:#ad5200;background:rgba(173,82,0,.10); }
.ht-result-state--error { color:#c32b2b;background:rgba(195,43,43,.10); }
.ht-result-state--not_checked,.ht-result-state--no_data { color:var(--secondary-text-color,#666);background:transparent; }
.ht-result-state--no_data { border-style:dashed; }
:host(.bento-dark) .ht-result-state--success { color:#81cf99; }
:host(.bento-dark) .ht-result-state--partial { color:#efd080; }
:host(.bento-dark) .ht-result-state--unconfirmed { color:#ffb97b; }
:host(.bento-dark) .ht-result-state--error { color:#ff9999; }
`;
  return { status, statusHtml, css };
}


// Component-local XSS protection: never reads from or publishes a global helper.
const _esc = (s) => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

// Component-local persistence retains this card's existing localStorage keys.
const haToolsPersistence = { _cache: {}, _hass: null, setHass(h) { this._hass = h; }, async save(k, d) { try { localStorage.setItem('ha-device-health-' + k, JSON.stringify(d)); } catch(e) { console.debug('[ha-device-health] caught:', e); } }, async load(k) { try { const r = localStorage.getItem('ha-device-health-' + k); return r ? JSON.parse(r) : null; } catch(e) { return null; } }, loadSync(k) { try { const r = localStorage.getItem('ha-device-health-' + k); return r ? JSON.parse(r) : null; } catch(e) { return null; } } };

/* ===== HA Tools split — inline shared infrastructure ===== */
// Bento Design System CSS (inline copy — keeps tool standalone)
const HA_DEVICE_HEALTH_BENTO_CSS = `
/* ═══════════════════════════════════════════════
   HA Tools — Bento Design System v2.0 (Premium)
   ═══════════════════════════════════════════════ */

/* keyboard a11y */
:focus-visible { outline: 2px solid var(--bento-primary, #6366f1); outline-offset: 2px; border-radius: 3px; }

:host {
  /* Brand palette — diamond top, gradient-friendly */
  --bento-primary: #6366f1;
  --bento-primary-2: #8b5cf6;
  --bento-primary-3: #ec4899;
  --bento-primary-hover: #4f46e5;
  --bento-primary-light: rgba(99, 102, 241, 0.08);
  --bento-primary-glow: rgba(99, 102, 241, 0.35);
  --bento-success: #10B981;
  --bento-success-light: rgba(16, 185, 129, 0.10);
  --bento-success-border: rgba(16, 185, 129, 0.25);
  --bento-error: #EF4444;
  --bento-error-light: rgba(239, 68, 68, 0.10);
  --bento-error-border: rgba(239, 68, 68, 0.25);
  --bento-warning: #F59E0B;
  --bento-warning-light: rgba(245, 158, 11, 0.10);
  --bento-warning-border: rgba(245, 158, 11, 0.25);
  --bento-info: #06b6d4;
  --bento-info-light: rgba(6, 182, 212, 0.10);
  --bento-info-border: rgba(6, 182, 212, 0.25);

  /* Theme */
  --bento-bg:     var(--primary-background-color, #fafaf9);
  --bento-bg-2:   var(--card-background-color, #f5f5f4);
  --bento-card:   var(--card-background-color, #ffffff);
  --bento-glass:  rgba(255, 255, 255, 0.7);
  --bento-border: var(--divider-color, #e7e5e4);
  --bento-border-strong: rgba(0, 0, 0, 0.08);
  --bento-text:           var(--primary-text-color,   #0c0a09);
  --bento-text-secondary: var(--secondary-text-color, #57534e);
  --bento-text-muted:     var(--disabled-text-color,  #a8a29e);

  /* Radii */
  --bento-radius-xs: 8px;
  --bento-radius-sm: 12px;
  --bento-radius-md: 18px;
  --bento-radius-lg: 24px;
  --bento-radius-pill: 999px;

  /* Shadows — modern, layered */
  --bento-shadow-sm: 0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02);
  --bento-shadow-md: 0 4px 12px rgba(0,0,0,0.05), 0 2px 6px rgba(0,0,0,0.03);
  --bento-shadow-lg: 0 24px 48px -12px rgba(0,0,0,0.10), 0 12px 24px -8px rgba(0,0,0,0.05);
  --bento-shadow-glow: 0 0 0 1px rgba(99,102,241,0.15), 0 8px 32px -8px rgba(99,102,241,0.25);

  /* Gradients */
  --bento-grad-primary: linear-gradient(135deg, #6366f1, #8b5cf6);
  --bento-grad-rainbow: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
  --bento-grad-success: linear-gradient(135deg, #10b981, #34d399);
  --bento-grad-error:   linear-gradient(135deg, #ef4444, #f87171);
  --bento-grad-warning: linear-gradient(135deg, #f59e0b, #fbbf24);

  /* Motion */
  --bento-trans-fast: 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  --bento-trans:      0.25s cubic-bezier(0.4, 0, 0.2, 1);
  --bento-trans-slow: 0.4s cubic-bezier(0.4, 0, 0.2, 1);

  /* Typography */
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif;
  font-feature-settings: "cv11" 1, "ss01" 1;
  letter-spacing: -0.01em;
  display: block;
  color: var(--bento-text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ── Dark mode ───────────────────────────────── */
:host(.bento-dark) {
    --bento-bg:     var(--primary-background-color, #0a0a0f);
    --bento-bg-2:   var(--card-background-color,    #111119);
    --bento-card:   var(--card-background-color,    #16161f);
    --bento-glass:  rgba(22, 22, 31, 0.7);
    --bento-border: var(--divider-color,            #27272f);
    --bento-border-strong: rgba(255, 255, 255, 0.08);
    --bento-text:           var(--primary-text-color,   #fafaf9);
    --bento-text-secondary: var(--secondary-text-color, #d6d3d1);
    --bento-text-muted:     var(--disabled-text-color,  #78716c);
    --bento-primary:        #818cf8;
    --bento-primary-2:      #a78bfa;
    --bento-primary-3:      #f472b6;
    --bento-primary-light:  rgba(129, 140, 248, 0.12);
    --bento-primary-glow:   rgba(129, 140, 248, 0.45);
    --bento-success: #34d399;
    --bento-success-light:  rgba(52, 211, 153, 0.12);
    --bento-success-border: rgba(52, 211, 153, 0.30);
    --bento-error:   #f87171;
    --bento-error-light:    rgba(248, 113, 113, 0.12);
    --bento-error-border:   rgba(248, 113, 113, 0.30);
    --bento-warning: #fbbf24;
    --bento-warning-light:  rgba(251, 191, 36, 0.12);
    --bento-warning-border: rgba(251, 191, 36, 0.30);
    --bento-info:    #22d3ee;
    --bento-info-light:     rgba(34, 211, 238, 0.12);
    --bento-info-border:    rgba(34, 211, 238, 0.30);
    --bento-shadow-sm: 0 1px 2px rgba(0,0,0,0.4);
    --bento-shadow-md: 0 4px 12px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.2);
    --bento-shadow-lg: 0 24px 48px -12px rgba(0,0,0,0.6), 0 12px 24px -8px rgba(0,0,0,0.3);
    --bento-shadow-glow: 0 0 0 1px rgba(129,140,248,0.2), 0 8px 32px -8px rgba(129,140,248,0.5);
    --bento-grad-primary: linear-gradient(135deg, #818cf8, #a78bfa);
    --bento-grad-rainbow: linear-gradient(135deg, #818cf8, #a78bfa 50%, #f472b6);
    color-scheme: dark !important;
  }
:host(.bento-dark) .card, :host(.bento-dark) .card-container, :host(.bento-dark) .main-card, :host(.bento-dark) .panel-card {
    background: var(--bento-card) !important; color: var(--bento-text) !important; border-color: var(--bento-border) !important;
  }
:host(.bento-dark) input, :host(.bento-dark) select, :host(.bento-dark) textarea { background: var(--bento-bg-2); color: var(--bento-text); border-color: var(--bento-border); }
:host(.bento-dark) table th { background: var(--bento-bg-2); color: var(--bento-text-secondary); border-color: var(--bento-border); }
:host(.bento-dark) table td { color: var(--bento-text); border-color: var(--bento-border); }
:host(.bento-dark) pre, :host(.bento-dark) code { background: #1e1e2e !important; color: #e2e8f0 !important; }

/* ── Reset & motion preferences ──────────────── */
* { box-sizing: border-box; }
@media (prefers-reduced-motion: reduce) { * { animation-duration: 0s !important; transition-duration: 0s !important; } }

/* ── Main Card Wrapper ───────────────────────── */
.card {
  background: var(--bento-card);
  border: 1px solid var(--bento-border);
  border-radius: var(--bento-radius-md);
  box-shadow: var(--bento-shadow-md);
  color: var(--bento-text);
  font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  position: relative;
  transition: box-shadow var(--bento-trans), border-color var(--bento-trans);
}

/* ── Header ──────────────────────────────────── */
.header {
  padding: 20px 24px 0;
  display: flex; align-items: center; gap: 12px;
}
.header-icon { font-size: 24px; }
.header-title {
  font-size: 18px; font-weight: 700; letter-spacing: -0.02em;
  color: var(--bento-text);
}
.header-badge {
  margin-left: auto;
  background: var(--bento-grad-primary); color: #fff;
  font-size: 11px; padding: 4px 10px; border-radius: var(--bento-radius-pill);
  font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
  box-shadow: 0 4px 14px -2px var(--bento-primary-glow);
}
.content { padding: 20px 24px 24px; }

/* ── Tabs (modern pill style) ────────────────── */
.tabs, .tab-bar, .tab-nav, .tab-header {
  display: flex !important; gap: 4px !important;
  padding: 4px !important;
  background: var(--bento-bg-2) !important;
  border-radius: var(--bento-radius-pill) !important;
  margin-bottom: 20px !important;
  overflow: visible !important;
  -webkit-overflow-scrolling: touch !important;
  flex-wrap: wrap !important; border-bottom: 0 !important;
  width: 100%; max-width: 100%; box-sizing: border-box;
}
.tab, .tab-btn, .tab-button, .dtab {
  padding: 8px 16px !important;
  border: none !important; background: transparent !important; cursor: pointer !important;
  font-size: 13px !important; font-weight: 600 !important;
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, system-ui, sans-serif !important;
  color: var(--bento-text-secondary) !important;
  border-radius: var(--bento-radius-pill) !important;
  margin-bottom: 0 !important;
  transition: all var(--bento-trans) !important;
  white-space: nowrap !important; flex: 1 1 auto !important; text-align: center !important; min-height: 40px !important;
  letter-spacing: -0.005em !important;
}
.tab:hover, .tab-btn:hover, .tab-button:hover, .dtab:hover {
  color: var(--bento-text) !important;
  background: var(--bento-card) !important;
}
.tab.active, .tab-btn.active, .tab-button.active, .dtab.active {
  background: var(--bento-card) !important;
  color: var(--bento-primary) !important;
  box-shadow: var(--bento-shadow-sm) !important;
  font-weight: 700 !important;
}
.tab-content { display: block; }
.tab-content.active { animation: bentoFadeIn 0.35s cubic-bezier(0.4, 0, 0.2, 1); }
@keyframes bentoFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Stat / KPI cards (premium) ──────────────── */
.stat-card, .stat-item, .metric-card, .kpi-card {
  background: var(--bento-bg-2) !important;
  border: 1px solid var(--bento-border) !important;
  border-radius: var(--bento-radius-sm) !important;
  padding: 18px !important;
  text-align: left !important;
  transition: transform var(--bento-trans), box-shadow var(--bento-trans), border-color var(--bento-trans);
  position: relative; overflow: hidden;
}
.stat-card::before, .metric-card::before, .kpi-card::before {
  content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: var(--bento-grad-primary);
  opacity: 0; transition: opacity var(--bento-trans);
}
.stat-card:hover, .stat-item:hover, .metric-card:hover, .kpi-card:hover {
  transform: translateY(-2px); box-shadow: var(--bento-shadow-lg); border-color: var(--bento-primary-light);
}
.stat-card:hover::before, .metric-card:hover::before, .kpi-card:hover::before { opacity: 1; }
.stat-icon { font-size: 22px; margin-bottom: 6px; opacity: 0.85; }
.stat-value, .stat-val, .metric-value, .kpi-val {
  font-size: 26px; font-weight: 800; line-height: 1.1;
  letter-spacing: -0.02em; color: var(--bento-text);
  font-feature-settings: "tnum" 1;
}
.stat-label, .stat-lbl, .metric-label, .kpi-lbl {
  font-size: 11px; color: var(--bento-text-secondary);
  margin-top: 4px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600;
}
.stat-num {
  font-size: 24px; font-weight: 800; color: var(--bento-primary);
  font-feature-settings: "tnum" 1; letter-spacing: -0.02em;
}
.stat-sub { font-size: 12px; color: var(--bento-text-muted); font-weight: 500; }

/* ── Overview grid ───────────────────────────── */
.overview-grid, .stats-grid, .summary-grid, .stat-cards, .kpi-grid, .metrics-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px; margin-bottom: 20px;
}

/* ── Section headers ─────────────────────────── */
.section-header, .section-title {
  display: flex; align-items: center; justify-content: space-between;
  position: relative; padding-left: 12px;
  font-size: 12px; font-weight: 700; color: var(--bento-text-secondary);
  text-transform: uppercase; letter-spacing: 0.08em;
  margin: 16px 0 10px;
}
.section-header::before, .section-title::before {
  content: ""; width: 4px; height: 4px; border-radius: 50%; background: var(--bento-primary);
  position: absolute; left: 0; top: 50%; transform: translateY(-50%); flex-shrink: 0;
}

/* ── Loading / Empty / Info ──────────────────── */
.loading-bar {
  height: 3px; border-radius: var(--bento-radius-pill);
  background: linear-gradient(90deg, var(--bento-primary), var(--bento-primary-2), transparent);
  background-size: 200% 100%;
  animation: bentoLoad 1.5s linear infinite; margin-bottom: 12px;
}
@keyframes bentoLoad { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.empty-state, .no-data, .no-results {
  text-align: center; color: var(--bento-text-secondary);
  padding: 40px 20px; font-size: 14px;
  background: var(--bento-bg-2); border-radius: var(--bento-radius-md);
  border: 1px dashed var(--bento-border);
}
.info-note, .tip-box {
  font-size: 13px; color: var(--bento-text-secondary);
  background: var(--bento-primary-light);
  border-radius: var(--bento-radius-sm); padding: 12px 14px;
  border-left: 3px solid var(--bento-primary); margin-top: 12px;
  line-height: 1.55;
}
.last-updated {
  font-size: 11px; color: var(--bento-text-muted);
  text-align: right; margin-top: 12px; font-feature-settings: "tnum" 1;
}

/* ── Buttons (premium) ───────────────────────── */
.refresh-btn {
  background: var(--bento-bg-2); border: 1px solid var(--bento-border);
  border-radius: var(--bento-radius-pill); padding: 6px 14px;
  font-size: 12px; color: var(--bento-text-secondary);
  cursor: pointer; font-weight: 600; transition: all var(--bento-trans);
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, system-ui, sans-serif;
}
.refresh-btn:hover {
  background: var(--bento-card); color: var(--bento-primary);
  border-color: var(--bento-primary); transform: translateY(-1px);
  box-shadow: var(--bento-shadow-sm);
}
.toggle-btn, .action-btn {
  background: var(--bento-grad-primary); border: none;
  border-radius: var(--bento-radius-xs); padding: 8px 16px;
  font-size: 13px; color: #fff; cursor: pointer; font-weight: 600;
  transition: all var(--bento-trans); font-family: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, system-ui, sans-serif;
  letter-spacing: -0.005em;
  box-shadow: 0 4px 12px -2px var(--bento-primary-glow);
}
.toggle-btn:hover, .action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px -4px var(--bento-primary-glow);
}
.send-btn, .btn-primary {
  width: 100%;
  background: var(--bento-grad-primary); color: #fff;
  border: none; border-radius: var(--bento-radius-sm);
  padding: 12px 20px; font-size: 14px; font-weight: 700;
  cursor: pointer; font-family: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, system-ui, sans-serif;
  letter-spacing: -0.01em;
  transition: all var(--bento-trans);
  box-shadow: 0 4px 14px -2px var(--bento-primary-glow);
}
.send-btn:hover, .btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px -6px var(--bento-primary-glow);
}
.send-btn:active, .btn-primary:active { transform: translateY(0); }
.send-btn:disabled, .btn-primary:disabled {
  opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none;
}

/* ── Badges / Status (modern pill) ───────────── */
.badge, .status-badge, .tag, .chip {
  padding: 4px 12px; border-radius: var(--bento-radius-pill);
  font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 5px;
  letter-spacing: 0.04em; text-transform: uppercase;
  border: 1px solid;
}
.badge-ok, .badge-success { background: var(--bento-success-light); color: var(--bento-success); border-color: var(--bento-success-border); }
.badge-er, .badge-error   { background: var(--bento-error-light);   color: var(--bento-error);   border-color: var(--bento-error-border); }
.badge-warn, .badge-warning { background: var(--bento-warning-light); color: var(--bento-warning); border-color: var(--bento-warning-border); }
.badge-info { background: var(--bento-info-light); color: var(--bento-info); border-color: var(--bento-info-border); }

.count-badge {
  font-size: 11px; font-weight: 700; padding: 3px 10px;
  border-radius: var(--bento-radius-pill); display: inline-flex; align-items: center;
  font-feature-settings: "tnum" 1;
}
.error-badge { background: var(--bento-error-light); color: var(--bento-error); border: 1px solid var(--bento-error-border); }
.warn-badge  { background: var(--bento-warning-light); color: var(--bento-warning); border: 1px solid var(--bento-warning-border); }
.info-badge  { background: var(--bento-primary-light); color: var(--bento-primary); border: 1px solid var(--bento-border); }
.ok-badge    { background: var(--bento-success-light); color: var(--bento-success); border: 1px solid var(--bento-success-border); }

/* ── Tables (modern) ─────────────────────────── */
table { width: 100%; border-collapse: separate; border-spacing: 0; }
th {
  background: var(--bento-bg-2); color: var(--bento-text-secondary);
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
  padding: 12px 16px; text-align: left;
  border-bottom: 1px solid var(--bento-border);
}
th:first-child { border-top-left-radius: var(--bento-radius-sm); }
th:last-child  { border-top-right-radius: var(--bento-radius-sm); }
td {
  padding: 14px 16px; border-bottom: 1px solid var(--bento-border);
  color: var(--bento-text); font-size: 13px;
}
tr { transition: background var(--bento-trans-fast); }
tr:hover td { background: var(--bento-primary-light); }
tr:last-child td { border-bottom: 0; }

/* ── Forms / Inputs ──────────────────────────── */
input, select, textarea {
  padding: 10px 14px; border: 1.5px solid var(--bento-border);
  border-radius: var(--bento-radius-xs);
  background: var(--bento-card); color: var(--bento-text);
  font-size: 14px; font-family: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, system-ui, sans-serif;
  transition: all var(--bento-trans); outline: none;
  letter-spacing: -0.005em;
}
input:focus, select:focus, textarea:focus {
  border-color: var(--bento-primary);
  box-shadow: 0 0 0 4px var(--bento-primary-light);
}
input::placeholder, textarea::placeholder { color: var(--bento-text-muted); }

/* ── Code blocks ─────────────────────────────── */
code {
  background: var(--bento-bg-2); padding: 2px 6px;
  border-radius: 4px; font-size: 12px;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
  border: 1px solid var(--bento-border);
}
pre {
  background: #1e1e2e; color: #e2e8f0;
  padding: 16px; border-radius: var(--bento-radius-sm);
  font-size: 12.5px; overflow-x: auto; line-height: 1.65;
  white-space: pre-wrap; word-break: break-word;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  box-shadow: var(--bento-shadow-md);
}

/* ── Grid layouts ────────────────────────────── */
.schedule-grid, .send-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
}
.schedule-card, .send-card, .info-card {
  background: var(--bento-bg-2); border: 1px solid var(--bento-border);
  border-radius: var(--bento-radius-sm); padding: 16px;
  transition: all var(--bento-trans);
}
.schedule-card:hover, .send-card:hover, .info-card:hover {
  border-color: var(--bento-primary-light); transform: translateY(-1px);
  box-shadow: var(--bento-shadow-md);
}

/* ── Log entries ─────────────────────────────── */
.log-entry {
  display: flex; flex-wrap: wrap; align-items: flex-start;
  gap: 4px 8px; padding: 10px 12px;
  border-radius: var(--bento-radius-sm); margin-bottom: 6px;
  font-size: 12.5px; min-width: 0; overflow: hidden;
  border: 1px solid transparent; transition: all var(--bento-trans-fast);
}
.error-entry { background: var(--bento-error-light); border-color: var(--bento-error-border); }
.warn-entry  { background: var(--bento-warning-light); border-color: var(--bento-warning-border); }
.log-time { color: var(--bento-text-muted); font-feature-settings: "tnum" 1; flex-shrink: 0; font-family: "JetBrains Mono", monospace; }
.log-domain {
  font-weight: 700; flex-shrink: 1; min-width: 0; max-width: 100%;
  overflow: hidden; text-overflow: ellipsis; word-break: break-all;
}
.error-domain { color: var(--bento-error); }
.warn-domain  { color: var(--bento-warning); }
.log-msg {
  color: var(--bento-text-secondary); flex-basis: 100%;
  word-break: break-word; overflow-wrap: anywhere;
  white-space: pre-wrap; min-width: 0; line-height: 1.55;
}

/* ── Send status ─────────────────────────────── */
.send-status {
  padding: 12px 16px; border-radius: var(--bento-radius-sm);
  margin-top: 14px; font-size: 13px; font-weight: 600;
  text-align: center; letter-spacing: -0.005em;
  border: 1px solid;
}
.send-status.sending { background: var(--bento-primary-light); color: var(--bento-primary); border-color: var(--bento-border); }
.send-status.success { background: var(--bento-success-light); color: var(--bento-success); border-color: var(--bento-success-border); }
.send-status.error   { background: var(--bento-error-light);   color: var(--bento-error);   border-color: var(--bento-error-border); }

/* ── Scrollbar ───────────────────────────────── */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--bento-border); border-radius: var(--bento-radius-pill); border: 2px solid transparent; background-clip: content-box; }
::-webkit-scrollbar-thumb:hover { background: var(--bento-text-muted); background-clip: content-box; }

/* ── Animations ──────────────────────────────── */
@keyframes bentoSpin  { to { transform: rotate(360deg); } }
@keyframes bentoPulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }
@keyframes bentoSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes bentoStaggerIn { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }

/* Apply stagger to grids of stat-cards */
.stats-grid > *, .overview-grid > *, .summary-grid > * {
  animation: bentoStaggerIn 0.35s cubic-bezier(0.4, 0, 0.2, 1) both;
}
.stats-grid > *:nth-child(1)  { animation-delay: 0.02s; }
.stats-grid > *:nth-child(2)  { animation-delay: 0.06s; }
.stats-grid > *:nth-child(3)  { animation-delay: 0.10s; }
.stats-grid > *:nth-child(4)  { animation-delay: 0.14s; }
.stats-grid > *:nth-child(5)  { animation-delay: 0.18s; }
.stats-grid > *:nth-child(6)  { animation-delay: 0.22s; }

/* ── Mobile — 768 px ─────────────────────────── */
@media (max-width: 768px) {
  .content { padding: 16px; }
  .header { padding: 16px 16px 0; }
  .tabs { gap: 2px !important; padding: 3px !important; }
  .tab, .tab-button, .tab-btn { padding: 6px 12px !important; font-size: 12px !important; }
  .overview-grid, .stats-grid, .summary-grid, .stat-cards, .kpi-grid, .metrics-grid {
    grid-template-columns: repeat(2, 1fr); gap: 10px;
  }
  .stat-value, .stat-val, .kpi-val, .metric-val { font-size: 22px; }
  .stat-label, .stat-lbl, .kpi-lbl, .metric-lbl { font-size: 10px; }
  .send-grid, .schedule-grid { grid-template-columns: 1fr; }
  .log-entry { flex-wrap: wrap; gap: 2px 6px; padding: 8px 10px; }
  .log-domain { max-width: 60%; font-size: 11.5px; }
  .log-msg { flex-basis: 100%; max-width: 100%; font-size: 11.5px; }
  pre { padding: 12px; font-size: 11.5px; }
  h2 { font-size: 18px; }
  h3 { font-size: 15px; }
  table { font-size: 12.5px; }
  th, td { padding: 10px 12px; }
}
@media (max-width: 480px) {
  .tabs { gap: 1px !important; padding: 2px !important; }
  .tab, .tab-button, .tab-btn { padding: 5px 10px !important; font-size: 11px !important; }
  .overview-grid, .stats-grid, .summary-grid { grid-template-columns: 1fr 1fr; }
  .stat-value, .stat-val, .kpi-val { font-size: 18px; }
}
`;
// Card-owned support footer. Never mutates document or foreign cards.
const _LOCAL_INTRO_KEY = 'ha-intro-dismissed-ha-device-health';
function _renderLocalSupport(t) { return ''
  + '<div class="donate-section" data-source="own-card" style="margin:8px 0 0;padding:4px 0;background:none;border:0;box-shadow:none;min-height:0;display:flex;gap:8px;align-items:center;flex-wrap:wrap;flex-direction:row;justify-content:flex-start;text-align:left;">'
  + '  <a href="https://buymeacoffee.com/macsiem" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:var(--secondary-text-color,#64748b);font-weight:400;text-decoration:underline;">' + _esc(t('optionalSupport')) + '</a><button type="button" class="support-dismiss" aria-label="' + _esc(t('dismissSupport')) + '" style="margin-left:auto;padding:2px 6px;min-height:0;line-height:1;border:0;background:none;color:var(--secondary-text-color,#64748b);cursor:pointer">×</button>'
  + '</div>'; }
const _LOCAL_SUPPORT_KEY = 'ha-device-health-support-dismissed';
function _localSupportDismissed() { try { return localStorage.getItem(_LOCAL_SUPPORT_KEY) === '1'; } catch (_) { return false; } }
function _bindLocalSupportDismiss(root) { root.querySelector('.support-dismiss')?.addEventListener('click', () => { try { localStorage.setItem(_LOCAL_SUPPORT_KEY, '1'); } catch (_) {} root.querySelector('.donate-section[data-source="own-card"]')?.remove(); }); }
function _localIntroDismissed() {
  try { return localStorage.getItem(_LOCAL_INTRO_KEY) === '1'; } catch(e) { return false; }
}
function _renderLocalIntro(t) {
  if (_localIntroDismissed()) return '';
  const steps = ['introStep1', 'introStep2', 'introStep3'].map(key => '<li>' + _esc(t(key)) + '</li>').join('');
  return '<div class="intro-banner" data-intro="ha-device-health">'
    + '<button class="intro-dismiss" type="button" title="' + _esc(t('dismissIntro')) + '" aria-label="' + _esc(t('dismissIntro')) + '">✕</button>'
    + '<div class="intro-headline">💡 ' + _esc(t('introHeadline')) + '</div>'
    + '<ol class="intro-steps">' + steps + '</ol>'
    + '</div>';
}
function _bindLocalIntroDismiss(root) {
  const button = root && root.querySelector('.intro-banner[data-intro="ha-device-health"] .intro-dismiss');
  if (!button) return;
  button.addEventListener('click', event => {
    event.stopPropagation();
    try { localStorage.setItem(_LOCAL_INTRO_KEY, '1'); } catch(e) {}
    button.closest('.intro-banner')?.remove();
  });
}
/* ============================================================ */

const FAMILY_NAV='.tabs',FAMILY_ATTR='data-tab',FAMILY_ACTIVE='active';

// Adapted from Config/YAML family15: options come only from current native buttons.
// Observe the actual navigation parent's content box, not the global viewport.
function _rememberFamilyFocus(card) {
  const active = card.shadowRoot?.activeElement;
  const nav = card.shadowRoot?.querySelector(FAMILY_NAV);
  if (active?.id === 'ha-tools-tab-picker') return { picker:true };
  if (nav?.contains(active)) return { tab:active.getAttribute(FAMILY_ATTR) };
  return null;
}
function _disconnectFamilyNavigation(card) {
  card._familyNavObserver?.disconnect();card._familyNavObserver=null;card._familyNavTarget=null;
}
function _bindFamilyNavigation(card, restoreFocus=null) {
  const root=card.shadowRoot, nav=root?.querySelector(FAMILY_NAV);
  if (!nav) { _disconnectFamilyNavigation(card);return; }
  let label=root.querySelector('.ht-tab-picker');
  if (!label) {
    label=card.ownerDocument.createElement('div');label.className='ht-tab-picker';
    const text=card.ownerDocument.createElement('label');text.htmlFor='ha-tools-tab-picker';label.append(text);
    const select=card.ownerDocument.createElement('select');select.id='ha-tools-tab-picker';label.append(select);nav.before(label);
    select.addEventListener('change',()=>{
      const button=Array.from(root.querySelectorAll(FAMILY_NAV+' button['+FAMILY_ATTR+']')).find(item=>item.getAttribute(FAMILY_ATTR)===select.value&&!item.disabled&&!item.hidden);
      if(button)button.click(); // The original handler owns navigation, history and guards.
      _bindFamilyNavigation(card);
    });
  }
  label.firstElementChild.textContent=card._lang==='pl'?'Zakładka':'Tab';
  const select=label.querySelector('select');
  const buttons=Array.from(nav.querySelectorAll('button['+FAMILY_ATTR+']')).filter(button=>!button.hidden&&!button.disabled);
  const options=Array.from(select.options);
  if(options.length!==buttons.length||buttons.some((button,index)=>options[index]?.value!==button.getAttribute(FAMILY_ATTR))) {
    select.replaceChildren(...buttons.map(button=>{const option=card.ownerDocument.createElement('option');option.value=button.getAttribute(FAMILY_ATTR);return option;}));
  }
  buttons.forEach((button,index)=>{select.options[index].textContent=button.getAttribute('aria-label')||button.textContent.trim();});
  const selected=buttons.find(button=>button.classList.contains(FAMILY_ACTIVE));select.value=selected?.getAttribute(FAMILY_ATTR)||'';
  const target=nav.parentElement;
  const applyWidth=width=>{
    const currentNav=root.querySelector(FAMILY_NAV),currentLabel=root.querySelector('.ht-tab-picker');if(!currentNav||!currentLabel)return;
    const input=currentLabel.querySelector('select'),active=root.activeElement;
    const style=getComputedStyle(currentNav);
    const available=width-(parseFloat(style.paddingLeft)||0)-(parseFloat(style.paddingRight)||0)-(parseFloat(style.borderLeftWidth)||0)-(parseFloat(style.borderRightWidth)||0);
    const narrow=available>0&&available<280,fromTab=currentNav.contains(active),fromPicker=active===input;
    currentNav.hidden=narrow;currentLabel.hidden=!narrow;
    if(narrow&&fromTab)input.focus({preventScroll:true});
    else if(!narrow&&fromPicker)currentNav.querySelector('button.'+FAMILY_ACTIVE)?.focus({preventScroll:true});
  };
  if(card._familyNavTarget!==target) {
    _disconnectFamilyNavigation(card);
    const style=getComputedStyle(target);
    const measured=target.getBoundingClientRect().width-(parseFloat(style.paddingLeft)||0)-(parseFloat(style.paddingRight)||0)-(parseFloat(style.borderLeftWidth)||0)-(parseFloat(style.borderRightWidth)||0);
    if(measured>0)card._familyNavWidth=measured;
    if(typeof ResizeObserver==='function'&&card.isConnected) {
      card._familyNavTarget=target;
      const observer=new ResizeObserver(entries=>{
        if(!card.isConnected||card._familyNavObserver!==observer||card._familyNavTarget!==target)return;
        const entry=entries.find(item=>item.target===target);if(!entry)return;
        card._familyNavWidth=entry.contentRect.width;applyWidth(card._familyNavWidth);
      });
      card._familyNavObserver=observer;
      observer.observe(target);
    }
  }
  // Without ResizeObserver neither control is hidden, so do not transfer its focus.
  if(typeof ResizeObserver!=='function') { nav.hidden=false;label.hidden=false; }
  else applyWidth(card._familyNavWidth||900);
  if(restoreFocus) {
    const button=buttons.find(item=>item.getAttribute(FAMILY_ATTR)===restoreFocus.tab)||selected;
    if(nav.hidden||(restoreFocus.picker&&!label.hidden))select.focus({preventScroll:true});else button?.focus({preventScroll:true});
  }
}

// W3: Data Exporter's container-local name/state and labelled record-fields pattern.
// Unlike a CSS-only switch, move the original cells/actions so focus and handlers
// survive a breakpoint. Neither observer nor disclosure reads or rebuilds data.
function _rememberFamilyRecords(card) {
  const root = card.shadowRoot, active = root?.activeElement;
  card._familyRecordOpen ||= new Set();
  root?.querySelectorAll('.ht-device-records > details').forEach(detail => {
    if (detail.open) card._familyRecordOpen.add(detail.dataset.recordKey);
    else card._familyRecordOpen.delete(detail.dataset.recordKey);
  });
  if (active?.dataset.recordSort) return { sort: active.dataset.recordSort };
  const record = active?.closest('[data-record-key]');
  return record ? { key: record.dataset.recordKey, id: active.id || null } : null;
}
function _disconnectFamilyRecords(card) {
  card._familyRecordObserver?.disconnect();
  card._familyRecordObserver = null;
}
function _focusFamilyRecord(card, key, id = null) {
  const mount = card._familyRecordMount;
  const item = mount?.items.find(item => item.key === key);
  if (!item) return false;
  const action = id && card.shadowRoot.getElementById(id);
  if (mount.narrow) {
    if (action && item.detail.contains(action)) {
      item.detail.open = true; card._familyRecordOpen.add(key);
      action.focus({ preventScroll: true });
    } else item.summary.focus({ preventScroll: true });
  } else {
    const target = action || item.row.querySelector('button,a[href],input,select');
    if (target) target.focus({ preventScroll: true });
    else { item.row.tabIndex = -1; item.row.focus({ preventScroll: true }); }
  }
  return true;
}
function _bindFamilyRecords(card, restoreFocus = null) {
  const root = card.shadowRoot, table = root?.querySelector('table[data-device-records]');
  if (!table) { _disconnectFamilyRecords(card); card._familyRecordMount = null; return; }
  let mount = card._familyRecordMount;
  if (mount?.table !== table) {
    _disconnectFamilyRecords(card);
    card._familyRecordOpen ||= new Set();
    const doc = card.ownerDocument, wide = table.parentElement;
    const layout = doc.createElement('div'); layout.className = 'ht-device-layout';
    const sorts = doc.createElement('div'); sorts.className = 'ht-record-sorts'; sorts.hidden = true;
    sorts.setAttribute('role', 'group'); sorts.setAttribute('aria-label', card._lang === 'pl' ? 'Sortowanie urządzeń' : 'Device order');
    const list = doc.createElement('div'); list.className = 'ht-device-records'; list.hidden = true;
    wide.before(layout); layout.append(wide, sorts, list);
    const headers = Array.from(table.tHead.rows[0].cells);
    const sortItems = headers.flatMap((header, index) => Array.from(header.querySelectorAll('button'), button => {
      button.dataset.recordSort = String(index);
      // Sorting is still owned by the existing header handler in both tools.
      button.addEventListener('click', () => { if (!header.contains(button)) header.click(); });
      return { header, button, label: button.getAttribute('aria-label') };
    }));
    const items = Array.from(table.tBodies[0].rows, row => {
      const key = row.dataset.recordKey;
      const detail = doc.createElement('details'); detail.dataset.recordKey = key;
      const summary = doc.createElement('summary');
      const name = doc.createElement('strong'); name.textContent = row.dataset.recordName;
      const state = doc.createElement('span'); state.textContent = row.dataset.recordState;
      summary.append(name, state); detail.append(summary);
      const fields = doc.createElement('dl'); fields.className = 'record-fields'; detail.append(fields);
      const cells = Array.from(row.cells, (cell, index) => {
        const label = doc.createElement('dt'); label.textContent = headers[index].textContent.trim();
        const value = doc.createElement('dd'); fields.append(label, value);
        return { cell, value, nodes: Array.from(cell.childNodes) };
      });
      // Network's existing row selection handler remains the sole action owner.
      row.querySelectorAll('.device-detail-button').forEach(button => {
        button.addEventListener('click', () => { if (!row.contains(button)) row.click(); });
      });
      detail.open = card._familyRecordOpen.has(key);
      detail.addEventListener('toggle', () => {
        if (!detail.isConnected) return;
        if (detail.open) card._familyRecordOpen.add(key); else card._familyRecordOpen.delete(key);
      });
      list.append(detail);
      return { key, row, detail, summary, cells };
    });
    mount = { table, layout, wide, sorts, list, sortItems, items, narrow: false };
    card._familyRecordMount = mount;
  }
  const applyWidth = width => {
    if (!Number.isFinite(width) || width <= 0) return;
    const narrow = width < 500;
    if (mount.narrow === narrow) return;
    const active = root.activeElement;
    const focusedItem = mount.items.find(item => item.row.contains(active) || item.detail.contains(active));
    const wasSummary = focusedItem?.summary === active || focusedItem?.row === active;
    // Reveal the destination before moving any focused node into it.
    if (narrow) { mount.list.hidden = false; mount.sorts.hidden = false; }
    else mount.wide.hidden = false;
    mount.sortItems.forEach(({ header, button, label }) => {
      (narrow ? mount.sorts : header).append(button);
      const order = header.getAttribute('aria-sort');
      if (narrow && ['ascending', 'descending'].includes(order)) {
        const spokenOrder = card._lang === 'pl' ? (order === 'ascending' ? 'rosnąco' : 'malejąco') : order;
        button.setAttribute('aria-label', (label || button.textContent.trim()) + ': ' + spokenOrder);
      } else if (label === null) button.removeAttribute('aria-label');
      else button.setAttribute('aria-label', label);
    });
    mount.items.forEach(item => item.cells.forEach(({ cell, value, nodes }) => (narrow ? value : cell).append(...nodes)));
    mount.narrow = narrow;
    if (focusedItem) {
      if (wasSummary) _focusFamilyRecord(card, focusedItem.key);
      else if (active) {
        if (narrow) { focusedItem.detail.open = true; card._familyRecordOpen.add(focusedItem.key); }
        active.focus({ preventScroll: true });
      }
    } else if (mount.sortItems.some(item => item.button === active)) active.focus({ preventScroll: true });
    mount.wide.hidden = narrow; mount.list.hidden = !narrow; mount.sorts.hidden = !narrow;
  };
  if (!card._familyRecordObserver && typeof ResizeObserver === 'function' && card.isConnected) {
    const style = getComputedStyle(mount.layout);
    const measured = mount.layout.getBoundingClientRect().width - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0) - (parseFloat(style.borderLeftWidth) || 0) - (parseFloat(style.borderRightWidth) || 0);
    if (measured > 0) card._familyRecordWidth = measured;
    const observer = new ResizeObserver(entries => {
      if (!card.isConnected || card._familyRecordObserver !== observer || card._familyRecordMount !== mount) return;
      const entry = entries.find(item => item.target === mount.layout);
      if (!entry) return;
      card._familyRecordWidth = entry.contentRect.width;
      applyWidth(card._familyRecordWidth);
    });
    card._familyRecordObserver = observer; observer.observe(mount.layout);
  }
  applyWidth(typeof ResizeObserver === 'function' ? card._familyRecordWidth || 900 : 900);
  if (restoreFocus?.sort) mount.sortItems.find(item => item.button.dataset.recordSort === restoreFocus.sort)?.button.focus({ preventScroll: true });
  else if (restoreFocus?.key && !_focusFamilyRecord(card, restoreFocus.key, restoreFocus.id)) {
    root.querySelector('#sI,.search-box')?.focus({ preventScroll: true });
  }
}

const _FAMILY_RECORD_CSS = `
/* Container content width controls only presentation. Wide table cells stay intact. */
.ht-device-layout {min-width:0;max-width:100%;}
.ht-device-layout [hidden] {display:none !important;}
.ht-record-sorts {display:flex;flex-wrap:wrap;gap:8px;margin-block:8px;}
.ht-record-sorts button {white-space:normal;overflow-wrap:anywhere;padding:8px !important;}
.ht-device-records > details {min-width:0;padding:8px 0;border-bottom:1px solid var(--bento-border);}
.ht-device-records summary {cursor:pointer;min-height:44px;padding:8px;overflow-wrap:anywhere;white-space:normal;}
.ht-device-records summary strong,.ht-device-records summary > span {display:block;min-width:0;overflow-wrap:anywhere;}
.ht-device-records summary > span {margin-top:4px;}
.ht-device-records .record-fields {display:grid;grid-template-columns:minmax(0,1fr);gap:4px;margin:8px;}
.ht-device-records dt {font-size:12px;color:var(--bento-text-secondary);margin-top:8px;}
.ht-device-records dd {margin:0;min-width:0;white-space:normal;overflow-wrap:anywhere;}
.ht-device-records .device-detail-button {white-space:normal;text-align:start;max-width:100%;}
.ht-device-records .dn {white-space:normal;overflow-wrap:anywhere;}
`;

const _FAMILY_CONTROL_CSS = `
/* Family15: native touch targets; checkbox indicators remain small inside labels. */
:host button,:host summary,:host a[href],:host [role=button],
:host input:not([type=checkbox]):not([type=radio]),:host select,:host textarea {
  box-sizing:border-box;min-height:44px !important;min-width:44px !important;max-width:100%;flex-shrink:0;
}
:host button,:host summary,:host a[href] { white-space:normal !important;overflow-wrap:anywhere; }
:host a[href] { display:inline-flex;align-items:center; }
:host label:has(input[type=checkbox]) { min-height:44px !important;min-width:44px;display:flex;align-items:center;gap:8px;cursor:pointer; }
:host input[type=checkbox] { width:18px !important;height:18px !important;min-width:18px !important;min-height:18px !important;flex:none; }
:host button:focus-visible,:host summary:focus-visible,:host a:focus-visible,:host input:focus-visible,:host select:focus-visible,:host textarea:focus-visible,:host [role=button]:focus-visible {
  outline:3px solid var(--primary-color,#1769aa) !important;outline-offset:2px;
}
.intro-banner { padding-right:64px !important; }
.ht-tab-picker { min-width:0;display:flex;flex-direction:column;gap:6px;padding:8px;margin:0 0 8px; }
.ht-tab-picker select { width:100%;font:inherit;color:var(--primary-text-color,inherit);background:var(--card-background-color,transparent);padding:8px;border:1px solid var(--divider-color,#aaa);border-radius:8px; }
.ht-tab-picker[hidden],.tabs[hidden],.det-tabs[hidden] { display:none !important; }
.tabs,.det-tabs { display:flex;box-sizing:border-box;flex-wrap:wrap !important;overflow:visible !important;min-width:0;max-width:100%; }
:host .tabs button,:host .det-tabs button { min-height:44px !important;min-width:44px !important;white-space:normal !important;overflow-wrap:anywhere;flex:1 1 auto; }
.pagination { flex-wrap:wrap; gap:8px; min-width:0; }
`;

class HADeviceHealth extends HTMLElement {
  constructor() {
    super();
    this._lang = (navigator.language || '').startsWith('pl') ? 'pl' : 'en';
    this.attachShadow({ mode: "open" });
    this._toolId = this.tagName.toLowerCase().replace('ha-', '');
    this._config = HADeviceHealth.getStubConfig();
    this._hass = null;
    this._entityRegistry = new Map();
    this._deviceRegistry = new Map();
    this._registryLoading = null;
    this._registryLoadedAt = 0;
    this._registryRetryAt = 0;
    this._registryStatus = 'idle';
    this._registryEpoch = 0;
    this._registrySession = null;
    this._registryConnection = null;
    this._registryUnsubs = [];
    this._registrySubscriptionEpoch = 0;
    this._registryDirty = false;
    this._activeTab = "devices";
    // Direct HA panels do not call Lovelace setConfig.
    try {
      const saved = JSON.parse(localStorage.getItem('ha-tools-device-health-settings'));
      if (['devices', 'batteries', 'network', 'alerts'].includes(saved?._activeTab)) {
        this._activeTab = saved._activeTab;
      }
    } catch (_) { /* Invalid saved state keeps the default Devices view. */ }
    this._deviceFilter = "all";
    this._searchQuery = "";
    this._groupByDomain = false;
    this._sortBy = "name";
    this._batterySortBy = "level";
    this._alerts = [];
    this._alertHistory = [];
    this._historyDevice = '';
    this._historyDays = 7;
    this._historyView = 'chart';
    this._historyState = 'idle';
    this._historyResult = null;
    this._historyAttempt = null;
    this._historySelected = null;
    this._historyPage = 0;
    this._historyEpisodePage = 0;
    this._historyEpisodesOpen = false;
    this._historyStale = false;
    this._historyEpoch = 0;
    this._historyWire = null;
    this._historyTimer = null;
    this._historyDeadlineMs = 15000;
    this._historyConnection = null;
    this._historyListenersBound = false;
    this._historyConnectionReady = false;
    this._historyBrowserBound = false;
    this._historyBrowserOnline = navigator.onLine !== false;
    this._historyReadyHandler = () => {
      this._historyConnectionReady = this._hass?.connection?.connected === true;
      this._cancelDeviceHistory('not_checked');
      this._historyConnected = this._hass?.connection?.connected === true;
      if (this.isConnected) this._render();
    };
    this._historyDisconnectHandler = () => {
      this._historyConnectionReady = false;
      this._cancelDeviceHistory('offline');
      if (this.isConnected) this._render();
    };
    this._historyOnlineHandler = () => {
      this._historyBrowserOnline = true;
      this._cancelDeviceHistory('not_checked');
      if (this.isConnected) this._render();
    };
    this._historyOfflineHandler = () => {
      this._historyBrowserOnline = false;
      this._cancelDeviceHistory('offline');
      if (this.isConnected) this._render();
    };
    this._alertEpisodes = new Map();
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
    this._renderTimer = null;
    this._offlineTimer = null;
    this._scrollFrame = null;
    this._scrollTimer = null;
    this._firstRender = true;
    this._throttleMs = 5000;
    this._lastRenderTime = 0;
    this._cachedStateHash = '';
    this._backgroundAlertDialog = null;
    this._backgroundAlertResult = null;
    this._backgroundAutomationOperation = null;
    this._backgroundAutomationUserId = undefined;
    // DOM optimization
    this._domBuilt = false;
    this._scrollPosition = 0;
    this._tabsScroll = 0;
  }

  static get _translations() {
    return {
      en: {
        editorTitle: "Title",
        editorBatteryWarning: "Battery warning %",
        editorBatteryCritical: "Battery critical %",
        genericDevice: "Device",
        registryLoading: "Loading device registry…",
        registryFailed: "Could not load the device registry. Existing readings may be out of date.",
        registryNotReady: "Device registry is not available yet.",
        retryRegistry: "Retry",
        networkOther: "Other",
        networkGroup: "{protocol} Network",
        previewDialog: "Generate Device Health background automations",
        previewNote: "Re-running this generator regenerates and updates the same automation ids, for example after adding devices.",
        automation: "automation",
        batteryTriggerBefore: "Trigger: numeric_state below",
        triggerOver: "over",
        batterySensorEntities: "battery sensor entities.",
        batteryAction: "Action: persistent_notification.create with entity name and current value.",
        offlineTriggerBefore: "Trigger: state to",
        triggerFor: "for",
        monitoredDeviceEntities: "monitored device entities.",
        offlineAction: "Action: persistent_notification.create with entity name.",
        yamlPreview: "YAML preview",
        cancel: "Cancel",
        create: "Create",
        creating: "Creating...",
        reload: "Reload",
        batteryAlert: "Battery alert",
        offlineAlert: "Offline alert",
        noBatteryEntities: "No numeric battery sensor entities were detected, so the battery automation cannot be generated.",
        noMonitoredEntities: "No monitored device entities were detected, so the offline automation cannot be generated.",
        haStateNotReady: "Home Assistant state is not available yet. Open the card after Home Assistant finishes loading and try again.",
        batteryLimit: "Detected {count} battery sensors. The automation will use the first 150.",
        automationCreated: "Created automation {id}.",
        automationUpdated: "Updated existing automation {id}.",
        automationCreateFailed: "Failed to create automation {id}: {detail}",
        automationUpdateFailed: "Failed to update automation {id}: {detail}",
        generationFailed: "Automation generation failed: {detail}",
        reloadCalled: "automation.reload service called.",
        reloadFailed: "automation.reload failed: {detail}",
        haRequestFailed: "Home Assistant request failed.",
        haHttpError: "Home Assistant request failed (HTTP {status}).",
        haPermissionDenied: "Home Assistant denied this request. Check administrator permissions.",
        haRequestRejected: "Home Assistant rejected this request. Check the configuration and available services.",
        haOutcomeUnknown: "The request outcome is unknown. Check the automation configuration before trying again.",
        automationWriteUnconfirmed: "Write of automation {id} is unconfirmed: {detail}",
        reloadUnconfirmed: "Reload is unconfirmed: {detail}",
        automationResultScope: "Result covers configuration writes and reload, not future alert delivery.",
        alert_type_battery_critical: "battery critical",
        alert_type_battery_warning: "battery warning",
        alert_type_signal_weak: "signal weak",
        alert_type_offline: "offline",
        alert_type_unavailable: "unavailable",
        introHeadline: "Device battery / signal / last-seen health.",
        introStep1: "Search devices by name and filter by connection status.",
        introStep2: "Use the Batteries and Network tabs to review battery levels and signal readings.",
        introStep3: "Read each device’s model and last state change in the Devices table.",
        dismissIntro: "Dismiss",
        optionalSupport: "Optional support for HA Tools",
        dismissSupport: "Dismiss support link",
        show: "Show",
        elapsedDays: "days",
        elapsedHours: "hours",
        elapsedMinutes: "minutes",
        backgroundAlerts: "Background alerts (24/7)",
        backgroundNote: "Creates native Home Assistant automations so alerts keep working with this panel closed.",
        generateAutomations: "Generate automations…",
        battery: "Battery",
        notCreated: "not created",
        automationActive: "active",
        automationDisabled: "disabled",
        automationUnknown: "unknown",
        lastTriggered: "last triggered",
        never: "never",
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
        unknown: "No entity state",
        toggleGrouping: "Toggle Grouping",
        totalDevices: "Total Devices",
        unlinkedEntities: "Entities without a registered device",
        availability: "Availability",
        name: "Name",
        type: "Type",
        status: "Status",
        lastSeen: "Last state change",
        uptime: "Since change",
        noNetworkEvidence: "No connection evidence in the device registry.",
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
        editorTitle: "Tytuł",
        editorBatteryWarning: "Ostrzeżenie baterii (%)",
        editorBatteryCritical: "Krytyczny poziom baterii (%)",
        genericDevice: "Urządzenie",
        registryLoading: "Ładowanie rejestru urządzeń…",
        registryFailed: "Nie udało się pobrać rejestru urządzeń. Dotychczasowe odczyty mogą być nieaktualne.",
        registryNotReady: "Rejestr urządzeń nie jest jeszcze dostępny.",
        retryRegistry: "Spróbuj ponownie",
        networkOther: "Inne",
        networkGroup: "Sieć: {protocol}",
        previewDialog: "Podgląd automatyzacji Device Health",
        previewNote: "Ponowne uruchomienie generatora odtwarza i aktualizuje te same identyfikatory automatyzacji, na przykład po dodaniu urządzeń.",
        automation: "automatyzacja",
        batteryTriggerBefore: "Wyzwalacz: numeric_state poniżej",
        triggerOver: "dla",
        batterySensorEntities: "encji czujników baterii.",
        batteryAction: "Akcja: persistent_notification.create z nazwą encji i bieżącą wartością.",
        offlineTriggerBefore: "Wyzwalacz: zmiana stanu na",
        triggerFor: "przez",
        monitoredDeviceEntities: "monitorowanych encji urządzeń.",
        offlineAction: "Akcja: persistent_notification.create z nazwą encji.",
        yamlPreview: "Podgląd YAML",
        cancel: "Anuluj",
        create: "Utwórz",
        creating: "Tworzenie...",
        reload: "Przeładuj",
        batteryAlert: "Alert baterii",
        offlineAlert: "Alert niedostępności",
        noBatteryEntities: "Nie wykryto liczbowych encji czujników baterii, więc nie można wygenerować automatyzacji baterii.",
        noMonitoredEntities: "Nie wykryto monitorowanych encji urządzeń, więc nie można wygenerować automatyzacji niedostępności.",
        haStateNotReady: "Stany Home Assistant nie są jeszcze dostępne. Otwórz kartę po zakończeniu ładowania i spróbuj ponownie.",
        batteryLimit: "Wykryto {count} czujników baterii. Automatyzacja użyje pierwszych 150.",
        automationCreated: "Utworzono automatyzację {id}.",
        automationUpdated: "Zaktualizowano istniejącą automatyzację {id}.",
        automationCreateFailed: "Nie udało się utworzyć automatyzacji {id}: {detail}",
        automationUpdateFailed: "Nie udało się zaktualizować automatyzacji {id}: {detail}",
        generationFailed: "Generowanie automatyzacji nie powiodło się: {detail}",
        reloadCalled: "Wywołano usługę automation.reload.",
        reloadFailed: "Przeładowanie automation.reload nie powiodło się: {detail}",
        haRequestFailed: "Żądanie Home Assistant nie powiodło się.",
        haHttpError: "Żądanie Home Assistant nie powiodło się (HTTP {status}).",
        haPermissionDenied: "Home Assistant odrzucił żądanie. Sprawdź uprawnienia administratora.",
        haRequestRejected: "Home Assistant odrzucił żądanie. Sprawdź konfigurację i dostępne usługi.",
        haOutcomeUnknown: "Wynik żądania jest nieznany. Sprawdź konfigurację automatyzacji przed ponowieniem.",
        automationWriteUnconfirmed: "Zapis automatyzacji {id} jest niepotwierdzony: {detail}",
        reloadUnconfirmed: "Przeładowanie jest niepotwierdzone: {detail}",
        automationResultScope: "Wynik dotyczy zapisu konfiguracji i przeładowania, nie przyszłego doręczenia alertów.",
        alert_type_battery_critical: "krytyczny poziom baterii",
        alert_type_battery_warning: "niski poziom baterii",
        alert_type_signal_weak: "słaby sygnał",
        alert_type_offline: "offline",
        alert_type_unavailable: "niedostępne",
        introHeadline: "Stan baterii, sygnału i ostatniej aktywności urządzeń.",
        introStep1: "Wyszukuj urządzenia po nazwie i filtruj je według stanu połączenia.",
        introStep2: "W zakładkach Baterie i Sieć sprawdzaj poziomy baterii oraz odczyty sygnału.",
        introStep3: "W tabeli Urządzenia odczytuj model i ostatnią zmianę stanu każdego urządzenia.",
        dismissIntro: "Zamknij instrukcję",
        optionalSupport: "Dobrowolne wsparcie HA Tools",
        dismissSupport: "Ukryj link wsparcia",
        show: "Pokaż",
        elapsedDays: "dni",
        elapsedHours: "godz.",
        elapsedMinutes: "min",
        backgroundAlerts: "Alerty w tle (24/7)",
        backgroundNote: "Tworzy automatyzacje Home Assistant, aby alerty działały także przy zamkniętym panelu.",
        generateAutomations: "Generuj automatyzacje…",
        battery: "Bateria",
        notCreated: "nie utworzono",
        automationActive: "aktywna",
        automationDisabled: "wyłączona",
        automationUnknown: "stan nieznany",
        lastTriggered: "ostatnio uruchomiona",
        never: "nigdy",
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
        unknown: "Brak stanu encji",
        toggleGrouping: "Przełącz Grupowanie",
        totalDevices: "Razem Urządzeń",
        unlinkedEntities: "Encje bez zarejestrowanego urządzenia",
        availability: "Dostępność",
        name: "Nazwa",
        type: "Typ",
        status: "Status",
        lastSeen: "Ostatnia zmiana stanu",
        uptime: "Od zmiany",
        noNetworkEvidence: "Brak danych o połączeniu w rejestrze urządzeń.",
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
    const lang = this._hass?.language?.startsWith('pl') ? 'pl' : 'en';
    const T = HADeviceHealth._translations;
    return (T[lang] || T['en'])[key] || T['en'][key] || key;
  }

  setConfig(config) {
    this._config = {
      ...HADeviceHealth.getStubConfig(),
      ...config,
    };
    for (const [key, fallback] of Object.entries(HADeviceHealth.getStubConfig())) {
      if (key !== 'type') this._config[key] = this._getConfigNumber(key, fallback);
    }
    if (this._hass) this._update();
  }

  _computeStateHash() {
    if (!this._hass?.states) return '';
    // Every entity contributes its ID to the unlinked count. Registered states
    // contribute the values consumed by device health, battery and network UI.
    return JSON.stringify(Object.keys(this._hass.states).sort().map(entityId => {
      const state = this._hass.states[entityId];
      const relevant = this._entityRegistry.has(entityId) ||
        this._isBatteryLevelEntity(entityId, state) || entityId.startsWith('device_tracker.') ||
        entityId === 'automation.ha_device_health_battery_alert' ||
        entityId === 'automation.ha_device_health_offline_alert';
      return relevant ? [entityId, state.state, state.last_changed, state.last_updated, state.attributes] : [entityId];
    }));
  }

  set hass(hass) {
    try {
      var _bg = (getComputedStyle(this).getPropertyValue('--card-background-color') || getComputedStyle(this).getPropertyValue('--primary-background-color') || '').trim();
      var _d = false;
      if (_bg) {
        var _h, _r, _g, _b, _m;
        if (_bg.charAt(0) === '#') { _h = _bg.slice(1); if (_h.length === 3) _h = _h.replace(/(.)/g, '$1$1'); _r = parseInt(_h.slice(0,2),16); _g = parseInt(_h.slice(2,4),16); _b = parseInt(_h.slice(4,6),16); }
        else { _m = _bg.match(/[\d.]+/g); if (_m) { _r = +_m[0]; _g = +_m[1]; _b = +_m[2]; } }
        if (_r != null) _d = (0.2126*_r + 0.7152*_g + 0.0722*_b) / 255 < 0.5;
      } else if (hass && hass.themes) { _d = !!hass.themes.darkMode; }
      this.classList.toggle('bento-dark', _d);
    } catch (e) {}
    if (hass?.language) this._lang = hass.language.startsWith('pl') ? 'pl' : 'en';
    const registrySession = this._readSession(hass);
    const registrySessionChanged = this._registrySession && !this._sameReadSession(this._registrySession, registrySession);
    const backgroundIdentityChanged = this._backgroundAutomationUserId !== hass?.user?.id;
    if (registrySessionChanged || backgroundIdentityChanged || hass?.user?.is_admin !== true) {
      if (this._backgroundAutomationOperation) this._backgroundAutomationOperation.cancelled = true;
      this._backgroundAlertDialog = null;
      this._backgroundAlertResult = null;
    }
    this._backgroundAutomationUserId = hass?.user?.id;
    if (registrySessionChanged) {
      this._clearOfflineTimer();
      this._stopRegistryUpdates();
      this._registryEpoch++;
      this._registryLoading = null;
      this._registryLoadedAt = 0;
      this._registryRetryAt = 0;
      this._registryStatus = 'idle';
      this._entityRegistry.clear();
      this._deviceRegistry.clear();
      this._alerts = [];
      this._alertHistory = [];
      this._alertEpisodes.clear();
      this._acknowledgedAlerts.clear();
      this._cachedStateHash = null;
    }
    this._registrySession = registrySession;
    this._hass = hass;
    const historyContextChanged = this._syncHistoryContext();
    this._loadRegistries();
    this._subscribeRegistryUpdates();
    if (haToolsPersistence) haToolsPersistence.setHass(hass);
    if (this._firstRender) {
      this._firstRender = false;
      this._cachedStateHash = this._computeStateHash();
      this._generateAlerts();
      this._render();
      return;
    }
    // Locale and administrator controls can change without any sensor change.
    // Rendered scalars also detect an in-place update of HA's user object.
    if (historyContextChanged || registrySessionChanged || backgroundIdentityChanged || this._renderedLang !== this._lang || this._renderedIsAdmin !== (hass?.user?.is_admin === true)) {
      this._render();
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
        this._renderTimer = setTimeout(() => {
          this._renderTimer = null;
          if (!this.isConnected) return;
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

  // Same session/epoch pattern as Network Map; this plugin reads native HA
  // registries rather than the integration's list_devices endpoint.
  _readSession(hass = this._hass) {
    return { connection: hass?.connection, userId: hass?.user?.id, admin: hass?.user?.is_admin };
  }

  _sameReadSession(a, b) {
    return a.connection === b.connection && a.userId === b.userId && a.admin === b.admin;
  }

  _stopRegistryUpdates() {
    this._registrySubscriptionEpoch++;
    this._registryConnection = null;
    for (const unsubscribe of this._registryUnsubs) unsubscribe();
    this._registryUnsubs = [];
    this._registryDirty = false;
  }

  _subscribeRegistryUpdates() {
    const connection = this._hass?.connection;
    if (!this.isConnected || !connection?.subscribeEvents || this._registryConnection === connection) return;
    this._registryConnection = connection;
    const session = this._readSession();
    const epoch = this._registrySubscriptionEpoch;
    const current = () => this.isConnected && epoch === this._registrySubscriptionEpoch && this._sameReadSession(session, this._readSession());
    for (const type of ['device_registry_updated', 'entity_registry_updated']) {
      Promise.resolve(connection.subscribeEvents(() => {
        if (!current()) return;
        if (this._registryLoading) this._registryDirty = true;
        else this._loadRegistries(true);
      }, type)).then(unsubscribe => {
        if (current()) this._registryUnsubs.push(unsubscribe);
        else unsubscribe();
      }).catch(() => { /* Periodic reads and explicit retry remain available. */ });
    }
  }

  _loadRegistries(explicitRetry = false) {
    if (!this._hass?.callWS || this._registryLoading) return;
    if (!explicitRetry && (Date.now() < this._registryRetryAt || Date.now() - this._registryLoadedAt < 300000)) return;
    const hass = this._hass;
    const session = this._readSession(hass);
    const epoch = ++this._registryEpoch;
    const current = () => this.isConnected && epoch === this._registryEpoch && this._sameReadSession(session, this._readSession());
    this._registryStatus = 'loading';
    this._registryDirty = false;
    const pending = Promise.resolve().then(() => Promise.all([
      hass.callWS({ type: 'config/entity_registry/list' }),
      hass.callWS({ type: 'config/device_registry/list' })
    ])).then(([entities, devices]) => {
      if (!current()) return;
      this._entityRegistry = new Map(entities.map(entry => [entry.entity_id, entry]));
      this._deviceRegistry = new Map(devices.map(entry => [entry.id, entry]));
      this._registryLoadedAt = Date.now();
      this._registryRetryAt = 0;
      this._registryStatus = 'ready';
      this._cachedStateHash = this._computeStateHash();
      this._generateAlerts();
      this._render();
    }).catch(() => {
      if (!current()) return;
      this._registryStatus = 'error';
      this._registryRetryAt = Date.now() + 30000;
      this._render();
    }).finally(() => {
      if (this._registryLoading !== pending) return;
      this._registryLoading = null;
      if (current() && this._registryDirty) this._loadRegistries(true);
    });
    this._registryLoading = pending;
    if (explicitRetry) this._render();
    return pending;
  }

  _update() {
    this._generateAlerts();
    this._render();
  }

  _ht(key) {
    const labels = {
      title: ['Recorded device history', 'Zapisana historia urządzenia'],
      device: ['Device', 'Urządzenie'], range: ['Range', 'Zakres'], days: ['days', 'dni'],
      load: ['Load / refresh', 'Pobierz / odśwież'], chart: ['Chart', 'Wykres'], data: ['Data', 'Dane'],
      idle: ['Select a device, then load its Recorder history.', 'Wybierz urządzenie i pobierz jego historię z Recorder.'],
      loading: ['Reading Recorder…', 'Odczyt Recorder…'], loaded: ['Recorder read finished.', 'Odczyt Recorder zakończony.'],
      partial: ['Partial result. Limits, missing sources or invalid records are listed below.', 'Wynik częściowy. Limity, brakujące źródła lub błędne rekordy opisano poniżej.'],
      no_data: ['No recorded samples returned. Quiet period, exclusions, retention and access filtering cannot be distinguished.', 'Nie zwrócono zapisanych próbek. Nie można rozróżnić ciszy, wykluczenia, retencji i filtrowania dostępu.'],
      unsupported: ['History is unsupported here. Requires History/Recorder and a supported Core version; household access requires Core 2026.5.0 or newer.', 'Historia nie jest tutaj obsługiwana. Wymaga History/Recorder i obsługiwanego Core; dostęp domownika wymaga Core 2026.5.0 lub nowszego.'],
      denied: ['History access denied.', 'Odmowa dostępu do historii.'], timeout: ['History deadline exceeded. Refresh explicitly when the pending read settles.', 'Przekroczono czas odczytu historii. Odśwież ręcznie po zakończeniu oczekującego odczytu.'],
      offline: ['Connection unavailable. Recovery requires an explicit refresh.', 'Połączenie niedostępne. Po przywróceniu odśwież ręcznie.'],
      error: ['History could not be read.', 'Nie udało się odczytać historii.'],
      not_checked: ['Selection changed. Load history for this selection.', 'Wybór zmieniony. Pobierz historię tego wyboru.'],
      stale: ['Previous read — stale', 'Poprzedni odczyt — nieaktualny'],
      caveat: ['Recorder state updates only. Retention and continuous coverage are unknown. Silence is not a gap or device downtime.', 'Tylko aktualizacje stanu z Recorder. Retencja i ciągłość pokrycia są nieznane. Cisza nie oznacza luki ani niedostępności urządzenia.'],
      source: ['Source / method', 'Źródło / metoda'], zone: ['Display time zone', 'Strefa wyświetlania'],
      first: ['First actual record', 'Pierwszy rzeczywisty rekord'], last: ['Last actual record', 'Ostatni rzeczywisty rekord'],
      samples: ['Projected rows', 'Wiersze projekcji'], limits: ['Limits', 'Limity'],
      cap: ['Result truncated at a client limit.', 'Wynik ucięty na limicie klienta.'],
      enabled: ['Enabled registered members', 'Włączone encje w rejestrze'], omitted: ['Members omitted because they are not currently readable or exceed the entity cap', 'Encje pominięte, bo nie są obecnie czytelne lub przekraczają limit'],
      unknown: ['Unknown', 'Nieznane'], missing: ['Requested entities without returned records', 'Żądane encje bez zwróconych rekordów'],
      invalid: ['Rejected records', 'Odrzucone rekordy'], entities: ['Requested sources', 'Żądane źródła'],
      battery: ['Battery sample', 'Próbka baterii'], reported_available: ['Entity reported a state', 'Encja zgłosiła stan'],
      reported_unknown: ['Entity reported unknown', 'Encja zgłosiła unknown'], reported_unavailable: ['Entity reported unavailable', 'Encja zgłosiła unavailable'],
      connection: ['Measured connection state', 'Zmierzony stan połączenia'],
      details: ['Selected record', 'Wybrany rekord'], select: ['Select a mark or a Data row to inspect its exact value.', 'Wybierz punkt lub wiersz danych, aby sprawdzić dokładną wartość.'],
      queriedUntil: ['Read through (UTC)', 'Odczytano do (UTC)'], queries: ['Completed daily queries', 'Ukończone zapytania dobowe'],
      time: ['Recorded at', 'Czas zapisu'], value: ['Value / state', 'Wartość / stan'], events: ['Entity availability and measured connection events', 'Zdarzenia dostępności encji i zmierzonego połączenia'],
      eventNote: ['Entity unknown/unavailable is not evidence that the physical device was offline.', 'Stan unknown/unavailable encji nie dowodzi niedostępności fizycznego urządzenia.'],
      recordPrevious: ['Previous record', 'Poprzedni rekord'], recordNext: ['Next record', 'Następny rekord'],
      snapshot: ['Current state snapshot — separate from Recorder history.', 'Bieżący stan — osobno od historii Recorder.'],
      page: ['Page', 'Strona'], previous: ['Previous', 'Poprzednia'], next: ['Next', 'Następna'],
      session: ['Existing alert history below contains observations from this browser session.', 'Dotychczasowa historia alertów poniżej zawiera obserwacje z tej sesji przeglądarki.'],
      inspected: ['Inspected records', 'Sprawdzone rekordy'], subset: ['Visible member entities queried', 'Odpytywane widoczne encje urządzenia'],
      points: ['Recorded samples; no interpolation', 'Zapisane próbki; bez interpolacji'],
      episodes: ['Recorded episodes', 'Zapisane epizody'],
      entity_availability: ['Entity unknown / unavailable', 'Encja unknown / unavailable'],
      measured_connection: ['Measured connection off', 'Zmierzony brak połączenia'],
      recorded_transition: ['Start: recorded transition', 'Początek: zapisana zmiana stanu'],
      first_observation: ['First negative observation; actual onset unknown', 'Pierwsza negatywna obserwacja; rzeczywisty początek nieznany'],
      recovery_recorded: ['Recovery recorded', 'Powrót zapisany'],
      recovery_unconfirmed: ['Recovery unconfirmed', 'Powrót niepotwierdzony'],
      observedSpan: ['Observed span; not physical downtime', 'Zaobserwowany odstęp; nie czas awarii urządzenia'],
      episodeNote: ['One episode per recorded negative sequence. Missing recovery is unconfirmed; empty history does not prove there were no incidents.', 'Jeden epizod na zapisany ciąg negatywnych stanów. Brak powrotu jest niepotwierdzony; pusta historia nie dowodzi braku incydentów.'],

    };
    return labels[key]?.[this._lang === 'pl' ? 1 : 0] || key;
  }

  _historyMembers() {
    const all = [...this._entityRegistry].filter(([, entry]) => entry.device_id === this._historyDevice && !entry.disabled_by);
    const visible = all.filter(([id]) => Object.hasOwn(this._hass?.states || {}, id));
    return { all: all.length, visible: visible.length, ids: visible.map(([id]) => id).sort().slice(0, 16) };
  }

  _historyContextKey() {
    const hass = this._hass, user = hass?.user;
    const members = this._historyMembers();
    return JSON.stringify([this._historyDevice, this._historyDays, this._deviceRegistry.has(this._historyDevice), this._registryEpoch, user?.id, user?.is_admin === true,
      user?.is_owner === true, user?.is_active, user?.group_ids || [], hass?.config?.version,
      members.all, members.visible, members.ids.map(id => [id, this._hass.states[id]?.attributes?.device_class,
        this._hass.states[id]?.attributes?.unit_of_measurement, this._hass.states[id]?.attributes?.source_type,
        this._hass.states[id]?.attributes?.tracking_type])]);
  }

  _cancelDeviceHistory(state = 'not_checked', clear = false) {
    this._historyEpoch++;
    if (this._historyTimer !== null) clearTimeout(this._historyTimer);
    this._historyTimer = null;
    this._historyState = state;
    if (clear) {
      this._historyStale = false;
      this._historyResult = null;
      this._historySelected = null;
      this._historyAttempt = null;
      this._historyProgress = null;
      this._historyPage = 0;
      this._historyEpisodePage = 0;
      this._historyEpisodesOpen = false;
    } else if (this._historyResult) this._historyStale = true;
  }

  _bindHistoryLifecycle() {
    const connection = this._hass?.connection;
    if (connection !== this._historyConnection) {
      if (this._historyConnection?.removeEventListener) {
        this._historyConnection.removeEventListener('ready', this._historyReadyHandler);
        this._historyConnection.removeEventListener('disconnected', this._historyDisconnectHandler);
      }
      this._historyListenersBound = false;
      if (this._historyConnection) this._cancelDeviceHistory('not_checked', true);
      this._historyConnectionReady = connection?.connected === true;
      this._historyConnection = connection;
    }
    if (this.isConnected && connection?.addEventListener && !this._historyListenersBound) {
      connection.addEventListener('ready', this._historyReadyHandler);
      connection.addEventListener('disconnected', this._historyDisconnectHandler);
      this._historyListenersBound = true;
    }
    if (this.isConnected && !this._historyBrowserBound) {
      window.addEventListener('online', this._historyOnlineHandler);
      window.addEventListener('offline', this._historyOfflineHandler);
      this._historyBrowserBound = true;
    }
  }

  _syncHistoryContext() {
    const previousEpoch = this._historyEpoch;
    this._bindHistoryLifecycle();
    const user = this._hass?.user;
    const identity = JSON.stringify([user?.id, user?.is_admin === true, user?.is_owner === true, user?.is_active, user?.group_ids || []]);
    const key = this._historyContextKey();
    if (this._historyIdentity !== undefined && this._historyIdentity !== identity) this._cancelDeviceHistory('not_checked', true);
    else if (this._historyContext !== undefined && key !== this._historyContext) this._cancelDeviceHistory('not_checked', true);
    if (this._historyConnected !== undefined && this._historyConnected !== (this._hass?.connection?.connected === true)) this._cancelDeviceHistory(this._hass?.connection?.connected === true ? 'not_checked' : 'offline');
    this._historyIdentity = identity;
    this._historyContext = key;
    this._historyConnected = this._hass?.connection?.connected === true;
    if (!this._historyConnected) this._historyConnectionReady = false;
    return previousEpoch !== this._historyEpoch;
  }

  _historySupportState() {
    const hass = this._hass;
    if (!hass?.user?.id || hass.user.is_active === false) return 'denied';
    if (!this.isConnected || !this._historyBrowserOnline || navigator.onLine === false || hass.connection?.connected !== true || this._historyConnectionReady !== true) return 'offline';
    if (typeof hass.callWS !== 'function' || this._registryStatus !== 'ready') return 'unsupported';
    if (Array.isArray(hass.config?.components) && !hass.config.components.includes('history')) return 'unsupported';
    const match = /^(\d{4})\.(\d{1,2})\.(\d+)(?:(a|b|rc)(\d+))?$/.exec(hass.config?.version || '');
    if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) return 'unsupported';
    const version = Number(match[1]) * 10000 + Number(match[2]) * 100 + Number(match[3]);
    if (version < 20240100 || (hass.user.is_admin !== true && (version < 20260500 || (version === 20260500 && match[4])))) return 'unsupported';
    if (!this._deviceRegistry.has(this._historyDevice)) return 'not_checked';
    return null;
  }

  // Core history/history_during_period result, NOT REST/full-state objects.
  _historyProject(raw, { start, end, entityIds }) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('invalid_history_shape');
    const rows = [], seen = new Set(), missing = [];
    let invalid = 0, inspected = 0, capped = false, firstRecord = null, lastRecord = null;
    const add = (entityId, time, kind, state, value = null, unit = '') => {
      const id = JSON.stringify([entityId, time, kind, state, unit]);
      if (seen.has(id)) return;
      seen.add(id);
      if (rows.length >= 2400) { capped = true; return; }
      rows.push({id,entityId,time,utc:new Date(time).toISOString(),kind,state,value,unit});
    };
    for (const entityId of entityIds) {
      if (!Object.hasOwn(raw, entityId) || !raw[entityId]?.length) {
        if (Object.hasOwn(raw, entityId) && !Array.isArray(raw[entityId])) throw new Error('invalid_history_shape');
        missing.push(entityId); continue;
      }
      const states = raw[entityId];
      if (!Array.isArray(states)) throw new Error('invalid_history_shape');
      // Do not sort an unbounded response. The endpoint has no server row cap.
      if (states.length > 12000 || inspected + states.length > 12000) { capped = true; break; }
      inspected += states.length;
      let previousAvailability = null;
      for (const record of [...states].sort((a, b) => (a?.lu || 0) - (b?.lu || 0))) {
        if (!record || typeof record.s !== 'string' || !record.s.trim() || typeof record.lu !== 'number' ||
            !Number.isFinite(record.lu) || !Number.isFinite(record.lu * 1000) ||
            record.lu * 1000 < start || record.lu * 1000 >= end || Math.abs(record.lu * 1000) > 8640000000000000) { invalid++; continue; }
        const time = Math.round(record.lu * 1000), attrs = record.a;
        firstRecord = firstRecord === null ? time : Math.min(firstRecord, time);
        lastRecord = lastRecord === null ? time : Math.max(lastRecord, time);
        const availability = record.s === 'unavailable' ? 'reported_unavailable' : record.s === 'unknown' ? 'reported_unknown' : 'reported_available';
        if (availability !== previousAvailability) add(entityId,time,availability,record.s);
        previousAvailability = availability;
        if (!attrs || typeof attrs !== 'object' || Array.isArray(attrs)) { invalid++; continue; }
        const namedBattery = (entityId.includes('_battery') || entityId.includes('battery_level')) && !attrs.device_class && attrs.unit_of_measurement === '%';
        if (attrs.device_class === 'battery' || namedBattery) {
          const unit = attrs.unit_of_measurement;
          const number = Number(record.s);
          if (!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/i.test(record.s.trim()) || !['%', 'V', 'mV'].includes(unit) || !Number.isFinite(number) || number < 0 || (unit === '%' && number > 100)) {
            if (!['unknown', 'unavailable'].includes(record.s)) invalid++;
          } else add(entityId,time,'battery',record.s,number,unit);
        }
        const measuredBinary = entityId.startsWith('binary_sensor.') && attrs.device_class === 'connectivity' && ['on','off'].includes(record.s);
        const measuredTracker = entityId.startsWith('device_tracker.') && attrs.source_type !== 'gps' && attrs.tracking_type !== 'position' &&
          (attrs.source_type === 'router' || attrs.tracking_type === 'connection') && ['home','not_home'].includes(record.s);
        if (measuredBinary || measuredTracker) add(entityId,time,'connection',record.s);
      }
    }
    rows.sort((a,b)=>a.time-b.time||a.entityId.localeCompare(b.entityId)||a.kind.localeCompare(b.kind));
    return {rows,episodes:this._historyEpisodes(rows),start,end,entityIds:[...entityIds],missing,invalid,inspected,capped,coverage:'unknown',retention:'unknown',
      first:firstRecord === null ? null : new Date(firstRecord).toISOString(),
      last:lastRecord === null ? null : new Date(lastRecord).toISOString()};
  }

  _historyEpisodes(rows) {
    const episodes = [], lanes = new Map();
    for (const row of rows) {
      const kind = row.kind === 'connection' ? 'measured_connection'
        : ['reported_available', 'reported_unknown', 'reported_unavailable'].includes(row.kind) ? 'entity_availability' : null;
      if (!kind) continue;
      const key = JSON.stringify([row.entityId, kind]);
      if (!lanes.has(key)) lanes.set(key, { previous: null, active: null });
      const lane = lanes.get(key);
      const negative = kind === 'measured_connection' ? ['off', 'not_home'].includes(row.state) : row.kind !== 'reported_available';
      if (negative && !lane.active) {
        const episode = { id: JSON.stringify([row.entityId, kind, row.utc]), entityId: row.entityId, kind,
          start: row.utc, startTime: row.time, startEvidence: lane.previous === false ? 'recorded_transition' : 'first_observation',
          end: null, endTime: null, observedSeconds: null, status: 'recovery_unconfirmed' };
        episodes.push(episode); lane.active = episode;
      } else if (!negative && lane.active) {
        lane.active.end = row.utc; lane.active.endTime = row.time;
        lane.active.observedSeconds = (row.time - lane.active.startTime) / 1000;
        lane.active.status = 'recovery_recorded'; lane.active = null;
      }
      lane.previous = negative;
    }
    return episodes.sort((a,b)=>a.startTime-b.startTime || a.entityId.localeCompare(b.entityId) || a.kind.localeCompare(b.kind));
  }

  _renderHistoryEpisodes(result) {
    if (!result) return '';
    const episodes = result.episodes || [], pages = Math.max(1, Math.ceil(episodes.length / 50));
    this._historyEpisodePage = Math.max(0, Math.min(this._historyEpisodePage, pages - 1));
    const visible = episodes.slice(this._historyEpisodePage * 50, (this._historyEpisodePage + 1) * 50);
    return `<details class="history-episodes" ${this._historyEpisodesOpen ? 'open' : ''}><summary>${this._ht('episodes')}: ${episodes.length}</summary>
      <p>${this._ht('episodeNote')}</p><ol>${visible.map(episode=>`<li><strong>${_esc(this._ht(episode.kind))}</strong><span>${_esc(episode.entityId)}</span>
      <span>${_esc(this._ht(episode.startEvidence))}</span><time datetime="${_esc(episode.start)}">${_esc(this._historyDate(episode.startTime))} · ${_esc(episode.start)}</time>
      <strong>${_esc(this._ht(episode.status))}</strong>${episode.end ? `<time datetime="${_esc(episode.end)}">${_esc(this._historyDate(episode.endTime))} · ${_esc(episode.end)}</time><span>${this._ht('observedSpan')}: ${_esc(episode.observedSeconds)} s</span>` : ''}</li>`).join('')}</ol>
      ${pages > 1 ? `<div class="history-controls"><button type="button" class="history-episode-prev" ${this._historyEpisodePage === 0 ? 'disabled' : ''}>${this._ht('previous')}</button><span>${this._ht('page')} ${this._historyEpisodePage+1} / ${pages}</span><button type="button" class="history-episode-next" ${this._historyEpisodePage === pages-1 ? 'disabled' : ''}>${this._ht('next')}</button></div>` : ''}</details>`;
  }

  _loadDeviceHistory() {
    // The wire slot survives cancellation/deadline until the real call settles.
    if (this._historyWire) return this._historyWire;
    this._syncHistoryContext();
    const unsupported = this._historySupportState();
    if (unsupported) { this._historyState = unsupported; this._render(); return Promise.resolve(); }
    const members = this._historyMembers();
    if (!members.ids.length) { this._historyState = 'no_data'; this._historyResult = null; this._render(); return Promise.resolve(); }
    const hass = this._hass, connection = hass.connection, key = this._historyContextKey();
    const epoch = ++this._historyEpoch;
    const days = this._historyDays === 30 ? 30 : 7;
    const end = Date.now(), start = end - days * 86400000;
    const scope = {start,end,entityIds:members.ids};
    this._historyAttempt = {...scope,visible:members.visible,all:members.all};
    this._historyState = 'loading'; this._historyStale = Boolean(this._historyResult); this._historyProgress = null;
    const current = () => this.isConnected && this._hass?.connection === connection && connection.connected === true &&
      this._historyBrowserOnline && this._historyConnectionReady === true && navigator.onLine !== false && epoch === this._historyEpoch && key === this._historyContextKey();
    this._historyTimer = setTimeout(() => {
      if (current()) {
        if (this._historyProgress?.rows.length) this._historyResult = {...this._historyProgress,capped:true,readFailure:'timeout'};
        this._cancelDeviceHistory('timeout'); this._render();
      }
    }, this._historyDeadlineMs);
    const pending = Promise.resolve().then(async () => {
      const merged = Object.fromEntries(members.ids.map(id => [id, []]));
      let count = 0, queries = 0, rejected = 0, result;
      for (let cursor = start; cursor < end; cursor += 86400000) {
        if (!current()) return;
        const response = await hass.callWS({type:'history/history_during_period',start_time:new Date(cursor-1).toISOString(),
          end_time:new Date(Math.min(end,cursor+86400000)).toISOString(),entity_ids:members.ids,
          include_start_time_state:false,significant_changes_only:false,minimal_response:false,no_attributes:false});
        if (!current()) return;
        if (!response || typeof response !== 'object' || Array.isArray(response)) throw new Error('invalid_history_shape');
        queries++;
        let scanCap = false;
        for (const id of members.ids) {
          if (!Object.hasOwn(response,id)) continue;
          if (!Array.isArray(response[id])) throw new Error('invalid_history_shape');
          if (response[id].length + count > 12000) { scanCap = true; break; }
          count += response[id].length;
          // Filter per-day boundaries before merging; no future/out-of-slice records.
          const accepted=response[id].filter(record => typeof record?.lu !== 'number' ||
            (record.lu * 1000 >= cursor && record.lu * 1000 < Math.min(end,cursor+86400000)));
          rejected += response[id].length-accepted.length;
          merged[id].push(...accepted);
        }
        result = this._historyProject(merged,scope);
        result.invalid += rejected;
        result.queries=queries; result.visible=members.visible; result.all=members.all;
        result.completedUntil=Math.min(end,cursor+86400000);
        if (scanCap) result.capped = true;
        this._historyProgress = result;
        if (result.capped || result.rows.length >= 2400) { result.capped = true; break; }
      }
      if (!current()) return;
      result ||= this._historyProject(merged,scope);
      result.capped ||= members.visible > members.ids.length;
      result.queries = queries; result.visible = members.visible; result.all = members.all; result.omitted = members.all-members.ids.length;
      this._historyResult = result; this._historySelected = null; this._historyPage = 0; this._historyEpisodePage = 0; this._historyStale = false;
      this._historyState = result.capped || result.invalid || result.omitted || (result.rows.length && result.missing.length) ? 'partial' : result.rows.length ? 'loaded' : 'no_data';
    }).catch(error => {
      if (!current()) return;
      this._historyState = ['unauthorized','unauthorized_entity','forbidden'].includes(error?.code) ? 'denied'
        : error?.code === 'unknown_command' ? 'unsupported' : 'error';
      if (this._historyState === 'denied') this._historyResult = null;
      else if (this._historyProgress?.rows.length) this._historyResult={...this._historyProgress,capped:true,readFailure:this._historyState};
      this._historyStale = Boolean(this._historyResult);
      // No raw server error, message, stack or response enters the UI/logs.
    }).finally(() => {
      if (this._historyWire !== pending) return;
      this._historyWire = null;
      if (this._historyTimer !== null) clearTimeout(this._historyTimer);
      this._historyTimer = null;
      if (this.isConnected) this._render();
    });
    this._historyWire = pending;
    this._render();
    return pending;
  }

  _historyZone() {
    const zone = this._hass?.config?.time_zone || 'UTC';
    try { new Intl.DateTimeFormat('en',{timeZone:zone}); return zone; } catch (_) { return 'UTC'; }
  }

  _historyDate(time) {
    return new Intl.DateTimeFormat(this._lang === 'pl' ? 'pl-PL' : 'en-GB',
      {timeZone:this._historyZone(),year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',timeZoneName:'short'}).format(time);
  }

  _historyRowText(row) {
    return `${this._historyDate(row.time)} · ${row.entityId} · ${this._ht(row.kind)} · ${row.value === null ? row.state : row.value}${row.unit ? ' '+row.unit : ''}`;
  }

  _renderDeviceHistory() {
    const ui = createUiV3({language:this._lang});
    const result = this._historyResult, scope = result || this._historyAttempt;
    const code = this._historyState === 'loaded' ? 'success' : this._historyState === 'partial' ? 'partial'
      : this._historyState === 'no_data' ? 'no_data' : ['denied','error','timeout'].includes(this._historyState) ? 'error' : 'not_checked';
    const devices = [...this._deviceRegistry.values()];
    const pageCount = Math.max(1,Math.ceil((result?.rows.length || 0)/50));
    this._historyPage = Math.min(this._historyPage,pageCount-1);
    // Both views use identical page/order; group batteries by source/unit, then events.
    const rows = (result?.rows.slice(this._historyPage*50,(this._historyPage+1)*50) || []).sort((a,b) => {
      if ((a.kind==='battery') !== (b.kind==='battery')) return a.kind==='battery' ? -1 : 1;
      if (a.kind==='battery') return a.entityId.localeCompare(b.entityId) || a.unit.localeCompare(b.unit) || a.time-b.time;
      return a.time-b.time || a.entityId.localeCompare(b.entityId) || a.kind.localeCompare(b.kind);
    });
    const selected = result?.rows.find(row=>row.id===this._historySelected);
    const selectedIndex = rows.findIndex(row=>row.id===this._historySelected);
    let visualization = '';
    if (rows.length && this._historyView === 'chart') {
      const batteryGroups = new Map();
      for (const row of rows.filter(row=>row.kind==='battery')) {
        const key = JSON.stringify([row.entityId,row.unit]);
        if (!batteryGroups.has(key)) batteryGroups.set(key,[]);
        batteryGroups.get(key).push(row);
      }
      const x = time => 10 + 80 * (time-result.start)/(result.end-result.start);
      const mark = (row,left,top) => `<button type="button" class="history-mark ${row.kind==='battery' ? 'history-battery-mark' : 'history-event-mark'}" style="left:${left}%;top:${top}%" data-history-row="${_esc(row.id)}" aria-label="${_esc(this._historyRowText(row))}" aria-pressed="${row.id===this._historySelected}"><span aria-hidden="true">${row.kind==='battery' ? '●' : row.kind==='reported_available' ? '◇' : row.kind==='connection' ? '◆' : '!'}</span></button>`;
      for (const group of batteryGroups.values()) {
        const unit=group[0].unit, values=group.map(row=>row.value);
        let min=unit==='%' ? 0 : Math.min(...values), max=unit==='%' ? 100 : Math.max(...values);
        if (min===max) { min=Math.max(0,min-0.5);max+=0.5; }
        const y=value=>max>min && Number.isFinite(max-min) ? 15+70*(1-(value-min)/(max-min)) : 50;
        visualization += `<figure class="history-figure"><figcaption>${_esc(group[0].entityId)} · ${_esc(unit)} <small>${this._ht('points')}</small></figcaption>
          <div class="history-plot"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M10 15H90 M10 50H90 M10 85H90" stroke="var(--divider-color,#aaa)" fill="none" vector-effect="non-scaling-stroke"/></svg>
          <span class="history-axis history-axis-top">${_esc(max.toFixed(2).replace(/\.00$/,''))} ${_esc(unit)}</span><span class="history-axis history-axis-bottom">${_esc(min.toFixed(2).replace(/\.00$/,''))} ${_esc(unit)}</span>
          ${group.map(row=>mark(row,x(row.time),y(row.value))).join('')}</div>
          <div class="history-dates"><span>${_esc(this._historyDate(result.start))}</span><span>${_esc(this._historyDate(result.end))}</span></div></figure>`;
      }
      const events=rows.filter(row=>row.kind!=='battery');
      if (events.length) visualization+=`<figure class="history-figure"><figcaption>${this._ht('events')}</figcaption><p>${this._ht('eventNote')}</p><div class="history-plot history-events">${events.map((row,i)=>mark(row,x(row.time),18+(i%4)*20)).join('')}</div><div class="history-dates"><span>${_esc(this._historyDate(result.start))}</span><span>${_esc(this._historyDate(result.end))}</span></div></figure>`;
    } else if (rows.length) {
      visualization=`<ol class="history-data">${rows.map(row=>`<li><button type="button" data-history-row="${_esc(row.id)}" aria-pressed="${row.id===this._historySelected}"><time datetime="${_esc(row.utc)}">${_esc(this._historyDate(row.time))}</time><strong>${_esc(this._ht(row.kind))}</strong><span>${_esc(row.entityId)}</span><span>${_esc(row.value===null ? row.state : row.value)} ${_esc(row.unit)}</span></button></li>`).join('')}</ol>`;
    }
    return `<section class="device-history" aria-label="${this._ht('title')}">
      <h3>${this._ht('title')}</h3><p>${this._ht('caveat')}</p>
      <div class="history-controls"><label>${this._ht('device')}<select class="history-device"><option value="">—</option>${devices.map(device=>`<option value="${_esc(device.id)}" ${device.id===this._historyDevice?'selected':''}>${_esc(device.name_by_user||device.name||this._t('genericDevice'))}</option>`).join('')}</select></label>
      <label>${this._ht('range')}<select class="history-range">${[7,30].map(days=>`<option value="${days}" ${this._historyDays===days?'selected':''}>${days} ${this._ht('days')}</option>`).join('')}</select></label>
      <button type="button" class="history-load" ${this._historyWire?'disabled':''}>${this._ht('load')}</button></div>
      <p class="history-status" role="status">${ui.statusHtml(code)} ${_esc(this._ht(this._historyState==='idle'?'idle':this._historyState))} ${this._historyStale?`<strong>${this._ht('stale')}</strong>`:''}</p>
      ${scope?`<details class="history-provenance"><summary>${this._ht('source')}: HA Recorder</summary><dl>
        <dt>${this._ht('source')}</dt><dd>history/history_during_period · include_start_time_state=false</dd>
        <dt>${this._ht('range')}</dt><dd>${_esc(new Date(scope.start).toISOString())} → ${_esc(new Date(scope.end).toISOString())}</dd>
        <dt>${this._ht('queriedUntil')}</dt><dd>${_esc(result?.completedUntil ? new Date(result.completedUntil).toISOString() : '—')}</dd><dt>${this._ht('queries')}</dt><dd>${result?.queries||0}</dd>
        <dt>${this._ht('zone')}</dt><dd>${_esc(this._historyZone())}</dd>
        <dt>${this._ht('first')}</dt><dd>${_esc(result?.first||'—')}</dd><dt>${this._ht('last')}</dt><dd>${_esc(result?.last||'—')}</dd>
        <dt>${this._ht('samples')}</dt><dd>${result?.rows.length||0}</dd><dt>${this._ht('inspected')}</dt><dd>${result?.inspected||0}</dd>
        <dt>${this._ht('subset')}</dt><dd>${scope.entityIds.length} / ${scope.visible ?? scope.entityIds.length}</dd><dt>${this._ht('enabled')}</dt><dd>${scope.all ?? scope.entityIds.length}</dd><dt>${this._ht('omitted')}</dt><dd>${result?.omitted ?? (scope.all ?? scope.entityIds.length)-scope.entityIds.length}</dd>
        <dt>${this._ht('limits')}</dt><dd>16 ${this._ht('entities')} · 2400 ${this._ht('samples')} · 12000 ${this._ht('inspected')} · 30 × 24 h · 15 s</dd>
        <dt>${this._ht('invalid')}</dt><dd>${result?.invalid||0}</dd><dt>${this._ht('missing')}</dt><dd>${result?.missing.length||0}</dd>
        <dt>${this._ht('entities')}</dt><dd>${scope.entityIds.map(id=>_esc(id)).join('<br>')}</dd></dl></details>`:''}
      ${this._renderHistoryEpisodes(result)}
      ${result?.capped?`<p class="history-cap" role="status">${this._ht('cap')}</p>`:''}
      ${result?.rows.length?`<div class="history-controls history-view" role="group" aria-label="${this._ht('chart')} / ${this._ht('data')}"><button type="button" data-history-view="chart" aria-pressed="${this._historyView==='chart'}">${this._ht('chart')}</button><button type="button" data-history-view="data" aria-pressed="${this._historyView==='data'}">${this._ht('data')}</button></div>
      <div class="history-inspector" role="status">${selected?`<strong>${this._ht('details')}</strong><p>${_esc(this._historyRowText(selected))}</p><time datetime="${_esc(selected.utc)}">${_esc(selected.utc)}</time>`:this._ht('select')}</div>
      <div class="history-controls history-step"><button type="button" class="history-record-prev" ${selectedIndex<=0?'disabled':''}>${this._ht('recordPrevious')}</button><button type="button" class="history-record-next" ${selectedIndex>=rows.length-1?'disabled':''}>${this._ht('recordNext')}</button></div>
      ${visualization}<div class="history-controls history-pages"><button type="button" class="history-prev" ${this._historyPage===0?'disabled':''}>${this._ht('previous')}</button><span>${this._ht('page')} ${this._historyPage+1} / ${pageCount}</span><button type="button" class="history-next" ${this._historyPage===pageCount-1?'disabled':''}>${this._ht('next')}</button></div>`:''}
      </section>`;
  }

  _attachHistoryEvents() {
    const root=this.shadowRoot;
    root.querySelector('.history-episodes')?.addEventListener('toggle',event=>{this._historyEpisodesOpen=event.target.open;});
    root.querySelector('.history-episode-prev')?.addEventListener('click',()=>{this._historyEpisodePage--;this._render();});
    root.querySelector('.history-episode-next')?.addEventListener('click',()=>{this._historyEpisodePage++;this._render();});
    root.querySelector('.history-load')?.addEventListener('click',()=>this._loadDeviceHistory());
    root.querySelector('.history-device')?.addEventListener('change',event=>{
      this._historyDevice=event.target.value; this._cancelDeviceHistory('not_checked',true);this._syncHistoryContext();this._render();
    });
    root.querySelector('.history-range')?.addEventListener('change',event=>{
      this._historyDays=event.target.value==='30'?30:7;this._cancelDeviceHistory('not_checked',true);this._syncHistoryContext();this._render();
    });
    root.querySelectorAll('[data-history-view]').forEach(button=>button.addEventListener('click',()=>{
      this._historyView=button.dataset.historyView;this._render();
    }));
    root.querySelectorAll('[data-history-row]').forEach(button=>button.addEventListener('click',()=>{
      this._historySelected=button.dataset.historyRow;this._render();
    }));
    const step = direction => {
      const marks=[...root.querySelectorAll('[data-history-row]')];
      const current=marks.findIndex(mark=>mark.dataset.historyRow===this._historySelected);
      const next=marks[Math.max(0,Math.min(marks.length-1,current+direction))];
      if (next) this._historySelected=next.dataset.historyRow;
      this._render();
    };
    root.querySelector('.history-record-prev')?.addEventListener('click',()=>step(-1));
    root.querySelector('.history-record-next')?.addEventListener('click',()=>step(1));
    root.querySelector('.history-prev')?.addEventListener('click',()=>{this._historyPage--;this._render();});
    root.querySelector('.history-next')?.addEventListener('click',()=>{this._historyPage++;this._render();});
  }

  _getDevices() {
    if (!this._hass?.states) return [];
    const statesByDevice = new Map();
    for (const [entityId, entry] of this._entityRegistry) {
      if (!entry.device_id || !this._hass.states[entityId]) continue;
      if (!statesByDevice.has(entry.device_id)) statesByDevice.set(entry.device_id, []);
      statesByDevice.get(entry.device_id).push(this._hass.states[entityId]);
    }
    return [...this._deviceRegistry.values()].map(device => {
      const states = statesByDevice.get(device.id) || [];
      const available = states.filter(state => state.state !== 'unavailable' && state.state !== 'unknown');
      const connectionStates = available.filter(state => {
        const attrs = state.attributes || {};
        if (state.entity_id?.startsWith('binary_sensor.')) {
          return attrs.device_class === 'connectivity' && ['on', 'off'].includes(state.state);
        }
        // Location trackers can be away while fully connected. A scanner's
        // zone state instead reports a connection to its router/beacon.
        return state.entity_id?.startsWith('device_tracker.') &&
          attrs.source_type !== 'gps' && attrs.tracking_type !== 'position' &&
          (attrs.source_type === 'router' || attrs.tracking_type === 'connection') &&
          typeof state.state === 'string' && Boolean(state.state.trim());
      });
      const disconnectedStates = connectionStates.filter(state => ['off', 'not_home'].includes(state.state));
      // A live connection keeps the physical device online even if another
      // link is down. The offline interval begins when the final link drops.
      const offline = disconnectedStates.length > 0 && disconnectedStates.length === connectionStates.length;
      const offlineSince = offline ? disconnectedStates.map(state => state.last_changed)
        .filter(value => Number.isFinite(Date.parse(value)))
        .sort((a, b) => Date.parse(a) - Date.parse(b)).at(-1) : null;
      const latest = states.map(state => state.last_changed).filter(Boolean).sort().at(-1);
      return {
        id: device.id,
        name: this._sanitize(device.name_by_user || device.name || device.id),
        type: device.model || 'device',
        status: !states.length ? 'unknown' : !available.length ? 'unavailable' : offline ? 'offline' : 'online',
        lastSeen: latest || null,
        offlineSince: offlineSince || null,
        uptime: latest ? this._calculateUptime(latest) : '',
        domain: 'device',
      };
    });
  }

  _unlinkedEntityCount() {
    if (!this._hass?.states || (this._registryStatus !== 'ready' && !this._entityRegistry.size && !this._deviceRegistry.size)) return null;
    return Object.keys(this._hass.states).filter(entityId => {
      const deviceId = this._entityRegistry.get(entityId)?.device_id;
      return !deviceId || !this._deviceRegistry.has(deviceId);
    }).length;
  }

  _isBatteryLevelEntity(entityId, state) {
    if (!state || typeof state.state !== "string" || !state.state.trim()) return false;
    const attrs = state.attributes || {};
    // Percent thresholds cannot be applied to battery voltage or unknown units.
    // A name fallback is valid only when no conflicting device class is present.
    const batteryName = entityId.includes("_battery") || entityId.includes("battery_level");
    if (attrs.unit_of_measurement !== "%" ||
        (attrs.device_class !== "battery" && !(!attrs.device_class && batteryName))) return false;
    const level = Number(state.state);
    return Number.isFinite(level) && level >= 0 && level <= 100;
  }

  _getBatteryDevices() {
    const batteries = [];

    if (!this._hass || !this._hass.states) {
      return [];
    }

    const states = this._hass.states;

    Object.keys(states).forEach((entityId) => {
      const state = states[entityId];
      if (!this._isBatteryLevelEntity(entityId, state)) return;
      const level = Number(state.state);
      batteries.push({
        id: entityId,
        name: this._sanitize(state.attributes.friendly_name || this._formatEntityName(entityId)),
        level: level,
        lastChanged: state.last_changed,
        device: this._sanitize(state.attributes.device_name || this._extractDeviceName(entityId)),
      });
    });

    return batteries;
  }

  _getNetworkDevices() {
    const networks = {};
    if (!this._hass?.states) return networks;
    const signalValue = value => {
      if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return null;
      const number = Number(value);
      return Number.isFinite(number) && number < 0 ? number : null;
    };
    const statesByDevice = new Map();
    for (const [entityId, entry] of this._entityRegistry) {
      const state = this._hass.states[entityId];
      if (!entry.device_id || !state) continue;
      if (!statesByDevice.has(entry.device_id)) statesByDevice.set(entry.device_id, []);
      statesByDevice.get(entry.device_id).push(state);
    }
    for (const device of this._deviceRegistry.values()) {
      const states = statesByDevice.get(device.id) || [];
      const connections = Array.isArray(device.connections) ? device.connections : [];
      const types = new Set(connections.map(connection => connection[0]));
      const attrs = states.map(state => state.attributes || {});
      const sourceTypes = new Set(attrs.map(a => a.source_type));
      const explicitType = attrs.map(a => String(a.connection_type || '').toLowerCase()).find(Boolean);
      const ssid = attrs.map(a => a.essid || a.ssid || a.wifi_name).find(Boolean) || '';
      const mac = connections.find(connection => connection[0] === 'mac')?.[1] || '';
      const ip = attrs.map(a => a.ip || a.ip_address || a.local_ip).find(Boolean) || '';
      let protocol = null;
      if (sourceTypes.has('bluetooth_le') || explicitType === 'ble') protocol = 'BLE';
      else if (types.has('bluetooth') || sourceTypes.has('bluetooth')) protocol = 'Bluetooth';
      else if (types.has('zigbee') || explicitType === 'zigbee') protocol = 'Zigbee';
      else if (explicitType === 'zwave' || explicitType === 'z-wave') protocol = 'Z-Wave';
      else if (explicitType === 'ethernet' || attrs.some(a => a.is_wired === true)) protocol = 'Ethernet';
      else if (explicitType === 'wifi' || ssid) protocol = 'WiFi';
      else if (mac || ip || sourceTypes.has('router')) protocol = 'Other';
      if (!protocol) continue;
      const readings = states.filter(state => /signal|rssi/i.test(state.entity_id || ''))
        .map(state => signalValue(state.state));
      const value = readings.find(reading => reading !== null) ??
        attrs.flatMap(a => [signalValue(a.rssi), signalValue(a.signal_strength)])
          .find(reading => reading !== null) ?? null;
      if (!networks[protocol]) networks[protocol] = [];
      networks[protocol].push({
        id: device.id,
        name: this._sanitize(device.name_by_user || device.name || device.id),
        device: this._sanitize(device.name_by_user || device.name || device.id),
        rssi: value,
        mac, ip, ssid, connectionType: protocol
      });
    }
    return networks;
  }

  _registryIdentityUnknown() {
    return Boolean(this._hass?.callWS && this._registryStatus !== 'ready' &&
      !this._entityRegistry.size && !this._deviceRegistry.size);
  }

  _clearOfflineTimer() {
    if (this._offlineTimer !== null) clearTimeout(this._offlineTimer);
    this._offlineTimer = null;
  }

  _generateAlerts() {
    this._clearOfflineTimer();
    // Initial registry failure/loading cannot establish whether two readings
    // belong to one device. Keep history untouched until identity is known.
    if (this._registryIdentityUnknown()) return;
    this._alerts = [];
    this._previousAlertEpisodes = this._alertEpisodes;
    this._alertEpisodes = new Map();
    const now = Date.now();
    const offlineThreshold = this._config.offline_alert_minutes * 60 * 1000;
    const batteryWarning = this._config.battery_warning;
    const batteryCritical = this._config.battery_critical;

    // Time passing is itself a producer: schedule only the nearest pending
    // offline deadline, instead of waiting for another sensor state change.
    let nextOfflineDeadline = Infinity;
    this._getDevices().forEach((device) => {
      if (device.status === "offline") {
        const deadline = Date.parse(device.offlineSince) + offlineThreshold + 1;
        if (now >= deadline) this._addAlert("offline", device.name, device.id, "critical");
        else if (Number.isFinite(deadline)) nextOfflineDeadline = Math.min(nextOfflineDeadline, deadline);
      } else if (device.status === "unavailable") {
        this._addAlert("unavailable", device.name, device.id, "warning");
      }
    });

    if (this.isConnected && Number.isFinite(nextOfflineDeadline)) {
      this._offlineTimer = setTimeout(() => {
        this._offlineTimer = null;
        if (this.isConnected && this._hass) this._update();
      }, Math.min(nextOfflineDeadline - now, 2147483647));
    }

    // Keep individual battery readings in the Batteries tab, but alert once
    // per registered physical device using its lowest percentage reading.
    const batteriesByDevice = new Map();
    this._getBatteryDevices().forEach(battery => {
      const device = this._deviceRegistry.get(this._entityRegistry.get(battery.id)?.device_id);
      const id = device?.id || battery.id;
      if (!batteriesByDevice.has(id) || battery.level < batteriesByDevice.get(id).level) {
        batteriesByDevice.set(id, { ...battery, id,
          name: device ? this._sanitize(device.name_by_user || device.name || device.id) : battery.name });
      }
    });
    batteriesByDevice.forEach(battery => {
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
    // Acknowledgement applies to the current continuous incident. Recovery
    // allows a later incident for the same device to notify again.
    for (const alertId of this._acknowledgedAlerts) {
      if (!this._alertEpisodes.has(alertId)) this._acknowledgedAlerts.delete(alertId);
    }
  }

  _addAlert(type, name, id, severity) {
    const alertId = `${type}_${id}`;
    const previous = this._previousAlertEpisodes?.get(alertId);
    const alert = { type, name, id, severity, timestamp: previous?.timestamp || new Date().toISOString() };
    this._alertEpisodes.set(alertId, alert);
    if (!this._acknowledgedAlerts.has(alertId)) {
      this._alerts.push(alert);
      if (!previous) {
        this._alertHistory.unshift(alert);
        if (this._alertHistory.length > 20) this._alertHistory.pop();
      }
    }
  }

  _calculateUptime(lastChanged) {
    const changedAt = Date.parse(lastChanged);
    if (!Number.isFinite(changedAt)) return '—';
    const diff = Math.max(0, Date.now() - changedAt);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days} ${this._t('elapsedDays')}`;
    if (hours > 0) return `${hours} ${this._t('elapsedHours')}`;
    return `${Math.floor(diff / (1000 * 60))} ${this._t('elapsedMinutes')}`;
  }

  _formatEntityName(entityId) {
    return entityId.split(".")[1].split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  }

  _extractDeviceName(entityId) {
    const parts = entityId.split(".")[1].replace(/_battery|_signal|_battery_level|_rssi/g, "").split("_");
    return parts.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  }

  _getStatusColor(status) {
    const colors = { online: "#10B981", offline: "#EF4444", unavailable: "#94A3B8" };
    return colors[status] || "#94A3B8";
  }

  _getBatteryColor(level) {
    if (level <= this._config.battery_critical) return "#EF4444";
    if (level <= this._config.battery_warning) return "#F59E0B";
    return "#10B981";
  }

  _getSignalColor(rssi) {
    if (rssi > -50) return "#10B981";
    if (rssi > -70) return "#3B82F6";
    if (rssi > -80) return "#F59E0B";
    return "#EF4444";
  }

  _getConfigNumber(key, fallback) {
    const raw = this._config?.[key];
    if (raw == null || (typeof raw === 'string' && !raw.trim())) return fallback;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  }

  _getDetectedBatteryEntityIds() {
    if (!this._hass || !this._hass.states) return [];
    return Object.keys(this._hass.states).filter((entityId) => {
      return this._isBatteryLevelEntity(entityId, this._hass.states[entityId]);
    });
  }

  _getMonitoredDeviceEntityIds() {
    if (!this._hass || !this._hass.states) return [];
    const ids = [];
    const seen = new Set();
    const add = (entityId) => {
      if (!seen.has(entityId)) {
        seen.add(entityId);
        ids.push(entityId);
      }
    };

    Object.keys(this._hass.states).forEach((entityId) => {
      if (entityId.startsWith("device_tracker.")) add(entityId);
    });

    Object.keys(this._hass.states).forEach((entityId) => {
      const domain = entityId.split(".")[0];
      if (["switch", "light", "climate", "sensor"].includes(domain) && !entityId.includes("_battery") && !entityId.includes("_signal")) {
        add(entityId);
      }
    });

    return ids;
  }

  _buildBackgroundAutomationPayloads() {
    const batteryWarning = this._getConfigNumber("battery_warning", 30);
    const offlineMinutes = this._getConfigNumber("offline_alert_minutes", 60);
    const detectedBatteryEntityIds = this._getDetectedBatteryEntityIds();
    const batteryEntityIds = detectedBatteryEntityIds.slice(0, 150);
    const deviceEntityIds = this._getMonitoredDeviceEntityIds();
    const warnings = [];
    const errors = [];

    if (detectedBatteryEntityIds.length > 150) {
      warnings.push(`Detected ${detectedBatteryEntityIds.length} battery sensors. The automation will use the first 150.`);
    }
    if (batteryEntityIds.length === 0) {
      errors.push("No numeric battery sensor entities were detected, so the battery automation cannot be generated.");
    }
    if (deviceEntityIds.length === 0) {
      errors.push("No monitored device entities were detected, so the offline automation cannot be generated.");
    }

    const batteryPayload = {
      id: "ha_device_health_battery_alert",
      alias: "HA Device Health Battery Alert",
      description: "Generated by the Device Health card. Re-run from the card to update the entity list.",
      mode: "queued",
      max: 20,
      trigger: [
        {
          platform: "numeric_state",
          entity_id: batteryEntityIds,
          below: batteryWarning,
        },
      ],
      condition: [],
      action: [
        {
          service: "persistent_notification.create",
          data: {
            title: "Device Health battery alert",
            message: `{{ state_attr(trigger.entity_id, 'friendly_name') or trigger.entity_id }} ({{ trigger.entity_id }}) is at {{ trigger.to_state.state }}%, below ${batteryWarning}%.`,
          },
        },
      ],
    };

    const offlinePayload = {
      id: "ha_device_health_offline_alert",
      alias: "HA Device Health Offline Alert",
      description: "Generated by the Device Health card. Re-run from the card to update the entity list.",
      mode: "queued",
      max: 20,
      trigger: [
        {
          platform: "state",
          entity_id: deviceEntityIds,
          to: "unavailable",
          for: {
            minutes: offlineMinutes,
          },
        },
      ],
      condition: [],
      action: [
        {
          service: "persistent_notification.create",
          data: {
            title: "Device Health offline alert",
            message: `{{ state_attr(trigger.entity_id, 'friendly_name') or trigger.entity_id }} ({{ trigger.entity_id }}) has been unavailable for ${offlineMinutes} minutes.`,
          },
        },
      ],
    };

    const automations = [
      {
        id: batteryPayload.id,
        entityId: "automation.ha_device_health_battery_alert",
        label: "Battery alert",
        payload: batteryPayload,
      },
      {
        id: offlinePayload.id,
        entityId: "automation.ha_device_health_offline_alert",
        label: "Offline alert",
        payload: offlinePayload,
      },
    ];

    return {
      automations,
      yaml: this._toYaml(automations.map((automation) => automation.payload)),
      warnings,
      errors,
      batteryEntityCount: batteryEntityIds.length,
      detectedBatteryEntityCount: detectedBatteryEntityIds.length,
      deviceEntityCount: deviceEntityIds.length,
      batteryWarning,
      offlineMinutes,
    };
  }

  _yamlScalar(value) {
    if (value === null) return "null";
    if (value === undefined) return "null";
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    return JSON.stringify(String(value));
  }

  _toYaml(value, indent = 0) {
    const pad = " ".repeat(indent);

    if (Array.isArray(value)) {
      if (value.length === 0) return `${pad}[]`;
      return value.map((item) => {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          const itemYaml = this._toYaml(item, indent + 2).split("\n");
          const first = itemYaml[0].slice(indent + 2);
          const rest = itemYaml.slice(1).join("\n");
          return `${pad}- ${first}${rest ? `\n${rest}` : ""}`;
        }
        if (Array.isArray(item)) {
          return `${pad}-\n${this._toYaml(item, indent + 2)}`;
        }
        return `${pad}- ${this._yamlScalar(item)}`;
      }).join("\n");
    }

    if (value && typeof value === "object") {
      const entries = Object.entries(value);
      if (entries.length === 0) return `${pad}{}`;
      return entries.map(([key, item]) => {
        if (item && typeof item === "object") {
          return `${pad}${key}:\n${this._toYaml(item, indent + 2)}`;
        }
        return `${pad}${key}: ${this._yamlScalar(item)}`;
      }).join("\n");
    }

    return `${pad}${this._yamlScalar(value)}`;
  }

  _backgroundAlertError(error) {
    const status = error?.status_code ?? error?.status;
    if (Number.isInteger(status) && status >= 400 && status <= 599) return `Home Assistant request failed (HTTP ${status}).`;
    if (['unauthorized', 'forbidden', 'unauthorized_entity'].includes(error?.code)) return 'Home Assistant denied this request. Check administrator permissions.';
    if (['invalid_format', 'unknown_command'].includes(error?.code)) return 'Home Assistant rejected this request. Check the configuration and available services.';
    return 'The request outcome is unknown. Check the automation configuration before trying again.';
  }

  _backgroundFailureCode(error) {
    const status = error?.status_code ?? error?.status;
    // A transport/server failure can arrive after the write happened. Only an
    // explicit validation/permission rejection proves that it was rejected.
    return ['unauthorized', 'forbidden', 'unauthorized_entity', 'invalid_format', 'unknown_command'].includes(error?.code)
      || [400, 401, 403, 404, 405, 422].includes(status) ? 'error' : 'unconfirmed';
  }

  _backgroundResultCode(result) {
    if (result.creating) return 'not_checked';
    const codes = [...(result.results || []), ...(result.reload ? [result.reload] : [])]
      .map(row => row.code || (row.ok === true ? 'success' : 'unconfirmed'));
    if (!codes.length) return 'no_data';
    if (codes.includes('unconfirmed')) return 'unconfirmed';
    if (codes.every(code => code === 'success')) return 'success';
    return codes.includes('success') ? 'partial' : 'error';
  }

  _renderBackgroundResults(result) {
    const ui = createUiV3({language:this._lang});
    const code = ui.status(result.code || this._backgroundResultCode(result)).code;
    const rows = [...(result.results || []), ...(result.reload ? [{...result.reload,label:'Reload'}] : [])];
    return `<div role="status" aria-live="polite" data-background-result="${code}">${ui.statusHtml(code)}</div>
      <p>${_esc(this._t('automationResultScope'))}</p>
      ${rows.map(row => {
        const state=ui.status(row.code || (row.ok === true ? 'success' : 'unconfirmed')).code;
        return `<div class="automation-result automation-result-${state}">${ui.statusHtml(state)}
          <strong>${_esc(this._backgroundAlertMessage(row.label))}:</strong> ${_esc(this._backgroundAlertMessage(row.message))}</div>`;
      }).join('')}`;
  }

  _backgroundAlertMessage(message) {
    const value = String(message ?? '');
    const exact = {
      'Battery alert': 'batteryAlert',
      'Offline alert': 'offlineAlert',
      'No numeric battery sensor entities were detected, so the battery automation cannot be generated.': 'noBatteryEntities',
      'No monitored device entities were detected, so the offline automation cannot be generated.': 'noMonitoredEntities',
      'Home Assistant state is not available yet. Open the card after Home Assistant finishes loading and try again.': 'haStateNotReady',
      'automation.reload service called.': 'reloadCalled',
      'Home Assistant request failed.': 'haRequestFailed',
      'Home Assistant denied this request. Check administrator permissions.': 'haPermissionDenied',
      'Home Assistant rejected this request. Check the configuration and available services.': 'haRequestRejected',
      'The request outcome is unknown. Check the automation configuration before trying again.': 'haOutcomeUnknown',
      'Reload': 'reload',
      'Battery': 'batteryAlert',
      'Offline': 'offlineAlert',
    };
    if (Object.prototype.hasOwnProperty.call(exact, value)) return this._t(exact[value]);
    const patterns = [
      [/^Home Assistant request failed \(HTTP (\d{3})\)\.$/, 'haHttpError', ['status']],
      [/^Detected (\d+) battery sensors\. The automation will use the first 150\.$/, 'batteryLimit', ['count']],
      [/^Created automation (.+)\.$/, 'automationCreated', ['id']],
      [/^Updated existing automation (.+)\.$/, 'automationUpdated', ['id']],
      [/^Failed to create automation ([^:]+): ([\s\S]*)$/, 'automationCreateFailed', ['id', 'detail']],
      [/^Failed to update automation ([^:]+): ([\s\S]*)$/, 'automationUpdateFailed', ['id', 'detail']],
      [/^Automation generation failed: ([\s\S]*)$/, 'generationFailed', ['detail']],
      [/^automation\.reload failed: ([\s\S]*)$/, 'reloadFailed', ['detail']],
      [/^Write of automation ([^:]+) is unconfirmed: ([\s\S]*)$/, 'automationWriteUnconfirmed', ['id', 'detail']],
      [/^Reload is unconfirmed: ([\s\S]*)$/, 'reloadUnconfirmed', ['detail']],
    ];
    for (const [pattern, key, fields] of patterns) {
      const match = value.match(pattern);
      if (!match) continue;
      const values = Object.fromEntries(fields.map((field, index) => [field, field === 'detail' ? this._backgroundAlertMessage(match[index + 1]) : match[index + 1]]));
      return this._t(key).replace(/\{(\w+)\}/g, (token, field) => values[field] ?? token);
    }
    return this._t('haRequestFailed');
  }

  _alertTypeLabel(type) {
    const key = 'alert_type_' + type;
    const label = this._t(key);
    return label === key ? String(type).replace(/_/g, ' ') : label;
  }

  _getBackgroundAutomationStatus(entityId) {
    const state = this._hass?.states?.[entityId];
    if (!state) return this._t('notCreated');
    const lastTriggered = state.attributes?.last_triggered;
    const triggeredDate = lastTriggered && Number.isFinite(Date.parse(lastTriggered))
      ? new Date(lastTriggered).toLocaleString(this._lang) : lastTriggered ? '—' : this._t('never');
    const triggeredText = `, ${this._t('lastTriggered')}: ${triggeredDate}`;
    const statusKey = state.state === 'on' ? 'automationActive' : state.state === 'off'
      ? 'automationDisabled' : state.state === 'unavailable' ? 'unavailable' : 'automationUnknown';
    return `${this._t(statusKey)}${triggeredText}`;
  }

  _renderBackgroundAlertsSection() {
    const batteryStatus = this._getBackgroundAutomationStatus("automation.ha_device_health_battery_alert");
    const offlineStatus = this._getBackgroundAutomationStatus("automation.ha_device_health_offline_alert");
    const resultHtml = this._hass?.user?.is_admin === true && this._backgroundAlertResult ? `
      <div class="automation-result-summary">
        ${this._renderBackgroundResults(this._backgroundAlertResult)}
      </div>
    ` : "";

    return `
      <div class="background-alerts-section">
        <div class="background-alerts-header">
          <div>
            <div class="background-alerts-title">${this._t('backgroundAlerts')}</div>
            <div class="background-alerts-note">${this._t('backgroundNote')}</div>
          </div>
          ${this._hass?.user?.is_admin === true ? `<button class="background-alerts-generate">${this._t('generateAutomations')}</button>` : ""}
        </div>
        <div class="background-alerts-status">
          <div><strong>${this._t('battery')}:</strong> ${_esc(batteryStatus)}</div>
          <div><strong>${this._t('offline')}:</strong> ${_esc(offlineStatus)}</div>
        </div>
        ${resultHtml}
      </div>
    `;
  }

  _renderBackgroundAutomationDialog() {
    if (!this._backgroundAlertDialog || this._hass?.user?.is_admin !== true) return "";
    const dialog = this._backgroundAlertDialog;
    const battery = dialog.automations?.[0];
    const offline = dialog.automations?.[1];
    const createDisabled = dialog.creating || (dialog.errors && dialog.errors.length > 0);

    return `
      <div class="automation-dialog-backdrop">
        <div class="automation-dialog" role="dialog" aria-modal="true" aria-label="${this._t('previewDialog')}" tabindex="-1">
          <div class="automation-dialog-title">${this._t('backgroundAlerts')}</div>
          <div class="automation-dialog-note">
            ${this._t('previewNote')}
          </div>

          ${dialog.errors && dialog.errors.length ? `
            <div class="automation-dialog-errors">
              ${dialog.errors.map((error) => `<div>${_esc(this._backgroundAlertMessage(error))}</div>`).join("")}
            </div>
          ` : ""}

          ${dialog.warnings && dialog.warnings.length ? `
            <div class="automation-dialog-warnings">
              ${dialog.warnings.map((warning) => `<div>${_esc(this._backgroundAlertMessage(warning))}</div>`).join("")}
            </div>
          ` : ""}

          <div class="automation-preview-grid">
            <div class="automation-preview-card">
              <div class="automation-preview-title">${this._t('automation')} 1 <code>${_esc(battery?.id || "")}</code></div>
              <div>${this._t('batteryTriggerBefore')} ${_esc(dialog.batteryWarning)} ${this._t('triggerOver')} ${_esc(dialog.batteryEntityCount)} ${this._t('batterySensorEntities')}</div>
              <div>${this._t('batteryAction')}</div>
            </div>
            <div class="automation-preview-card">
              <div class="automation-preview-title">${this._t('automation')} 2 <code>${_esc(offline?.id || "")}</code></div>
              <div>${this._t('offlineTriggerBefore')} "unavailable" ${this._t('triggerFor')} ${_esc(dialog.offlineMinutes)} ${this._t('elapsedMinutes')} ${this._t('triggerOver')} ${_esc(dialog.deviceEntityCount)} ${this._t('monitoredDeviceEntities')}</div>
              <div>${this._t('offlineAction')}</div>
            </div>
          </div>

          <label class="automation-yaml-label" for="background-automation-yaml">${this._t('yamlPreview')}</label>
          <textarea id="background-automation-yaml" class="automation-yaml-preview" readonly spellcheck="false">${_esc(dialog.yaml || "")}</textarea>

          ${dialog.creating || dialog.results ? `
            <div class="automation-dialog-results">
              ${this._renderBackgroundResults(dialog)}
            </div>
          ` : ""}

          <div class="automation-dialog-actions">
            <button class="automation-dialog-cancel" ${dialog.creating ? "disabled" : ""}>${this._t('cancel')}</button>
            <button class="automation-dialog-create primary" ${createDisabled ? "disabled" : ""}>${dialog.creating ? this._t('creating') : this._t('create')}</button>
          </div>
        </div>
      </div>
    `;
  }

  _openBackgroundAutomationDialog() {
    if (this._hass?.user?.is_admin !== true || this._backgroundAutomationOperation) return;
    try {
      if (!this._hass || !this._hass.states) {
        this._backgroundAlertDialog = {
          automations: [],
          yaml: "",
          warnings: [],
          errors: ["Home Assistant state is not available yet. Open the card after Home Assistant finishes loading and try again."],
        };
      } else {
        this._backgroundAlertDialog = this._buildBackgroundAutomationPayloads();
      }
    } catch (error) {
      this._backgroundAlertDialog = {
        automations: [],
        yaml: "",
        warnings: [],
        errors: [`Automation generation failed: ${this._backgroundAlertError(error)}`],
      };
    }
    this._render();
  }

  async _createBackgroundAlertAutomations() {
    if (this._backgroundAutomationOperation || this._hass?.user?.is_admin !== true || !this._backgroundAlertDialog || this._backgroundAlertDialog.errors?.length) return;

    const dialog = {
      ...this._backgroundAlertDialog,
      creating: true,
      results: null,
      reload: null,
      code: 'not_checked',
    };
    const operation = { userId: this._hass.user.id, session: this._readSession(), cancelled: false };
    this._backgroundAutomationOperation = operation;
    this._backgroundAlertDialog = dialog;
    this._backgroundAlertResult = {code:'not_checked',results:[],reload:null};
    const isCurrent = () => this._backgroundAutomationOperation === operation
      && !operation.cancelled && this._backgroundAlertDialog === dialog
      && this._sameReadSession(operation.session, this._readSession())
      && this._hass?.user?.is_admin === true && this._hass.user.id === operation.userId;
    this._render();

    try {
      const results = [];
      for (const automation of dialog.automations) {
        if (!isCurrent()) return;
        const existed = Boolean(this._hass?.states?.[automation.entityId]);
        try {
          await this._hass.callApi('post', 'config/automation/config/' + automation.id, automation.payload);
          results.push({
            ok: true,
            code: 'success',
            label: automation.label,
            id: automation.id,
            message: `${existed ? "Updated existing" : "Created"} automation ${automation.id}.`,
          });
        } catch (error) {
          const code = this._backgroundFailureCode(error);
          results.push({
            ok: false,
            code,
            label: automation.label,
            id: automation.id,
            message: code === 'unconfirmed'
              ? `Write of automation ${automation.id} is unconfirmed: ${this._backgroundAlertError(error)}`
              : `Failed to ${existed ? "update" : "create"} automation ${automation.id}: ${this._backgroundAlertError(error)}`,
          });
        }
        if (!isCurrent()) return;
      }

      let reload = null;
      if (results.some((result) => result.ok)) {
        if (!isCurrent()) return;
        try {
          await this._hass.callService('automation', 'reload', {}, undefined, false);
          reload = { ok: true, code:'success', message: "automation.reload service called." };
        } catch (error) {
          const code = this._backgroundFailureCode(error);
          reload = { ok: false, code, message: code === 'unconfirmed'
            ? `Reload is unconfirmed: ${this._backgroundAlertError(error)}`
            : `automation.reload failed: ${this._backgroundAlertError(error)}` };
        }
        if (!isCurrent()) return;
      }

      const code = this._backgroundResultCode({results,reload});
      this._backgroundAlertResult = { code, results, reload };
      Object.assign(dialog, { creating: false, code, results, reload });
      this._render();
    } finally {
      const authorized = isCurrent();
      if (this._backgroundAutomationOperation === operation) {
        this._backgroundAutomationOperation = null;
        if (!authorized) {
          this._backgroundAlertDialog = null;
          this._backgroundAlertResult = null;
          this._render();
        }
      }
    }
  }

  _render() {
    if (!this._hass) return;
    const familyFocus = _rememberFamilyFocus(this);
    const recordFocus = _rememberFamilyRecords(this);
    this._syncHistoryContext();
    this._renderedLang = this._lang;
    this._renderedIsAdmin = this._hass.user?.is_admin === true;
    const oldDialog = this.shadowRoot.querySelector('.automation-dialog');
    const activeElement = this.shadowRoot.activeElement;
    const historyFocus = activeElement?.closest('.device-history') ? {
      row: activeElement.dataset.historyRow, view: activeElement.dataset.historyView,
      className: [...activeElement.classList].find(name=>name.startsWith('history-'))
    } : null;
    const dialogFocusClass = oldDialog?.contains(activeElement)
      ? ['automation-yaml-preview', 'automation-dialog-cancel', 'automation-dialog-create']
        .find(className => activeElement.classList.contains(className)) : null;
    const dialogSelection = dialogFocusClass === 'automation-yaml-preview'
      ? [activeElement.selectionStart, activeElement.selectionEnd, activeElement.selectionDirection] : null;
    const focusedSearch = this.shadowRoot.activeElement?.matches('.search-box')
      ? this.shadowRoot.activeElement : null;
    const searchSelection = focusedSearch
      ? [focusedSearch.selectionStart, focusedSearch.selectionEnd, focusedSearch.selectionDirection] : null;
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

      .status-online { background: #047857; }
      .status-offline { background: #B91C1C; }
      .status-unavailable { background: #64748B; }
      .status-unknown { background: #475569; }

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

      .device-sort-name {
        background: none; border: 0; padding: 0; color: inherit; font: inherit;
        text-transform: inherit; letter-spacing: inherit; cursor: pointer;
      }
      .device-sort-name:focus-visible { outline: 2px solid currentColor; outline-offset: 4px; }

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

      .background-alerts-section {
        margin: 16px 0;
        padding: 16px;
        border: 1.5px solid var(--dc);
        border-radius: var(--radius-sm);
        background: var(--bg);
      }

      .background-alerts-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }

      .background-alerts-title {
        font-size: 14px;
        font-weight: 700;
        color: var(--tc);
        margin-bottom: 4px;
      }

      .background-alerts-note {
        font-size: 12px;
        line-height: 1.45;
        color: var(--ts);
      }

      .background-alerts-status {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 8px;
        margin-top: 12px;
        font-size: 12px;
        color: var(--ts);
      }

      .automation-result-summary,
      .automation-dialog-results {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 12px;
      }

      .automation-result {
        min-width: 0;
        overflow-wrap: anywhere;
        padding: 8px 10px;
        border-radius: var(--radius-xs);
        font-size: 12px;
        line-height: 1.45;
        border: 1px solid var(--dc);
      }

      .automation-result-success {
        color: var(--sc);
        background: var(--bento-success-light);
        border-color: rgba(16, 185, 129, 0.25);
      }

      .automation-result-error {
        color: var(--ec);
        background: var(--bento-error-light);
        border-color: rgba(239, 68, 68, 0.25);
      }

      :host(:not(.bento-dark)) .ht-result-state--partial { color: #895b00; }
      :host(:not(.bento-dark)) .automation-result-success { color: #237b3d; }
      :host(:not(.bento-dark)) .automation-result-error,
      :host(:not(.bento-dark)) .automation-dialog-errors { color: #c32b2b; }
      :host(:not(.bento-dark)) .automation-dialog-warnings { color: #895b00; }
      :host(.bento-dark) .automation-result-success { color: #81cf99; }
      :host(.bento-dark) .automation-result-error,
      :host(.bento-dark) .automation-dialog-errors { color: #ff9999; }
      :host(.bento-dark) .automation-dialog-warnings { color: #efd080; }
      .automation-result .ht-result-state { background: transparent; }

      .automation-dialog-backdrop {
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        background: rgba(15, 23, 42, 0.45);
      }

      .automation-dialog {
        width: min(920px, 100%);
        max-height: calc(100vh - 32px);
        overflow: auto;
        padding: 20px;
        border: 1.5px solid var(--dc);
        border-radius: var(--radius-sm);
        background: var(--cbg);
        color: var(--tc);
        box-shadow: var(--shadow-md);
      }

      .automation-dialog-title {
        font-size: 18px;
        font-weight: 700;
        margin-bottom: 6px;
      }

      .automation-dialog-note {
        font-size: 13px;
        color: var(--ts);
        line-height: 1.45;
        margin-bottom: 14px;
      }

      .automation-dialog-errors,
      .automation-dialog-warnings {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 14px;
        padding: 10px 12px;
        border-radius: var(--radius-xs);
        font-size: 12px;
        line-height: 1.45;
      }

      .automation-dialog-errors {
        color: var(--ec);
        background: var(--bento-error-light);
        border: 1px solid rgba(239, 68, 68, 0.25);
      }

      .automation-dialog-warnings {
        color: var(--wc);
        background: var(--bento-warning-light);
        border: 1px solid rgba(245, 158, 11, 0.25);
      }

      .automation-preview-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
        gap: 10px;
        margin-bottom: 14px;
      }

      .automation-preview-card {
        min-width: 0;
        overflow-wrap: anywhere;
        border: 1px solid var(--dc);
        border-radius: var(--radius-xs);
        padding: 12px;
        background: var(--bg);
        color: var(--ts);
        font-size: 12px;
        line-height: 1.5;
      }

      .automation-preview-title {
        color: var(--tc);
        font-weight: 700;
        margin-bottom: 6px;
      }

      .automation-preview-title code {
        font-size: 11px;
        white-space: normal;
        overflow-wrap: anywhere;
      }

      .automation-yaml-label {
        display: block;
        font-size: 12px;
        font-weight: 700;
        color: var(--tc);
        margin-bottom: 6px;
      }

      .automation-yaml-preview {
        width: 100%;
        min-height: 320px;
        resize: vertical;
        padding: 12px;
        border: 1px solid var(--dc);
        border-radius: var(--radius-xs);
        background: var(--bg);
        color: var(--tc);
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 12px;
        line-height: 1.45;
      }

      .automation-dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 14px;
      }

      .automation-dialog-actions .primary {
        background: var(--pc);
        border-color: var(--pc);
        color: white;
      }

      .automation-dialog-actions button:disabled,
      .background-alerts-generate:disabled {
        opacity: 0.5;
        cursor: not-allowed;
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

    const devices = this._getDevices().sort((a, b) =>
      a.name.localeCompare(b.name, this._lang) * (this._sortBy === "name-desc" ? -1 : 1)
    );
    const registryUnknown = this._registryStatus !== 'ready' && !this._deviceRegistry.size;
    const batteries = this._getBatteryDevices();
    const networks = this._getNetworkDevices();
    const online = devices.filter((d) => d.status === "online").length;
    const unlinkedEntities = this._unlinkedEntityCount();
    const observed = devices.filter(device => device.status !== 'unknown').length;
    const availability = observed ? `${((online / observed) * 100).toFixed(1)}%` : 'N/A';

    const batteryNeedingAttention = new Set(batteries
      .filter(battery => battery.level <= this._config.battery_warning)
      .map(battery => this._deviceRegistry.get(this._entityRegistry.get(battery.id)?.device_id)?.id || battery.id)).size;

    let html = `
      <div class="card">
        <div class="card-header">${_esc(this._config.title ?? this._t('deviceHealth'))}</div>
        <div class="tabs">
          <button class="tab-btn ${this._activeTab === "devices" ? "active" : ""}" data-tab="devices">${this._t('devices')}</button>
          <button class="tab-btn ${this._activeTab === "batteries" ? "active" : ""}" data-tab="batteries">${this._t('batteries')}</button>
          <button class="tab-btn ${this._activeTab === "network" ? "active" : ""}" data-tab="network">${this._t('network')}</button>
          <button class="tab-btn ${this._activeTab === "alerts" ? "active" : ""}" data-tab="alerts">${this._t('alerts')}</button>
        
        </div>
    `;

    if (this._registryStatus !== 'ready' && (registryUnknown || this._registryStatus === 'error')) {
      const messageKey = this._registryStatus === 'error' ? 'registryFailed'
        : this._registryStatus === 'loading' ? 'registryLoading' : 'registryNotReady';
      html += `<div class="registry-notice" role="status" style="margin:12px;padding:12px;border:1px solid var(--bento-border);border-radius:8px;">${this._t(messageKey)}${this._hass?.callWS && this._registryStatus !== 'loading' ? ` <button type="button" class="registry-retry">${this._t('retryRegistry')}</button>` : ''}</div>`;
    }

    if (this._activeTab === 'devices') html += `<p class="history-snapshot-note">${this._ht('snapshot')}</p>`;

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
              <input type="text" class="search-box" aria-label="${_esc(this._t('searchDevices'))}" placeholder="${this._t('searchDevices')}" value="${_esc(this._searchQuery)}">
            </div>
            <div class="control-group">
              <select class="filter-status" aria-label="${this._lang === 'pl' ? 'Stan urządzenia' : 'Device status'}">
                <option value="all" ${this._deviceFilter === 'all' ? 'selected' : ''}>${this._t('all')}</option>
                <option value="online" ${this._deviceFilter === 'online' ? 'selected' : ''}>${this._t('online')}</option>
                <option value="offline" ${this._deviceFilter === 'offline' ? 'selected' : ''}>${this._t('offline')}</option>
                <option value="unavailable" ${this._deviceFilter === 'unavailable' ? 'selected' : ''}>${this._t('unavailable')}</option>
                <option value="unknown" ${this._deviceFilter === 'unknown' ? 'selected' : ''}>${this._t('unknown')}</option>
              </select>
            </div>
            <div class="control-group">
              <button class="toggle-grouping ${this._groupByDomain ? 'active' : ''}">${this._t('toggleGrouping')}</button>
            </div>
            <div class="control-group">
              <span style="font-size:12px;color:var(--ts);white-space:nowrap;">${this._t('show')}:</span>
              <select class="page-size-selector" aria-label="${this._lang === 'pl' ? 'Wiersze na stronę' : 'Rows per page'}" data-tab="devices">
                ${[15,30,50,100].map(n => `<option value="${n}" ${this._pageSize === n ? 'selected' : ''}>${n}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="stats">
            ${this._t('totalDevices')}: ${registryUnknown ? '—' : devices.length} | ${this._t('online')}: ${online} | ${this._t('availability')}: ${availability}${unlinkedEntities === null ? '' : ` | ${this._t('unlinkedEntities')}: ${unlinkedEntities}`}
          </div>
          <div class="table-wrapper">
          <table class="device-table" data-device-records>
            <thead>
              <tr>
                <th data-sort="name" aria-sort="${this._sortBy === 'name-desc' ? 'descending' : 'ascending'}"><button type="button" class="device-sort-name">${this._t('name')}</button></th>
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
                    `<tr data-record-key="${_esc(device.id)}" data-record-name="${_esc(device.name)}" data-record-state="${_esc(this._t(device.status).toUpperCase())}">
                      <td>${_esc(device.name)}</td>
                      <td>${_esc(this._deviceRegistry.get(device.id)?.model ? device.type : this._t('genericDevice'))}</td>
                      <td><span class="status-badge status-${_esc(device.status)}">${_esc(this._t(device.status).toUpperCase())}</span></td>
                      <td>${device.lastSeen && Number.isFinite(Date.parse(device.lastSeen)) ? new Date(device.lastSeen).toLocaleString(this._lang) : "—"}</td>
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

    if (this._activeTab === 'devices') html += this._renderDeviceHistory();

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
              <select class="battery-sort" aria-label="${this._lang === 'pl' ? 'Sortowanie baterii' : 'Battery order'}" style="width: auto; max-width: 200px; margin-right: 4px;">
                <option value="level" ${this._batterySortBy === 'level' ? 'selected' : ''}>${this._t('levelWorstFirst')}</option>
                <option value="name" ${this._batterySortBy === 'name' ? 'selected' : ''}>${this._t('name')}</option>
              </select>
            </div>
            <div class="control-group">
              <span style="font-size:12px;color:var(--ts);white-space:nowrap;">${this._t('show')}:</span>
              <select class="page-size-selector" aria-label="${this._lang === 'pl' ? 'Wiersze na stronę' : 'Rows per page'}" data-tab="batteries">
                ${[15,30,50,100].map(n => `<option value="${n}" ${this._batteryPageSize === n ? 'selected' : ''}>${n}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="stats">
            ${this._t('batteryHealthSummary')}: ${this._registryIdentityUnknown() ? '—' : batteryNeedingAttention} ${this._t('deviceNeedAttention')}
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
                        <div class="battery-label">${this._t('lastChanged')}: ${new Date(battery.lastChanged).toLocaleDateString(this._lang)}</div>
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
      const protocolLabel = protocol => protocol === 'Other' ? this._t('networkOther') : protocol;
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
              <span style="font-size:12px;color:var(--ts);white-space:nowrap;">${this._t('show')}:</span>
              <select class="page-size-selector" aria-label="${this._lang === 'pl' ? 'Wiersze na stronę' : 'Rows per page'}" data-tab="network">
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
            <div class="network-stat-label">${_esc(protocolLabel(protocol))} ${this._t('networkDevices')}</div>
          </div>
        `;
      });

      html += `
          </div>
          <canvas id="signal-chart" width="400" height="250"></canvas>
      `;
      if (!allNetDevices.length) html += `<div class="empty-state">${this._t('noNetworkEvidence')}</div>`;

      // Group paginated devices by protocol for display
      let lastProto = '';
      paginatedNet.forEach((device) => {
        if (device.protocol !== lastProto) {
          lastProto = device.protocol;
          html += `<div class="section-title">${_esc(this._t('networkGroup').replace('{protocol}', () => protocolLabel(device.protocol)))}</div>`;
        }
        const hasRssi = device.rssi !== null && device.rssi !== undefined && !isNaN(device.rssi);
        const color = hasRssi ? this._getSignalColor(device.rssi) : '#94a3b8';
        const strength = hasRssi ? Math.max(0, Math.min(100, ((device.rssi + 100) / 50) * 100)) : 0;

        // Build detail line with MAC/IP/SSID
        const details = [];
        if (device.mac) details.push('<code style="font-size:11px;background:var(--bg);padding:2px 6px;border-radius:3px;">' + _esc(device.mac) + '</code>');
        if (device.ip) details.push('IP: ' + _esc(device.ip));
        if (device.ssid) details.push('\u{1F4F6} ' + _esc(device.ssid));
        if (device.connectionType) details.push(_esc(protocolLabel(device.connectionType)));

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
              <span style="font-size: 13px; color: var(--ts);">${this._t('itemsPerPage')}:</span>
              <select class="page-size-selector" aria-label="${this._lang === 'pl' ? 'Wiersze na stronę' : 'Rows per page'}" data-tab="alerts">
                <option value="10" ${this._alertsPageSize === 10 ? 'selected' : ''}>10</option>
                <option value="15" ${this._alertsPageSize === 15 ? 'selected' : ''}>15</option>
                <option value="20" ${this._alertsPageSize === 20 ? 'selected' : ''}>20</option>
                <option value="30" ${this._alertsPageSize === 30 ? 'selected' : ''}>30</option>
              </select>
            </div>
          </div>
          <div class="stats" aria-live="polite" aria-atomic="true">
            ${this._t('activeAlerts')}: ${this._registryIdentityUnknown() ? '—' : this._alerts.length}
          </div>
          ${this._renderBackgroundAlertsSection()}
      `;

      if (this._alerts.length === 0 && !this._registryIdentityUnknown()) {
        html += `<div class="empty-state">${this._t('noActiveAlerts')}</div>`;
      } else {
        paginatedAlerts.forEach((alert) => {
          const alertId = `${alert.type}_${alert.id}`;
          html += `
            <div class="alert-item alert-${_esc(alert.severity)}">
              <div class="alert-text">
                <div class="alert-type">${_esc(this._alertTypeLabel(alert.type).toUpperCase())}</div>
                <div>${_esc(alert.name)}</div>
                <div class="alert-time">${new Date(alert.timestamp).toLocaleString(this._lang)}</div>
              </div>
              <div class="alert-actions">
                <button class="alert-dismiss" data-alert-id="${_esc(alertId)}">${this._t('dismiss')}</button>
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
        <div class="section-title">${this._t('alertHistory')}</div><p class="history-snapshot-note">${this._ht('session')}</p>
        ${this._alertHistory
          .slice(0, 20)
          .map(
            (alert) =>
              `<div style="padding: 8px 12px; border-left: 3px solid; border-color: ${alert.severity === "critical" ? "var(--ec)" : alert.severity === "warning" ? "var(--wc)" : "var(--pc)"}; margin-bottom: 4px; border-radius: var(--radius-xs); background: var(--bg);">
                <div style="font-size: 12px; font-weight: 500; color: var(--tc);">${_esc(this._alertTypeLabel(alert.type))} — ${_esc(alert.name)}</div>
                <div style="font-size: 11px; color: var(--ts); margin-top: 2px;">${new Date(alert.timestamp).toLocaleString(this._lang)}</div>
              </div>`
          )
          .join("")}
      </div>
        </div>
      `;
    }

    html += this._renderBackgroundAutomationDialog();

    // Mark DOM as built after content is set
    const restoreScroll = !this._domBuilt;
    this.shadowRoot.innerHTML = `<style>${HA_DEVICE_HEALTH_BENTO_CSS}${createUiV3({language:this._lang}).css}
/* Recorder history owns one bounded projection; no external renderer. */
.device-history { margin:20px 0 0; padding:18px; border:1px solid var(--divider-color,#ddd); border-radius:var(--bento-radius-sm,12px); background:var(--card-background-color,#fff); color:var(--primary-text-color,#222); min-width:0; }
.device-history h3 { margin:0 0 8px; font-size:18px; }
.device-history p,.history-snapshot-note { color:var(--secondary-text-color,#555); font-size:13px; line-height:1.55; overflow-wrap:anywhere; }
.history-controls { display:flex; flex-wrap:wrap; align-items:end; gap:8px; margin:14px 0; }
.history-controls label { display:flex; flex-direction:column; gap:5px; flex:1 1 140px; min-width:0; font-size:13px; }
.history-controls button,.history-controls select,.history-data button { min-height:44px; min-width:44px; border:1px solid var(--divider-color,#aaa); border-radius:8px; background:var(--card-background-color,#fff); color:var(--primary-text-color,#222); font:inherit; padding:10px 12px; max-width:100%; }
.history-controls select { width:100%; }
.device-history button { cursor:pointer; }
.device-history button:disabled { cursor:default; opacity:.6; }
.device-history button[aria-pressed="true"] { border-color:var(--primary-color,#4f46e5); background:var(--bento-primary-light,rgba(79,70,229,.08)); }
.device-history :focus-visible { outline:3px solid var(--primary-color,#4f46e5); outline-offset:3px; }
.history-status { display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
.history-provenance { font-size:13px; overflow-wrap:anywhere; }
.history-provenance summary,.history-episodes summary { cursor:pointer; padding:12px 0; min-height:44px; box-sizing:border-box; }
.history-provenance dl { display:grid; grid-template-columns:minmax(100px,1fr) minmax(0,2fr); gap:8px 16px; }
.history-provenance dt { color:var(--secondary-text-color,#555); }
.history-provenance dd { margin:0; }
.history-inspector { border:1px solid var(--divider-color,#ddd); border-radius:8px; padding:12px; min-height:44px; font-size:13px; overflow-wrap:anywhere; }
.history-inspector p { margin:8px 0; }
.history-inspector time { font-variant-numeric:tabular-nums; }
.history-episodes { margin:12px 0; font-size:13px; overflow-wrap:anywhere; }
.history-episodes ol { list-style:none; padding:0; display:grid; gap:10px; }
.history-episodes li { display:grid; gap:6px; padding:12px; border:1px solid var(--divider-color,#ddd); border-radius:8px; }
.history-episodes time { font-variant-numeric:tabular-nums; }
.history-figure { margin:18px 0; border-top:1px solid var(--divider-color,#ddd); padding-top:12px; min-width:0; }
.history-figure figcaption { font-size:13px; font-weight:600; overflow-wrap:anywhere; }
.history-figure small { display:block; font-weight:400; color:var(--secondary-text-color,#555); margin-top:5px; }
.history-plot { position:relative; height:220px; margin:12px 22px 8px; }
.history-plot svg { width:100%; height:100%; }
.history-axis { position:absolute; left:0; font-size:11px; pointer-events:none; color:var(--secondary-text-color,#555); }
.history-axis-top { top:0; }.history-axis-bottom { bottom:0; }
.history-mark { position:absolute; transform:translate(-50%,-50%); width:44px; height:44px; min-width:44px; min-height:44px; padding:0; border:1px solid transparent; border-radius:50%; background:transparent; color:var(--primary-color,#4f46e5); font-size:18px; }
.history-mark:focus-visible,.history-mark[aria-pressed="true"] { z-index:2; }
.history-event-mark { color:var(--primary-text-color,#222); font-weight:700; }
.history-events { height:170px; background:repeating-linear-gradient(to bottom,transparent 0,transparent 39px,var(--divider-color,#ddd) 40px,transparent 41px); }
.history-dates { display:flex; justify-content:space-between; gap:16px; font-size:11px; font-variant-numeric:tabular-nums; color:var(--secondary-text-color,#555); }
.history-dates span { max-width:48%; overflow-wrap:anywhere; }
.history-data { list-style:none; padding:0; margin:12px 0; display:grid; gap:6px; }
.history-data button { display:grid; grid-template-columns:1fr 1fr; gap:6px; text-align:start; width:100%; font-size:13px; overflow-wrap:anywhere; }
.history-data time { font-variant-numeric:tabular-nums; }
.history-pages { justify-content:space-between; align-items:center; }
@media (max-width:500px) { .device-history { padding:12px; }.history-controls label { flex-basis:100%; }.history-provenance dl,.history-data button { grid-template-columns:1fr; }.history-provenance dt { margin-top:6px; }.history-plot { margin-inline:18px; } }

/* === HA Tools split — premium banners (donate / intro / prereq) === */

/* Donation footer — diamond top */
.donate-section {  margin: 24px 0 4px; padding: 20px 24px; position: relative; overflow: hidden;  background: linear-gradient(135deg, rgba(99,102,241,0.06), rgba(236,72,153,0.06));  border: 1px solid rgba(99,102,241,0.18); border-radius: var(--bento-radius-md, 18px);  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 18px;  font-family: 'Inter', -apple-system, sans-serif;}
.donate-section:not([data-source="own-card"])::before {  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;  background: linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899);}
.donate-section .donate-text { flex: 1; min-width: 240px; }
.donate-section h3 {  margin: 0 0 6px; font-size: 16px; font-weight: 700; letter-spacing: -0.02em;  background: linear-gradient(135deg, #6366f1, #ec4899);  -webkit-background-clip: text; background-clip: text; color: transparent;}
.donate-section p { margin: 0; font-size: 13px; line-height: 1.55; color: var(--bento-text-secondary, #57534e); letter-spacing: -0.005em; }
.donate-buttons { display: flex; gap: 10px; flex-wrap: wrap; }
.donate-btn {  display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px;  border-radius: 12px; font-weight: 700; font-size: 13px; letter-spacing: -0.005em;  text-decoration: none; transition: transform 0.2s cubic-bezier(0.4,0,0.2,1), box-shadow 0.2s, filter 0.2s;  border: 1px solid transparent;}
.donate-btn:hover { transform: translateY(-2px); filter: brightness(1.05); }
.donate-btn.coffee {  background: linear-gradient(135deg, #FFDD00, #FFC700); color: #000;  box-shadow: 0 4px 14px -2px rgba(255, 221, 0, 0.4);}
.donate-btn.coffee:hover { box-shadow: 0 8px 24px -4px rgba(255, 221, 0, 0.55); }
.donate-btn.paypal {  background: linear-gradient(135deg, #0070ba, #005ea6); color: #fff;  box-shadow: 0 4px 14px -2px rgba(0, 112, 186, 0.45);}
.donate-btn.paypal:hover { box-shadow: 0 8px 24px -4px rgba(0, 112, 186, 0.6); }
:host(.bento-dark) .donate-section { background: linear-gradient(135deg, rgba(129,140,248,0.10), rgba(244,114,182,0.10)); border-color: rgba(129,140,248,0.25); }
:host(.bento-dark) .donate-section h3 { background: linear-gradient(135deg, #a5b4fc, #f9a8d4); -webkit-background-clip: text; background-clip: text; color: transparent; }
:host(.bento-dark) .donate-section p { color: #d6d3d1; }
@media (max-width: 600px) {  .donate-section { flex-direction: column; text-align: center; padding: 18px; }  .donate-buttons { justify-content: center; width: 100%; } }

/* Prereq banner — premium */
.prereq-banner {  display: flex; align-items: flex-start; gap: 14px; padding: 16px 20px;  border-radius: var(--bento-radius-sm, 12px); margin: 0 0 16px;  font-size: 13px; line-height: 1.55; border: 1px solid;  font-family: 'Inter', sans-serif; letter-spacing: -0.005em;  position: relative; overflow: hidden;}
.prereq-banner::before {  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;}
.prereq-banner.prereq-error { background: rgba(239,68,68,0.06); border-color: rgba(239,68,68,0.25); color: #991b1b; }
.prereq-banner.prereq-error::before { background: linear-gradient(180deg, #ef4444, #f87171); }
.prereq-banner.prereq-info  { background: rgba(99,102,241,0.06); border-color: rgba(99,102,241,0.25); color: #4338ca; }
.prereq-banner.prereq-info::before  { background: linear-gradient(180deg, #6366f1, #8b5cf6); }
.prereq-banner .prereq-icon { font-size: 22px; line-height: 1; padding-top: 2px; flex-shrink: 0; }
.prereq-banner .prereq-text { flex: 1; min-width: 0; }
.prereq-banner .prereq-text strong { font-weight: 700; letter-spacing: -0.01em; }
.prereq-banner code {  background: rgba(0,0,0,0.06); padding: 1px 7px; border-radius: 5px;  font-size: 12px; font-family: 'JetBrains Mono', ui-monospace, monospace;  border: 1px solid rgba(0,0,0,0.08);}
.prereq-banner .prereq-cta {  display: inline-flex; align-items: center; padding: 8px 16px; border-radius: 10px;  background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff !important;  text-decoration: none; font-weight: 700; font-size: 12.5px; flex-shrink: 0;  letter-spacing: -0.005em;  box-shadow: 0 4px 14px -2px rgba(99,102,241,0.45);  transition: all 0.2s cubic-bezier(0.4,0,0.2,1);}
.prereq-banner .prereq-cta:hover { transform: translateY(-1px); box-shadow: 0 8px 24px -4px rgba(99,102,241,0.6); }
:host(.bento-dark) .prereq-banner.prereq-error { background: rgba(248,113,113,0.10); border-color: rgba(248,113,113,0.30); color: #fca5a5; }
:host(.bento-dark) .prereq-banner.prereq-info { background: rgba(129,140,248,0.10); border-color: rgba(129,140,248,0.30); color: #c7d2fe; }
:host(.bento-dark) .prereq-banner code { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.10); }
@media (max-width: 600px) {  .prereq-banner { flex-direction: column; align-items: stretch; padding-left: 20px; }  .prereq-banner .prereq-cta { align-self: flex-start; } }

/* First-run intro banner — premium */
.intro-banner {  position: relative; padding: 18px 52px 18px 22px; margin: 0 0 18px;  background: linear-gradient(135deg, rgba(99,102,241,0.08), rgba(236,72,153,0.06));  border: 1px solid rgba(99,102,241,0.20);  border-radius: var(--bento-radius-sm, 12px);  font-size: 13px; line-height: 1.55; overflow: hidden;  font-family: 'Inter', sans-serif; letter-spacing: -0.005em;  animation: bentoSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);}
.intro-banner::before {  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;  background: linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899);}
.intro-banner .intro-headline {  font-weight: 700; font-size: 14.5px; margin-bottom: 10px; letter-spacing: -0.02em;  background: linear-gradient(135deg, #6366f1, #ec4899);  -webkit-background-clip: text; background-clip: text; color: transparent;  display: flex; align-items: center; gap: 8px;}
.intro-banner .intro-steps {  margin: 8px 0 0; padding: 0; list-style: none; counter-reset: introstep;}
.intro-banner .intro-steps li {  margin-bottom: 8px; line-height: 1.55; color: var(--bento-text, #0c0a09);  padding-left: 32px; position: relative; counter-increment: introstep;  font-size: 12.5px;}
.intro-banner .intro-steps li::before {  content: counter(introstep); position: absolute; left: 0; top: -1px;  width: 22px; height: 22px; border-radius: 50%;  background: var(--bento-card, #fff); border: 1px solid rgba(99,102,241,0.25);  display: flex; align-items: center; justify-content: center;  font-size: 11px; font-weight: 800; color: #6366f1;  font-family: 'JetBrains Mono', ui-monospace, monospace;  font-feature-settings: 'tnum' 1;}
.intro-banner .intro-dismiss {  position: absolute; top: 12px; right: 14px;  background: var(--bento-card, transparent); border: 1px solid var(--bento-border, transparent);  cursor: pointer; font-size: 14px; line-height: 1;  color: var(--bento-text-secondary, #64748B);  padding: 4px 8px; border-radius: 999px;  transition: all 0.15s ease;}
.intro-banner .intro-dismiss:hover {  background: var(--bento-bg-2, #e7e5e4); color: var(--bento-text, #0c0a09);  transform: rotate(90deg);}
:host(.bento-dark) .intro-banner { background: linear-gradient(135deg, rgba(129,140,248,0.14), rgba(244,114,182,0.10)); border-color: rgba(129,140,248,0.30); }
:host(.bento-dark) .intro-banner .intro-headline { background: linear-gradient(135deg, #a5b4fc, #f9a8d4); -webkit-background-clip: text; background-clip: text; color: transparent; }
:host(.bento-dark) .intro-banner .intro-steps li { color: #fafaf9; }
:host(.bento-dark) .intro-banner .intro-steps li::before { background: #16161f; border-color: rgba(129,140,248,0.35); color: #a5b4fc; }
:host(.bento-dark) .intro-banner .intro-dismiss { background: #16161f; border-color: #27272f; color: #d6d3d1; }
:host(.bento-dark) .intro-banner .intro-dismiss:hover { background: #27272f; color: #fafaf9; }

${style}

:host(.bento-dark) {
    --bento-bg: var(--primary-background-color, #1a1a2e);
    --bento-card: var(--card-background-color, #16213e);
    --bento-text: var(--primary-text-color, #e2e8f0);
    --bento-text-secondary: var(--secondary-text-color, #94a3b8);
    --bento-border: var(--divider-color, #334155);
    --bento-shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
    --bento-shadow-md: 0 4px 12px rgba(0,0,0,0.4);
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

${_FAMILY_CONTROL_CSS}
${_FAMILY_RECORD_CSS}
</style>${_renderLocalIntro(key => this._t(key))}${html}${this._hass?.user?.is_admin && this._config?.show_support !== false && !_localSupportDismissed() ? _renderLocalSupport(key => this._t(key)) : ''}`
    _bindLocalIntroDismiss(this.shadowRoot);
    _bindLocalSupportDismiss(this.shadowRoot);
    this._attachEventListeners();
    this._attachHistoryEvents();
    _bindFamilyNavigation(this, familyFocus);
    this._drawSignalChart();
    const dialog = this.shadowRoot.querySelector('.automation-dialog');
    for (const child of this.shadowRoot.children) {
      if (child.tagName !== 'STYLE' && !child.contains(dialog)) child.toggleAttribute('inert', Boolean(dialog));
    }
    if (dialog) {
      const retainedFocus = dialogFocusClass && dialog.querySelector('.' + dialogFocusClass);
      const target = retainedFocus && !retainedFocus.disabled ? retainedFocus
        : dialog.querySelector('.automation-dialog-cancel:not(:disabled)') || dialog.querySelector('.automation-yaml-preview');
      target.focus({ preventScroll: true });
      if (dialogSelection && target.matches('.automation-yaml-preview')) target.setSelectionRange(...dialogSelection);
    } else if (oldDialog) {
      this.shadowRoot.querySelector('.background-alerts-generate')?.focus({ preventScroll: true });
    } else if (historyFocus) {
      const target = historyFocus.row ? [...this.shadowRoot.querySelectorAll('[data-history-row]')].find(node=>node.dataset.historyRow===historyFocus.row)
        : historyFocus.view ? [...this.shadowRoot.querySelectorAll('[data-history-view]')].find(node=>node.dataset.historyView===historyFocus.view)
        : historyFocus.className ? this.shadowRoot.querySelector('.'+historyFocus.className) : null;
      if (target && !target.disabled) target.focus({preventScroll:true});
      else {
        const status=this.shadowRoot.querySelector('.history-status');
        status?.setAttribute('tabindex','-1');status?.focus({preventScroll:true});
      }
    } else if (activeElement?.matches('.device-sort-name')) {
      this.shadowRoot.querySelector('.device-sort-name')?.focus({ preventScroll: true });
    } else if (focusedSearch) {
      const search = this.shadowRoot.querySelector('.search-box');
      if (search) {
        search.focus({ preventScroll: true });
        search.setSelectionRange(...searchSelection);
      }
    }

    _bindFamilyRecords(this, recordFocus);

    // Restore scroll positions after DOM rebuild
    this._scrollFrame = requestAnimationFrame(() => {
      this._scrollFrame = null;
      if (!this.isConnected) return;
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
        this._scrollTimer = setTimeout(() => {
          this._scrollTimer = null;
          if (this.isConnected) list.scrollTop = this._scrollPosition;
        }, 0);
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
      deviceCount.textContent = this._getDevices().length;
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
    const dialog = this.shadowRoot.querySelector('.automation-dialog');
    if (dialog) dialog.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!this._backgroundAlertDialog?.creating) {
          this._backgroundAlertDialog = null;
          this._render();
        }
      } else if (event.key === 'Tab') {
        const controls = [...dialog.querySelectorAll('textarea, button:not(:disabled)')];
        const first = controls[0], last = controls.at(-1);
        if ((event.shiftKey && this.shadowRoot.activeElement === first) ||
            (!event.shiftKey && this.shadowRoot.activeElement === last)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus({ preventScroll: true });
        }
      }
    });
    const registryRetry = this.shadowRoot.querySelector('.registry-retry');
    if (registryRetry) registryRetry.addEventListener('click', () => this._loadRegistries(true));
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

    const backgroundGenerate = this.shadowRoot.querySelector(".background-alerts-generate");
    if (backgroundGenerate) {
      backgroundGenerate.addEventListener("click", () => this._openBackgroundAutomationDialog());
    }

    const backgroundCancel = this.shadowRoot.querySelector(".automation-dialog-cancel");
    if (backgroundCancel) {
      backgroundCancel.addEventListener("click", () => {
        this._backgroundAlertDialog = null;
        this._render();
      });
    }

    const backgroundCreate = this.shadowRoot.querySelector(".automation-dialog-create");
    if (backgroundCreate) {
      backgroundCreate.addEventListener("click", () => this._createBackgroundAlertAutomations());
    }

    const sortHeaders = this.shadowRoot.querySelectorAll(".device-table th[data-sort]");
    sortHeaders.forEach((header) => {
      header.addEventListener("click", (e) => {
        const sortBy = e.currentTarget.dataset.sort;
        this._sortBy = this._sortBy === sortBy ? sortBy + "-desc" : sortBy;
        this._currentPage = 1;
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
    if (!ctx) return;
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
  getGridOptions() { return { columns: 12, min_rows: 3, min_columns: 6 }; }

  static getStubConfig() {
    return {
      type: "custom:ha-device-health",
      battery_warning: 30,
      battery_critical: 10,
      offline_alert_minutes: 60,
    };
  }

  connectedCallback() {
    this._bindHistoryLifecycle();
    _bindFamilyNavigation(this);
    _bindFamilyRecords(this);
    if (this._hass) {
      this._loadRegistries();
      this._subscribeRegistryUpdates();
      this._update();
    }
  }

  disconnectedCallback() {
    _disconnectFamilyNavigation(this);
    _disconnectFamilyRecords(this);
    this._familyRecordWidth = null;
    this._familyNavWidth = null;
    this._cancelDeviceHistory('not_checked',true);
    if (this._historyConnection?.removeEventListener) {
      this._historyConnection.removeEventListener('ready',this._historyReadyHandler);
      this._historyConnection.removeEventListener('disconnected',this._historyDisconnectHandler);
    }
    this._historyConnection = null;
    this._historyListenersBound = false;
    window.removeEventListener('online',this._historyOnlineHandler);
    window.removeEventListener('offline',this._historyOfflineHandler);
    this._historyBrowserBound = false;
    if (this._backgroundAutomationOperation) this._backgroundAutomationOperation.cancelled = true;
    this._backgroundAlertDialog = null;
    this._backgroundAlertResult = null;
    this._clearOfflineTimer();
    this._stopRegistryUpdates();
    this._registryEpoch++;
    this._registryLoading = null;
    this._registryLoadedAt = 0;
    if (this._renderTimer) clearTimeout(this._renderTimer);
    if (this._scrollTimer) clearTimeout(this._scrollTimer);
    if (this._scrollFrame) cancelAnimationFrame(this._scrollFrame);
    this._renderTimer = null;
    this._scrollTimer = null;
    this._scrollFrame = null;
    this._renderScheduled = false;
  }

  setActiveTab(tabId) {
    this._activeTab = tabId;
    this._render();
  }
}

if (!customElements.get('ha-device-health')) customElements.define("ha-device-health", HADeviceHealth);

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
  set hass(hass) {
    this._hass = hass;
    const lang = hass?.language?.startsWith('pl') ? 'pl' : 'en';
    if (lang !== this._renderedLanguage) this._render();
  }
  _dispatch() {
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true }));
  }
  _render() {
    const lang = this._hass?.language?.startsWith('pl') ? 'pl' : 'en';
    const labels = HADeviceHealth._translations[lang];
    const active = this.shadowRoot.activeElement;
    const focus = active?.tagName === 'INPUT' ? {
      id: active.id, start: active.selectionStart, end: active.selectionEnd,
      direction: active.selectionDirection,
    } : null;
    this.shadowRoot.innerHTML = `
      <style>${_FAMILY_CONTROL_CSS}
            :host { display:block; padding:16px; }
            h3 { margin:0 0 16px; font-size:15px; font-weight:600; color:var(--bento-text, var(--primary-text-color,#1e293b)); }
            input { outline:none; transition:border-color .2s; }
            input:focus { border-color:var(--bento-primary, var(--primary-color,#3b82f6)); }
        </style>
      <h3>${_esc(labels.deviceHealth)}</h3>
            <div style="margin-bottom:12px;">
              <label for="cf_title" style="display:block;font-weight:500;margin-bottom:4px;font-size:13px;">${_esc(labels.editorTitle)}</label>
              <input type="text" id="cf_title" value="${_esc(this._config?.title ?? '')}" placeholder="${_esc(labels.deviceHealth)}"
                style="width:100%;padding:8px 12px;border:1px solid var(--divider-color,#e2e8f0);border-radius:8px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#1e293b);font-size:14px;box-sizing:border-box;">
            </div>
            <div style="margin-bottom:12px;">
              <label for="cf_battery_warning" style="display:block;font-weight:500;margin-bottom:4px;font-size:13px;">${_esc(labels.editorBatteryWarning)}</label>
              <input type="text" id="cf_battery_warning" value="${_esc(this._config?.battery_warning ?? '30')}"
                style="width:100%;padding:8px 12px;border:1px solid var(--divider-color,#e2e8f0);border-radius:8px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#1e293b);font-size:14px;box-sizing:border-box;">
            </div>
            <div style="margin-bottom:12px;">
              <label for="cf_battery_critical" style="display:block;font-weight:500;margin-bottom:4px;font-size:13px;">${_esc(labels.editorBatteryCritical)}</label>
              <input type="text" id="cf_battery_critical" value="${_esc(this._config?.battery_critical ?? '10')}"
                style="width:100%;padding:8px 12px;border:1px solid var(--divider-color,#e2e8f0);border-radius:8px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#1e293b);font-size:14px;box-sizing:border-box;">
            </div>
    `;
        this._renderedLanguage = lang;
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
        if (focus) {
          const input = this.shadowRoot.getElementById(focus.id);
          if (input) {
            input.focus();
            input.setSelectionRange(focus.start, focus.end, focus.direction);
          }
        }
  }
  connectedCallback() { this._render(); }
}
if (!customElements.get('ha-device-health-editor')) { customElements.define('ha-device-health-editor', HaDeviceHealthEditor); }

})();

window.customCards = window.customCards || [];
window.customCards.push({ type: 'ha-device-health', name: 'Device Health', description: 'Monitor device health, battery levels and connectivity', preview: false });
