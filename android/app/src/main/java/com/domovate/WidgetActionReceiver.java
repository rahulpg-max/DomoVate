package com.domovate;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.appwidget.AppWidgetManager;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class WidgetActionReceiver extends BroadcastReceiver {
    private static final String AUTH_KEY = "M2I5ZDNidWlkDE0CE3CE8E285355F35159C6C0AE7503CA7F72435F6FD6E3B5E8848A16B87DC637B15E4216B18832";
    private static final String SHELLY_URL = "https://shelly-233-eu.shelly.cloud/device/relay/control";

    @Override
    public void onReceive(final Context context, Intent intent) {
        final int widgetId = intent.getIntExtra("widgetId", -1);
        final SharedPreferences prefs = context.getSharedPreferences("DATA", Context.MODE_PRIVATE);
        
        final String statusKey = "status_" + widgetId;
        final String currentStatus = prefs.getString(statusKey, "OFF");
        final String newStatus = currentStatus.equalsIgnoreCase("ON") ? "off" : "on";
        final String deviceId = prefs.getString("deviceId_" + widgetId, ""); // Device ID link honi chahiye

        // UI ko turant badlo (Optimistic UI)
        prefs.edit().putString(statusKey, newStatus.toUpperCase()).apply();
        updateAllWidgets(context);

        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    URL url = new URL(SHELLY_URL);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setDoOutput(true);
                    String postData = "channel=0&turn=" + newStatus + "&id=" + deviceId + "&auth_key=" + AUTH_KEY;
                    conn.getOutputStream().write(postData.getBytes("UTF-8"));
                    conn.getResponseCode();
                    conn.disconnect();
                } catch (Exception e) {
                    // Revert status if failed
                    prefs.edit().putString(statusKey, currentStatus).apply();
                    updateAllWidgets(context);
                }
            }
        }).start();
    }

    private void updateAllWidgets(Context context) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(context);
        int[] ids = mgr.getAppWidgetIds(new android.content.ComponentName(context, HomeWidgetProvider.class));
        for (int id : ids) HomeWidgetProvider.updateAppWidget(context, mgr, id);
    }
}