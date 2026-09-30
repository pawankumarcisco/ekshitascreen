package com.screencast.player.database

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface SignageDao {

    @Query("SELECT * FROM screen_config LIMIT 1")
    suspend fun getScreenConfig(): ScreenConfigEntity?

    @Query("SELECT * FROM screen_config LIMIT 1")
    fun observeScreenConfig(): Flow<ScreenConfigEntity?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveScreenConfig(config: ScreenConfigEntity)

    // Active Playlist Queries
    @Query("SELECT * FROM playlists WHERE isActive = 1 LIMIT 1")
    suspend fun getActivePlaylist(): PlaylistEntity?

    @Query("SELECT * FROM playlists WHERE isActive = 1 LIMIT 1")
    fun observeActivePlaylist(): Flow<PlaylistEntity?>

    @Query("SELECT * FROM playlist_items WHERE playlistId = :playlistId ORDER BY sortOrder ASC")
    suspend fun getPlaylistItems(playlistId: String): List<PlaylistItemEntity>

    @Query("SELECT * FROM playlist_items WHERE playlistId = :playlistId ORDER BY sortOrder ASC")
    fun observePlaylistItems(playlistId: String): Flow<List<PlaylistItemEntity>>

    // Staging Playlist Queries
    @Query("SELECT * FROM playlists WHERE isStaged = 1 LIMIT 1")
    suspend fun getStagedPlaylist(): PlaylistEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPlaylist(playlist: PlaylistEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPlaylistItems(items: List<PlaylistItemEntity>)

    // Atomic switchover transaction
    @Transaction
    suspend fun activateStagedPlaylist(stagedPlaylistId: String) {
        // 1. Deactivate old active playlists
        deactivateAllPlaylists()
        // 2. Mark staged as active and unstaged
        markPlaylistActive(stagedPlaylistId)
    }

    @Query("UPDATE playlists SET isActive = 0 WHERE isActive = 1")
    suspend fun deactivateAllPlaylists()

    @Query("UPDATE playlists SET isActive = 1, isStaged = 0, activatedAt = :now WHERE playlistId = :playlistId")
    suspend fun markPlaylistActive(playlistId: String, now: Long = System.currentTimeMillis())

    @Query("DELETE FROM playlists WHERE isStaged = 1 AND isActive = 0")
    suspend fun clearStagedPlaylists()

    // Cache management
    @Query("SELECT * FROM cached_assets WHERE assetId = :assetId LIMIT 1")
    suspend fun getCachedAsset(assetId: String): CachedAssetEntity?

    @Query("SELECT * FROM cached_assets")
    suspend fun getAllCachedAssets(): List<CachedAssetEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveCachedAsset(asset: CachedAssetEntity)

    @Delete
    suspend fun deleteCachedAsset(asset: CachedAssetEntity)

    @Query("DELETE FROM cached_assets WHERE assetId NOT IN (SELECT assetId FROM playlist_items WHERE playlistId IN (SELECT playlistId FROM playlists WHERE isActive = 1))")
    suspend fun cleanObsoleteCachedAssets()
}

@Database(
    entities = [
        ScreenConfigEntity::class,
        PlaylistEntity::class,
        PlaylistItemEntity::class,
        CachedAssetEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun signageDao(): SignageDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: android.content.Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "screencast_signage.db"
                ).fallbackToDestructiveMigration().build()
                INSTANCE = instance
                instance
            }
        }
    }
}
