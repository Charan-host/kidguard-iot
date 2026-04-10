# KidGuard IoT Backend (Real Device Bridge)

This server connects your real IoT device data (via MQTT) to the website API endpoints.

## 1. Install and run

```bash
cd server
npm install
copy .env.example .env
npm start
```

Server API base URL for local development: `http://localhost:3000/api`

When the frontend is deployed, set `Device Settings -> IoT API Base URL` to your live backend URL instead of `localhost`.

## 2. MQTT topics from device

Publish telemetry:

- Topic: `kidguard/<deviceId>/telemetry`
- Example payload:

```json
{
  "childName": "Emma Wilson",
  "lat": 12.9716,
  "lng": 77.5946,
  "address": "MG Road",
  "city": "Bengaluru",
  "batteryPct": 72,
  "distanceKm": 1.8,
  "statusText": "Safe",
  "statusType": "safe",
  "locationLabel": "School"
}
```

Publish alert:

- Topic: `kidguard/<deviceId>/alerts`
- Example payload:

```json
{
  "id": "alert-1001",
  "title": "SOS Button Activated",
  "message": "Near school gate",
  "time": "10:45 AM",
  "status": "active",
  "lat": 12.972,
  "lng": 77.596
}
```

## 3. Device example (pseudo)

From ESP32/Arduino loop:

1. read GPS (`lat`, `lng`)
2. read battery %
3. publish JSON to `kidguard/KB-2024-0123/telemetry`
4. if SOS pressed, publish JSON to `kidguard/KB-2024-0123/alerts`

## 4. API endpoints exposed

- `GET /api/devices/:deviceId/state`
- `GET /api/devices/:deviceId/alerts`
- `POST /api/devices/:deviceId/alerts/:alertId/resolve`
- `GET /api/devices/:deviceId/history?range=Today`
- `GET /api/devices/:deviceId/settings`
- `PUT /api/devices/:deviceId/settings`

These match your frontend JS files.
