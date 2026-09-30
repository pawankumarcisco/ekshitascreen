@echo off
setlocal enabledelayedexpansion

echo ====================================================================
echo  ScreenCast -- Headless Android SDK Installer for Windows
echo  (Installs lightweight Android SDK without Android Studio GUI)
echo ====================================================================
echo.

:: 1. Check for Java
where java >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Java JDK 17+ is required.
    echo Please install OpenJDK 17 (e.g. from https://adoptium.net/) and try again.
    pause
    exit /b 1
)

:: Set default SDK directory in user's AppData
if not defined ANDROID_HOME (
    set "TARGET_SDK=%LOCALAPPDATA%\Android\Sdk"
) else (
    set "TARGET_SDK=%ANDROID_HOME%"
)

echo Target Android SDK directory:
echo   %TARGET_SDK%
echo.

if not exist "%TARGET_SDK%" mkdir "%TARGET_SDK%"
if not exist "%TARGET_SDK%\cmdline-tools" mkdir "%TARGET_SDK%\cmdline-tools"

set "SDKMANAGER=%TARGET_SDK%\cmdline-tools\latest\bin\sdkmanager.bat"

if exist "%SDKMANAGER%" (
    echo [OK] Google Command-Line Tools already found at:
    echo   %SDKMANAGER%
) else (
    echo [1/3] Downloading Google Android Command-Line Tools (~145 MB)...
    set "ZIP_URL=https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
    set "TEMP_ZIP=%TEMP%\cmdline-tools.zip"
    
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('%ZIP_URL%', '%TEMP_ZIP%')"
    
    if not exist "%TEMP_ZIP%" (
        echo [ERROR] Failed to download commandlinetools.
        echo Please check your internet connection and try again.
        pause
        exit /b 1
    )
    
    echo [2/3] Extracting Command-Line Tools...
    powershell -Command "Expand-Archive -Path '%TEMP_ZIP%' -DestinationPath '%TEMP%\cmdline_extracted' -Force"
    
    if not exist "%TARGET_SDK%\cmdline-tools\latest" (
        mkdir "%TARGET_SDK%\cmdline-tools\latest"
    )
    
    xcopy /E /I /Y "%TEMP%\cmdline_extracted\cmdline-tools\*" "%TARGET_SDK%\cmdline-tools\latest\" >nul
    del "%TEMP_ZIP%" 2>nul
    rmdir /S /Q "%TEMP%\cmdline_extracted" 2>nul
)

if not exist "%SDKMANAGER%" (
    echo [ERROR] sdkmanager.bat could not be located.
    pause
    exit /b 1
)

echo.
echo [3/3] Installing Android TV Platform 34 and Build Tools 34.0.0...
echo (Accepting licenses automatically...)
echo.

powershell -Command "for ($i=0; $i -lt 10; $i++) { 'y' } | & '%SDKMANAGER%' --licenses"
call "%SDKMANAGER%" --install "platforms;android-34" "build-tools;34.0.0"

:: Generate local.properties in project root
set "ESCAPED_SDK=%TARGET_SDK:\=\\%"
echo sdk.dir=%ESCAPED_SDK% > local.properties

echo.
echo ====================================================================
echo [SUCCESS] Android SDK is ready!
echo local.properties created with sdk.dir=%TARGET_SDK%
echo ====================================================================
echo You can now run build-apk.bat to compile the ScreenCast APK!
echo.
pause
