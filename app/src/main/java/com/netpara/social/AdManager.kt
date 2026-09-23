package com.netpara.social

import android.app.Activity
import android.content.Context
import android.util.Log
import android.view.ViewGroup
import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdSize
import com.google.android.gms.ads.AdView
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback

class AdManager(private val activity: Activity) {

    companion object {
        private const val TAG = "NetParaAdManager"

        // Official Google AdMob Test Ad Unit IDs
        const val BANNER_TEST_ID = "ca-app-pub-3940256099942544/6300978111"
        const val INTERSTITIAL_TEST_ID = "ca-app-pub-3940256099942544/1033173712"
        const val REWARDED_TEST_ID = "ca-app-pub-3940256099942544/5224354917"

        private const val MIN_INTERSTITIAL_INTERVAL_MS = 60_000L // 60 seconds frequency cap
    }

    private var interstitialAd: InterstitialAd? = null
    private var rewardedAd: RewardedAd? = null
    private var isAdFree: Boolean = true
    private var lastInterstitialTimeMs: Long = 0L
    private var isInitialized = false

    init {
        // Ads disabled per user configuration (No test ads)
        Log.d(TAG, "AdManager initialized with ads disabled (clean ad-free experience)")
    }

    fun setAdFree(adFree: Boolean) {
        this.isAdFree = adFree
    }

    fun isAdFreeUser(): Boolean = true

    fun loadBanner(container: ViewGroup) {
        container.removeAllViews()
        container.visibility = android.view.View.GONE
    }

    fun loadInterstitialAd() {
        // No-op: test ads removed
    }

    fun showInterstitial(onAdDismissed: (() -> Unit)? = null): Boolean {
        onAdDismissed?.invoke()
        return false
    }

    fun loadRewardedAd() {
        // No-op: test ads removed
    }

    fun showRewarded(onRewardEarned: (rewardAmount: Int, rewardType: String) -> Unit, onDismissed: (() -> Unit)? = null): Boolean {
        // Grant reward instantly without showing intrusive test ads
        onRewardEarned(1, "gold_pass")
        onDismissed?.invoke()
        return true
    }
}
