package com.screencast.player.database

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.ForeignKey
import androidx.room.Index

@Entity(tableName = "screen_config")
data class ScreenConfigEntity(
    @PrimaryKey
    val screenId: String,
    val width: Int = 1920,
    val height: Int = 1080,
    val rotation: Int = 0,
    val orientation: String = "LANDSCAPE",
    val fitMode: String = "FIT",
    val intervalSeconds: Int = 10,
    val transition: String = "FADE",
    val transitionDurationMs: Int = 400,
    val loop: Boolean = true,
    val shuffle: Boolean = false,
    val autoStart: Boolean = true,
    val version: Int = 1,
    val updatedAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "playlists")
data class PlaylistEntity(
    @PrimaryKey
    val playlistId: String,
    val screenId: String,
    val version: Int,
    val isActive: Boolean,
    val isStaged: Boolean,
    val publishedAt: Long?,
    val activatedAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "playlist_items",
    foreignKeys = [
        ForeignKey(
            entity = PlaylistEntity::class,
            parentColumns = ["playlistId"],
            childColumns = ["playlistId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index("playlistId"), Index("assetId")]
)
data class PlaylistItemEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val playlistId: String,
    val assetId: String,
    val filename: String,
    val sortOrder: Int,
    val durationSeconds: Int,
    val sha256: String,
    val fileSize: Long,
    val localFilePath: String
)

@Entity(tableName = "cached_assets")
data class CachedAssetEntity(
    @PrimaryKey
    val assetId: String,
    val sha256: String,
    val fileSize: Long,
    val localFilePath: String,
    val lastUsedAt: Long = System.currentTimeMillis()
)
