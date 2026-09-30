# EkshitaScreen — Android TV Player Installation & Setup

This guide details the prerequisites, compilation, installation via ADB over Wi-Fi, and initial setup for Android TVs and Android streaming boxes.

---

## 1. Supported Hardware

- **Target Platforms**: Android TV 9.0 (API 28) through Android TV 14 (API 34)
- **Supported Devices**:
  - Google TV / Chromecast with Google TV
  - Sony Bravia Android TV
  - Xiaomi TV Stick / Box S
  - NVIDIA Shield TV
  - Amazon Fire TV (via sideloading)
  - Generic Android TV boxes (Rockchip, Amlogic, Allwinner)

---

## 2. Enabling Developer Options & ADB on Android TV

1. On your Android TV, navigate to **Settings** > **Device Preferences** > **About**.
2. Scroll down to **Build** and click the center remote button 7 times until you see:
   `"You are now a developer!"`
3. Return to **Device Preferences** > **Developer Options**.
4. Enable:
   - **USB Debugging**: ON
   - **Network Debugging / Wireless Debugging**: ON
5. Note the TV's IP address from **Settings** > **Network & Internet** (e.g. `192.168.1.150`).

---

## 3. Building the APK

From your development workstation:
```bash
cd screencast/apps/android-player

# Generate Debug APK
./gradlew assembleDebug

# Output location:
# app/build/outputs/apk/debug/app-debug.apk

# Generate Production Signed Release APK
./gradlew assembleRelease
# Output location:
# app/build/outputs/apk/release/app-release.apk
```

---

## 4. Installing APK over Local Wi-Fi (ADB)

Connect to the TV using the Android Debug Bridge:
```bash
adb connect 192.168.1.150:5555

# Verify device is connected
adb devices

# Install EkshitaScreen
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

To grant boot permissions and launch:
```bash
adb shell monkey -p com.screencast.player -c android.intent.category.LAUNCHER 1
```

---

## 5. First Launch & Screen Activation

1. When EkshitaScreen opens for the first time, it connects to the configured server (default: `http://192.168.1.200:3000`).
2. If connection fails, a **Connection Failed** screen allows you to enter your local PC's IP address using the TV remote.
3. Once connected, the TV generates a unique 6-digit activation code (e.g., `SC-482913`) and displays:
   ```
   EKSHITASCREEN
   Activate Your Screen
   [ SC-482913 ]
   Waiting for registration...
   ```
4. Open the EkshitaScreen Web Dashboard on your computer:
   `http://<SERVER_IP>:3000`
5. Click **Register Screen**, enter the code `SC-482913`, enter a screen name (e.g. "Lobby Display"), and click **Register Screen**.
6. The TV immediately detects the registration via WebSocket, begins downloading assigned images, and begins playing the slideshow!

---

## 6. Remote Control Navigation

- **Back / Menu button**: Opens the exit and settings dialog.
- **Center D-Pad / Enter**: Pauses/opens options overlay during playback.
- **Boot Persistence**: The application automatically resumes upon TV power on via `BOOT_COMPLETED` receiver.
