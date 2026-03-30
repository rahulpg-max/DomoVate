package com.domovate;

import android.service.quicksettings.Tile;
import android.service.quicksettings.TileService;
import android.content.SharedPreferences;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import org.json.JSONArray;
import org.json.JSONObject;

public class AllLightsTileService extends TileService {

    private static final String CLOUD_URL = "https://shelly-233-eu.shelly.cloud/device/relay/control";
    private static final String AUTH_KEY = "M2I5ZDNidWlkDE0CE3CE8E285355F35159C6C0AE7503CA7F72435F6FD6E3B5E8848A16B87DC637B15E4216B18832";

    @Override
    public void onClick() {
        super.onClick();
        final Tile tile = getQsTile();
        if (tile == null) return;

        SharedPreferences prefs = getSharedPreferences("DATA", MODE_PRIVATE);
        // JSON format: [{"id":"123", "ip":"192.168.1.10"}, {"id":"456", "ip":"192.168.1.11"}]
        String lightsJson = prefs.getString("all_lights_full_data", "[]");

        new Thread(() -> {
            try {
                JSONArray lightsArray = new JSONArray(lightsJson);
                if (lightsArray.length() == 0) return;

                boolean isCurrentlyActive = tile.getState() == Tile.STATE_ACTIVE;
                String nextCommand = isCurrentlyActive ? "off" : "on";

                updateTileState(nextCommand.equals("on") ? Tile.STATE_ACTIVE : Tile.STATE_INACTIVE);

                for (int i = 0; i < lightsArray.length(); i++) {
                    JSONObject light = lightsArray.getJSONObject(i);
                    String deviceId = light.getString("id");
                    String localIp = light.getString("ip");

                    // Step 1: Local try karo
                    boolean localSuccess = sendLocalCommand(nextCommand, localIp);
                    
                    // Step 2: Agar local fail ho toh Cloud par jao
                    if (!localSuccess) {
                        sendCloudCommand(nextCommand, deviceId);
                    }
                }

                Intent syncIntent = new Intent("com.domovate.REFRESH_UI");
                syncIntent.putExtra("deviceId", "ALL_DEVICES");
                syncIntent.putExtra("status", nextCommand.toUpperCase());
                sendBroadcast(syncIntent);

            } catch (Exception e) { e.printStackTrace(); }
        }).start();
    }

    private boolean sendLocalCommand(String command, String ip) {
        if (ip == null || ip.isEmpty()) return false;
        try {
            URL url = new URL("http://" + ip + "/relay/0?turn=" + command);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(1000); // 1 second timeout
            conn.setRequestMethod("GET");
            int code = conn.getResponseCode();
            conn.disconnect();
            return (code == 200);
        } catch (Exception e) {
            return false;
        }
    }

    private void sendCloudCommand(String command, String id) throws Exception {
        URL url = new URL(CLOUD_URL);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setDoOutput(true);
        String postData = "channel=0&turn=" + command + "&id=" + id + "&auth_key=" + AUTH_KEY;
        try (OutputStream os = conn.getOutputStream()) {
            os.write(postData.getBytes("utf-8"));
        }
        conn.getResponseCode();
        conn.disconnect();
    }

    private void updateTileState(int state) {
        new Handler(Looper.getMainLooper()).post(() -> {
            Tile tile = getQsTile();
            if (tile != null) {
                tile.setState(state);
                tile.updateTile();
            }
        });
    }

    @Override
    public void onStartListening() {
        super.onStartListening();
        Tile tile = getQsTile();
        if (tile != null) {
            tile.setLabel("All Lights");
            tile.updateTile();
        }
    }
}