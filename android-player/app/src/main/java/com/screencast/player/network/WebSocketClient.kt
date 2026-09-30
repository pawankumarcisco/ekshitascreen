package com.screencast.player.network

import android.util.Log
import kotlinx.coroutines.*
import okhttp3.*
import org.json.JSONObject
import java.util.concurrent.TimeUnit
import kotlin.math.min

class WebSocketClient(
    private val okHttpClient: OkHttpClient,
    private val onContentUpdate: (screenId: String, playlistVersion: Int, configVersion: Int) -> Unit,
    private val onDeviceActivated: (screenId: String, screenName: String) -> Unit,
    private val onDeviceUnregistered: () -> Unit = {},
    private val onScreenRenewed: (validUntil: String?) -> Unit = {}
) {
    private val TAG = "ScreenCastWebSocket"
    private var webSocket: WebSocket? = null
    private var serverBaseUrl: String = ""
    private var deviceId: String? = null
    private var isConnected = false
    private var isConnecting = false
    private var retryAttempt = 0
    private var coroutineScope: CoroutineScope? = null

    fun connect(baseUrl: String, deviceId: String?) {
        this.serverBaseUrl = baseUrl
        this.deviceId = deviceId
        coroutineScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
        attemptConnection()
    }

    private fun attemptConnection() {
        if (isConnected || isConnecting) return
        isConnecting = true

        val wsUrl = serverBaseUrl.replace("http://", "ws://").replace("https://", "wss://")
        Log.d(TAG, "Connecting to WebSocket: $wsUrl")

        val request = Request.Builder().url(wsUrl).build()

        webSocket = okHttpClient.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.d(TAG, "WebSocket connected successfully")
                isConnected = true
                isConnecting = false
                retryAttempt = 0

                // Identify device if registered
                deviceId?.let { id ->
                    val identifyPayload = JSONObject().apply {
                        put("type", "DEVICE_IDENTIFY")
                        put("deviceId", id)
                    }
                    webSocket.send(identifyPayload.toString())
                }
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                Log.d(TAG, "Received WS message: $text")
                try {
                    val root = JSONObject(text)
                    val type = root.optString("type")
                    val payload = root.optJSONObject("payload") ?: return

                    when (type) {
                        "CONTENT_UPDATE_AVAILABLE" -> {
                            val screenId = payload.optString("screenId")
                            val playlistVersion = payload.optInt("playlistVersion")
                            val configVersion = payload.optInt("configurationVersion", 1)
                            onContentUpdate(screenId, playlistVersion, configVersion)
                        }
                        "DEVICE_ACTIVATED" -> {
                            val screenId = payload.optString("screenId")
                            val screenName = payload.optString("screenName")
                            onDeviceActivated(screenId, screenName)
                        }
                        "DEVICE_UNREGISTERED" -> onDeviceUnregistered()
                        "SCREEN_RENEWED" -> onScreenRenewed(payload.optString("validUntil").takeIf { it.isNotBlank() })
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to parse WS message", e)
                }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.w(TAG, "WebSocket failure: ${t.message}")
                isConnected = false
                isConnecting = false
                scheduleReconnect()
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                Log.d(TAG, "WebSocket closed: $reason ($code)")
                isConnected = false
                isConnecting = false
                scheduleReconnect()
            }
        })
    }

    private fun scheduleReconnect() {
        coroutineScope?.launch {
            retryAttempt++
            // Exponential backoff: 2s, 4s, 8s, up to 30s max
            val delayMs = min(30000L, (1000L * (1 shl min(retryAttempt, 5))))
            Log.d(TAG, "Scheduling reconnect attempt #$retryAttempt in ${delayMs / 1000}s")
            delay(delayMs)
            attemptConnection()
        }
    }

    fun disconnect() {
        isConnected = false
        isConnecting = false
        coroutineScope?.cancel()
        webSocket?.close(1000, "App closing")
        webSocket = null
    }
}
