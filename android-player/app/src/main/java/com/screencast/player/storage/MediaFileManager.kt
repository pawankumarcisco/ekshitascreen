package com.screencast.player.storage

import android.content.Context
import android.util.Log
import java.io.File
import java.io.FileInputStream
import java.io.InputStream
import java.security.MessageDigest

class MediaFileManager(private val context: Context) {
    private val TAG = "ScreenCastFileManager"

    val mediaDir: File by lazy {
        File(context.filesDir, "media").apply { if (!exists()) mkdirs() }
    }

    val stagingDir: File by lazy {
        File(context.filesDir, "staging").apply { if (!exists()) mkdirs() }
    }

    fun getActiveFile(assetId: String, filename: String): File {
        val extension = filename.substringAfterLast('.', "jpg")
        return File(mediaDir, "$assetId.$extension")
    }

    fun getStagingFile(assetId: String, filename: String): File {
        val extension = filename.substringAfterLast('.', "jpg")
        return File(stagingDir, "$assetId.$extension")
    }

    fun clearStaging() {
        stagingDir.listFiles()?.forEach { it.delete() }
    }

    /**
     * Calculates SHA-256 of file using a buffered stream (zero RAM blowout)
     */
    fun calculateFileSha256(file: File): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val buffer = ByteArray(8192)
        FileInputStream(file).use { input ->
            var bytesRead: Int
            while (input.read(buffer).also { bytesRead = it } != -1) {
                digest.update(buffer, 0, bytesRead)
            }
        }
        val bytes = digest.digest()
        return bytes.joinToString("") { "%02x".format(it) }
    }

    /**
     * Promotes a verified file from staging to active media directory
     */
    fun promoteStagedFile(stagedFile: File, activeFile: File): Boolean {
        if (!stagedFile.exists()) return false
        if (activeFile.exists()) activeFile.delete()
        return stagedFile.renameTo(activeFile)
    }

    fun deleteUnreferencedMedia(activeAssetIds: Set<String>) {
        val allFiles = mediaDir.listFiles() ?: return
        for (file in allFiles) {
            val fileAssetId = file.name.substringBefore('.')
            if (!activeAssetIds.contains(fileAssetId)) {
                Log.d(TAG, "Removing obsolete cached asset file: ${file.name}")
                file.delete()
            }
        }
    }

    fun getAvailableStorageBytes(): Long {
        return context.filesDir.freeSpace
    }
}
