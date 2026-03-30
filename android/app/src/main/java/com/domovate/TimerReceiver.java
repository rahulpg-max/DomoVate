package com.domovate;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class TimerReceiver extends BroadcastReceiver {
    private static final String AUTH_KEY = "M2I5ZDNidWlkDE0CE3CE8E285355F35159C6C0AE7503CA7F72435F6FD6E3B5E8848A16B87DC637B15E4216B18832";
    private static final String SHELLY_URL = "https://shelly-233-eu.shelly.cloud/device/relay/control";

    @Override
    public void onReceive(final Context context, Intent intent) {
        final String deviceId = intent.getStringExtra("deviceId");
        final String command = intent.getStringExtra("command");

        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    URL url = new URL(SHELLY_URL);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setDoOutput(true);
                    String postData = "channel=0&turn=" + command + "&id=" + deviceId + "&auth_key=" + AUTH_KEY;
                    conn.getOutputStream().write(postData.getBytes("UTF-8"));
                    int responseCode = conn.getResponseCode();
                    conn.disconnect();

                    if (responseCode == HttpURLConnection.HTTP_OK) {
                        SharedPreferences prefs = context.getSharedPreferences("DATA", Context.MODE_PRIVATE);
                        prefs.edit().putString("status_Hall Light", command.toUpperCase()).apply();

                        Intent syncIntent = new Intent("com.domovate.REFRESH_UI");
                        syncIntent.putExtra("deviceId", deviceId);
                        syncIntent.putExtra("status", command.toUpperCase());
                        context.sendBroadcast(syncIntent);
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }).start();
    }
}