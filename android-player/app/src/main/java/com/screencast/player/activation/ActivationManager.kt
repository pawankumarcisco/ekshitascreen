package com.screencast.player.activation

import android.os.Build
import android.util.Log
import com.screencast.player.connection.ServerConnectionManager
import com.screencast.player.network.ActivationRequest
import com.screencast.player.security.KeyStoreHelper
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext

sealed class ActivationUIState {
    object Idle : ActivationUIState()
    object Requesting : ActivationUIState()
    data class CodeReady(val code: String, val expiresAt: String, val secondsRemaining: Int) : ActivationUIState()
    data class Success(val screenName: String) : ActivationUIState()
    data class Error(val message: String) : ActivationUIState()
}

class ActivationManager(
    private val connectionManager: ServerConnectionManager,
    private val keyStoreHelper: KeyStoreHelper
) {
    private val TAG = "ActivationManager"

    private val _uiState = MutableStateFlow<ActivationUIState>(ActivationUIState.Idle)
    val uiState: StateFlow<ActivationUIState> = _uiState.asStateFlow()

    private var isPolling = false

    suspend fun startActivationFlow() = withContext(Dispatchers.IO) {
        _uiState.value = ActivationUIState.Requesting
        val deviceUid = keyStoreHelper.getDeviceUid()

        try {
            val api = connectionManager.getApi()
            val request = ActivationRequest(
                deviceUid = deviceUid,
                deviceName = "Android TV " + Build.MODEL,
                appVersion = "1.0.0",
                androidVersion = Build.VERSION.RELEASE ?: "12",
                model = Build.MODEL ?: "Unknown Box",
                manufacturer = Build.MANUFACTURER ?: "Generic"
            )

            val response = api.requestActivation(request)
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                if (body.status == "ACTIVATED" && body.deviceId != null) {
                    keyStoreHelper.saveRegistration(body.deviceId, body.token)
                    _uiState.value = ActivationUIState.Success("Registered Screen")
                    return@withContext
                }

                val code = body.code ?: "SC-000000"
                _uiState.value = ActivationUIState.CodeReady(
                    code = code,
                    expiresAt = body.expiresAt ?: "",
                    secondsRemaining = 15 * 60
                )
                startPolling(deviceUid)
            } else {
                _uiState.value = ActivationUIState.Error("Server error: ${response.code()} ${response.message()}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Activation request failed", e)
            _uiState.value = ActivationUIState.Error("Connection failed: ${e.localizedMessage}")
        }
    }

    private suspend fun startPolling(deviceUid: String) = withContext(Dispatchers.IO) {
        if (isPolling) return@withContext
        isPolling = true

        while (isPolling) {
            delay(3000)
            try {
                val api = connectionManager.getApi()
                val response = api.checkActivationStatus(deviceUid)
                if (response.isSuccessful && response.body() != null) {
                    val status = response.body()!!
                    when (status.status) {
                        "ACTIVATED" -> {
                            isPolling = false
                            keyStoreHelper.saveRegistration(status.deviceId, status.token)
                            _uiState.value = ActivationUIState.Success(status.screenName ?: "ScreenCast Display")
                            return@withContext
                        }
                        "EXPIRED" -> {
                            isPolling = false
                            _uiState.value = ActivationUIState.Error("Activation code expired. Please retry.")
                            return@withContext
                        }
                        "CANCELLED" -> {
                            isPolling = false
                            _uiState.value = ActivationUIState.Error("Activation cancelled by server.")
                            return@withContext
                        }
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Polling check encountered error, retrying...", e)
            }
        }
    }

    fun stop() {
        isPolling = false
    }
}
