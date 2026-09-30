package com.screencast.player

import android.os.Bundle
import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.util.Log
import android.view.KeyEvent
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.lifecycleScope
import coil.compose.AsyncImage
import com.screencast.player.activation.ActivationManager
import com.screencast.player.activation.ActivationUIState
import com.screencast.player.connection.ServerConnectionManager
import com.screencast.player.database.AppDatabase
import com.screencast.player.network.WebSocketClient
import com.screencast.player.playback.SlideshowPlayer
import com.screencast.player.security.KeyStoreHelper
import com.screencast.player.storage.MediaFileManager
import com.screencast.player.sync.DownloadEngine
import com.screencast.player.sync.HeartbeatManager
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.io.File

enum class AppState {
    SPLASH,
    CONNECTING,
    CONNECTION_FAILED,
    ACCOUNT_SUSPENDED,
    ACTIVATION_REQUEST,
    WAITING_FOR_REGISTRATION,
    REGISTERED,
    DOWNLOADING,
    READY,
    PLAYING
}

class MainActivity : ComponentActivity() {
    private val TAG = "ScreenCastMainActivity"

    private lateinit var keyStoreHelper: KeyStoreHelper
    private lateinit var mediaFileManager: MediaFileManager
    private lateinit var db: AppDatabase
    private lateinit var connectionManager: ServerConnectionManager
    private lateinit var downloadEngine: DownloadEngine
    private lateinit var activationManager: ActivationManager
    private lateinit var slideshowPlayer: SlideshowPlayer
    private lateinit var heartbeatManager: HeartbeatManager
    private lateinit var webSocketClient: WebSocketClient
    private lateinit var connectivityManager: ConnectivityManager
    private var networkCallback: ConnectivityManager.NetworkCallback? = null
    private var suspendedValidUntil by mutableStateOf<String?>(null)

    private val appStateFlow = mutableStateFlow(AppState.SPLASH)
    private var showExitDialog by mutableStateOf(false)
    private var showSettingsDialog by mutableStateOf(false)

    private fun <T> mutableStateFlow(initial: T) = androidx.compose.runtime.mutableStateOf(initial)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Keep screen always on for Digital Signage
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        // Initialize core architecture components
        keyStoreHelper = KeyStoreHelper(this)
        mediaFileManager = MediaFileManager(this)
        db = AppDatabase.getInstance(this)
        connectionManager = ServerConnectionManager(this, keyStoreHelper)
        downloadEngine = DownloadEngine(connectionManager, mediaFileManager, db, keyStoreHelper)
        activationManager = ActivationManager(connectionManager, keyStoreHelper)
        slideshowPlayer = SlideshowPlayer(this, db)
        heartbeatManager = HeartbeatManager(
            connectionManager,
            keyStoreHelper,
            mediaFileManager,
            db
        ) { status ->
            lifecycleScope.launch { handleAccountStatus(status.accountStatus, status.validUntil) }
        }

        // WebSocket for instantaneous content updates
        webSocketClient = WebSocketClient(
            okHttpClient = connectionManager.okHttpClient,
            onContentUpdate = { screenId, playlistVersion, configVersion ->
                Log.d(TAG, "WS: Content update available: v$playlistVersion")
                lifecycleScope.launch {
                    downloadEngine.synchronize(playlistVersion)
                    slideshowPlayer.reloadIfUpdated()
                }
            },
            onDeviceActivated = { screenId, screenName ->
                Log.d(TAG, "WS: Device activated for screen: $screenName")
                lifecycleScope.launch {
                    initiatePlaybackOrDownload()
                }
            },
            onDeviceUnregistered = {
                lifecycleScope.launch {
                    slideshowPlayer.stop()
                    heartbeatManager.stop()
                    keyStoreHelper.resetRegistration()
                    startLaunchSequence()
                }
            },
            onScreenRenewed = {
                lifecycleScope.launch { startLaunchSequence() }
            }
        )

        connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        networkCallback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                val capabilities = connectivityManager.getNetworkCapabilities(network)
                if (capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true &&
                    appStateFlow.value in setOf(AppState.CONNECTION_FAILED, AppState.ACTIVATION_REQUEST)
                ) {
                    lifecycleScope.launch { startLaunchSequence() }
                }
            }
        }.also { connectivityManager.registerDefaultNetworkCallback(it) }

        setContent {
            ScreenCastPlayerTheme {
                val state = appStateFlow.value
                val activationUI by activationManager.uiState.collectAsState()
                val syncProgress by downloadEngine.syncProgress.collectAsState()
                val slideState by slideshowPlayer.displayState.collectAsState()

                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color(0xFF0F172A))
                ) {
                    when (state) {
                        AppState.SPLASH -> SplashScreen()
                        AppState.CONNECTING -> ConnectingScreen(keyStoreHelper.getServerUrl())
                        AppState.CONNECTION_FAILED -> ConnectionFailedScreen(
                            serverUrl = keyStoreHelper.getServerUrl(),
                            onRetry = { lifecycleScope.launch { startLaunchSequence() } },
                            onOpenSettings = { showSettingsDialog = true }
                        )
                        AppState.ACCOUNT_SUSPENDED -> AccountSuspendedScreen(suspendedValidUntil)
                        AppState.ACTIVATION_REQUEST, AppState.WAITING_FOR_REGISTRATION -> {
                            ActivationScreen(
                                activationState = activationUI
                            )
                        }
                        AppState.DOWNLOADING -> DownloadingScreen(syncProgress)
                        AppState.READY, AppState.PLAYING -> {
                            FullscreenSlideshow(slideState)
                        }
                        else -> Box(modifier = Modifier.fillMaxSize())
                    }

                    // Exit Confirmation Dialog (Remote D-Pad Control)
                    if (showExitDialog) {
                        ExitConfirmationDialog(
                            onDismiss = { showExitDialog = false },
                            onOpenSettings = {
                                showExitDialog = false
                                showSettingsDialog = true
                            },
                            onExitApp = { finishAffinity() }
                        )
                    }

                    // Server Settings Dialog
                    if (showSettingsDialog) {
                        ServerSettingsDialog(
                            currentUrl = keyStoreHelper.getServerUrl(),
                            onSave = { newUrl ->
                                keyStoreHelper.saveServerUrl(newUrl)
                                showSettingsDialog = false
                                lifecycleScope.launch { startLaunchSequence() }
                            },
                            onDismiss = { showSettingsDialog = false }
                        )
                    }
                }
            }
        }

        lifecycleScope.launch {
            startLaunchSequence()
        }
    }

    private suspend fun startLaunchSequence() {
        appStateFlow.value = AppState.SPLASH
        delay(1200)

        // 1. Check if cached playlist exists (Offline first!)
        val activePlaylist = db.signageDao().getActivePlaylist()
        val hasCachedMedia = activePlaylist != null && db.signageDao().getPlaylistItems(activePlaylist.playlistId).isNotEmpty()

        // 2. Check connection to local server
        appStateFlow.value = AppState.CONNECTING
        val isConnected = connectionManager.testConnection()

        if (!isConnected) {
            if (hasCachedMedia) {
                // Critical Phase 1 Requirement: If disconnected, continue/start cached playback!
                Log.d(TAG, "Server unreachable, but cached playlist v${activePlaylist!!.version} exists. Starting offline playback.")
                appStateFlow.value = AppState.PLAYING
                slideshowPlayer.loadAndStart()
                return
            } else {
                appStateFlow.value = AppState.CONNECTION_FAILED
                return
            }
        }

        // 3. Server reachable: Check registration
        val creds = keyStoreHelper.getCredentials()
        webSocketClient.connect(keyStoreHelper.getServerUrl(), creds.deviceId)
        heartbeatManager.start()

        if (!creds.isRegistered || creds.deviceId == null) {
            appStateFlow.value = AppState.ACTIVATION_REQUEST
            activationManager.startActivationFlow()

            // Observe activation success
            lifecycleScope.launch {
                activationManager.uiState.collect { uiState ->
                    if (uiState is ActivationUIState.Success) {
                        initiatePlaybackOrDownload()
                    }
                }
            }
        } else {
            val account = heartbeatManager.checkNow()
            if (account == null || account.accountStatus == "ACTIVE") {
                initiatePlaybackOrDownload()
            } else {
                handleAccountStatus(account.accountStatus, account.validUntil)
            }
        }
    }

    private suspend fun handleAccountStatus(status: String, validUntil: String?) {
        when (status) {
            "SUSPENDED" -> {
                suspendedValidUntil = validUntil
                slideshowPlayer.stop()
                appStateFlow.value = AppState.ACCOUNT_SUSPENDED
            }
            "UNREGISTERED" -> {
                slideshowPlayer.stop()
                heartbeatManager.stop()
                keyStoreHelper.resetRegistration()
                appStateFlow.value = AppState.ACTIVATION_REQUEST
                activationManager.startActivationFlow()
            }
            "ACTIVE" -> {
                if (appStateFlow.value == AppState.ACCOUNT_SUSPENDED) {
                    initiatePlaybackOrDownload()
                }
            }
        }
    }

    private suspend fun initiatePlaybackOrDownload() {
        appStateFlow.value = AppState.DOWNLOADING
        val success = downloadEngine.synchronize()

        if (success) {
            appStateFlow.value = AppState.PLAYING
            slideshowPlayer.loadAndStart()
        } else {
            val activePlaylist = db.signageDao().getActivePlaylist()
            if (activePlaylist != null) {
                // Safe activation fallback: use previous active playlist
                appStateFlow.value = AppState.PLAYING
                slideshowPlayer.loadAndStart()
            } else {
                appStateFlow.value = AppState.CONNECTION_FAILED
            }
        }
    }

    // Android TV Remote Control Handlers
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        when (keyCode) {
            KeyEvent.KEYCODE_BACK, KeyEvent.KEYCODE_MENU -> {
                showExitDialog = true
                return true
            }
            KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER -> {
                if (appStateFlow.value == AppState.PLAYING) {
                    showExitDialog = true
                    return true
                }
            }
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onDestroy() {
        super.onDestroy()
        heartbeatManager.stop()
        networkCallback?.let { connectivityManager.unregisterNetworkCallback(it) }
        webSocketClient.disconnect()
        slideshowPlayer.stop()
        activationManager.stop()
    }
}

