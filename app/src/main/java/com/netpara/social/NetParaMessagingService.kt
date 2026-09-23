package com.netpara.social

import android.app.NotificationChannel
import android.app.NotificationManager as AndroidNotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import org.json.JSONObject

class NetParaMessagingService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "NetParaFCM"
        const val CALL_CHANNEL_ID = "netpara_calls_channel"
        const val CALL_NOTIFICATION_ID = 9001
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "New FCM Registration Token: $token")
        // Store token locally and sync to user profile if available
        val prefs = getSharedPreferences("netpara_secure_prefs", Context.MODE_PRIVATE)
        prefs.edit().putString("fcm_token", token).apply()
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        Log.d(TAG, "From: ${remoteMessage.from}")

        val data = remoteMessage.data
        if (data.isNotEmpty()) {
            val type = data["type"] ?: ""
            if (type == "incoming_call" || type == "call_signal") {
                handleIncomingCallNotification(data)
            } else {
                val title = data["title"] ?: remoteMessage.notification?.title ?: "NetPara"
                val body = data["body"] ?: remoteMessage.notification?.body ?: "New activity"
                showStandardNotification(title, body)
            }
        } else {
            remoteMessage.notification?.let {
                showStandardNotification(it.title ?: "NetPara", it.body ?: "")
            }
        }
    }

    private fun handleIncomingCallNotification(data: Map<String, String>) {
        val callerName = data["callerName"] ?: "A friend"
        val callType = data["callType"] ?: "voice"
        val callId = data["callId"] ?: ""
        val callerUid = data["callerUid"] ?: ""
        val callerAvatar = data["callerAvatar"] ?: ""

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as AndroidNotificationManager
        createCallChannelIfNeeded(notificationManager)

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("action", "incoming_call")
            putExtra("callId", callId)
            putExtra("callerName", callerName)
            putExtra("callerUid", callerUid)
            putExtra("callType", callType)
            putExtra("callerAvatar", callerAvatar)
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            CALL_NOTIFICATION_ID,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        val ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)

        val builder = NotificationCompat.Builder(this, CALL_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_sys_phone_call)
            .setContentTitle("Incoming $callType Call")
            .setContentText("$callerName is calling you on NetPara")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setAutoCancel(true)
            .setSound(ringtoneUri)
            .setVibrate(longArrayOf(0, 1000, 1000, 1000))
            .setFullScreenIntent(pendingIntent, true)
            .setContentIntent(pendingIntent)

        notificationManager.notify(CALL_NOTIFICATION_ID, builder.build())
    }

    private fun showStandardNotification(title: String, body: String) {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as AndroidNotificationManager
        val channelId = "netpara_social_channel"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Social Updates",
                AndroidNotificationManager.IMPORTANCE_DEFAULT
            )
            notificationManager.createNotificationChannel(channel)
        }

        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            (System.currentTimeMillis() % 10000).toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        notificationManager.notify((System.currentTimeMillis() % 100000).toInt(), notification)
    }

    private fun createCallChannelIfNeeded(notificationManager: AndroidNotificationManager) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CALL_CHANNEL_ID,
                "Incoming Calls",
                AndroidNotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Urgent incoming audio and video call notifications"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 1000, 1000, 1000)
                setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE), null)
                setShowBadge(true)
            }
            notificationManager.createNotificationChannel(channel)
        }
    }
}
