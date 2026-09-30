# EkshitaScreen — REST & WebSocket API Specification

All endpoints are hosted locally under `/api/*`.

---

## 1. System Health

### `GET /api/health`
Unauthenticated health probe used by Android devices and dashboard to verify local server availability.

**Response `200 OK`**:
```json
{
  "status": "ok",
  "service": "screencast",
  "mode": "local",
  "timestamp": "2026-09-29T15:20:00.000Z",
  "uptime": 3600
}
```

---

## 2. Authentication

### `POST /api/auth/login`
Dashboard administrator or operator login.
- **Request Body**: `{ "email": "admin@ekshitascreen.com", "password": "Forever@123" }`
- **Response**: `{ "token": "jwt_token...", "user": { "id": "...", "name": "...", "role": "ADMIN" } }`

### `GET /api/auth/me`
Requires `Bearer <JWT>`. Returns the authenticated user session.

---

## 3. Device Activation

### `POST /api/device/activation/request`
Called by Android Player on initial boot.
- **Request Body**:
  ```json
  {
    "deviceUid": "SC-TV-9A82D1",
    "deviceName": "Sony Bravia 4K",
    "appVersion": "1.0.0",
    "androidVersion": "12",
    "model": "AFTMM",
    "manufacturer": "Amazon"
  }
  ```
- **Response**:
  ```json
  {
    "status": "PENDING",
    "code": "SC-482913",
    "expiresAt": "2026-09-29T15:35:00.000Z",
    "pollIntervalSeconds": 3
  }
  ```

### `GET /api/device/activation/status?deviceUid=...`
Android player polls every 3 seconds until status transitions to `ACTIVATED`.

### `POST /api/screens/register`
Dashboard registers the screen by entering the activation code.
- **Request Body**:
  ```json
  {
    "code": "SC-482913",
    "name": "Lobby Main Entrance",
    "location": "Building A Ground Floor",
    "description": "55-inch portrait display",
    "config": {
      "width": 1920,
      "height": 1080,
      "orientation": "LANDSCAPE",
      "rotation": 0,
      "fitMode": "FIT",
      "intervalSeconds": 10,
      "transition": "FADE",
      "transitionDurationMs": 400,
      "loop": true,
      "shuffle": false,
      "autoStart": true
    }
  }
  ```

---

## 4. Media Management

### `POST /api/media/upload`
Multipart upload supporting JPEG, PNG, and WebP up to 25 MB.
- Calculates SHA-256 hash.
- Extracts dimensions.
- Generates thumbnail.

### `GET /api/media`
Returns all uploaded media assets, dimensions, file size, SHA-256 hash, and usage count.

### `DELETE /api/media/:id`
Safely deletes unreferenced media. Returns `409 Conflict` if the asset is active in any published playlist.

---

## 5. Screen & Playlist Workflow

### `GET /api/screens`
Returns all registered screens with real-time status:
`ONLINE`, `OFFLINE` (heartbeat > 90s), `SYNCING`, `UP TO DATE`, `SYNC FAILED`.

### `GET /api/screens/:id/playlist`
Returns draft playlist and currently published playlist.

### `PUT /api/screens/:id/playlist/draft`
Saves draft playlist changes without modifying the active TV playback.

### `POST /api/screens/:id/playlist/publish`
1. Validates referenced assets.
2. Creates an immutable version increment (e.g. v1 -> v2).
3. Emits `CONTENT_UPDATE_AVAILABLE` WebSocket notification to the target screen.
4. Initializes `PENDING` device sync record.

---

## 6. Android TV Player Sync Contract

### `GET /api/device/manifest`
Requires device credentials (`Authorization: Bearer <device_token>` or `X-Device-Uid`).
```json
{
  "screenId": "screen-uuid",
  "playlistVersion": 3,
  "configurationVersion": 2,
  "screenConfiguration": {
    "width": 1920,
    "height": 1080,
    "rotation": 0,
    "fitMode": "FIT",
    "intervalSeconds": 12,
    "transition": "FADE",
    "transitionDurationMs": 400
  },
  "items": [
    {
      "assetId": "asset-1",
      "filename": "welcome.jpg",
      "order": 1,
      "durationSeconds": 10,
      "sha256": "4a7d...391a",
      "fileSize": 2048576,
      "downloadUrl": "/api/device/media/asset-1"
    }
  ]
}
```

### `GET /api/device/media/:assetId`
Streams image file with `X-Asset-SHA256` header.

### `POST /api/device/heartbeat`
Android sends every 30 seconds:
```json
{
  "deviceId": "dev-uuid",
  "appVersion": "1.0.0",
  "playbackStatus": "PLAYING",
  "appliedVersion": 3,
  "freeStorageBytes": 14502891520
}
```

### `POST /api/device/sync-status`
Android reports progress during downloading, staging, and activation:
```json
{
  "deviceId": "dev-uuid",
  "targetVersion": 3,
  "appliedVersion": 3,
  "status": "COMPLETED",
  "progress": 100,
  "errorMessage": null
}
```
