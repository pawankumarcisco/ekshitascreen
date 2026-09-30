@echo off
setlocal enabledelayedexpansion

echo ====================================================================
echo  ScreenCast Android TV Player -- Windows APK Build Script
echo ====================================================================
echo.

:: 1. Check for Java
where java >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Java JDK 17+ is required to build the Android APK.
    echo Please install OpenJDK 17 (e.g. https://adoptium.net/) and try again.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('java -version 2^>^&1') do (
    set "JAVA_OUT=%%i"
    goto :got_java
)
:got_java
echo [OK] Java detected: !JAVA_OUT!

:: 2. Handle Gradle Wrapper & System Gradle (such as Gradle 9)
if not exist "gradle\wrapper\gradle-wrapper.jar" (
    echo [INFO] gradle-wrapper.jar not found.
    where gradle >nul 2>nul
    if !errorlevel! equ 0 (
        echo [OK] Installed Gradle detected! Generating Gradle 8.7 wrapper...
        echo Note: Android Gradle Plugin requires Gradle 8.7 (Gradle 9 is too new for AGP).
        call gradle wrapper --gradle-version 8.7
    ) else (
        echo [INFO] Downloading Gradle 8.7 wrapper jar...
        if not exist "gradle\wrapper" mkdir "gradle\wrapper"
        powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('https://raw.githubusercontent.com/gradle/gradle/v8.7.0/gradle/wrapper/gradle-wrapper.jar', 'gradle\wrapper\gradle-wrapper.jar')" 2>nul
        if not exist "gradle\wrapper\gradle-wrapper.jar" (
            curl -f -L -o "gradle\wrapper\gradle-wrapper.jar" "https://raw.githubusercontent.com/gradle/gradle/v8.7.0/gradle/wrapper/gradle-wrapper.jar" 2>nul
        )
    )
)

if not exist "gradle\wrapper\gradle-wrapper.jar" (
    echo [ERROR] Failed to obtain gradle-wrapper.jar.
    echo Please run this command manually in this folder:
    echo   gradle wrapper --gradle-version 8.7
    pause
    exit /b 1
)

echo [OK] Gradle 8.7 wrapper verified.

:: 3. Check for Android SDK / local.properties
set "SDK_FOUND=0"
if exist "local.properties" (
    set "SDK_FOUND=1"
    echo [OK] local.properties found.
) else (
    if defined ANDROID_HOME (
        echo sdk.dir=%ANDROID_HOME:\=\\% > local.properties
        echo [OK] Configured local.properties using ANDROID_HOME.
        set "SDK_FOUND=1"
    ) else if defined ANDROID_SDK_ROOT (
        echo sdk.dir=%ANDROID_SDK_ROOT:\=\\% > local.properties
        echo [OK] Configured local.properties using ANDROID_SDK_ROOT.
        set "SDK_FOUND=1"
    ) else if exist "%LOCALAPPDATA%\Android\Sdk\platforms\android-34" (
        echo sdk.dir=%LOCALAPPDATA:\=\\%\\Android\\Sdk > local.properties
        echo [OK] Found Android SDK in standard location (%LOCALAPPDATA%\Android\Sdk).
        set "SDK_FOUND=1"
    )
)

if "!SDK_FOUND!"=="0" (
    echo.
    echo [ATTENTION] Android SDK was not detected on this machine.
    echo Because Android Studio is not installed, you can either:
    echo   1. Run install-android-sdk-windows.bat in this folder
    echo      (Automated 2-minute download of lightweight Google SDK tools)
    echo   2. Set ANDROID_HOME to your existing Android SDK folder
    echo.
    set /p "RUN_INSTALL=Would you like to run install-android-sdk-windows.bat now? (Y/N): "
    if /i "!RUN_INSTALL!"=="Y" (
        call install-android-sdk-windows.bat
    ) else (
        echo Continuing build attempt...
    )
)

:: 4. Build APK with Gradle Wrapper 8.7
echo.
echo Building Debug APK with Gradle Wrapper 8.7...
echo (Running: gradlew.bat assembleDebug)
echo --------------------------------------------------------------------
call gradlew.bat assembleDebug
echo --------------------------------------------------------------------

if exist "app\build\outputs\apk\debug\app-debug.apk" (
    echo.
    echo ====================================================================
    echo [SUCCESS] APK Created Successfully!
    echo File: app\build\outputs\apk\debug\app-debug.apk
    echo ====================================================================
    echo.
    echo To install on your Android TV:
    echo   adb connect [YOUR_TV_IP]:5555
    echo   adb install app\build\outputs\apk\debug\app-debug.apk
    echo.
) else (
    echo.
    echo [NOTE] Build did not produce app-debug.apk.
    echo If missing SDK licenses or platforms: run install-android-sdk-windows.bat
)

pause
