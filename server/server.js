const express = require("express");
const cors = require("cors");
const mqtt = require("mqtt");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.set("trust proxy", true);
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 3000);
const MQTT_URL = process.env.MQTT_URL || "mqtt://localhost:1883";
const MQTT_TOPIC_PREFIX = process.env.MQTT_TOPIC_PREFIX || "kidguard";
const DEFAULT_DEVICE_ID = process.env.DEFAULT_DEVICE_ID || "KB-2024-0123";

const devices = new Map();

function nowTimeLabel() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function etaFromBattery(batteryPct) {
  if (batteryPct >= 80) return "~3 days remaining";
  if (batteryPct >= 50) return "~2 days remaining";
  if (batteryPct >= 20) return "~1 day remaining";
  return "~few hours remaining";
}

function defaultDeviceState(deviceId) {
  return {
    childName: "Emma Wilson",
    batteryPct: 85,
    batteryEta: "~3 days remaining",
    statusText: "Safe",
    statusType: "safe",
    distanceKm: 2.3,
    location: {
      lat: 10.938,
      lng: 76.7449,
      address: "Karunya Institute of Technology and Sciences, Karunya Nagar",
      city: "Coimbatore, Tamil Nadu"
    },
    updatedAt: nowTimeLabel(),
    settings: {
      childName: "Emma Wilson",
      deviceId,
      safeZoneRadius: 100,
      safeZoneLat: 10.938,
      safeZoneLng: 76.7449,
      sosAlerts: true,
      geofencingAlerts: true,
      batteryAlerts: true,
      nightMode: false
    },
    geofence: {
      lat: 10.938,
      lng: 76.7449,
      radius: 100,
      isConfigured: false
    },
    parentAlertPending: false,
    parentAlertMessage: "Parent requested check-in",
    lastEmergencyEventType: "",
    lastEmergencyAtMs: 0,
    alerts: [],
    history: []
  };
}

function getDevice(deviceId) {
  if (!devices.has(deviceId)) {
    devices.set(deviceId, defaultDeviceState(deviceId));
  }
  return devices.get(deviceId);
}

function addHistoryEntry(device, location) {
  const entry = {
    id: `h-${Date.now()}`,
    title: location.label || "Tracked Location",
    address: location.address || "Unknown address",
    timeLabel: `${nowTimeLabel()} - Today`,
    lat: Number(location.lat),
    lng: Number(location.lng)
  };
  device.history.unshift(entry);
  if (device.history.length > 200) {
    device.history.length = 200;
  }
}

function addAlert(device, alert) {
  const item = {
    id: alert.id || `a-${Date.now()}`,
    title: alert.title || "Alert",
    message: alert.message || "",
    time: alert.time || nowTimeLabel(),
    status: alert.status === "resolved" ? "resolved" : "active",
    lat: Number(alert.lat || device.location.lat || 0),
    lng: Number(alert.lng || device.location.lng || 0)
  };
  device.alerts.unshift(item);
  if (device.alerts.length > 200) {
    device.alerts.length = 200;
  }
}

function syncSettingsFromGeofence(device) {
  device.settings.safeZoneRadius = device.geofence.radius;
  device.settings.safeZoneLat = device.geofence.lat;
  device.settings.safeZoneLng = device.geofence.lng;
}

function configureGeofence(device, lat, lng, radius, isConfigured) {
  if (!Number.isNaN(lat)) {
    device.geofence.lat = lat;
  }
  if (!Number.isNaN(lng)) {
    device.geofence.lng = lng;
  }
  if (!Number.isNaN(radius)) {
    device.geofence.radius = radius;
  }
  if (typeof isConfigured === "boolean") {
    device.geofence.isConfigured = isConfigured;
  }
  syncSettingsFromGeofence(device);
}