// -------------------------------------------------------------
// TV COMPOSE SCREENS
// -------------------------------------------------------------

@Composable
fun SplashScreen() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            EkshitaScreenLogo()
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Local Digital Signage Player",
                fontSize = 18.sp,
                color = Color(0xFF94A3B8)
            )
        }
    }
}

@Composable
fun ConnectingScreen(serverUrl: String) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            CircularProgressIndicator(color = Color(0xFF38BDF8), strokeWidth = 3.dp)
            Spacer(modifier = Modifier.height(24.dp))
            Text(
                text = "Connecting to Local Server",
                fontSize = 24.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color.White
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = serverUrl,
                fontSize = 16.sp,
                color = Color(0xFF64748B),
                fontFamily = FontFamily.Monospace
            )
        }
    }
}

@Composable
fun ConnectionFailedScreen(
    serverUrl: String,
    onRetry: () -> Unit,
    onOpenSettings: () -> Unit
) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(32.dp)
        ) {
            Text(
                text = "EkshitaScreen",
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "Connection Failed",
                fontSize = 22.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color(0xFFF87171)
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Unable to connect to the configured local server:\n$serverUrl",
                fontSize = 15.sp,
                color = Color(0xFF94A3B8),
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(32.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                Button(
                    onClick = onRetry,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7))
                ) {
                    Text("Retry")
                }
                OutlinedButton(
                    onClick = onOpenSettings,
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White)
                ) {
                    Text("Server Settings")
                }
            }
        }
    }
}

