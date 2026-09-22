package com.netpara.social

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.webkit.JavascriptInterface
import android.widget.Toast
import org.json.JSONObject

class WebAppInterface(private val activity: MainActivity) {

    private val prefs = activity.getSharedPreferences("netpara_secure_prefs", Context.MODE_PRIVATE)

    @JavascriptInterface
    fun showToast(message: String) {
        activity.runOnUiThread {
            Toast.makeText(activity, message, Toast.LENGTH_SHORT).show()
        }
    }

    @JavascriptInterface
    fun vibrate(durationMs: Long) {
        val vibrator = activity.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        if (vibrator != null && vibrator.hasVibrator()) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(
                    VibrationEffect.createOneShot(
                        durationMs.coerceIn(10, 500),
                        VibrationEffect.DEFAULT_AMPLITUDE
                    )
                )
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(durationMs.coerceIn(10, 500))
            }
        }
    }

    @JavascriptInterface
    fun sendNativeNotification(title: String, body: String, type: String, payload: String?) {
        val id = (System.currentTimeMillis() % 100000).toInt()
        activity.notificationManager.showNotification(id, title, body, type, payload)
    }

    @JavascriptInterface
    fun getNetworkStatus(): String {
        return activity.networkManager.getNetworkStatusJson().toString()
    }

    @JavascriptInterface
    fun showInterstitialAd() {
        activity.runOnUiThread {
            activity.adManager.showInterstitial {
                activity.webViewManager.executeJs("window.onInterstitialDismissed && window.onInterstitialDismissed();")
            }
        }
    }

    @JavascriptInterface
    fun showRewardedAd() {
        activity.runOnUiThread {
            activity.adManager.showRewarded(
                onRewardEarned = { amount, type ->
                    activity.webViewManager.executeJs("window.onRewardedAdSuccess && window.onRewardedAdSuccess($amount, '$type');")
                },
                onDismissed = {
                    activity.webViewManager.executeJs("window.onRewardedAdDismissed && window.onRewardedAdDismissed();")
                }
            )
        }
    }

    @JavascriptInterface
    fun setAdFree(isAdFree: Boolean) {
        activity.adManager.setAdFree(isAdFree)
        activity.runOnUiThread {
            if (isAdFree) {
                activity.hideBannerAd()
            } else {
                activity.showBannerAd()
            }
        }
    }

    @JavascriptInterface
    fun isAdFree(): Boolean {
        return activity.adManager.isAdFreeUser()
    }

    @JavascriptInterface
    fun shareContent(title: String, text: String, url: String) {
        activity.runOnUiThread {
            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_SUBJECT, title)
                putExtra(Intent.EXTRA_TEXT, "$text\n$url".trim())
            }
            activity.startActivity(Intent.createChooser(shareIntent, "Share via NetPará"))
        }
    }

    @JavascriptInterface
    fun copyToClipboard(text: String) {
        activity.runOnUiThread {
            val clipboard = activity.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
            val clip = ClipData.newPlainText("NetPara Copy", text)
            clipboard?.setPrimaryClip(clip)
            Toast.makeText(activity, "Copied to clipboard", Toast.LENGTH_SHORT).show()
        }
    }

    @JavascriptInterface
    fun saveLocalData(key: String, value: String) {
        prefs.edit().putString(key, value).apply()
    }

    @JavascriptInterface
    fun getLocalData(key: String): String {
        return prefs.getString(key, "") ?: ""
    }

    @JavascriptInterface
    fun removeLocalData(key: String) {
        prefs.edit().remove(key).apply()
    }

    @JavascriptInterface
    fun getDeviceInfo(): String {
        val json = JSONObject()
        json.put("platform", "Android")
        json.put("osVersion", Build.VERSION.RELEASE)
        json.put("sdkInt", Build.VERSION.SDK_INT)
        json.put("appName", "NetPará")
        json.put("versionName", "1.0.0")
        return json.toString()
    }
}
