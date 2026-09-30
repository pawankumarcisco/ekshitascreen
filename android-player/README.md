# ScreenCast — Android TV Player Application

Native Kotlin Android TV Player built with Jetpack Compose for TV, Leanback Launcher support, Room SQLite database, and automatic offline fallback engine.

## Prerequisites
- **Java JDK 17+** (e.g., Eclipse Temurin OpenJDK 17)
- Android Studio **OR** standalone Google Android Command-Line Tools

## Setup Without Android Studio (Using Your Installed Gradle 9)

If you have **Gradle 9** and **Java** installed on Windows, but **do not** have Android Studio installed:

### Step 1: Generate Gradle 8.7 Wrapper (Why?)
Android Gradle Plugin (AGP 8.4) does not support Gradle 9 yet (Gradle 9 removed internal APIs that AGP requires). AGP strictly requires Gradle 8.6–8.7.
Since you already have Gradle 9 installed, generate the Gradle 8.7 wrapper directly:
```cmd
gradle wrapper --gradle-version 8.7
```
This instantly generates `gradle\wrapper\gradle-wrapper.jar` and `gradlew.bat` pinned to version 8.7!

### Step 2: Install Lightweight Android SDK (No Studio GUI Needed)
Run the automated installer included in this directory:
```cmd
install-android-sdk-windows.bat
```
This automatically:
- Downloads Google's official commandline-tools (~145 MB)
- Installs `platforms;android-34` and `build-tools;34.0.0`
- Accepts SDK licenses
- Writes `local.properties` with the SDK directory

### Step 3: Build the APK
```cmd
build-apk.bat
:: Or directly:
gradlew.bat assembleDebug
```
The APK is generated at:
`app\build\outputs\apk\debug\app-debug.apk`

---

## Option 1: Open in Android Studio (If Installed)
1. Open **Android Studio**.
2. Click **Open** and select this directory (`screencast-android-player`).
3. Wait for Gradle sync to complete.
4. Select your connected Android TV device or Android TV Emulator from the device dropdown.
5. Click **Run** (`Shift + F10`) or click **Build -> Build Bundle(s) / APK(s) -> Build APK(s)**.
6. The generated APK will be at:
   `app/build/outputs/apk/debug/app-debug.apk`

## Option 2: Build APK via Command Line
- **macOS / Linux**:
  ```bash
  ./build-apk.sh
  # Or:
  ./gradlew assembleDebug
  ```
- **Windows**:
  ```cmd
  build-apk.bat
  :: Or:
  gradlew.bat assembleDebug
  ```

## Installing APK on Android TV / Fire TV via Wi-Fi ADB
1. On your Android TV, navigate to **Settings -> Device Preferences -> About**.
2. Scroll to **Build** and click it **7 times** until you see "You are now a developer!".
3. Go back to **Settings -> Developer Options** and enable:
   - **USB Debugging**
   - **Network Debugging / Wireless Debugging**
4. Check your TV's Wi-Fi IP address in **Settings -> Network & Internet**.
5. From your computer terminal, connect and install:
   ```bash
   adb connect <TV_IP_ADDRESS>:5555
   adb install app/build/outputs/apk/debug/app-debug.apk
   ```
6. Launch the **ScreenCast** app from your TV Leanback home screen.
7. Enter the 6-digit registration code displayed on the TV into the ScreenCast Web Dashboard to pair!
