/* HA Tools split — ha-device-health v4.1.5 (2026-06-07) — single-tool standalone repo */
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
   HA Tools — Bento Design System v2.0 (Premium)
   ═══════════════════════════════════════════════ */


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
@media (prefers-color-scheme: dark) {
  :host {
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
  .card, .card-container, .main-card, .panel-card {
    background: var(--bento-card) !important; color: var(--bento-text) !important; border-color: var(--bento-border) !important;
  }
  input, select, textarea { background: var(--bento-bg-2); color: var(--bento-text); border-color: var(--bento-border); }
  table th { background: var(--bento-bg-2); color: var(--bento-text-secondary); border-color: var(--bento-border); }
  table td { color: var(--bento-text); border-color: var(--bento-border); }
  pre, code { background: #1e1e2e !important; color: #e2e8f0 !important; }
}

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
  overflow-x: auto !important; overflow-y: hidden !important;
  -webkit-overflow-scrolling: touch !important;
  flex-wrap: nowrap !important; border-bottom: 0 !important;
  width: fit-content; max-width: 100%;
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
  white-space: nowrap !important; flex: none !important;
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
  font-size: 12px; font-weight: 700; color: var(--bento-text-secondary);
  text-transform: uppercase; letter-spacing: 0.08em;
  margin: 16px 0 10px;
}
.section-header::before, .section-title::before {
  content: ""; width: 4px; height: 4px; border-radius: 50%; background: var(--bento-primary);
  margin-right: 8px; flex-shrink: 0;
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
  // Per-tool prerequisite check + inline install banner
  var PREREQS = {
    'ha-energy-email': { service: 'ha_tools_email', repo: 'ha-tools-email-integration', label: 'HA Tools Email integration', kind: 'integration' },
    'ha-log-email':    { service: 'ha_tools_email', repo: 'ha-tools-email-integration', label: 'HA Tools Email integration', kind: 'integration' },
    'ha-encoding-fixer': { shellCommand: 'fix_encoding', label: 'shell_command.fix_encoding (optional advanced feature)', kind: 'shell_command_optional' }
  };
  // Per-tool first-run intro banner (one-line scope + 3 use cases)
  var INTROS = {
    'ha-yaml-checker': { headline: 'Validate Home Assistant YAML configuration on demand.', steps: ['Click \'Check HA Configuration\' to run homeassistant.check_config.', 'Switch to \'Encje\' tab to search entities by domain.', 'Use \'Template\' tab to preview Jinja2 templates.'] },
    'ha-data-exporter': { headline: 'Browse, filter, and export Home Assistant entity data.', steps: ['Filter by domain or search entities live.', 'Take a snapshot or export selection to CSV / JSON.', 'Privacy warning before downloading attributes with sensitive data.'] },
    'ha-chore-tracker': { headline: 'Household chore tracker with kanban + recurring schedules.', steps: ['Add a chore: name + assignee + frequency.', 'Drag from \'Todo\' to \'Done\' to mark complete.', 'Stats tab shows counts per assignee.'] },
    'ha-energy-optimizer': { headline: 'Tariff-aware energy usage with hourly heatmaps + tips.', steps: ['Today / Yesterday / 7-day / 30-day usage and cost.', 'Patterns tab — hourly heatmap of consumption.', 'Recommendations tab — auto-generated tips.'] },
    'ha-energy-insights': { headline: 'Daily / weekly / monthly energy charts + top consumers.', steps: ['Switch view tabs to see consumption over time.', 'Top devices ranked by kWh.', 'Tips tab with energy-saving suggestions.'] },
    'ha-energy-email': { headline: 'Energy reports delivered by email via ha_tools_email.', steps: ['Click \'Send Now\' to email the current snapshot.', 'Schedule daily / weekly / monthly delivery.', 'Configure SMTP in the Schedule tab (one-time).'] },
    'ha-log-email': { headline: 'Daily error / warning digests delivered by email.', steps: ['Click \'Send Now\' to email the current digest.', 'Schedule daily delivery + threshold (e.g. \u22653 errors).', 'Requires ha-tools-email-integration.'] },
    'ha-smart-reports': { headline: 'Aggregate weekly / monthly reports — energy + automations + state changes.', steps: ['Weekly summary card on Overview.', 'Drill down by Energy / Automations / System sub-tabs.', 'Privacy-safe view strips entity names before sharing.'] },
    'ha-network-map': { headline: 'Visualise the network around HA — devices, topology, MAC bindings.', steps: ['Devices tab — table of all known devices.', 'Topology tab — graph view of the network.', 'Click \'Rescan\' to ping the local subnet (user-initiated).'] },
    'ha-trace-viewer': { headline: 'Step through HA automation traces with a flow graph.', steps: ['Pick automation in sidebar to see latest 5 traces.', 'Click trace for full path through triggers / conditions / actions.', 'Export trace as JSON for offline debug.'] },
    'ha-automation-analyzer': { headline: 'Surface slow / failing / suspicious automations.', steps: ['Overview shows total + health score + top failing.', 'Performance tab ranks by avg runtime.', 'Optimization tab suggests improvements (loops, redundant triggers).'] },
    'ha-storage-monitor': { headline: 'Disk + recorder DB + add-on storage breakdown.', steps: ['Overview shows used / free + per-category breakdown.', 'Backups tab — count + size warning.', 'Cleanup tab — actionable suggestions.'] },
    'ha-backup-manager': { headline: 'Create + list + inspect HA backups.', steps: ['List existing backups (date / size / encryption).', 'Click \'Create backup now\' to invoke backup.create.', 'Restore selected backup.'] },
    'ha-security-check': { headline: 'Security audit + remediation tips.', steps: ['Overview shows score (X/100) + letter grade.', 'Click warning row for step-by-step remediation.', 'Tips tab — checklist of best practices.'] },
    'ha-device-health': { headline: 'Device battery / signal / last-seen health.', steps: ['List devices grouped by health (OK / Warning / Critical).', 'Filter by low battery (<20%) or weak signal.', 'Click device for model / manufacturer / last seen.'] },
    'ha-encoding-fixer': { headline: 'Detect + fix UTF-8 / mojibake issues across HA.', steps: ['Click \'Scan\' to walk entity registry + states.', 'Per-entity \'Fix\' button calls homeassistant.reload.', 'Optional: deep file scan via shell_command (see README).'] },
    'ha-entity-renamer': { headline: 'Bulk-rename HA entities + friendly names.', steps: ['Pick an entity, set new ID — entity_registry/update.', 'Bulk pattern: sensor.old_* \u2192 sensor.new_*.', 'Optional: rewrite Lovelace dashboard refs.'] },
    'ha-frigate-privacy': { headline: 'One-click Frigate privacy mode (pause detection / recording / snapshots).', steps: ['Click \'Pause 15 min\' for instant privacy.', 'Schedules tab — daily privacy window (e.g. 22:00\u201306:00).', 'Resume at any time to re-enable cameras.'] }
  };
  var PREREQ_HTML_CACHE = {};
  function buildPrereqBanner(tag, prereq, hass) {
    if (PREREQ_HTML_CACHE[tag]) return PREREQ_HTML_CACHE[tag];
    var html = '';
    if (prereq.kind === 'integration') {
      html = '<div class="prereq-banner prereq-error" data-prereq="' + tag + '">' +
        '<div class="prereq-icon">⚠️</div>' +
        '<div class="prereq-text">' +
          '<strong>This tool requires the ' + prereq.label + '</strong><br>' +
          'Install it from HACS: <code>https://github.com/MacSiem/' + prereq.repo + '</code> ' +
          '(Category: <strong>Integration</strong>) — then add <code>' + prereq.service + ':</code> to your <code>configuration.yaml</code> and restart HA.' +
        '</div>' +
        '<a class="prereq-cta" href="https://github.com/MacSiem/' + prereq.repo + '" target="_blank" rel="noopener noreferrer">Open install guide ↗</a>' +
      '</div>';
    } else if (prereq.kind === 'shell_command_optional') {
      html = '<div class="prereq-banner prereq-info" data-prereq="' + tag + '">' +
        '<div class="prereq-icon">💡</div>' +
        '<div class="prereq-text">' +
          '<strong>Optional advanced feature: deep file scan</strong><br>' +
          'To enable scanning of <code>configuration.yaml</code> files, install the bundled <code>encoding_scanner.py</code> + add <code>shell_command:</code> entries. See README.' +
        '</div>' +
      '</div>';
    }
    PREREQ_HTML_CACHE[tag] = html;
    return html;
  }
  function buildIntroBanner(tag, intro) {
    var stepsHtml = intro.steps.map(function(s){ return '<li>' + s + '</li>'; }).join('');
    return '<div class="intro-banner" data-intro="' + tag + '">' +
      '<button class="intro-dismiss" type="button" title="Dismiss" aria-label="Dismiss">✕</button>' +
      '<div class="intro-headline">💡 ' + intro.headline + '</div>' +
      '<ol class="intro-steps">' + stepsHtml + '</ol>' +
    '</div>';
  }
  function introDismissed(tag) {
    try { return localStorage.getItem('ha-intro-dismissed-' + tag) === '1'; } catch(e) { return false; }
  }
  function dismissIntro(tag, el) {
    try { localStorage.setItem('ha-intro-dismissed-' + tag, '1'); } catch(e) {}
    var node = el.shadowRoot && el.shadowRoot.querySelector('.intro-banner[data-intro="' + tag + '"]');
    if (node) node.remove();
  }
  function injectAll() {
    SPLIT_TAGS.forEach(function(tag){
      deepFindAll(tag).forEach(function(el){
        // panel_custom auto-init: HA assigns hass/panel/narrow but does not always call setConfig.
        if (typeof el.setConfig === 'function' && !el.config && !el._config) {
          try { el.setConfig({ type: 'custom:' + tag, title: tag }); } catch(e) {}
        }
        if (!el.shadowRoot) return;
        // 0) First-run intro banner (skip if tool has its own native tip)
        var intro = INTROS[tag];
        if (intro && !introDismissed(tag)) {
          var hasOwnTip = el.shadowRoot.querySelector('#tip-banner, .tip-banner');
          var injectedIntro = el.shadowRoot.querySelector('.intro-banner[data-intro="' + tag + '"]');
          if (!hasOwnTip && !injectedIntro) {
            try {
              var _introTmp = document.createElement('div');
              _introTmp.innerHTML = buildIntroBanner(tag, intro);
              var _introNode = _introTmp.firstElementChild;
              if (_introNode) el.shadowRoot.insertBefore(_introNode, el.shadowRoot.firstChild);
              var btn = el.shadowRoot.querySelector('.intro-banner[data-intro="' + tag + '"] .intro-dismiss');
              if (btn) btn.addEventListener('click', function(ev){ ev.stopPropagation(); dismissIntro(tag, el); });
            } catch(e) {}
          }
        }
        // 1) Prereq banner — checked every poll so it disappears when prereq becomes available
        var prereq = PREREQS[tag];
        if (prereq && el._hass) {
          var hassReady = !!el._hass;
          var present = true;
          if (prereq.service) present = !!(el._hass.services && el._hass.services[prereq.service]);
          if (prereq.shellCommand) present = !!(el._hass.services && el._hass.services.shell_command && el._hass.services.shell_command[prereq.shellCommand]);
          var existing = el.shadowRoot.querySelector('.prereq-banner[data-prereq="' + tag + '"]');
          if (!present && hassReady) {
            if (!existing) {
              try {
                var _prereqTmp = document.createElement('div');
                _prereqTmp.innerHTML = buildPrereqBanner(tag, prereq, el._hass);
                var _prereqNode = _prereqTmp.firstElementChild;
                if (_prereqNode) el.shadowRoot.insertBefore(_prereqNode, el.shadowRoot.firstChild);
              } catch(e) {}
            }
          } else if (present && existing) {
            existing.remove();
          }
        }
        // 2) Donate footer
        if (el.shadowRoot.querySelector('.donate-section')) return;
        try {
          var _donateTmp = document.createElement('div');
          _donateTmp.innerHTML = DONATE_HTML;
          while (_donateTmp.firstChild) el.shadowRoot.appendChild(_donateTmp.firstChild);
        } catch(e) {}
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
/* === HA Tools split — premium banners (donate / intro / prereq) === */

/* Donation footer — diamond top */
.donate-section {  margin: 24px 0 4px; padding: 20px 24px; position: relative; overflow: hidden;  background: linear-gradient(135deg, rgba(99,102,241,0.06), rgba(236,72,153,0.06));  border: 1px solid rgba(99,102,241,0.18); border-radius: var(--bento-radius-md, 18px);  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 18px;  font-family: 'Inter', -apple-system, sans-serif;}
.donate-section::before {  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;  background: linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899);}
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
@media (prefers-color-scheme: dark) {  .donate-section { background: linear-gradient(135deg, rgba(129,140,248,0.10), rgba(244,114,182,0.10)); border-color: rgba(129,140,248,0.25); }  .donate-section h3 { background: linear-gradient(135deg, #a5b4fc, #f9a8d4); -webkit-background-clip: text; background-clip: text; color: transparent; }  .donate-section p { color: #d6d3d1; } }
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
@media (prefers-color-scheme: dark) {  .prereq-banner.prereq-error { background: rgba(248,113,113,0.10); border-color: rgba(248,113,113,0.30); color: #fca5a5; }  .prereq-banner.prereq-info  { background: rgba(129,140,248,0.10); border-color: rgba(129,140,248,0.30); color: #c7d2fe; }  .prereq-banner code { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.10); } }
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
@media (prefers-color-scheme: dark) {  .intro-banner { background: linear-gradient(135deg, rgba(129,140,248,0.14), rgba(244,114,182,0.10)); border-color: rgba(129,140,248,0.30); }  .intro-banner .intro-headline { background: linear-gradient(135deg, #a5b4fc, #f9a8d4); -webkit-background-clip: text; background-clip: text; color: transparent; }  .intro-banner .intro-steps li { color: #fafaf9; }  .intro-banner .intro-steps li::before { background: #16161f; border-color: rgba(129,140,248,0.35); color: #a5b4fc; }  .intro-banner .intro-dismiss { background: #16161f; border-color: #27272f; color: #d6d3d1; }  .intro-banner .intro-dismiss:hover { background: #27272f; color: #fafaf9; } }

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
  getGridOptions() { return { rows: 6, columns: 12, min_rows: 3, min_columns: 6 }; }

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
