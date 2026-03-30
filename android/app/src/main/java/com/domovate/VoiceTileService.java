package com.domovate;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.service.quicksettings.TileService;

public class VoiceTileService extends TileService {
    @Override
    public void onClick() {
        super.onClick();

        Intent intent = new Intent(this, MainActivity.class);
        intent.putExtra("action", "VOICE_CONTROL");
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startActivityAndCollapse(intent);
        } else {
            startActivityAndCollapse(intent);
            Intent closeDrawerIntent = new Intent(Intent.ACTION_CLOSE_SYSTEM_DIALOGS);
            sendBroadcast(closeDrawerIntent);
        }
    }
}