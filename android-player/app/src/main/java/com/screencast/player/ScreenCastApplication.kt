package com.screencast.player

import android.app.Application
import android.util.Log

class ScreenCastApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        Log.d("EkshitaScreen", "EkshitaScreen TV application initialized")
    }
}
