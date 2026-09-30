package com.screencast.player.connection

import android.content.Context
import android.util.Log
import com.screencast.player.network.HealthResponse
import com.screencast.player.network.ScreenCastApi
import com.screencast.player.security.KeyStoreHelper
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

class ServerConnectionManager(
    private val context: Context,
    private val keyStoreHelper: KeyStoreHelper
) {
    private val TAG = "ServerConnectionManager"

    val okHttpClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(75, TimeUnit.SECONDS)
            .readTimeout(90, TimeUnit.SECONDS)
            .writeTimeout(90, TimeUnit.SECONDS)
            .addInterceptor(HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BASIC
            })
            .build()
    }

    private var currentRetrofit: Retrofit? = null
    private var currentApi: ScreenCastApi? = null
    private var lastUrl: String = ""

    fun getApi(): ScreenCastApi {
        val serverUrl = keyStoreHelper.getServerUrl()
        if (currentApi != null && lastUrl == serverUrl) {
            return currentApi!!
        }

        lastUrl = serverUrl
        val retrofit = Retrofit.Builder()
            .baseUrl(if (serverUrl.endsWith("/")) serverUrl else "$serverUrl/")
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        currentRetrofit = retrofit
        currentApi = retrofit.create(ScreenCastApi::class.java)
        return currentApi!!
    }

    suspend fun testConnection(): Boolean = withContext(Dispatchers.IO) {
        try {
            val response = getApi().checkHealth()
            if (response.isSuccessful && response.body()?.status == "ok") {
                Log.d(TAG, "Connection successful: ${response.body()?.service}")
                true
            } else {
                Log.w(TAG, "Health check failed: HTTP ${response.code()}")
                false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to connect to ${keyStoreHelper.getServerUrl()}", e)
            false
        }
    }
}
