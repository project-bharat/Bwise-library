package com.bharatrasve.bwiselibrary;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import com.android.billingclient.api.BillingClient;
import java.util.concurrent.TimeUnit;

public final class DriveBackupWorker extends Worker {
    public DriveBackupWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull @Override public Result doWork() {
        Context context = getApplicationContext();
        var prefs = DriveBackup.prefs(context);
        String account = prefs.getString("account", "");
        if (account.isEmpty() || !prefs.getBoolean("auto", false)) return Result.success();
        BillingClient client = PlayPremium.client(context, (response, items) -> {});
        try {
            PlayPremium.connect(client).get(30, TimeUnit.SECONDS);
            if (!PlayPremium.active(client).get(30, TimeUnit.SECONDS)) return Result.success();
            if (isStopped() || !prefs.getBoolean("auto", false)) return Result.success();
            DriveBackup.upload(context, account);
            prefs.edit().remove("error").apply();
            return Result.success();
        } catch (Exception exception) {
            String code = exception.getMessage();
            if ("backupConflict".equals(code) || "reconnect".equals(code) || "tooLarge".equals(code)) {
                prefs.edit().putString("error", code).apply();
                return Result.success();
            }
            return Result.retry();
        } finally {
            client.endConnection();
        }
    }
}
