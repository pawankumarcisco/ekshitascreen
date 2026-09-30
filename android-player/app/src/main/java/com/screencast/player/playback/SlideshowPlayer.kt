package com.screencast.player.playback

import android.content.Context
import android.util.Log
import com.screencast.player.database.AppDatabase
import com.screencast.player.database.PlaylistItemEntity
import com.screencast.player.database.ScreenConfigEntity
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.io.File

data class SlideDisplayState(
    val currentImageFile: File?,
    val nextImageFile: File?,
    val transition: String,
    val transitionDurationMs: Int,
    val fitMode: String,
    val rotation: Int,
    val durationSeconds: Int,
    val isPlaying: Boolean,
    val currentIndex: Int,
    val totalCount: Int
)

class SlideshowPlayer(
    private val context: Context,
    private val db: AppDatabase
) {
    private val TAG = "SlideshowPlayer"
    private val dao = db.signageDao()

    private val _displayState = MutableStateFlow(
        SlideDisplayState(
            currentImageFile = null,
            nextImageFile = null,
            transition = "FADE",
            transitionDurationMs = 400,
            fitMode = "FIT",
            rotation = 0,
            durationSeconds = 10,
            isPlaying = false,
            currentIndex = 0,
            totalCount = 0
        )
    )
    val displayState: StateFlow<SlideDisplayState> = _displayState.asStateFlow()

    private var playbackJob: Job? = null
    private var playlistItems: List<PlaylistItemEntity> = emptyList()
    private var screenConfig: ScreenConfigEntity? = null
    private var currentIndex = 0

    suspend fun loadAndStart(): Boolean = withContext(Dispatchers.IO) {
        val activePlaylist = dao.getActivePlaylist()
        if (activePlaylist == null) {
            Log.d(TAG, "No active playlist to play")
            return@withContext false
        }

        val items = dao.getPlaylistItems(activePlaylist.playlistId)
        if (items.isEmpty()) {
            Log.d(TAG, "Active playlist has no items")
            return@withContext false
        }

        screenConfig = dao.getScreenConfig() ?: ScreenConfigEntity(screenId = activePlaylist.screenId)
        playlistItems = if (screenConfig?.shuffle == true) items.shuffled() else items
        currentIndex = 0

        startLoop()
        true
    }

    private fun startLoop() {
        playbackJob?.cancel()
        playbackJob = CoroutineScope(Dispatchers.IO).launch {
            if (playlistItems.isEmpty()) return@launch

            while (isActive) {
                val currentItem = playlistItems[currentIndex]
                val currentFile = File(currentItem.localFilePath)

                // Preload next index
                val nextIndex = (currentIndex + 1) % playlistItems.size
                val nextItem = playlistItems[nextIndex]
                val nextFile = File(nextItem.localFilePath)

                val cfg = screenConfig ?: ScreenConfigEntity(screenId = "default")
                val slideDurationSec = currentItem.durationSeconds.takeIf { it > 0 } ?: cfg.intervalSeconds

                _displayState.value = SlideDisplayState(
                    currentImageFile = if (currentFile.exists()) currentFile else null,
                    nextImageFile = if (nextFile.exists()) nextFile else null,
                    transition = cfg.transition,
                    transitionDurationMs = cfg.transitionDurationMs,
                    fitMode = cfg.fitMode,
                    rotation = cfg.rotation,
                    durationSeconds = slideDurationSec,
                    isPlaying = true,
                    currentIndex = currentIndex + 1,
                    totalCount = playlistItems.size
                )

                // Single item playlist: sleep without looping transition
                if (playlistItems.size == 1) {
                    delay(slideDurationSec * 1000L)
                    continue
                }

                delay(slideDurationSec * 1000L)

                if (cfg.loop || currentIndex + 1 < playlistItems.size) {
                    currentIndex = nextIndex
                } else {
                    // Loop is disabled and reached end
                    break
                }
            }
        }
    }

    fun stop() {
        playbackJob?.cancel()
        _displayState.value = _displayState.value.copy(isPlaying = false)
    }

    suspend fun reloadIfUpdated() {
        val activePlaylist = dao.getActivePlaylist() ?: return
        val currentLoadedId = playlistItems.firstOrNull()?.playlistId
        if (currentLoadedId != activePlaylist.playlistId) {
            Log.d(TAG, "New active playlist detected, seamlessly reloading slideshow")
            loadAndStart()
        }
    }
}
