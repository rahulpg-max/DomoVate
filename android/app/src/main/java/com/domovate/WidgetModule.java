package com.domovate;

import android.app.Activity;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class WidgetModule extends ReactContextBaseJavaModule {
    private static ReactApplicationContext reactContext;

    WidgetModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;
    }

    @Override
    public String getName() {
        return "WidgetModule";
    }

    @ReactMethod
    public void saveTileData(String key, String value) {
        SharedPreferences prefs = reactContext.getSharedPreferences("DATA", Context.MODE_PRIVATE);
        prefs.edit().putString(key, value).apply();
    }

    @ReactMethod
    public void syncSpecificWidget(int widgetId, String name, String status, String layoutName, String deviceId) {
        SharedPreferences prefs = reactContext.getSharedPreferences("DATA", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();

        int layoutResId = reactContext.getResources().getIdentifier(
            layoutName, 
            "layout", 
            reactContext.getPackageName()
        );

        if (layoutResId == 0) {
            layoutResId = R.layout.home_widget_layout;
        }

        editor.putString("pending_name", name);
        editor.putString("pending_status", status);
        editor.putString("pending_layout", layoutName);
        editor.putString("pending_deviceId", deviceId);
        
        editor.putString("name_" + widgetId, name);
        editor.putString("status_" + widgetId, status);
        editor.putInt("layout_" + widgetId, layoutResId);
        editor.putString("deviceId_" + widgetId, deviceId);
        editor.apply();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AppWidgetManager appWidgetManager = reactContext.getSystemService(AppWidgetManager.class);
            
            Class<?> providerClass = HomeWidgetProvider.class;
            if (layoutName.equals("widget_mini_toggle")) providerClass = HomeWidgetProviderMini.class;
            else if (layoutName.equals("widget_slim_bar")) providerClass = HomeWidgetProviderSlim.class;

            ComponentName myProvider = new ComponentName(reactContext, providerClass);

            if (appWidgetManager.isRequestPinAppWidgetSupported()) {
                appWidgetManager.requestPinAppWidget(myProvider, null, null);
            }
        }

        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(reactContext);
        HomeWidgetProvider.updateAppWidget(reactContext, appWidgetManager, widgetId);
    }

    @ReactMethod
    public void finishWidgetSetup(int widgetId) {
        Activity currentActivity = getCurrentActivity();
        if (currentActivity != null) {
            Intent resultValue = new Intent();
            resultValue.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
            currentActivity.setResult(Activity.RESULT_OK, resultValue);
            currentActivity.finish();
        }
    }

    @ReactMethod
    public void scheduleDeviceTimer(String deviceId, String command, int durationMinutes) {
        Intent intent = new Intent(reactContext, TimerReceiver.class);
        intent.putExtra("deviceId", deviceId);
        intent.putExtra("command", command);

        int requestId = (int) System.currentTimeMillis();
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            reactContext, 
            requestId, 
            intent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        AlarmManager alarmManager = (AlarmManager) reactContext.getSystemService(Context.ALARM_SERVICE);
        long triggerAt = System.currentTimeMillis() + ((long) durationMinutes * 60 * 1000);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
        } else {
            alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
        }
    }

    @ReactMethod
    public void updateWidget(String name, String status) {
        SharedPreferences prefs = reactContext.getSharedPreferences("DATA", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString("widget_label", name);
        editor.putString("widget_status", status);
        editor.apply();

        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(reactContext);
        int[] ids = appWidgetManager.getAppWidgetIds(new ComponentName(reactContext, HomeWidgetProvider.class));
        for (int id : ids) {
            HomeWidgetProvider.updateAppWidget(reactContext, appWidgetManager, id);
        }
    }
}