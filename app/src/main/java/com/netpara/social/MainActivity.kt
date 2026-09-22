package com.netpara.social

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.MediaStore
import android.view.View
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.widget.FrameLayout
import android.widget.LinearLayout
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat

open class MainActivity : ComponentActivity() {

    lateinit var webView: WebView
    lateinit var bannerContainer: FrameLayout
    lateinit var webViewManager: WebViewManager
    lateinit var adManager: AdManager
    lateinit var notificationManager: NotificationManager
    lateinit var networkManager: NetworkManager
    lateinit var webAppInterface: WebAppInterface

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val callback = webViewManager.fileChooserCallback ?: return@registerForActivityResult
        if (result.resultCode == Activity.RESULT_OK) {
            val data = result.data
            val results: Array<Uri>? = when {
                data?.data != null -> arrayOf(data.data!!)
                data?.clipData != null -> {
                    val count = data.clipData!!.itemCount
                    Array(count) { i -> data.clipData!!.getItemAt(i).uri }
                }
                else -> null
            }
            callback.onReceiveValue(results)
        } else {
            callback.onReceiveValue(null)
        }
        webViewManager.fileChooserCallback = null
    }

    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            notificationManager.showNotification(
                1001,
                "Welcome to NetPará",
                "Notifications enabled! You will be alerted when friends interact with you.",
                "system"
            )
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Modern Edge-to-Edge handling
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = Color.TRANSPARENT
        window.navigationBarColor = Color.TRANSPARENT

        // Build native root view hierarchy programmatically for speed and reliability
        val rootLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(Color.parseColor("#0F172A"))
        }

        webView = WebView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                1.0f
            )
            setBackgroundColor(Color.parseColor("#0F172A"))
        }

        bannerContainer = FrameLayout(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            visibility = View.VISIBLE
        }

        rootLayout.addView(webView)
        rootLayout.addView(bannerContainer)

        setContentView(rootLayout)

        // Apply WindowInsets for status and navigation bar padding
        ViewCompat.setOnApplyWindowInsetsListener(rootLayout) { _, insets ->
            val statusBarInsets = insets.getInsets(WindowInsetsCompat.Type.statusBars())
            val navBarInsets = insets.getInsets(WindowInsetsCompat.Type.navigationBars())
            rootLayout.setPadding(0, statusBarInsets.top, 0, navBarInsets.bottom)
            insets
        }

        // Initialize Managers
        notificationManager = NotificationManager(this)
        networkManager = NetworkManager(this)
        adManager = AdManager(this)
        webAppInterface = WebAppInterface(this)
        webViewManager = WebViewManager(this, webView)

        webViewManager.setupWebView(webAppInterface)

        // Load AdMob test banner ad
        adManager.loadBanner(bannerContainer)

        // Listen for Network State changes
        networkManager.onStatusChanged = { isConnected, connectionType ->
            runOnUiThread {
                val script = "window.onNetworkStatusChanged && window.onNetworkStatusChanged($isConnected, '$connectionType');"
                webViewManager.executeJs(script)
            }
        }
        networkManager.startListening()

        // Handle Back Navigation smoothly
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                webView.evaluateJavascript("window.handleAppBackPressed ? window.handleAppBackPressed() : false") { result ->
                    val handled = result == "true"
                    if (!handled) {
                        if (webViewManager.canGoBack()) {
                            webViewManager.goBack()
                        } else {
                            isEnabled = false
                            onBackPressedDispatcher.onBackPressed()
                        }
                    }
                }
            }
        })

        // Request notification permission on Android 13+
        requestNotificationPermissionIfNeeded()
    }

    fun launchFileChooser(params: WebChromeClient.FileChooserParams?) {
        val intent = params?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "*/*"
            putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("image/*", "video/*"))
            putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
        }

        // Add camera intent option
        val captureIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
        val chooserIntent = Intent(Intent.ACTION_CHOOSER).apply {
            putExtra(Intent.EXTRA_INTENT, intent)
            putExtra(Intent.EXTRA_TITLE, "Select Photo, Video or Camera")
            putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf(captureIntent))
        }

        try {
            fileChooserLauncher.launch(chooserIntent)
        } catch (e: Exception) {
            e.printStackTrace()
            fileChooserLauncher.launch(intent)
        }
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.POST_NOTIFICATIONS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }

    fun showBannerAd() {
        runOnUiThread {
            bannerContainer.visibility = View.VISIBLE
            adManager.loadBanner(bannerContainer)
        }
    }

    fun hideBannerAd() {
        runOnUiThread {
            bannerContainer.removeAllViews()
            bannerContainer.visibility = View.GONE
        }
    }

    override fun onResume() {
        super.onResume()
        webViewManager.onResume()
    }

    override fun onPause() {
        super.onPause()
        webViewManager.onPause()
    }

    override fun onDestroy() {
        networkManager.stopListening()
        webViewManager.onDestroy()
        super.onDestroy()
    }
}
