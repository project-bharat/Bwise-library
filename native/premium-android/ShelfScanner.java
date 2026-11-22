package com.bharatrasve.bwiselibrary;

import android.app.Activity;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import com.journeyapps.barcodescanner.ScanOptions;

@CapacitorPlugin(name = "ShelfScanner")
public class ShelfScanner extends Plugin {
    @PluginMethod public void scan(PluginCall call) {
        ScanOptions options = new ScanOptions();
        options.setDesiredBarcodeFormats("EAN_13");
        options.setBeepEnabled(false);
        options.setBarcodeImageEnabled(false);
        options.setPrompt(call.getString("prompt", "Scan ISBN"));
        startActivityForResult(call, options.createScanIntent(getContext()), "finished");
    }

    @ActivityCallback private void finished(PluginCall call, ActivityResult result) {
        if (call == null) return;
        JSObject response = new JSObject();
        if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
            response.put("isbn", result.getData().getStringExtra("SCAN_RESULT"));
        } else if (result.getData() != null && result.getData().getBooleanExtra("MISSING_CAMERA_PERMISSION", false)) {
            call.reject("cameraUnavailable");
            return;
        }
        call.resolve(response);
    }
}
