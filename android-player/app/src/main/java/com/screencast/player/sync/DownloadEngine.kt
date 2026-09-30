package com.screencast.player.sync

import android.util.Log
import com.screencast.player.connection.ServerConnectionManager
import com.screencast.player.database.*
import com.screencast.player.network.*
import com.screencast.player.security.KeyStoreHelper
import com.screencast.player.storage.MediaFileManager
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream

data class SyncProgress(
    val status: String, // IDLE, DOWNLOADING, VERIFYING, APPLYING, COMPLETED, FAILED
    val progressPercent: Int,
    val currentFile: String?,
    val totalFiles: Int,
    val downloadedFiles: Int,
    val errorMessage: String? = null
)

class DownloadEngine(
    private val connectionManager: ServerConnectionManager,
    private val mediaFileManager: MediaFileManager,
    private val db: AppDatabase,
    private val keyStoreHelper: KeyStoreHelper
) {
    private val TAG = "DownloadEngine"

    private val _syncProgress = MutableStateFlow(SyncProgress("IDLE", 0, null, 0, 0))
    val syncProgress: StateFlow<SyncProgress> = _syncProgress.asStateFlow()

    private val dao = db.signageDao()

    /**
     * Executes the versioned synchronization workflow
     */
    suspend fun synchronize(targetVersion: Int? = null): Boolean = withContext(Dispatchers.IO) {
        val credentials = keyStoreHelper.getCredentials()
        if (!credentials.isRegistered || credentials.deviceId == null) {
            Log.w(TAG, "Cannot sync: device not registered")
            return@withContext false
        }

        val deviceId = credentials.deviceId
        val deviceUid = credentials.deviceUid
        val authHeader = credentials.authToken?.let { "Bearer $it" }

        try {
            reportStatus(deviceId, targetVersion ?: 0, null, "DOWNLOADING", 5, null)
            _syncProgress.value = SyncProgress("DOWNLOADING", 5, "Fetching manifest...", 0, 0)

            // 1. Fetch latest manifest from local server
            val api = connectionManager.getApi()
            val manifestRes = api.getManifest(authHeader, deviceUid)
            if (!manifestRes.isSuccessful || manifestRes.body() == null) {
                val err = "Failed to fetch manifest: ${manifestRes.code()}"
                reportStatus(deviceId, targetVersion ?: 0, null, "FAILED", 0, err)
                _syncProgress.value = SyncProgress("FAILED", 0, null, 0, 0, err)
                return@withContext false
            }

            val manifest = manifestRes.body()!!
            val publishedVersion = manifest.playlistVersion

            // Save screen configuration locally
            val configDto = manifest.screenConfiguration
            val configEntity = ScreenConfigEntity(
                screenId = manifest.screenId,
                width = configDto.width,
                height = configDto.height,
                rotation = configDto.rotation,
                orientation = configDto.orientation,
                fitMode = configDto.fitMode,
                intervalSeconds = configDto.intervalSeconds,
                transition = configDto.transition,
                transitionDurationMs = configDto.transitionDurationMs,
                loop = configDto.loop,
                shuffle = configDto.shuffle,
                autoStart = configDto.autoStart,
                version = configDto.version
            )
            dao.saveScreenConfig(configEntity)

            if (manifest.items.isEmpty()) {
                Log.d(TAG, "Manifest has no items to play")
                reportStatus(deviceId, publishedVersion, publishedVersion, "COMPLETED", 100, null)
                _syncProgress.value = SyncProgress("COMPLETED", 100, null, 0, 0)
                return@withContext true
            }

            // 2. Identify cached vs missing files
            val stagingFilesToPromote = mutableListOf<Pair<File, File>>()
            val stagedPlaylistItems = mutableListOf<PlaylistItemEntity>()
            val stagedPlaylistId = "pl-${manifest.screenId}-v$publishedVersion"

            val totalItems = manifest.items.size
            var processedItems = 0

            mediaFileManager.clearStaging()

            for (item in manifest.items) {
                processedItems++
                val activeFile = mediaFileManager.getActiveFile(item.assetId, item.filename)
                var fileValid = false

                // Check if active file already exists and matches hash
                if (activeFile.exists() && activeFile.length() == item.fileSize) {
                    val existingHash = mediaFileManager.calculateFileSha256(activeFile)
                    if (existingHash.equals(item.sha256, ignoreCase = true)) {
                        fileValid = true
                        Log.d(TAG, "Reusing cached asset: ${item.filename} ($existingHash)")
                    }
                }

                if (!fileValid) {
                    // Download missing / changed file to isolated STAGING directory
                    _syncProgress.value = SyncProgress(
                        status = "DOWNLOADING",
                        progressPercent = (processedItems * 80) / totalItems,
                        currentFile = item.filename,
                        totalFiles = totalItems,
                        downloadedFiles = processedItems
                    )

                    val stagedFile = mediaFileManager.getStagingFile(item.assetId, item.filename)
                    val downloadSuccess = downloadFile(api, item.downloadUrl, authHeader, deviceUid, stagedFile)

                    if (!downloadSuccess) {
                        val err = "Download interrupted for file: ${item.filename}"
                        Log.e(TAG, err)
                        reportStatus(deviceId, publishedVersion, null, "FAILED", 0, err)
                        _syncProgress.value = SyncProgress("FAILED", 0, null, totalItems, processedItems, err)
                        return@withContext false
                    }

                    // Verify file size and SHA-256
                    _syncProgress.value = SyncProgress(
                        status = "VERIFYING",
                        progressPercent = 85,
                        currentFile = item.filename,
                        totalFiles = totalItems,
                        downloadedFiles = processedItems
                    )
                    reportStatus(deviceId, publishedVersion, null, "VERIFYING", 85, null)

                    val downloadedHash = mediaFileManager.calculateFileSha256(stagedFile)
                    if (!downloadedHash.equals(item.sha256, ignoreCase = true)) {
                        val err = "Checksum mismatch for ${item.filename}. Expected ${item.sha256}, got $downloadedHash"
                        Log.e(TAG, err)
                        stagedFile.delete()
                        reportStatus(deviceId, publishedVersion, null, "FAILED", 0, err)
                        _syncProgress.value = SyncProgress("FAILED", 0, null, totalItems, processedItems, err)
                        return@withContext false
                    }

                    stagingFilesToPromote.add(Pair(stagedFile, activeFile))
                }

                stagedPlaylistItems.add(
                    PlaylistItemEntity(
                        playlistId = stagedPlaylistId,
                        assetId = item.assetId,
                        filename = item.filename,
                        sortOrder = item.order,
                        durationSeconds = item.durationSeconds,
                        sha256 = item.sha256,
                        fileSize = item.fileSize,
                        localFilePath = activeFile.absolutePath
                    )
                )
            }

            // 3. SAFE PLAYLIST ACTIVATION
            _syncProgress.value = SyncProgress("APPLYING", 95, "Activating playlist...", totalItems, totalItems)
            reportStatus(deviceId, publishedVersion, null, "APPLYING", 95, null)

            // Promote all staged files to active media directory
            for ((staged, active) in stagingFilesToPromote) {
                mediaFileManager.promoteStagedFile(staged, active)
            }

            // Record staged playlist in DB
            val stagedPlaylist = PlaylistEntity(
                playlistId = stagedPlaylistId,
                screenId = manifest.screenId,
                version = publishedVersion,
                isActive = false,
                isStaged = true,
                publishedAt = System.currentTimeMillis()
            )
            dao.insertPlaylist(stagedPlaylist)
            dao.insertPlaylistItems(stagedPlaylistItems)

            // Atomically switch active playlist
            dao.activateStagedPlaylist(stagedPlaylistId)

            // Update cached asset entries
            for (item in manifest.items) {
                val activeFile = mediaFileManager.getActiveFile(item.assetId, item.filename)
                dao.saveCachedAsset(
                    CachedAssetEntity(
                        assetId = item.assetId,
                        sha256 = item.sha256,
                        fileSize = item.fileSize,
                        localFilePath = activeFile.absolutePath
                    )
                )
            }

            // Clean obsolete unreferenced files
            val activeAssetIds = manifest.items.map { it.assetId }.toSet()
            mediaFileManager.deleteUnreferencedMedia(activeAssetIds)
            dao.cleanObsoleteCachedAssets()

            // 4. Report applied version to server
            reportStatus(deviceId, publishedVersion, publishedVersion, "COMPLETED", 100, null)
            _syncProgress.value = SyncProgress("COMPLETED", 100, null, totalItems, totalItems)
            Log.d(TAG, "Sync complete! Applied version: v$publishedVersion")

            true
        } catch (e: Exception) {
            Log.e(TAG, "Fatal error during sync", e)
            val err = "Sync error: ${e.localizedMessage}"
            reportStatus(deviceId, targetVersion ?: 0, null, "FAILED", 0, err)
            _syncProgress.value = SyncProgress("FAILED", 0, null, 0, 0, err)
            false
        }
    }

    private suspend fun downloadFile(
        api: ScreenCastApi,
        url: String,
        authHeader: String?,
        deviceUid: String,
        targetFile: File
    ): Boolean = withContext(Dispatchers.IO) {
        try {
            val response = api.downloadMediaFile(url, authHeader, deviceUid)
            if (!response.isSuccessful || response.body() == null) {
                return@withContext false
            }

            val body = response.body()!!
            val inputStream: InputStream = body.byteStream()
            val outputStream = FileOutputStream(targetFile)

            val buffer = ByteArray(8192)
            var bytesRead: Int
            while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                outputStream.write(buffer, 0, bytesRead)
            }

            outputStream.flush()
            outputStream.close()
            inputStream.close()
            true
        } catch (e: Exception) {
            Log.e(TAG, "Download failed for $url", e)
            if (targetFile.exists()) targetFile.delete()
            false
        }
    }

    private suspend fun reportStatus(
        deviceId: String,
        targetVersion: Int,
        appliedVersion: Int?,
        status: String,
        progress: Int,
        errorMessage: String?
    ) {
        try {
            val api = connectionManager.getApi()
            api.reportSyncStatus(
                SyncStatusRequest(
                    deviceId = deviceId,
                    targetVersion = targetVersion,
                    appliedVersion = appliedVersion,
                    status = status,
                    progress = progress,
                    errorMessage = errorMessage
                )
            )
        } catch (e: Exception) {
            // best effort, non-fatal if offline
        }
    }
}
