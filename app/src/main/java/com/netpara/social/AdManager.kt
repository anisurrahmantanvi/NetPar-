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
    private var isAdFree: Boolean = false
    private var lastInterstitialTimeMs: Long = 0L
    private var isInitialized = false

    init {
        try {
            MobileAds.initialize(activity) {
                isInitialized = true
                Log.d(TAG, "Google Mobile Ads SDK initialized successfully")
                loadInterstitialAd()
                loadRewardedAd()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize MobileAds SDK: ${e.message}")
        }
    }

    fun setAdFree(adFree: Boolean) {
        this.isAdFree = adFree
    }

    fun isAdFreeUser(): Boolean = isAdFree

    fun loadBanner(container: ViewGroup) {
        if (isAdFree) {
            container.removeAllViews()
            return
        }

        try {
            container.removeAllViews()
            val adView = AdView(activity).apply {
                setAdSize(AdSize.BANNER)
                adUnitId = BANNER_TEST_ID
            }
            container.addView(adView)
            val adRequest = AdRequest.Builder().build()
            adView.loadAd(adRequest)
        } catch (e: Exception) {
            Log.e(TAG, "Error loading banner ad: ${e.message}")
        }
    }

    fun loadInterstitialAd() {
        if (isAdFree) return

        val adRequest = AdRequest.Builder().build()
        InterstitialAd.load(
            activity,
            INTERSTITIAL_TEST_ID,
            adRequest,
            object : InterstitialAdLoadCallback() {
                override fun onAdLoaded(ad: InterstitialAd) {
                    interstitialAd = ad
                    Log.d(TAG, "Interstitial ad loaded successfully")
                }

                override fun onAdFailedToLoad(error: LoadAdError) {
                    interstitialAd = null
                    Log.w(TAG, "Interstitial ad failed to load: ${error.message}")
                }
            }
        )
    }

    fun showInterstitial(onAdDismissed: (() -> Unit)? = null): Boolean {
        if (isAdFree) {
            onAdDismissed?.invoke()
            return false
        }

        val now = System.currentTimeMillis()
        if (now - lastInterstitialTimeMs < MIN_INTERSTITIAL_INTERVAL_MS) {
            Log.d(TAG, "Interstitial throttled by frequency cap")
            onAdDismissed?.invoke()
            return false
        }

        val ad = interstitialAd
        if (ad != null) {
            ad.fullScreenContentCallback = object : FullScreenContentCallback() {
                override fun onAdDismissedFullScreenContent() {
                    interstitialAd = null
                    lastInterstitialTimeMs = System.currentTimeMillis()
                    loadInterstitialAd()
                    onAdDismissed?.invoke()
                }

                override fun onAdFailedToShowFullScreenContent(adError: AdError) {
                    interstitialAd = null
                    loadInterstitialAd()
                    onAdDismissed?.invoke()
                }
            }
            ad.show(activity)
            return true
        } else {
            loadInterstitialAd()
            onAdDismissed?.invoke()
            return false
        }
    }

    fun loadRewardedAd() {
        val adRequest = AdRequest.Builder().build()
        RewardedAd.load(
            activity,
            REWARDED_TEST_ID,
            adRequest,
            object : RewardedAdLoadCallback() {
                override fun onAdLoaded(ad: RewardedAd) {
                    rewardedAd = ad
                    Log.d(TAG, "Rewarded ad loaded successfully")
                }

                override fun onAdFailedToLoad(error: LoadAdError) {
                    rewardedAd = null
                    Log.w(TAG, "Rewarded ad failed to load: ${error.message}")
                }
            }
        )
    }

    fun showRewarded(onRewardEarned: (rewardAmount: Int, rewardType: String) -> Unit, onDismissed: (() -> Unit)? = null): Boolean {
        val ad = rewardedAd
        if (ad != null) {
            ad.fullScreenContentCallback = object : FullScreenContentCallback() {
                override fun onAdDismissedFullScreenContent() {
                    rewardedAd = null
                    loadRewardedAd()
                    onDismissed?.invoke()
                }

                override fun onAdFailedToShowFullScreenContent(adError: AdError) {
                    rewardedAd = null
                    loadRewardedAd()
                    onDismissed?.invoke()
                }
            }
            ad.show(activity) { rewardItem ->
                onRewardEarned(rewardItem.amount, rewardItem.type)
            }
            return true
        } else {
            loadRewardedAd()
            onDismissed?.invoke()
            return false
        }
    }
}
