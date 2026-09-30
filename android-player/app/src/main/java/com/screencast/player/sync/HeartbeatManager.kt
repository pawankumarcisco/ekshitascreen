package com.screencast.player.sync

import android.os.Build
import android.util.Log
import com.screencast.player.connection.ServerConnectionManager
import com.screencast.player.database.AppDatabase
import com.screencast.player.network.HeartbeatRequest
import com.screencast.player.network.HeartbeatResponse
import com.screencast.player.security.KeyStoreHelper
import com.screencast.player.storage.MediaFileManager
import kotlinx.coroutines.*

class HeartbeatManager(
    private val connectionManager: ServerConnectionManager,
    private val keyStoreHelper: KeyStoreHelper,
    private val mediaFileManager: MediaFileManager,
    private val db: AppDatabase,
    private val onAccountStatus: (HeartbeatResponse) -> Unit = {}
) {
    private val TAG = "HeartbeatManager"
    private var heartbeatJob: Job? = null
    private val dao = db.signageDao()

    fun start() {
        if (heartbeatJob?.isActive == true) return

        heartbeatJob = CoroutineScope(Dispatchers.IO + SupervisorJob()).launch {
            while (isActive) {
                checkNow()
                delay(30000) // 30 seconds interval
            }
        }
    }

    suspend fun checkNow(): HeartbeatResponse? {
        val creds = keyStoreHelper.getCredentials()
        if (!creds.isRegistered || creds.deviceId == null) return null

        try {
            val activePlaylist = dao.getActivePlaylist()
            val appliedVersion = activePlaylist?.version ?: 0
            val freeBytes = mediaFileManager.getAvailableStorageBytes()

            val req = HeartbeatRequest(
                deviceId = creds.deviceId,
                appVersion = "1.0.0",
                playbackStatus = if (activePlaylist != null) "PLAYING" else "IDLE",
                appliedVersion = appliedVersion,
                freeStorageBytes = freeBytes
            )

            val api = connectionManager.getApi()
            val response = api.sendHeartbeat(req)
            val body = response.body()
            if (response.isSuccessful && body != null) {
                onAccountStatus(body)
            }
            Log.d(TAG, "Heartbeat sent successfully (v$appliedVersion)")
            return body
        } catch (e: Exception) {
            Log.w(TAG, "Heartbeat failed (likely offline): ${e.message}")
            return null
        }
    }

    fun stop() {
        heartbeatJob?.cancel()
        heartbeatJob = null
    }
}
