package com.bharatrasve.bwiselibrary;

import android.accounts.Account;
import android.content.Context;
import android.content.SharedPreferences;
import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.common.api.Scope;
import com.google.android.gms.tasks.Tasks;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Collections;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.json.*;

final class DriveBackup {
    static final String NAME = "app_cloud_backup.json";
    static final String SCOPE = "https://www.googleapis.com/auth/drive.appdata";
    static final String DRIVE = "https://www.googleapis.com/drive/v3/files";
    static final String UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
    static final int MAX_BYTES = 16 * 1024 * 1024;
    static final Object LOCK = new Object();

    static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences("bwise_premium_backup", Context.MODE_PRIVATE);
    }

    static AuthorizationRequest request(String account) {
        return AuthorizationRequest.builder().setAccount(new Account(account, "com.google"))
            .setRequestedScopes(Collections.singletonList(new Scope(SCOPE))).build();
    }

    static String token(Context context, String account) throws Exception {
        var result = Tasks.await(Identity.getAuthorizationClient(context).authorize(request(account)), 30, TimeUnit.SECONDS);
        if (result.hasResolution() || result.getAccessToken() == null) throw new IOException("reconnect");
        return result.getAccessToken();
    }

    static String read(InputStream input) throws IOException {
        try (InputStream stream = input; ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int count;
            while ((count = stream.read(buffer)) != -1) {
                if (output.size() + count > MAX_BYTES) throw new IOException("tooLarge");
                output.write(buffer, 0, count);
            }
            return output.toString(StandardCharsets.UTF_8.name());
        }
    }

    static String call(String token, String method, String url, String contentType, String body) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
        try {
            connection.setRequestMethod(method);
            connection.setConnectTimeout(15000);
            connection.setReadTimeout(30000);
            connection.setInstanceFollowRedirects(false);
            connection.setRequestProperty("Authorization", "Bearer " + token);
            if (body != null) {
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", contentType);
                try (OutputStream out = connection.getOutputStream()) {
                    out.write(body.getBytes(StandardCharsets.UTF_8));
                }
            }
            int status = connection.getResponseCode();
            if (status == 401 || status == 403) throw new IOException("reconnect");
            if (status == 412) throw new IOException("backupConflict");
            if (status < 200 || status >= 300) throw new IOException("driveUnavailable");
            return read(connection.getInputStream());
        } finally {
            connection.disconnect();
        }
    }

    static JSONObject latest(String token) throws Exception {
        String query = URLEncoder.encode("name = '" + NAME + "' and trashed = false", "UTF-8");
        JSONObject response = new JSONObject(call(token, "GET",
            DRIVE + "?spaces=appDataFolder&q=" + query + "&fields=nextPageToken,files(id,version,modifiedTime)&pageSize=2", null, null));
        JSONArray files = response.getJSONArray("files");
        if (files.length() > 1 || response.has("nextPageToken")) throw new IOException("backupConflict");
        return files.optJSONObject(0);
    }

    static String version(JSONObject file) throws JSONException {
        return file.getString("id") + ":" + file.getString("version");
    }

    static String hash(String text) throws Exception {
        return android.util.Base64.encodeToString(MessageDigest.getInstance("SHA-256")
            .digest(text.getBytes(StandardCharsets.UTF_8)), android.util.Base64.NO_WRAP);
    }

    static JSONObject validatePayload(String text) throws Exception {
        JSONObject payload = new JSONObject(text);
        payload.getJSONArray("books");
        payload.getJSONArray("people");
        payload.getJSONArray("wishlist");
        payload.getJSONObject("config");
        return payload;
    }

    static long upload(Context context, String account) throws Exception {
        synchronized (LOCK) {
            SharedPreferences settings = prefs(context);
            if (!account.equals(settings.getString("account", ""))) throw new IOException("reconnect");
            String token = token(context, account);
            JSONObject remote = latest(token);
            String known = settings.getString("version", "");
            if (remote != null && !version(remote).equals(known)) throw new IOException("backupConflict");
            String local = read(new FileInputStream(new File(context.getFilesDir(), "bwise-library-data.json")));
            JSONObject payload = validatePayload(local);
            String localHash = hash(local);
            if (remote != null && localHash.equals(settings.getString("hash", ""))) return settings.getLong("synced", 0);

            JSONObject metadata = new JSONObject().put("name", NAME);
            if (remote == null) metadata.put("parents", new JSONArray().put("appDataFolder"));
            JSONObject backup = new JSONObject().put("schemaVersion", 1)
                .put("exportedAtTimestamp", System.currentTimeMillis()).put("payload", payload);
            String boundary = "bwise_" + UUID.randomUUID();
            String body = "--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n"
                + metadata + "\r\n--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n"
                + backup + "\r\n--" + boundary + "--\r\n";
            if (body.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) throw new IOException("tooLarge");
            String id = remote == null ? "" : "/" + remote.getString("id");
            JSONObject saved = new JSONObject(call(token, remote == null ? "POST" : "PATCH",
                UPLOAD + id + "?uploadType=multipart&fields=id,version,modifiedTime", "multipart/related; boundary=" + boundary, body));
            long timestamp = System.currentTimeMillis();
            settings.edit().putString("version", version(saved)).putString("hash", localHash)
                .putLong("synced", timestamp).remove("error").commit();
            return timestamp;
        }
    }

    static JSONObject download(Context context, String account) throws Exception {
        synchronized (LOCK) {
            String token = token(context, account);
            JSONObject remote = latest(token);
            if (remote == null) throw new IOException("noBackup");
            JSONObject backup = new JSONObject(call(token, "GET",
                DRIVE + "/" + remote.getString("id") + "?alt=media", null, null));
            JSONObject latest = latest(token);
            if (latest == null || !version(remote).equals(version(latest))) throw new IOException("backupConflict");
            if (backup.getInt("schemaVersion") != 1) throw new IOException("invalidBackup");
            return new JSONObject().put("version", version(remote)).put("modifiedTime", remote.getString("modifiedTime"))
                .put("payload", validatePayload(backup.getJSONObject("payload").toString()));
        }
    }
}