function addCompatibilityEmergencyAlert(device, eventType) {
  const normalizedType = String(eventType || "EMERGENCY").toUpperCase();
  const nowMs = Date.now();
  if (device.lastEmergencyEventType === normalizedType && nowMs - device.lastEmergencyAtMs < 60000) {
    return;
  }

  const titles = {
    EMERGENCY: "Emergency Mode Active",
    SOS: "SOS Button Activated",
    GEOFENCE: "Left Safe Zone",
    FALL: "Fall Detected"
  };

  addAlert(device, {
    title: titles[normalizedType] || "Emergency Alert",
    message: `${device.location.address || "Unknown location"} • ${device.location.city || "Unknown city"}`,
    status: "active",
    lat: device.location.lat,
    lng: device.location.lng
  });

  device.lastEmergencyEventType = normalizedType;
  device.lastEmergencyAtMs = nowMs;
}

function getCompatDeviceId(req) {
  const raw = req.query.deviceId || req.query.id || DEFAULT_DEVICE_ID;
  return String(raw).trim() || DEFAULT_DEVICE_ID;
}

function applyTelemetry(deviceId, payload) {
  const device = getDevice(deviceId);
  const lat = Number(payload.lat);
  const lng = Number(payload.lng);
  const batteryPct = Number(payload.batteryPct);
  const distanceKm = Number(payload.distanceKm);

  if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
    device.location.lat = lat;
    device.location.lng = lng;
    if (!device.geofence.isConfigured) {
      configureGeofence(device, lat, lng, device.geofence.radius, false);
    }
  }
  if (typeof payload.address === "string") {
    device.location.address = payload.address;
  }
  if (typeof payload.city === "string") {
    device.location.city = payload.city;
  }
  if (!Number.isNaN(batteryPct)) {
    device.batteryPct = Math.max(0, Math.min(100, batteryPct));
    device.batteryEta = etaFromBattery(device.batteryPct);
  }
  if (!Number.isNaN(distanceKm)) {
    device.distanceKm = distanceKm;
  }
  if (typeof payload.childName === "string" && payload.childName.trim()) {
    device.childName = payload.childName.trim();
    device.settings.childName = payload.childName.trim();
  }
  if (typeof payload.statusText === "string") {
    device.statusText = payload.statusText;
  }
  if (["safe", "warning", "danger"].includes(payload.statusType)) {
    device.statusType = payload.statusType;
  }

  device.updatedAt = nowTimeLabel();

  addHistoryEntry(device, {
    label: payload.locationLabel,
    address: device.location.address,
    lat: device.location.lat,
    lng: device.location.lng
  });
}

function applyAlert(deviceId, payload) {
  const device = getDevice(deviceId);
  addAlert(device, payload);
}

const mqttClient = mqtt.connect(MQTT_URL, {
  username: process.env.MQTT_USERNAME || undefined,
  password: process.env.MQTT_PASSWORD || undefined
});

mqttClient.on("connect", () => {
  const wildcardTopic = `${MQTT_TOPIC_PREFIX}/+/+`;
  mqttClient.subscribe(wildcardTopic, (err) => {
    if (err) {
      console.error("MQTT subscribe error:", err.message);
      return;
    }
    console.log(`MQTT connected, subscribed to ${wildcardTopic}`);
  });
});

mqttClient.on("error", (err) => {
  console.error("MQTT error:", err.message);
});

