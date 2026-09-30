#!/bin/bash
set -e

echo "=========================================================="
echo " ScreenCast Android TV Player — APK Build Script"
echo "=========================================================="
echo ""

# 1. Check for Java
if ! command -v java &> /dev/null; then
    echo "❌ Error: Java (JDK 17+) is required to build the Android APK."
    echo "Please install OpenJDK 17+ or Android Studio, then try again."
    exit 1
fi

JAVA_VER=$(java -version 2>&1 | head -n 1)
echo "✓ Found Java: $JAVA_VER"

# 2. Check gradle-wrapper.jar
WRAPPER_JAR="gradle/wrapper/gradle-wrapper.jar"
if [ ! -f "$WRAPPER_JAR" ]; then
    echo "📥 gradle-wrapper.jar not found. Downloading Gradle 8.7 wrapper..."
    mkdir -p gradle/wrapper
    curl -s -f -L -o "$WRAPPER_JAR" https://raw.githubusercontent.com/gradle/gradle/v8.7.0/gradle/wrapper/gradle-wrapper.jar || \
    curl -s -f -L -o "$WRAPPER_JAR" https://repo.maven.apache.org/maven2/org/gradle/gradle-wrapper/8.7/gradle-wrapper-8.7.jar
fi

# 3. Check for Android SDK / local.properties
if [ ! -f "local.properties" ]; then
    if [ -n "$ANDROID_HOME" ]; then
        echo "sdk.dir=$ANDROID_HOME" > local.properties
        echo "✓ Configured local.properties with ANDROID_HOME"
    elif [ -n "$ANDROID_SDK_ROOT" ]; then
        echo "sdk.dir=$ANDROID_SDK_ROOT" > local.properties
        echo "✓ Configured local.properties with ANDROID_SDK_ROOT"
    elif [ -d "$HOME/Library/Android/sdk" ]; then
        echo "sdk.dir=$HOME/Library/Android/sdk" > local.properties
        echo "✓ Found macOS Android SDK at $HOME/Library/Android/sdk"
    elif [ -d "$HOME/Android/Sdk" ]; then
        echo "sdk.dir=$HOME/Android/Sdk" > local.properties
        echo "✓ Found Linux Android SDK at $HOME/Android/Sdk"
    fi
fi

# Make gradlew executable
chmod +x gradlew

echo "Building Debug APK with Gradle..."
echo "----------------------------------------------------------"
./gradlew assembleDebug
echo "----------------------------------------------------------"

APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_PATH" ]; then
    echo ""
    echo "=========================================================="
    echo "🎉 Build Successful!"
    echo "APK created at: $APK_PATH"
    echo "=========================================================="
    echo ""
    echo "To install on your Android TV via Wi-Fi ADB:"
    echo "  1. Enable Developer Options on your TV (Settings -> About -> click Build 7 times)"
    echo "  2. Enable Network Debugging (Settings -> Developer Options -> Network Debugging)"
    echo "  3. Connect via ADB: adb connect <YOUR_TV_IP_ADDRESS>:5555"
    echo "  4. Install APK:     adb install $APK_PATH"
    echo ""
else
    echo "ℹ️ If Gradle asked for SDK licenses, open the project in Android Studio to auto-download."
fi
