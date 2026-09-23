package com.netpara.social

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.media.Ringtone
import android.media.RingtoneManager
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.util.Log

class CallAudioManager(private val context: Context) {

    companion object {
        private const val TAG = "NetParaCallAudio"
    }

    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    private var ringtone: Ringtone? = null
    private var originalMode = AudioManager.MODE_NORMAL
    private var isVibrating = false

    fun startCallAudio(isVideo: Boolean) {
        try {
            stopRingtone()
            originalMode = audioManager.mode
            audioManager.mode = AudioManager.MODE_IN_COMMUNICATION

            // Default to speaker for video calls, earpiece for voice calls
            setSpeakerphone(isVideo)
            audioManager.isMicrophoneMute = false
        } catch (e: Exception) {
            Log.e(TAG, "Error starting call audio", e)
        }
    }

    fun setSpeakerphone(enable: Boolean) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val devices = audioManager.availableCommunicationDevices
                val targetType = if (enable) AudioDeviceInfo.TYPE_BUILTIN_SPEAKER else AudioDeviceInfo.TYPE_BUILTIN_EARPIECE
                val targetDevice = devices.firstOrNull { it.type == targetType }
                if (targetDevice != null) {
                    audioManager.setCommunicationDevice(targetDevice)
                } else {
                    @Suppress("DEPRECATION")
                    audioManager.isSpeakerphoneOn = enable
                }
            } else {
                @Suppress("DEPRECATION")
                audioManager.isSpeakerphoneOn = enable
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error setting speakerphone: $enable", e)
        }
    }

    fun setMicrophoneMute(muted: Boolean) {
        try {
            audioManager.isMicrophoneMute = muted
        } catch (e: Exception) {
            Log.e(TAG, "Error setting microphone mute: $muted", e)
        }
    }

    fun endCallAudio() {
        try {
            stopRingtone()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                audioManager.clearCommunicationDevice()
            }
            @Suppress("DEPRECATION")
            audioManager.isSpeakerphoneOn = false
            audioManager.mode = AudioManager.MODE_NORMAL
            audioManager.isMicrophoneMute = false
        } catch (e: Exception) {
            Log.e(TAG, "Error ending call audio", e)
        }
    }

    fun playRingtone(isIncoming: Boolean) {
        try {
            stopRingtone()
            val uri = if (isIncoming) {
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            } else {
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            }

            ringtone = RingtoneManager.getRingtone(context, uri)?.apply {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    audioAttributes = AudioAttributes.Builder()
                        .setUsage(if (isIncoming) AudioAttributes.USAGE_NOTIFICATION_RINGTONE else AudioAttributes.USAGE_VOICE_COMMUNICATION)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                }
                play()
            }

            if (isIncoming) {
                startVibrationPattern()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error playing ringtone", e)
        }
    }

    fun stopRingtone() {
        try {
            ringtone?.let {
                if (it.isPlaying) {
                    it.stop()
                }
            }
            ringtone = null
            stopVibration()
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping ringtone", e)
        }
    }

    private fun startVibrationPattern() {
        try {
            if (vibrator != null && vibrator.hasVibrator()) {
                isVibrating = true
                val pattern = longArrayOf(0, 1000, 1000)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0))
                } else {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(pattern, 0)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error starting vibration", e)
        }
    }

    private fun stopVibration() {
        try {
            if (isVibrating) {
                vibrator?.cancel()
                isVibrating = false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping vibration", e)
        }
    }
}