mqttClient.on("message", (topic, messageBuffer) => {
  try {
    const topicParts = topic.split("/");
    // Expected: kidguard/<deviceId>/telemetry OR kidguard/<deviceId>/alerts
    if (topicParts.length < 3) return;
    const [, deviceId, eventType] = topicParts;

    const payload = JSON.parse(messageBuffer.toString("utf8"));
    if (eventType === "telemetry") {
      applyTelemetry(deviceId, payload);
    } else if (eventType === "alerts") {
      applyAlert(deviceId, payload);
    }
  } catch (error) {
    console.error("MQTT message parse error:", error.message);
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

app.get("/update.php", (req, res) => {
  const deviceId = getCompatDeviceId(req);
  const eventType = String(req.query.event || "NORMAL").trim().toUpperCase();
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const batteryPct = Number(req.query.batteryPct);
  const distanceKm = Number(req.query.distanceKm);
  const statusType = eventType === "NORMAL" ? "safe" : "danger";
  const statusText = eventType === "NORMAL" ? "Safe" : eventType.replace(/_/g, " ");

  applyTelemetry(deviceId, {
    lat,
    lng,
    batteryPct,
    distanceKm,
    childName: req.query.childName,
    address: req.query.address,
    city: req.query.city,
    locationLabel: req.query.label || req.query.locationLabel || "Tracked Location",
    statusType,
    statusText
  });

  if (eventType !== "NORMAL") {
    const device = getDevice(deviceId);
    addCompatibilityEmergencyAlert(device, eventType);
  }

  res.type("text/plain").send("OK");
});

app.get("/getGeofence.php", (req, res) => {
  const device = getDevice(getCompatDeviceId(req));
  const lat = Number(device.geofence.lat || 0).toFixed(6);
  const lng = Number(device.geofence.lng || 0).toFixed(6);
  const radius = Number(device.geofence.radius || 100).toFixed(0);
  res.type("text/plain").send(`LAT=${lat}\nLNG=${lng}\nRADIUS=${radius}`);
});

app.get("/setGeofence.php", (req, res) => {
  const device = getDevice(getCompatDeviceId(req));
  configureGeofence(
    device,
    Number(req.query.lat),
    Number(req.query.lng),
    Number(req.query.radius),
    true
  );
  res.type("text/plain").send("OK");
});

app.get("/getAlert.php", (req, res) => {
  const device = getDevice(getCompatDeviceId(req));
  const shouldAlert = device.parentAlertPending ? "1" : "0";
  device.parentAlertPending = false;
  res.type("text/plain").send(`ALERT=${shouldAlert}`);
});

app.get("/triggerAlert.php", (req, res) => {
  const device = getDevice(getCompatDeviceId(req));
  const value = String(req.query.value || "1");
  device.parentAlertPending = value === "1";
  if (typeof req.query.message === "string" && req.query.message.trim()) {
    device.parentAlertMessage = req.query.message.trim();
  }
  res.type("text/plain").send(`ALERT=${device.parentAlertPending ? "1" : "0"}`);
});

app.get("/api/devices/:deviceId/state", (req, res) => {
  const device = getDevice(req.params.deviceId);
  res.json({
    childName: device.childName,
    batteryPct: device.batteryPct,
    batteryEta: device.batteryEta,
    statusText: device.statusText,
    statusType: device.statusType,
    distanceKm: device.distanceKm,
    location: device.location,
    updatedAt: device.updatedAt
  });
});

app.get("/api/devices/:deviceId/alerts", (req, res) => {
  const device = getDevice(req.params.deviceId);
  res.json(device.alerts);
});

app.post("/api/devices/:deviceId/alerts/:alertId/resolve", (req, res) => {
  const device = getDevice(req.params.deviceId);
  const found = device.alerts.find((a) => a.id === req.params.alertId);
  if (found) {
    found.status = "resolved";
  }
  res.json({ ok: true });
});

app.get("/api/devices/:deviceId/history", (req, res) => {
  const device = getDevice(req.params.deviceId);
  const range = String(req.query.range || "Today");
  // Range filtering can be expanded; currently returns latest entries.
  void range;
  res.json(device.history);
});

app.get("/api/devices/:deviceId/settings", (req, res) => {
  const device = getDevice(req.params.deviceId);
  syncSettingsFromGeofence(device);
  res.json(device.settings);
});

app.put("/api/devices/:deviceId/settings", (req, res) => {
  const device = getDevice(req.params.deviceId);
  const body = req.body || {};

  device.settings = {
    ...device.settings,
    ...body,
    deviceId: body.deviceId || req.params.deviceId
  };
  if (typeof body.childName === "string" && body.childName.trim()) {
    device.childName = body.childName.trim();
  }
  configureGeofence(
    device,
    Number(body.safeZoneLat),
    Number(body.safeZoneLng),
    Number(body.safeZoneRadius),
    !Number.isNaN(Number(body.safeZoneLat)) && !Number.isNaN(Number(body.safeZoneLng))
  );
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`KidGuard IoT API listening on http://localhost:${PORT}/api`);
});
