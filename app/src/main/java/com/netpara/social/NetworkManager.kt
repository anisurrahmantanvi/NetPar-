package com.netpara.social

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import org.json.JSONObject

class NetworkManager(private val context: Context) {

    private val connectivityManager =
        context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager

    var onStatusChanged: ((isConnected: Boolean, connectionType: String) -> Unit)? = null

    private var networkCallback: ConnectivityManager.NetworkCallback? = null

    fun startListening() {
        if (connectivityManager == null) return

        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()

        networkCallback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                notifyStatus()
            }

            override fun onLost(network: Network) {
                notifyStatus()
            }

            override fun onCapabilitiesChanged(
                network: Network,
                networkCapabilities: NetworkCapabilities
            ) {
                notifyStatus()
            }
        }

        try {
            connectivityManager.registerNetworkCallback(request, networkCallback!!)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun stopListening() {
        networkCallback?.let {
            try {
                connectivityManager?.unregisterNetworkCallback(it)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun notifyStatus() {
        val status = getNetworkStatusJson()
        val isConnected = status.optBoolean("connected", false)
        val type = status.optString("type", "UNKNOWN")
        onStatusChanged?.invoke(isConnected, type)
    }

    fun getNetworkStatusJson(): JSONObject {
        val json = JSONObject()
        if (connectivityManager == null) {
            json.put("connected", false)
            json.put("type", "NONE")
            return json
        }

        val activeNetwork = connectivityManager.activeNetwork
        val capabilities = connectivityManager.getNetworkCapabilities(activeNetwork)

        if (activeNetwork != null && capabilities != null) {
            val hasInternet = capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            val type = when {
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "WIFI"
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "CELLULAR"
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "ETHERNET"
                else -> "OTHER"
            }
            json.put("connected", hasInternet)
            json.put("type", type)
        } else {
            json.put("connected", false)
            json.put("type", "NONE")
        }
        return json
    }
}
