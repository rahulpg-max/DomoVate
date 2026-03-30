package com.domovate;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import android.app.PendingIntent;
import android.content.Intent;
import android.graphics.Color;

public class HomeWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);

        if (AppWidgetManager.ACTION_APPWIDGET_UPDATE.equals(intent.getAction())) {
            SharedPreferences prefs = context.getSharedPreferences("DATA", Context.MODE_PRIVATE);
            String pName = prefs.getString("pending_name", null);

            if (pName != null) {
                AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
                int[] appWidgetIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, getClass()));
                
                for (int id : appWidgetIds) {
                    if (!prefs.contains("name_" + id)) {
                        prefs.edit()
                            .putString("name_" + id, pName)
                            .putString("status_" + id, prefs.getString("pending_status", "OFF"))
                            .putString("deviceId_" + id, prefs.getString("pending_deviceId", ""))
                            .putInt("layout_" + id, prefs.getInt("pending_layout_res", R.layout.home_widget_layout))
                            .apply();
                    }
                    updateAppWidget(context, appWidgetManager, id);
                }
                prefs.edit().remove("pending_name").apply();
            }
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences("DATA", Context.MODE_PRIVATE);
        
        String deviceName = prefs.getString("name_" + appWidgetId, prefs.getString("widget_label", "Setup Required"));
        String status = prefs.getString("status_" + appWidgetId, "OFF");
        int layoutId = prefs.getInt("layout_" + appWidgetId, R.layout.home_widget_layout);

        RemoteViews views = new RemoteViews(context.getPackageName(), layoutId);

        try { views.setTextViewText(R.id.widget_device_name, deviceName); } catch (Exception e) {}
        views.setTextViewText(R.id.widget_status, status);

        int color = status.equalsIgnoreCase("ON") ? Color.parseColor("#FFD700") : Color.parseColor("#A8A8A8");
        
        try {
            views.setTextColor(R.id.widget_status, color);
            views.setInt(R.id.widget_toggle_btn, "setColorFilter", color);
        } catch (Exception e) {}

        Intent intent = new Intent(context, WidgetActionReceiver.class);
        intent.putExtra("widgetId", appWidgetId);
        
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context, 
            appWidgetId, 
            intent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        views.setOnClickPendingIntent(R.id.widget_toggle_btn, pendingIntent);
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onDeleted(Context context, int[] appWidgetIds) {
        super.onDeleted(context, appWidgetIds);
        SharedPreferences.Editor editor = context.getSharedPreferences("DATA", Context.MODE_PRIVATE).edit();
        for (int id : appWidgetIds) {
            editor.remove("name_" + id);
            editor.remove("status_" + id);
            editor.remove("layout_" + id);
            editor.remove("deviceId_" + id);
        }
        editor.apply();
    }
}