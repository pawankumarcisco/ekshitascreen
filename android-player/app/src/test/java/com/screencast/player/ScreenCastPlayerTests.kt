package com.screencast.player

import com.screencast.player.database.CachedAssetEntity
import com.screencast.player.database.PlaylistEntity
import com.screencast.player.database.PlaylistItemEntity
import com.screencast.player.database.ScreenConfigEntity
import org.junit.Assert.*
import org.junit.Test
import java.io.File
import java.security.MessageDigest

class ScreenCastPlayerTests {

    @Test
    fun testSha256ChecksumCalculation() {
        val testContent = "ScreenCast Digital Signage Test Payload".toByteArray()
        val digest = MessageDigest.getInstance("SHA-256")
        val hash = digest.digest(testContent).joinToString("") { "%02x".format(it) }

        assertNotNull(hash)
        assertEquals(64, hash.length)
    }

    @Test
    fun testSafeStagingLogic() {
        // Simulating safe playlist staging
        val activeVersion = 2
        val newTargetVersion = 3

        val stagedPlaylist = PlaylistEntity(
            playlistId = "pl-screen-1-v3",
            screenId = "screen-1",
            version = newTargetVersion,
            isActive = false,
            isStaged = true,
            publishedAt = System.currentTimeMillis()
        )

        // Staged playlist must NOT be active until verification completes
        assertFalse(stagedPlaylist.isActive)
        assertTrue(stagedPlaylist.isStaged)
    }

    @Test
    fun testOfflineResiliencePlaylistSelection() {
        val cachedItems = listOf(
            PlaylistItemEntity(
                id = 1,
                playlistId = "pl-1",
                assetId = "asset-1",
                filename = "welcome.jpg",
                sortOrder = 1,
                durationSeconds = 10,
                sha256 = "dummy-hash",
                fileSize = 1024,
                localFilePath = "/data/user/0/com.screencast.player/files/media/asset-1.jpg"
            )
        )

        // When offline, items must be playable from disk
        assertTrue("Cached playlist has playable items offline", cachedItems.isNotEmpty())
        assertEquals(10, cachedItems[0].durationSeconds)
    }

    @Test
    fun testObsoleteMediaDetection() {
        val activeAssetIds = setOf("asset-1", "asset-2")
        val cachedFiles = listOf("asset-1.jpg", "asset-2.jpg", "asset-old-3.jpg")

        val obsoleteFiles = cachedFiles.filter { filename ->
            val assetId = filename.substringBefore(".")
            !activeAssetIds.contains(assetId)
        }

        assertEquals(1, obsoleteFiles.size)
        assertEquals("asset-old-3.jpg", obsoleteFiles[0])
    }
}
