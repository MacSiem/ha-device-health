class HADeviceHealth extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
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
    // Throttle control
    this._renderScheduled = false;
    this._firstRender = true;
    this._throttleMs = 5000;
    this._lastRenderTime = 0;
    this._cachedStateHash = ''
    this._charts = {}; // Store Chart.js instances
    this._chartJSPromise = null;;
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
  }

  set hass(hass) {
    this._hass = hass;
    if (this._firstRender) {
      this._firstRender = false;
      this._generateAlerts();
      this._render();
      return;
    }
    // Throttle: only re-render every _throttleMs
    const now = Date.now();
    if (now - this._lastRenderTime < this._throttleMs) {
      if (!this._renderScheduled) {
        this._renderScheduled = true;
        setTimeout(() => {
          this._renderScheduled = false;
          this._generateAlerts();
          this._render();
        }, this._throttleMs - (now - this._lastRenderTime));
      }
      return;
    }
    this._generateAlerts();
    this._render();
  }

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
          name: state.attributes.friendly_name || this._formatEntityName(entityId),
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
            name: state.attributes.friendly_name || this._formatEntityName(entityId),
            level: level,
            lastChanged: state.last_changed,
            device: state.attributes.device_name || this._extractDeviceName(entityId),
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

    Object.keys(states).forEach((entityId) => {
      if (entityId.includes("_signal") || entityId.includes("signal_strength") || entityId.includes("rssi")) {
        const state = states[entityId];
        const rssi = parseInt(state.state);

        if (!isNaN(rssi)) {
          const protocol = this._detectProtocol(entityId);
          if (!networks[protocol]) {
            networks[protocol] = [];
          }
          networks[protocol].push({
            id: entityId,
            name: state.attributes.friendly_name || this._formatEntityName(entityId),
            rssi: rssi,
            device: state.attributes.device_name || this._extractDeviceName(entityId),
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
    this._lastRenderTime = Date.now();
    const style = `
      :host {
        --pc: #3B82F6;
        --ec: #EF4444;
        --wc: #F59E0B;
        --sc: #10B981;
        --bg: #F8FAFC;
        --cbg: #FFFFFF;
        --tc: #1E293B;
        --ts: #64748B;
        --dc: #E2E8F0;
        --hov: rgba(59, 130, 246, 0.04);
        --sel: rgba(59, 130, 246, 0.08);
        --radius: 16px;
        --radius-sm: 10px;
        --radius-xs: 6px;
        --shadow: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02);
        --shadow-md: 0 4px 12px rgba(0,0,0,0.06);
        --tr: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        display: block;
        color-scheme: light !important;
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
      }

      .tab {
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

      .tab.active {
        color: var(--pc) !important;
        background: var(--cbg) !important;
        border-bottom-color: var(--pc);
      }

      .tab:hover {
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
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 12px;
        margin-bottom: 0;
      }

      .battery-card {
        border: 1.5px solid var(--dc);
        border-radius: var(--radius-sm);
        padding: 14px;
        text-align: center;
        transition: var(--tr);
        background: var(--cbg);
      }

      .battery-card:hover {
        box-shadow: var(--shadow-md);
        border-color: var(--pc);
      }

      .battery-bar {
        width: 100%;
        height: 8px;
        background: var(--dc);
        border-radius: 4px;
        overflow: hidden;
        margin: 8px 0;
      }

      .battery-fill {
        height: 100%;
        border-radius: 4px;
        transition: var(--tr);
      }

      .battery-label {
        font-size: 11px;
        color: var(--ts);
        margin-top: 6px;
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
        border: 1px solid var(--dc);
        border-radius: var(--radius-xs);
        margin-bottom: 16px;
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

      /* RESPONSIVE */
      @media (max-width: 768px) {
        .device-grid, .battery-grid { grid-template-columns: 1fr !important; }
        .card { padding: 12px; }
        .header { flex-direction: column; gap: 8px; }
        .header h2 { font-size: 16px; }
        .tab-bar { flex-wrap: wrap; }
        .tab { font-size: 12px; padding: 6px 10px; }
        table { font-size: 12px; }
        td, th { padding: 6px 8px; }
      }
      @media (max-width: 480px) {
        .device-grid, .battery-grid { gap: 8px; }
        .tab { font-size: 11px; padding: 5px 8px; }
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
        <div class="card-header">${this._config.title}</div>
        <div class="tabs">
          <button class="tab ${this._activeTab === "devices" ? "active" : ""}" data-tab="devices">${this._t('devices')}</button>
          <button class="tab ${this._activeTab === "batteries" ? "active" : ""}" data-tab="batteries">${this._t('batteries')}</button>
          <button class="tab ${this._activeTab === "network" ? "active" : ""}" data-tab="network">${this._t('network')}</button>
          <button class="tab ${this._activeTab === "alerts" ? "active" : ""}" data-tab="alerts">${this._t('alerts')}</button>
        </div>
    `;

    // Devices Tab
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
      <div class="tab-content ${this._activeTab === "devices" ? "active" : ""}">
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
            <select class="page-size-selector" data-tab="devices">
              ${[15,30,50,100].map(n => `<option value="${n}" ${this._pageSize === n ? 'selected' : ''}>${n} ${this._t('itemsPerPage')}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="stats">
          ${this._t('totalDevices')}: ${devices.length} | ${this._t('online')}: ${online} | ${this._t('availability')}: ${availability}%
        </div>
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
                    <td>${device.name}</td>
                    <td>${device.type}</td>
                    <td><span class="status-badge status-${device.status}">${device.status.toUpperCase()}</span></td>
                    <td>${new Date(device.lastSeen).toLocaleString()}</td>
                    <td>${device.uptime}</td>
                  </tr>`
              )
              .join("")}
          </tbody>
        </table>
        <div class="pagination">
          <button class="pagination-btn pagination-prev" ${this._currentPage === 1 ? 'disabled' : ''}>${this._t('previous')}</button>
          <span class="pagination-info">${this._t('page')} ${this._currentPage} ${this._t('of')} ${totalPages}</span>
          <button class="pagination-btn pagination-next" ${this._currentPage === totalPages ? 'disabled' : ''}>${this._t('next')}</button>
        </div>
      </div>
    `;

    // Batteries Tab
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
      <div class="tab-content ${this._activeTab === "batteries" ? "active" : ""}">
        <div class="controls">
          <div class="control-group">
            <select class="battery-sort">
              <option value="level" ${this._batterySortBy === 'level' ? 'selected' : ''}>${this._t('levelWorstFirst')}</option>
              <option value="name" ${this._batterySortBy === 'name' ? 'selected' : ''}>${this._t('name')}</option>
            </select>
          </div>
          <div class="control-group">
            <select class="page-size-selector" data-tab="batteries">
              ${[15,30,50,100].map(n => `<option value="${n}" ${this._batteryPageSize === n ? 'selected' : ''}>${n} ${this._t('itemsPerPage')}</option>`).join('')}
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
                    <div style="font-size: 20px; margin-bottom: 6px;">🔋</div>
                    <div style="font-size: 13px; font-weight: 600; color: var(--tc);">${battery.name}</div>
                    <div class="battery-bar">
                      <div class="battery-fill" style="width: ${battery.level}%; background: ${color};"></div>
                    </div>
                    <div style="font-size: 16px; font-weight: 700; color: ${color};">${battery.level}%</div>
                    <div class="battery-label">${this._t('lastChanged')}: ${new Date(battery.lastChanged).toLocaleDateString()}</div>
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

    // Network Tab
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
      <div class="tab-content ${this._activeTab === "network" ? "active" : ""}">
        <div class="controls">
          <div class="control-group">
            <select class="page-size-selector" data-tab="network">
              ${[15,30,50,100].map(n => `<option value="${n}" ${this._networkPageSize === n ? 'selected' : ''}>${n} ${this._t('itemsPerPage')}</option>`).join('')}
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
        html += `<div class="section-title">${device.protocol} Network</div>`;
      }
      const color = this._getSignalColor(device.rssi);
      const strength = Math.max(0, Math.min(100, ((device.rssi + 100) / 50) * 100));
      html += `
        <div style="margin-bottom: 8px;">
          <div style="font-size: 13px; font-weight: 600; margin-bottom: 4px; color: var(--tc);">${device.name}</div>
          <div class="rssi-bar">
            <div class="rssi-value" style="color: ${color};">${device.rssi} dBm</div>
            <div class="rssi-indicator">
              <div class="rssi-fill" style="width: ${strength}%; background: ${color};"></div>
            </div>
          </div>
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

    // Alerts Tab
    html += `
      <div class="tab-content ${this._activeTab === "alerts" ? "active" : ""}">
        <div class="stats">
          ${this._t('activeAlerts')}: ${this._alerts.length}
        </div>
    `;

    if (this._alerts.length === 0) {
      html += `<div class="empty-state">${this._t('noActiveAlerts')}</div>`;
    } else {
      const alertTotalPages = Math.ceil(this._alerts.length / this._alertPageSize) || 1;
      if (this._alertPage > alertTotalPages) this._alertPage = 1;
      const alertStart = (this._alertPage - 1) * this._alertPageSize;
      const alertEnd = alertStart + this._alertPageSize;
      const alertsPage = this._alerts.slice(alertStart, alertEnd);
      alertsPage.forEach((alert) => {
        const alertId = `${alert.type}_${alert.id}`;
        html += `
          <div class="alert-item alert-${alert.severity}">
            <div class="alert-text">
              <div class="alert-type">${alert.type.toUpperCase().replace(/_/g, " ")}</div>
              <div>${alert.name}</div>
              <div class="alert-time">${new Date(alert.timestamp).toLocaleString()}</div>
            </div>
            <div class="alert-actions">
              <button class="alert-dismiss" data-alert-id="${alertId}">${this._t('dismiss')}</button>
            </div>
          </div>
        `;
      });
      if (alertTotalPages > 1) {
        html += `<div class="pagination">
          <button class="pagination-btn alert-prev" ${this._alertPage === 1 ? 'disabled' : ''}>${this._t('previous')}</button>
          <span class="pagination-info">${this._t('page')} ${this._alertPage} ${this._t('of')} ${alertTotalPages}</span>
          <button class="pagination-btn alert-next" ${this._alertPage === alertTotalPages ? 'disabled' : ''}>${this._t('next')}</button>
        </div>`;
      }
    }

    // Alert History with pagination
    const historyTotalPages = Math.ceil(this._alertHistory.length / this._historyPageSize) || 1;
    if (this._historyPage > historyTotalPages) this._historyPage = 1;
    const histStart = (this._historyPage - 1) * this._historyPageSize;
    const histEnd = histStart + this._historyPageSize;
    const historyPage = this._alertHistory.slice(histStart, histEnd);

    html += `
      <div class="section-title">${this._t('alertHistory')} (${this._alertHistory.length})</div>
      ${historyPage
        .map(
          (alert) =>
            `<div style="padding: 8px 12px; border-left: 3px solid; border-color: ${alert.severity === "critical" ? "var(--ec)" : alert.severity === "warning" ? "var(--wc)" : "var(--pc)"}; margin-bottom: 4px; border-radius: var(--radius-xs); background: var(--bg);">
              <div style="font-size: 12px; font-weight: 500; color: var(--tc);">${alert.type.replace(/_/g, ' ')} — ${alert.name}</div>
              <div style="font-size: 11px; color: var(--ts); margin-top: 2px;">${new Date(alert.timestamp).toLocaleString()}</div>
            </div>`
        )
        .join("")}
    ${historyTotalPages > 1 ? `<div class="pagination">
      <button class="pagination-btn hist-prev" ${this._historyPage === 1 ? 'disabled' : ''}>${this._t('previous')}</button>
      <span class="pagination-info">${this._t('page')} ${this._historyPage} ${this._t('of')} ${historyTotalPages}</span>
      <button class="pagination-btn hist-next" ${this._historyPage === historyTotalPages ? 'disabled' : ''}>${this._t('next')}</button>
    </div>` : ''}
    </div>
    </div>
    `;

    this.shadowRoot.innerHTML = `<style>${style}</style>${html}`;
    this._attachEventListeners();
    this._drawSignalChart();
  }

  _attachEventListeners() {
    const tabs = this.shadowRoot.querySelectorAll(".tab");
    tabs.forEach((tab) => {
      tab.addEventListener("click", (e) => {
        this._activeTab = e.target.dataset.tab;
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

    // Alert pagination
    const alertPrev = this.shadowRoot.querySelector(".alert-prev");
    if (alertPrev) {
      alertPrev.addEventListener("click", () => {
        if (this._alertPage > 1) { this._alertPage--; this._render(); }
      });
    }
    const alertNext = this.shadowRoot.querySelector(".alert-next");
    if (alertNext) {
      alertNext.addEventListener("click", () => {
        const tp = Math.ceil(this._alerts.length / this._alertPageSize) || 1;
        if (this._alertPage < tp) { this._alertPage++; this._render(); }
      });
    }

    // History pagination
    const histPrev = this.shadowRoot.querySelector(".hist-prev");
    if (histPrev) {
      histPrev.addEventListener("click", () => {
        if (this._historyPage > 1) { this._historyPage--; this._render(); }
      });
    }
    const histNext = this.shadowRoot.querySelector(".hist-next");
    if (histNext) {
      histNext.addEventListener("click", () => {
        const tp = Math.ceil(this._alertHistory.length / this._historyPageSize) || 1;
        if (this._historyPage < tp) { this._historyPage++; this._render(); }
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
  }

    _drawSignalChart() {
    const canvas = this.shadowRoot.querySelector("#signal-chart");
    if (!canvas) return;

    // Ensure Chart.js is loaded
    if (!window.Chart) {
      this._loadChartJS().then(() => this._drawSignalChartWithChartJS());
      return;
    }

    this._drawSignalChartWithChartJS();
  }

  _drawSignalChartWithChartJS() {
    const canvas = this.shadowRoot.querySelector("#signal-chart");
    if (!canvas) return;

    const networks = this._getNetworkDevices();
    const allDevices = [];
    Object.keys(networks).forEach((protocol) => {
      networks[protocol].forEach((device) => {
        allDevices.push({ rssi: device.rssi, protocol, name: device.name });
      });
    });

    if (allDevices.length === 0) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    // Create histogram bins
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

    // Prepare chart data
    const labels = [];
    for (let i = 0; i < bins; i++) {
      const rssi = minRssi + i * binWidth;
      labels.push(`${rssi.toFixed(0)}`);
    }

    const chartConfig = {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: this._t("signalStrengthDist"),
            data: histogram,
            backgroundColor: "#3B82F6",
            borderColor: "#1E40AF",
            borderWidth: 1,
            borderRadius: 4,
            barPercentage: 0.8,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "x",
        plugins: {
          legend: {
            display: true,
            labels: {
              font: { family: "Inter, sans-serif", size: 12 },
              color: "#64748B",
              padding: 15
            }
          },
          tooltip: {
            backgroundColor: "rgba(30, 41, 59, 0.8)",
            padding: 8,
            titleFont: { family: "Inter, sans-serif", size: 12 },
            bodyFont: { family: "Inter, sans-serif", size: 12 },
            cornerRadius: 4,
            displayColors: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              font: { family: "Inter, sans-serif", size: 11 },
              color: "#64748B"
            },
            grid: {
              color: "#E2E8F0",
              drawBorder: false
            }
          },
          x: {
            ticks: {
              font: { family: "Inter, sans-serif", size: 11 },
              color: "#64748B"
            },
            grid: {
              display: false
            }
          }
        }
      }
    };

    // Destroy existing chart if it exists
    if (this._charts.signal) {
      this._charts.signal.destroy();
    }

    // Create new chart
    const ctx = canvas.getContext("2d");
    this._charts.signal = new window.Chart(ctx, chartConfig);
  }

  _loadChartJS() {
    // Return cached promise if already loading/loaded
    if (this._chartJSPromise) {
      return this._chartJSPromise;
    }

    // Check if already loaded
    if (window.Chart) {
      this._chartJSPromise = Promise.resolve();
      return this._chartJSPromise;
    }

    // Load Chart.js from CDN
    this._chartJSPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js";
      script.async = true;
      script.onload = () => {
        // Give Chart.js a moment to initialize
        setTimeout(() => resolve(), 100);
      };
      script.onerror = () => {
        reject(new Error("Failed to load Chart.js"));
      };
      document.head.appendChild(script);
    });

    return this._chartJSPromise;
  }

  static getConfigElement() {
    const element = document.createElement("ha-device-health-editor");
    return element;
  }

  static getStubConfig() {
    return {
      type: "custom:ha-device-health",
      title: "Device Health",
      battery_warning: 30,
      battery_critical: 10,
      offline_alert_minutes: 60,
    };
  }
}

customElements.define("ha-device-health", HADeviceHealth);

// Auto-load HA Tools Panel (if not already registered)
if (!customElements.get('ha-tools-panel')) {
  const _currentScript = document.currentScript?.src || '';
  const _baseUrl = _currentScript.substring(0, _currentScript.lastIndexOf('/') + 1);
  if (_baseUrl) {
    const _s = document.createElement('script');
    _s.src = _baseUrl + 'ha-tools-panel.js';
    document.head.appendChild(_s);
  }
  disconnectedCallback() {
    // Clean up Chart.js instances when component is removed
    Object.keys(this._charts).forEach((key) => {
      if (this._charts[key]) {
        this._charts[key].destroy();
        delete this._charts[key];
      }
    });
  }

}
