package com.screencast.player.security

import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import java.util.UUID

data class DeviceCredentials(
    val deviceUid: String,
    val deviceId: String?,
    val authToken: String?,
    val isRegistered: Boolean
)

class KeyStoreHelper(private val context: Context) {
    private val TAG = "ScreenCastKeyStore"
    private val PREFS_FILENAME = "screencast_secure_credentials"
    private val KEY_DEVICE_UID = "device_uid"
    private val KEY_DEVICE_ID = "device_id"
    private val KEY_AUTH_TOKEN = "auth_token"
    private val KEY_IS_REGISTERED = "is_registered"
    private val KEY_SERVER_URL = "server_url"

    private val sharedPreferences: SharedPreferences by lazy {
        try {
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()

            EncryptedSharedPreferences.create(
                context,
                PREFS_FILENAME,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        } catch (e: Exception) {
            Log.w(TAG, "Keystore encryption unavailable, falling back to private prefs", e)
            context.getSharedPreferences(PREFS_FILENAME, Context.MODE_PRIVATE)
        }
    }

    fun getDeviceUid(): String {
        var uid = sharedPreferences.getString(KEY_DEVICE_UID, null)
        if (uid.isNullOrEmpty()) {
            uid = "SC-TV-" + UUID.randomUUID().toString().substring(0, 8).uppercase()
            sharedPreferences.edit().putString(KEY_DEVICE_UID, uid).apply()
        }
        return uid
    }

    fun getCredentials(): DeviceCredentials {
        return DeviceCredentials(
            deviceUid = getDeviceUid(),
            deviceId = sharedPreferences.getString(KEY_DEVICE_ID, null),
            authToken = sharedPreferences.getString(KEY_AUTH_TOKEN, null),
            isRegistered = sharedPreferences.getBoolean(KEY_IS_REGISTERED, false)
        )
    }

    fun saveRegistration(deviceId: String, authToken: String?) {
        sharedPreferences.edit()
            .putString(KEY_DEVICE_ID, deviceId)
            .putString(KEY_AUTH_TOKEN, authToken)
            .putBoolean(KEY_IS_REGISTERED, true)
            .apply()
    }

    fun getServerUrl(defaultUrl: String = "http://192.168.1.200:3000"): String {
        return sharedPreferences.getString(KEY_SERVER_URL, defaultUrl) ?: defaultUrl
    }

    fun saveServerUrl(url: String) {
        val trimmed = url.trim().removeSuffix("/")
        sharedPreferences.edit().putString(KEY_SERVER_URL, trimmed).apply()
    }

    fun resetRegistration() {
        sharedPreferences.edit()
            .remove(KEY_DEVICE_ID)
            .remove(KEY_AUTH_TOKEN)
            .putBoolean(KEY_IS_REGISTERED, false)
            .apply()
    }
}
