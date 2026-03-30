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
import java.util.Scanner;
import org.json.JSONObject;

public class LightTileService extends TileService {

    private static final String CONTROL_URL = "https://shelly-233-eu.shelly.cloud/device/relay/control";
    private static final String STATUS_URL = "https://shelly-233-eu.shelly.cloud/device/status";
    private static final String AUTH_KEY = "M2I5ZDNidWlkDE0CE3CE8E285355F35159C6C0AE7503CA7F72435F6FD6E3B5E8848A16B87DC637B15E4216B18832";

    @Override
    public void onClick() {
        super.onClick();
        final Tile tile = getQsTile();
        if (tile == null) return;

        SharedPreferences prefs = getSharedPreferences("DATA", MODE_PRIVATE);
        final String deviceId = prefs.getString("hall_light_id", "");
        final String deviceIp = prefs.getString("hall_light_ip", ""); 
        
        if (deviceId.isEmpty()) {
            tile.setLabel("Light");
            tile.updateTile();
            return;
        }

        tile.setLabel("Hall Light");
        final boolean isCurrentlyOn = tile.getState() == Tile.STATE_ACTIVE;
        final String nextCommand = isCurrentlyOn ? "off" : "on";

        tile.setState(nextCommand.equals("on") ? Tile.STATE_ACTIVE : Tile.STATE_INACTIVE);
        tile.updateTile();

        new Thread(() -> {
            boolean success = false;
            try {
                if (deviceIp != null && !deviceIp.isEmpty()) {
                    success = sendLocalCommand(nextCommand, deviceIp);
                }

                if (!success) {
                    success = sendCloudCommand(nextCommand, deviceId);
                }

                if (success) {
                    prefs.edit().putString("status_Hall Light", nextCommand.toUpperCase()).apply();
                    
                    Intent syncIntent = new Intent("com.domovate.REFRESH_UI");
                    syncIntent.putExtra("deviceId", deviceId);
                    syncIntent.putExtra("status", nextCommand.toUpperCase());
                    sendBroadcast(syncIntent);
                } else {
                    updateTileUI(isCurrentlyOn);
                }
            } catch (Exception e) {
                updateTileUI(isCurrentlyOn);
            }
        }).start();
    }

    private boolean sendLocalCommand(String command, String ip) {
        try {
            URL url = new URL("http://" + ip + "/relay/0?turn=" + command);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(1500);
            conn.setRequestMethod("GET");
            int code = conn.getResponseCode();
            conn.disconnect();
            return (code == 200);
        } catch (Exception e) {
            return false;
        }
    }

    private boolean sendCloudCommand(String command, String id) throws Exception {
        URL url = new URL(CONTROL_URL);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setDoOutput(true);
        String postData = "channel=0&turn=" + command + "&id=" + id + "&auth_key=" + AUTH_KEY;
        try (OutputStream os = conn.getOutputStream()) {
            os.write(postData.getBytes("utf-8"));
        }
        int code = conn.getResponseCode();
        conn.disconnect();
        return (code == HttpURLConnection.HTTP_OK);
    }

    private void updateTileUI(boolean active) {
        new Handler(Looper.getMainLooper()).post(() -> {
            Tile tile = getQsTile();
            if (tile != null) {
                tile.setLabel("Hall Light");
                tile.setState(active ? Tile.STATE_ACTIVE : Tile.STATE_INACTIVE);
                tile.updateTile();
            }
        });
    }

    @Override
    public void onStartListening() {
        super.onStartListening();
        final Tile tile = getQsTile();
        if (tile == null) return;

        tile.setLabel("Hall Light");
        tile.updateTile();

        final SharedPreferences prefs = getSharedPreferences("DATA", MODE_PRIVATE);
        final String deviceId = prefs.getString("hall_light_id", "");

        if (deviceId.isEmpty()) {
            tile.setLabel("Light");
            tile.setState(Tile.STATE_UNAVAILABLE);
            tile.updateTile();
            return;
        }

        new Thread(() -> {
            try {
                URL url = new URL(STATUS_URL + "?id=" + deviceId + "&auth_key=" + AUTH_KEY);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                Scanner s = new Scanner(conn.getInputStream()).useDelimiter("\\A");
                String response = s.hasNext() ? s.next() : "";
                
                JSONObject json = new JSONObject(response);
                if (json.getBoolean("isok")) {
                    JSONObject status = json.getJSONObject("data").getJSONObject("device_status");
                    boolean ison;
                    if (status.has("relays")) {
                        ison = status.getJSONArray("relays").getJSONObject(0).getBoolean("ison");
                    } else {
                        ison = status.getJSONObject("relay:0").getBoolean("ison");
                    }
                    
                    new Handler(Looper.getMainLooper()).post(() -> {
                        tile.setLabel("Hall Light");
                        tile.setState(ison ? Tile.STATE_ACTIVE : Tile.STATE_INACTIVE);
                        tile.updateTile();
                    });
                }
            } catch (Exception e) {
                new Handler(Looper.getMainLooper()).post(() -> {
                    String lastStatus = prefs.getString("status_Hall Light", "OFF");
                    tile.setLabel("Hall Light");
                    tile.setState(lastStatus.equals("ON") ? Tile.STATE_ACTIVE : Tile.STATE_INACTIVE);
                    tile.updateTile();
                });
            }
        }).start();
    }
}