@Composable
fun AccountSuspendedScreen(validUntil: String?) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(48.dp)
        ) {
            EkshitaScreenLogo()
            Spacer(modifier = Modifier.height(40.dp))
            Text(
                text = "Account Suspended",
                fontSize = 38.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFFF87171)
            )
            Spacer(modifier = Modifier.height(14.dp))
            Text(
                text = "This screen's subscription has expired.",
                fontSize = 20.sp,
                color = Color.White,
                textAlign = TextAlign.Center
            )
            if (!validUntil.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Expired: ${validUntil.take(10)}",
                    fontSize = 16.sp,
                    color = Color(0xFFA8B2C4)
                )
            }
            Spacer(modifier = Modifier.height(18.dp))
            Text(
                text = "Please contact your administrator to renew the account.\nPlayback will resume automatically after renewal.",
                fontSize = 17.sp,
                color = Color(0xFFA8B2C4),
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
fun ActivationScreen(
    activationState: ActivationUIState
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 48.dp, vertical = 28.dp)
        ) {
            EkshitaScreenLogo()
            Spacer(modifier = Modifier.height(30.dp))
            Text(
                text = "Register Your Screen",
                fontSize = 34.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            Spacer(modifier = Modifier.height(26.dp))

            when (activationState) {
                is ActivationUIState.CodeReady -> {
                    Column(
                        modifier = Modifier
                            .widthIn(max = 620.dp)
                            .fillMaxWidth()
                            .background(
                                brush = Brush.horizontalGradient(
                                    listOf(Color(0xFF07162C), Color(0xFF061126))
                                ),
                                shape = RoundedCornerShape(8.dp)
                            )
                            .border(2.dp, Color(0xFF079CF2), RoundedCornerShape(8.dp))
                            .padding(horizontal = 38.dp, vertical = 18.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "SCREEN CODE",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFB6C0D2),
                            letterSpacing = 1.sp
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = activationState.code,
                            fontSize = 58.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF079CF2),
                            letterSpacing = 5.sp,
                            fontFamily = FontFamily.Monospace
                        )
                    }
                    Spacer(modifier = Modifier.height(20.dp))
                    Text(
                        text = "Enter this code in the dashboard to register your screen.",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White,
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Waiting for registration...",
                        fontSize = 16.sp,
                        color = Color(0xFFA8B2C4)
                    )
                }
                is ActivationUIState.Requesting -> {
                    CircularProgressIndicator(color = Color(0xFF079CF2))
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("Generating screen code...", color = Color(0xFFA8B2C4))
                }
                is ActivationUIState.Error -> {
                    Text(
                        activationState.message,
                        color = Color(0xFFF87171),
                        textAlign = TextAlign.Center
                    )
                }
                else -> {}
            }
        }
    }
}

@Composable
private fun EkshitaScreenLogo() {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center
    ) {
        Canvas(modifier = Modifier.size(width = 116.dp, height = 74.dp)) {
            val blue = Color(0xFF079CF2)
            drawRoundRect(
                color = blue,
                topLeft = Offset(size.width * .06f, size.height * .06f),
                size = Size(size.width * .86f, size.height * .72f),
                cornerRadius = CornerRadius(7.dp.toPx()),
                style = androidx.compose.ui.graphics.drawscope.Stroke(width = 7.dp.toPx())
            )
            drawLine(
                color = blue,
                start = Offset(size.width * .50f, size.height * .78f),
                end = Offset(size.width * .50f, size.height * .91f),
                strokeWidth = 7.dp.toPx()
            )
            drawLine(
                color = blue,
                start = Offset(size.width * .34f, size.height * .91f),
                end = Offset(size.width * .66f, size.height * .91f),
                strokeWidth = 7.dp.toPx()
            )

            val playPath = Path().apply {
                moveTo(size.width * .20f, size.height * .25f)
                lineTo(size.width * .20f, size.height * .60f)
                lineTo(size.width * .72f, size.height * .425f)
                close()
            }
            drawPath(
                path = playPath,
                brush = Brush.horizontalGradient(
                    colors = listOf(Color(0xFF0B3A85), blue),
                    startX = size.width * .2f,
                    endX = size.width * .72f
                )
            )
        }
        Spacer(modifier = Modifier.width(12.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = "Ekshita",
                fontSize = 42.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            Text(
                text = "Screen",
                fontSize = 42.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF079CF2)
            )
        }
    }
}

