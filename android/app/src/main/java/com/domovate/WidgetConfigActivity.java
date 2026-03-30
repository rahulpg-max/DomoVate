package com.domovate;

import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.os.Bundle;
import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactActivityDelegate;

public class WidgetConfigActivity extends ReactActivity {
    private int mAppWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        Intent intent = getIntent();
        Bundle extras = intent.getExtras();
        if (extras != null) {
            mAppWidgetId = extras.getInt(
                AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        }

        if (mAppWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish();
        }

        // Default cancel result set karte hain, agar user setup pura na kare
        setResult(RESULT_CANCELED);
        
        super.onCreate(savedInstanceState);
    }

    @Override
    protected String getMainComponentName() {
        return "DomoVate"; 
    }

    @Override
    protected ReactActivityDelegate createReactActivityDelegate() {
        return new DefaultReactActivityDelegate(
            this,
            getMainComponentName(),
            DefaultNewArchitectureEntryPoint.getFabricEnabled()
        ) {
            @Override
            protected Bundle getLaunchOptions() {
                // Ye sabse important part hai: React Native ko widgetId pass karna
                Bundle initialProps = new Bundle();
                initialProps.putInt("widgetId", mAppWidgetId);
                return initialProps;
            }
        };
    }
}