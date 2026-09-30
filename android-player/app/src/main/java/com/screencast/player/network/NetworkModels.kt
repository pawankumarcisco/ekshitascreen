package com.screencast.player.network

import com.google.gson.annotations.SerializedName
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.*

data class HealthResponse(
    val status: String,
    val service: String,
    val mode: String
)

data class ActivationRequest(
    val deviceUid: String,
    val deviceName: String?,
    val appVersion: String,
    val androidVersion: String,
    val model: String,
    val manufacturer: String
)

data class ActivationResponse(
    val status: String, // PENDING, ACTIVATED
    val code: String?,
    val expiresAt: String?,
    val pollIntervalSeconds: Long?,
    val registered: Boolean?,
    val deviceId: String?,
    val screenId: String?,
    val token: String?
)

data class ActivationStatusResponse(
    val status: String, // PENDING, ACTIVATED, EXPIRED, CANCELLED
    val registered: Boolean,
    val deviceId: String,
    val screenId: String?,
    val screenName: String?,
    val token: String?
)

data class ManifestItem(
    val assetId: String,
    val filename: String,
    val order: Int,
    val durationSeconds: Int,
    val sha256: String,
    val fileSize: Long,
    val downloadUrl: String
)

data class ScreenConfigDto(
    val id: String,
    val screenId: String,
    val width: Int,
    val height: Int,
    val rotation: Int,
    val orientation: String,
    val fitMode: String,
    val intervalSeconds: Int,
    val transition: String,
    val transitionDurationMs: Int,
    val loop: Boolean,
    val shuffle: Boolean,
    val autoStart: Boolean,
    val version: Int
)

data class DeviceManifestResponse(
    val screenId: String,
    val playlistVersion: Int,
    val configurationVersion: Int,
    val screenConfiguration: ScreenConfigDto,
    val items: List<ManifestItem>
)

data class HeartbeatRequest(
    val deviceId: String,
    val appVersion: String,
    val playbackStatus: String, // PLAYING, PAUSED, DOWNLOADING, ERROR
    val appliedVersion: Int,
    val freeStorageBytes: Long
)

data class HeartbeatResponse(
    val status: String,
    val serverTime: String?,
    val accountStatus: String, // ACTIVE, SUSPENDED, UNREGISTERED
    val screenName: String?,
    val validUntil: String?
)

data class SyncStatusRequest(
    val deviceId: String,
    val targetVersion: Int,
    val appliedVersion: Int?,
    val status: String, // PENDING, DOWNLOADING, VERIFYING, APPLYING, COMPLETED, FAILED
    val progress: Int,
    val errorMessage: String?
)

interface ScreenCastApi {

    @GET("/api/health")
    suspend fun checkHealth(): Response<HealthResponse>

    @POST("/api/device/activation/request")
    suspend fun requestActivation(
        @Body request: ActivationRequest
    ): Response<ActivationResponse>

    @GET("/api/device/activation/status")
    suspend fun checkActivationStatus(
        @Query("deviceUid") deviceUid: String
    ): Response<ActivationStatusResponse>

    @GET("/api/device/manifest")
    suspend fun getManifest(
        @Header("Authorization") bearerToken: String?,
        @Header("X-Device-Uid") deviceUid: String
    ): Response<DeviceManifestResponse>

    @Streaming
    @GET
    suspend fun downloadMediaFile(
        @Url url: String,
        @Header("Authorization") bearerToken: String?,
        @Header("X-Device-Uid") deviceUid: String
    ): Response<ResponseBody>

    @POST("/api/device/heartbeat")
    suspend fun sendHeartbeat(
        @Body request: HeartbeatRequest
    ): Response<HeartbeatResponse>

    @POST("/api/device/sync-status")
    suspend fun reportSyncStatus(
        @Body request: SyncStatusRequest
    ): Response<ResponseBody>
}