@Composable
fun DownloadingScreen(sync: com.screencast.player.sync.SyncProgress) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.width(450.dp)
        ) {
            Text(
                text = "Synchronizing Content",
                fontSize = 24.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color.White
            )
            Spacer(modifier = Modifier.height(16.dp))
            LinearProgressIndicator(
                progress = { sync.progressPercent / 100f },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp),
                color = Color(0xFF0284C7),
                trackColor = Color(0xFF334155)
            )
            Spacer(modifier = Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = sync.currentFile ?: sync.status,
                    fontSize = 14.sp,
                    color = Color(0xFF94A3B8)
                )
                Text(
                    text = "${sync.progressPercent}%",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
        }
    }
}

@Composable
fun FullscreenSlideshow(state: com.screencast.player.playback.SlideDisplayState) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .rotate(state.rotation.toFloat())
    ) {
        val contentScale = when (state.fitMode.uppercase()) {
            "FILL" -> ContentScale.Crop
            "STRETCH" -> ContentScale.FillBounds
            "CENTER" -> ContentScale.None
            else -> ContentScale.Fit
        }

        AnimatedContent(
            targetState = state.currentImageFile,
            transitionSpec = {
                if (state.transition.equals("SLIDE", ignoreCase = true)) {
                    slideInHorizontally(
                        initialOffsetX = { fullWidth -> fullWidth },
                        animationSpec = tween(state.transitionDurationMs)
                    ) togetherWith slideOutHorizontally(
                        targetOffsetX = { fullWidth -> -fullWidth },
                        animationSpec = tween(state.transitionDurationMs)
                    )
                } else if (state.transition.equals("NONE", ignoreCase = true)) {
                    fadeIn(animationSpec = tween(0)) togetherWith fadeOut(animationSpec = tween(0))
                } else {
                    // Default FADE transition
                    fadeIn(animationSpec = tween(state.transitionDurationMs)) togetherWith
                            fadeOut(animationSpec = tween(state.transitionDurationMs))
                }
            },
            label = "slide_transition"
        ) { targetFile ->
            if (targetFile != null && targetFile.exists()) {
                AsyncImage(
                    model = targetFile,
                    contentDescription = "EkshitaScreen Digital Signage",
                    contentScale = contentScale,
                    modifier = Modifier.fillMaxSize()
                )
            } else {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Text("No media loaded", color = Color.Gray)
                }
            }
        }
    }
}

@Composable
fun ExitConfirmationDialog(
    onDismiss: () -> Unit,
    onOpenSettings: () -> Unit,
    onExitApp: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Exit EkshitaScreen?") },
        text = { Text("You can continue the slideshow, modify local server settings, or close the player.") },
        confirmButton = {
            Button(onClick = onDismiss) {
                Text("Continue Slideshow")
            }
        },
        dismissButton = {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = onOpenSettings) {
                    Text("Open Settings")
                }
                Button(
                    onClick = onExitApp,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626))
                ) {
                    Text("Exit Application")
                }
            }
        }
    )
}

@Composable
fun ServerSettingsDialog(
    currentUrl: String,
    onSave: (String) -> Unit,
    onDismiss: () -> Unit
) {
    var urlText by remember { mutableStateOf(currentUrl) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Local Server Settings") },
        text = {
            Column {
                Text(
                    text = "Configure the HTTP address of the local EkshitaScreen backend:",
                    fontSize = 14.sp
                )
                Spacer(modifier = Modifier.height(12.dp))
                OutlinedTextField(
                    value = urlText,
                    onValueChange = { urlText = it },
                    label = { Text("Backend URL") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(onClick = { onSave(urlText) }) {
                Text("Save & Connect")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}

@Composable
fun ScreenCastPlayerTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Color(0xFF0284C7),
            background = Color(0xFF0F172A),
            surface = Color(0xFF1E293B)
        ),
        content = content
    )
}
