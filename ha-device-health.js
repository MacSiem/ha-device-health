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
    this._update();
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
    const colors = { online: "#4CAF50", offline: "#F44336", unavailable: "#9E9E9E" };
    return colors[status] || "#999";
  }

  _getBatteryColor(level) {
    if (level < 10) return "#FF1744";
    if (level < 30) return "#FF6D00";
    return "#4CAF50";
  }

  _getSignalColor(rssi) {
    if (rssi > -50) return "#4CAF50";
    if (rssi > -70) return "#8BC34A";
    if (rssi > -80) return "#FFC107";
    return "#F44336";
  }

  _render() {
    const style = `
      :host {
        --primary-color: var(--primary-color, #03a9f4);
        --primary-text-color: var(--primary-text-color, #212121);
        --secondary-text-color: var(--secondary-text-color, #727272);
        --divider-color: var(--divider-color, #e0e0e0);
        --error-color: var(--error-color, #f44336);
      }

      * {
        box-sizing: border-box;
      }

      .card {
        background: var(--ha-card-background, white);
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        padding: 16px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }

      .card-header {
        font-size: 24px;
        font-weight: 500;
        margin-bottom: 16px;
        color: var(--primary-text-color);
      }

      .tabs {
        display: flex;
        gap: 8px;
        border-bottom: 2px solid var(--divider-color);
        margin-bottom: 16px;
      }

      .tab {
        padding: 12px 16px;
        cursor: pointer;
        color: var(--secondary-text-color);
        border: none;
        background: none;
        font-size: 14px;
        font-weight: 500;
        border-bottom: 3px solid transparent;
        transition: all 0.3s;
      }

      .tab.active {
        color: var(--primary-color);
        border-bottom-color: var(--primary-color);
      }

      .tab:hover {
        color: var(--primary-text-color);
      }

      .tab-content {
        display: none;
      }

      .tab-content.active {
        display: block;
      }

      .controls {
        display: flex;
        gap: 12px;
        margin-bottom: 16px;
        flex-wrap: wrap;
      }

      .control-group {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      input[type="text"], select {
        padding: 8px 12px;
        border: 1px solid var(--divider-color);
        border-radius: 4px;
        font-size: 14px;
        background: var(--ha-card-background, white);
        color: var(--primary-text-color);
      }

      input[type="text"]::placeholder {
        color: var(--secondary-text-color);
      }

      button {
        padding: 8px 12px;
        border: 1px solid var(--divider-color);
        background: var(--ha-card-background, white);
        color: var(--primary-text-color);
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      }

      button:hover {
        background: var(--divider-color);
      }

      button.active {
        background: var(--primary-color);
        color: white;
        border-color: var(--primary-color);
      }

      .status-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        color: white;
      }

      .status-online {
        background: #4CAF50;
      }

      .status-offline {
        background: #F44336;
      }

      .status-unavailable {
        background: #9E9E9E;
      }

      .device-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 16px;
      }

      .device-table th {
        text-align: left;
        padding: 12px;
        border-bottom: 2px solid var(--divider-color);
        font-weight: 600;
        color: var(--primary-text-color);
        background: var(--divider-color);
        cursor: pointer;
        user-select: none;
      }

      .device-table th:hover {
        background: #e0e0e0;
      }

      .device-table td {
        padding: 12px;
        border-bottom: 1px solid var(--divider-color);
        color: var(--primary-text-color);
      }

      .device-table tr:hover {
        background: var(--divider-color);
      }

      .stats {
        padding: 12px;
        background: var(--divider-color);
        border-radius: 4px;
        margin-bottom: 16px;
        font-size: 14px;
      }

      .battery-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 16px;
        margin-bottom: 16px;
      }

      .battery-card {
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        padding: 12px;
        text-align: center;
        transition: all 0.2s;
      }

      .battery-card:hover {
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      }

      .battery-bar {
        width: 100%;
        height: 20px;
        background: var(--divider-color);
        border-radius: 10px;
        overflow: hidden;
        margin: 8px 0;
      }

      .battery-fill {
        height: 100%;
        transition: all 0.3s;
      }

      .battery-label {
        font-size: 12px;
        color: var(--secondary-text-color);
        margin-top: 8px;
      }

      .network-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 12px;
        margin-bottom: 16px;
      }

      .network-stat {
        border: 1px solid var(--divider-color);
        border-radius: 4px;
        padding: 12px;
        text-align: center;
      }

      .network-stat-value {
        font-size: 24px;
        font-weight: bold;
        color: var(--primary-color);
      }

      .network-stat-label {
        font-size: 12px;
        color: var(--secondary-text-color);
        margin-top: 4px;
      }

      .rssi-bar {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 8px 0;
        padding: 8px;
        background: var(--divider-color);
        border-radius: 4px;
      }

      .rssi-value {
        min-width: 50px;
        font-weight: 600;
      }

      .rssi-indicator {
        width: 100%;
        height: 8px;
        background: var(--divider-color);
        border-radius: 4px;
        overflow: hidden;
      }

      .rssi-fill {
        height: 100%;
        transition: all 0.3s;
      }

      .alert-item {
        padding: 12px;
        border-left: 4px solid;
        border-radius: 4px;
        margin-bottom: 8px;
        background: var(--divider-color);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .alert-critical {
        border-color: #F44336;
      }

      .alert-warning {
        border-color: #FFC107;
      }

      .alert-info {
        border-color: #2196F3;
      }

      .alert-text {
        flex: 1;
      }

      .alert-type {
        font-weight: 600;
        font-size: 12px;
        margin-bottom: 4px;
      }

      .alert-time {
        font-size: 12px;
        color: var(--secondary-text-color);
      }

      .alert-actions {
        display: flex;
        gap: 8px;
      }

      .alert-dismiss {
        padding: 4px 8px;
        font-size: 12px;
        background: var(--error-color);
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }

      .alert-dismiss:hover {
        opacity: 0.8;
      }

      canvas {
        width: 100%;
        height: 300px;
        border: 1px solid var(--divider-color);
        border-radius: 4px;
        margin-bottom: 16px;
      }

      .empty-state {
        text-align: center;
        padding: 40px 16px;
        color: var(--secondary-text-color);
      }

      .health-score {
        font-size: 48px;
        font-weight: bold;
        color: var(--primary-color);
        text-align: center;
        margin: 20px 0;
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
          <button class="tab ${this._activeTab === "devices" ? "active" : ""}" data-tab="devices">Devices</button>
          <button class="tab ${this._activeTab === "batteries" ? "active" : ""}" data-tab="batteries">Batteries</button>
          <button class="tab ${this._activeTab === "network" ? "active" : ""}" data-tab="network">Network</button>
          <button class="tab ${this._activeTab === "alerts" ? "active" : ""}" data-tab="alerts">Alerts</button>
        </div>
    `;

    // Devices Tab
    html += `
      <div class="tab-content ${this._activeTab === "devices" ? "active" : ""}">
        <div class="controls">
          <div class="control-group">
            <input type="text" class="search-box" placeholder="Search devices..." value="${this._searchQuery}">
          </div>
          <div class="control-group">
            <select class="filter-status">
              <option value="all">All</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>
          <div class="control-group">
            <button class="toggle-grouping">Toggle Grouping</button>
          </div>
        </div>
        <div class="stats">
          Total Devices: ${devices.length} | Online: ${online} | Availability: ${availability}%
        </div>
        <table class="device-table">
          <thead>
            <tr>
              <th data-sort="name">Name</th>
              <th>Type</th>
              <th>Status</th>
              <th>Last Seen</th>
              <th>Uptime</th>
            </tr>
          </thead>
          <tbody>
            ${devices
              .filter((d) => (this._deviceFilter === "all" || d.status === this._deviceFilter) && d.name.toLowerCase().includes(this._searchQuery.toLowerCase()))
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
      </div>
    `;

    // Batteries Tab
    const batteryDevicesByHealth = [...batteries].sort((a, b) => {
      if (this._batterySortBy === "level") return a.level - b.level;
      if (this._batterySortBy === "name") return a.name.localeCompare(b.name);
      return 0;
    });

    html += `
      <div class="tab-content ${this._activeTab === "batteries" ? "active" : ""}">
        <div class="controls">
          <div class="control-group">
            <select class="battery-sort">
              <option value="level">Level (Worst First)</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>
        <div class="stats">
          Battery Health Summary: ${batteryNeedingAttention} device(s) need attention
        </div>
        <div class="battery-grid">
          ${batteryDevicesByHealth
            .map(
              (battery) => {
                const color = this._getBatteryColor(battery.level);
                const animation = battery.level < 10 ? "animation: pulse 1s infinite;" : "";
                return `
                  <div class="battery-card">
                    <div style="font-size: 24px; margin-bottom: 8px;">🔋</div>
                    <div style="font-size: 14px; font-weight: 600; color: var(--primary-text-color);">${battery.name}</div>
                    <div class="battery-bar">
                      <div class="battery-fill" style="width: ${battery.level}%; background: ${color}; ${animation}"></div>
                    </div>
                    <div style="font-size: 18px; font-weight: bold; color: ${color};">${battery.level}%</div>
                    <div class="battery-label">Last changed: ${new Date(battery.lastChanged).toLocaleDateString()}</div>
                  </div>
                `;
              }
            )
            .join("")}
        </div>
      </div>
    `;

    // Network Tab
    const protocolCounts = {};
    let totalDevices = 0;
    Object.keys(networks).forEach((protocol) => {
      protocolCounts[protocol] = networks[protocol].length;
      totalDevices += networks[protocol].length;
    });

    html += `
      <div class="tab-content ${this._activeTab === "network" ? "active" : ""}">
        <div class="network-stats">
    `;

    Object.keys(protocolCounts).forEach((protocol) => {
      html += `
        <div class="network-stat">
          <div class="network-stat-value">${protocolCounts[protocol]}</div>
          <div class="network-stat-label">${protocol} Devices</div>
        </div>
      `;
    });

    html += `
        </div>
        <canvas id="signal-chart" width="400" height="300"></canvas>
    `;

    Object.keys(networks).forEach((protocol) => {
      html += `
        <h3 style="margin-top: 24px; color: var(--primary-text-color);">${protocol} Network</h3>
      `;
      networks[protocol].forEach((device) => {
        const color = this._getSignalColor(device.rssi);
        const strength = Math.max(0, Math.min(100, ((device.rssi + 100) / 50) * 100));
        html += `
          <div style="margin-bottom: 12px;">
            <div style="font-size: 14px; font-weight: 600; margin-bottom: 4px;">${device.name}</div>
            <div class="rssi-bar">
              <div class="rssi-value" style="color: ${color};">${device.rssi} dBm</div>
              <div class="rssi-indicator">
                <div class="rssi-fill" style="width: ${strength}%; background: ${color};"></div>
              </div>
            </div>
          </div>
        `;
      });
    });

    html += `
      </div>
    `;

    // Alerts Tab
    html += `
      <div class="tab-content ${this._activeTab === "alerts" ? "active" : ""}">
        <div class="stats">
          Active Alerts: ${this._alerts.length}
        </div>
    `;

    if (this._alerts.length === 0) {
      html += `<div class="empty-state">No active alerts</div>`;
    } else {
      this._alerts.forEach((alert) => {
        const alertId = `${alert.type}_${alert.id}`;
        html += `
          <div class="alert-item alert-${alert.severity}">
            <div class="alert-text">
              <div class="alert-type">${alert.type.toUpperCase().replace(/_/g, " ")}</div>
              <div>${alert.name}</div>
              <div class="alert-time">${new Date(alert.timestamp).toLocaleString()}</div>
            </div>
            <div class="alert-actions">
              <button class="alert-dismiss" data-alert-id="${alertId}">Dismiss</button>
            </div>
          </div>
        `;
      });
    }

    html += `
      <h3 style="margin-top: 24px; color: var(--primary-text-color);">Alert History (Last 20)</h3>
      ${this._alertHistory
        .slice(0, 20)
        .map(
          (alert) =>
            `<div style="padding: 8px; border-left: 3px solid; border-color: ${alert.severity === "critical" ? "#F44336" : alert.severity === "warning" ? "#FFC107" : "#2196F3"}; margin-bottom: 4px;">
              <small>${alert.type} - ${alert.name}</small><br>
              <tiny style="color: var(--secondary-text-color);">${new Date(alert.timestamp).toLocaleString()}</tiny>
            </div>`
        )
        .join("")}
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
    ctx.strokeStyle = "#ccc";
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
    ctx.fillStyle = "#03a9f4";
    histogram.forEach((count, i) => {
      const barHeight = (count / maxCount) * chartHeight;
      const x = padding + i * barWidth;
      const y = height - padding - barHeight;
      ctx.fillRect(x, y, barWidth * 0.9, barHeight);
    });

    // Draw labels
    ctx.fillStyle = "#666";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    for (let i = 0; i <= bins; i++) {
      const rssi = minRssi + i * binWidth;
      const x = padding + i * barWidth;
      ctx.fillText(rssi.toFixed(0), x, height - padding + 20);
    }

    ctx.textAlign = "left";
    ctx.fillText("Signal Strength Distribution (dBm)", padding, padding - 10);
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
