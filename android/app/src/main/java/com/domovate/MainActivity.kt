package com.domovate

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.modules.core.DeviceEventManagerModule

class MainActivity : ReactActivity() {

    override fun getMainComponentName(): String = "DomoVate"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

    private val uiRefreshReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val deviceId = intent.getStringExtra("deviceId")
            val status = intent.getStringExtra("status")

            val params: WritableMap = Arguments.createMap()
            params.putString("deviceId", deviceId)
            params.putString("status", status)

            reactInstanceAssistant?.emitEvent("onStatusUpdate", params)
        }
    }

    private var reactInstanceAssistant: ReactInstanceAssistant? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        reactInstanceAssistant = ReactInstanceAssistant()
        
        val filter = IntentFilter("com.domovate.REFRESH_UI")
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(uiRefreshReceiver, filter, Context.RECEIVER_EXPORTED)
        } else {
            registerReceiver(uiRefreshReceiver, filter)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        unregisterReceiver(uiRefreshReceiver)
    }

    inner class ReactInstanceAssistant {
        fun emitEvent(eventName: String, params: WritableMap?) {
            if (reactContext != null && reactContext!!.hasActiveCatalystInstance()) {
                reactContext!!
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit(eventName, params)
            }
        }
    }

    private val reactContext get() = reactInstanceManager.currentReactContext
}