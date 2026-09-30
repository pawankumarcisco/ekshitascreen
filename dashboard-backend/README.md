# EkshitaScreen — Phase 1: Local Network Digital Signage Management System

EkshitaScreen is an enterprise-grade digital signage management platform designed for local area networks (LAN). It provides centralized media management, real-time screen orchestration, and a native Android TV player with robust offline resilience and safe playlist synchronization.

---

## Key Highlights

- **Pure Local Network Operation**: No external cloud servers or public internet connectivity required.
- **Android TV Player Application**: Full native Kotlin TV player with Android Leanback and Jetpack Compose support, D-pad navigation, automatic boot restart, and Keystore encryption.
- **Safe Playlist Staging & Atomic Activation**: Zero blank screens or broken decoders during updates. The current slideshow plays uninterrupted until new assets are downloaded and SHA-256 verified.
- **Offline Playback**: Seamless playback continues indefinitely if Wi-Fi or server disconnects.
- **Smart Differential Downloads**: Only downloads missing or modified media files, reusing unchanged cached assets.
- **Interactive Web Management Dashboard**: Clean desktop UI with live screen status, visual drag-and-drop playlist editor, draft vs. publish separation, and real-time WebSocket sync telemetry.

---

## Monorepo Architecture

```
screencast/
  apps/
    dashboard/          # React + Vite + Tailwind + TypeScript Management Dashboard
    android-player/     # Kotlin Android TV Application (Room, Retrofit, Coil, Compose)
    backend/            # NestJS + PostgreSQL + Prisma + WebSocket Gateway
  packages/
    shared-types/       # Shared TypeScript interfaces and DTO definitions
  storage/
    media/              # Local filesystem asset store (JPEG, PNG, WebP)
    thumbnails/         # Generated preview thumbnails
  docs/
    installation.md     # Server & PostgreSQL deployment on Windows/Linux
    android-setup.md    # Android TV sideloading & ADB setup
    network-setup.md    # LAN configuration & firewall rules
    api.md              # REST & WebSocket API specification
```

---

## Quick Start (Local Server & Dashboard)

1. **Install Dependencies & Start Server**:
   ```bash
   npm install
   npm run dev
   ```
2. Open your web browser to `http://localhost:3000`.
3. Default administrator credentials:
   - **Email**: `admin@ekshitascreen.com`
   - **Password**: `Forever@123`

---

## Running the Android TV Player

1. Build and install the APK via ADB (see `docs/android-setup.md`):
   ```bash
   cd screencast/apps/android-player
   ./gradlew assembleDebug
   adb connect <TV_IP_ADDRESS>:5555
   adb install -r app/build/outputs/apk/debug/app-debug.apk
   ```
2. Launch EkshitaScreen on your Android TV. The screen displays a 6-digit code (e.g. `SC-482913`).
3. In the Web Dashboard, click **Register Screen**, enter the code and display name, then click **Register**.
4. Upload images to the Media Library, arrange your playlist, and click **Publish to Screen**.
5. The TV automatically downloads the assets and starts the continuous fullscreen loop!

---

## Verification & Testing Guide

Run automated unit and integration tests:
- **Backend Tests**: `cd screencast/apps/backend && npm test`
- **Android Unit Tests**: `cd screencast/apps/android-player && ./gradlew test`

---

## License

Proprietary — Internal Enterprise Digital Signage Solution.
