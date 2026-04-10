# KidGuard IoT API Contract

Frontend expects these REST endpoints under `API_BASE_URL` (default: `https://kidguard-backend.onrender.com/api`).

- `GET /devices/:deviceId/state`
  - Returns:
    - `childName` (string)
    - `batteryPct` (number)
    - `batteryEta` (string)
    - `statusText` (string)
    - `statusType` (`safe` | `warning` | `danger`)
    - `distanceKm` (number)
    - `location` object: `lat`, `lng`, `address`, `city`
    - `updatedAt` (string)

- `GET /devices/:deviceId/alerts`
  - Returns array of alerts:
    - `id`, `title`, `message`, `time`, `status` (`active` | `resolved`), `lat`, `lng`

- `POST /devices/:deviceId/alerts/:alertId/resolve`
  - Marks alert as resolved.

- `GET /devices/:deviceId/history?range=Today|Yesterday|This%20Week`
  - Returns array:
    - `id`, `title`, `address`, `timeLabel`, `lat`, `lng`

- `GET /devices/:deviceId/settings`
  - Returns:
    - `childName`, `deviceId`, `safeZoneRadius`, `sosAlerts`, `geofencingAlerts`, `batteryAlerts`, `nightMode`

- `PUT /devices/:deviceId/settings`
  - Accepts the same settings payload as above plus optional `apiBaseUrl`.

## Notes

- If API is unavailable, frontend currently falls back to demo data (`useDemoOnError: true` in `iot-config.js`).
- Change API base URL from `Device Settings` page (`IoT API Base URL` field).
- Device ID is persisted in browser storage and shared across pages.
