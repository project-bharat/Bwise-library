package com.bharatrasve.bwiselibrary;

import android.app.Activity;
import android.os.CancellationSignal;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.work.*;
import com.android.billingclient.api.*;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.identity.AuthorizationResult;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;
import java.util.*;
import java.util.concurrent.*;

@CapacitorPlugin(name = "LibraryPremium")
public final class PremiumPlugin extends Plugin {
    private static final String WORK = "bwise-drive-backup";
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final Map<String, BillingFlowParams.ProductDetailsParams> offers = new ConcurrentHashMap<>();
    private BillingClient billing;
    private CompletableFuture<Void> connection;
    private PluginCall pendingPurchase;
    private PluginCall pendingAuthorization;
    private String authorizingAccount;
    private String displayName, photo;
    private ActivityResultLauncher<IntentSenderRequest> authorizationLauncher;

    @Override public void load() {
        billing = PlayPremium.client(getContext(), this::purchaseFinished);
        getActivity().runOnUiThread(() -> authorizationLauncher = getActivity().getActivityResultRegistry()
            .register("bwise-drive-authorization", new ActivityResultContracts.StartIntentSenderForResult(), result -> {
                PluginCall call = pendingAuthorization;
                pendingAuthorization = null;
                if (call == null) return;
                if (result.getResultCode() != Activity.RESULT_OK) {
                    call.reject("cancelled");
                    return;
                }
                try {
                    completeLink(call, authorizingAccount,
                        Identity.getAuthorizationClient(getActivity()).getAuthorizationResultFromIntent(result.getData()));
                } catch (Exception failure) {
                    call.reject("reconnect");
                }
            }));
    }

    private synchronized CompletableFuture<Void> ready() {
        if (billing.isReady()) return CompletableFuture.completedFuture(null);
        if (connection == null || connection.isDone()) connection = PlayPremium.connect(billing);
        return timed(connection);
    }

    private static <T> CompletableFuture<T> timed(CompletableFuture<T> future) {
        android.os.Handler handler = new android.os.Handler(android.os.Looper.getMainLooper());
        Runnable timeout = () -> future.completeExceptionally(new TimeoutException());
        handler.postDelayed(timeout, 30000);
        future.whenComplete((result, failure) -> handler.removeCallbacks(timeout));
        return future;
    }

    private CompletableFuture<Boolean> active() {
        return timed(ready().thenCompose(ignored -> PlayPremium.active(billing)));
    }

    private JSObject state(boolean pro) {
        var settings = DriveBackup.prefs(getContext());
        return new JSObject().put("pro", pro).put("account", settings.getString("account", ""))
            .put("name", settings.getString("name", "")).put("photo", settings.getString("photo", ""))
            .put("auto", settings.getBoolean("auto", false)).put("synced", settings.getLong("synced", 0))
            .put("error", settings.getString("error", ""));
    }

    @PluginMethod public void status(PluginCall call) {
        active().whenComplete((pro, failure) -> {
            if (failure != null) call.reject("billingUnavailable");
            else call.resolve(state(pro));
        });
    }

    @PluginMethod public void products(PluginCall call) {
        timed(ready().thenCompose(ignored -> PlayPremium.details(billing, BillingClient.ProductType.SUBS, PlayPremium.SUBSCRIPTION)
            .thenCombine(PlayPremium.details(billing, BillingClient.ProductType.INAPP, PlayPremium.LIFETIME),
                (subscriptions, lifetime) -> {
                    JSObject products = new JSObject();
                    offers.clear();
                    for (ProductDetails details : subscriptions) {
                        var subscriptionOffers = details.getSubscriptionOfferDetails();
                        if (subscriptionOffers == null) continue;
                        for (var offer : subscriptionOffers) {
                            String key = offer.getBasePlanId();
                            if (offer.getOfferId() != null || (!key.equals(PlayPremium.MONTHLY) && !key.equals(PlayPremium.YEARLY))) continue;
                            var prices = offer.getPricingPhases().getPricingPhaseList();
                            if (prices.size() != 1) continue;
                            var price = prices.get(0);
                            if (price.getRecurrenceMode() != ProductDetails.RecurrenceMode.INFINITE_RECURRING
                                || !(key.equals(PlayPremium.MONTHLY) ? "P1M" : "P1Y").equals(price.getBillingPeriod())) continue;
                            offers.put(key, BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(details)
                                .setOfferToken(offer.getOfferToken()).build());
                            products.put(key, new JSObject().put("price", price.getFormattedPrice())
                                .put("micros", price.getPriceAmountMicros()).put("currency", price.getPriceCurrencyCode()));
                        }
                    }
                    for (ProductDetails details : lifetime) {
                        var price = details.getOneTimePurchaseOfferDetails();
                        if (price == null) continue;
                        var offer = BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(details);
                        if (price.getOfferToken() != null) offer.setOfferToken(price.getOfferToken());
                        offers.put("lifetime", offer.build());
                        products.put("lifetime", new JSObject().put("price", price.getFormattedPrice()));
                    }
                    return products;
                }))).whenComplete((products, failure) -> {
                    if (failure != null) call.reject("billingUnavailable");
                    else call.resolve(products);
                });
    }

    @PluginMethod public void buy(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            var offer = offers.get(call.getString("plan", ""));
            if (pendingPurchase != null || offer == null || !billing.isReady()) {
                call.reject("billingUnavailable");
                return;
            }
            pendingPurchase = call;
            var response = billing.launchBillingFlow(getActivity(), BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(Collections.singletonList(offer)).build());
            if (!PlayPremium.ok(response)) {
                pendingPurchase = null;
                if (response.getResponseCode() == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) status(call);
                else call.reject("billingUnavailable");
            }
        });
    }

    private void purchaseFinished(BillingResult response, List<Purchase> purchases) {
        PluginCall call = pendingPurchase;
        pendingPurchase = null;
        if (call == null) return;
        if (response.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            call.reject("cancelled");
        } else if (!PlayPremium.ok(response)) {
            call.reject("billingUnavailable");
        } else if (purchases != null && purchases.stream().anyMatch(p -> p.getPurchaseState() == Purchase.PurchaseState.PENDING)
            && purchases.stream().noneMatch(PlayPremium::entitled)) {
            call.reject("pending");
        } else {
            status(call);
        }
    }

    @PluginMethod public void link(PluginCall call) {
        active().whenComplete((pro, failure) -> {
            if (failure != null || !pro) {
                call.reject(failure != null ? "billingUnavailable" : "requiresPro");
                return;
            }
            getActivity().runOnUiThread(() -> {
                String client = getContext().getString(R.string.default_web_client_id).trim();
                if (client.isEmpty()) {
                    call.reject("googleSetup");
                    return;
                }
                if (pendingAuthorization != null || authorizationLauncher == null) {
                    call.reject("reconnect");
                    return;
                }
                pendingAuthorization = call;
                var request = new GetCredentialRequest.Builder().addCredentialOption(
                    new GetSignInWithGoogleOption.Builder(client).build()).build();
                CredentialManager.create(getContext()).getCredentialAsync(getActivity(), request,
                    new CancellationSignal(), androidx.core.content.ContextCompat.getMainExecutor(getActivity()),
                    new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                        @Override public void onResult(GetCredentialResponse response) {
                            try {
                                var identity = GoogleIdTokenCredential.createFrom(response.getCredential().getData());
                                String account = identity.getId();
                                displayName = identity.getDisplayName();
                                photo = identity.getProfilePictureUri() == null ? null : identity.getProfilePictureUri().toString();
                                authorizingAccount = account;
                                Identity.getAuthorizationClient(getActivity()).authorize(DriveBackup.request(account))
                                    .addOnSuccessListener(getActivity(), result -> {
                                        if (result.hasResolution() && result.getPendingIntent() != null) {
                                            try {
                                                authorizationLauncher.launch(new IntentSenderRequest.Builder(result.getPendingIntent()).build());
                                            } catch (RuntimeException invalid) {
                                                pendingAuthorization = null;
                                                call.reject("reconnect");
                                            }
                                        } else {
                                            pendingAuthorization = null;
                                            completeLink(call, account, result);
                                        }
                                    }).addOnFailureListener(getActivity(), error -> {
                                        pendingAuthorization = null;
                                        call.reject("reconnect");
                                    });
                            } catch (Exception invalid) {
                                pendingAuthorization = null;
                                call.reject("reconnect");
                            }
                        }
                        @Override public void onError(GetCredentialException error) {
                            pendingAuthorization = null;
                            call.reject(error instanceof androidx.credentials.exceptions.GetCredentialCancellationException ? "cancelled" : "reconnect");
                        }
                    });
            });
        });
    }

    private void completeLink(PluginCall call, String account, AuthorizationResult result) {
        if (result.getAccessToken() == null || account == null || account.isEmpty()) {
            call.reject("reconnect");
            return;
        }
        io.execute(() -> {
            synchronized (DriveBackup.LOCK) {
                var settings = DriveBackup.prefs(getContext());
                if (!account.equals(settings.getString("account", ""))) {
                    WorkManager.getInstance(getContext()).cancelUniqueWork(WORK);
                    settings.edit().clear().putString("account", account).commit();
                } else {
                    settings.edit().remove("error").apply();
                }
            }
            DriveBackup.prefs(getContext()).edit().putString("name", displayName).putString("photo", photo).apply();
            call.resolve(state(true));
        });
    }

    private interface CloudAction { void run(String account) throws Exception; }

    private void withCloud(PluginCall call, CloudAction action) {
        active().whenComplete((pro, failure) -> {
            if (failure != null || !pro) {
                call.reject(failure != null ? "billingUnavailable" : "requiresPro");
                return;
            }
            io.execute(() -> {
                String account = DriveBackup.prefs(getContext()).getString("account", "");
                if (account.isEmpty()) { call.reject("reconnect"); return; }
                try { action.run(account); }
                catch (Exception error) {
                    String code = error.getMessage();
                    if (Arrays.asList("backupConflict", "noBackup", "reconnect", "tooLarge", "invalidBackup").contains(code == null ? "" : code)) {
                        if ("backupConflict".equals(code) || "reconnect".equals(code)) {
                            DriveBackup.prefs(getContext()).edit().putString("error", code).apply();
                        }
                        call.reject(code);
                    } else call.reject("driveUnavailable");
                }
            });
        });
    }

    @PluginMethod public void autoBackup(PluginCall call) {
        withCloud(call, account -> {
            boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
            WorkManager work = WorkManager.getInstance(getContext());
            DriveBackup.prefs(getContext()).edit().putBoolean("auto", enabled).commit();
            if (enabled) {
                var constraints = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
                work.enqueueUniquePeriodicWork(WORK, ExistingPeriodicWorkPolicy.KEEP,
                    new PeriodicWorkRequest.Builder(DriveBackupWorker.class, 12, TimeUnit.HOURS)
                        .setConstraints(constraints).build()).getResult().get(15, TimeUnit.SECONDS);
            } else {
                work.cancelUniqueWork(WORK);
            }
            call.resolve(state(true));
        });
    }

    @PluginMethod public void backupNow(PluginCall call) {
        withCloud(call, account -> {
            DriveBackup.upload(getContext(), account);
            call.resolve(state(true));
        });
    }

    @PluginMethod public void cloudBackup(PluginCall call) {
        withCloud(call, account -> call.resolve(new JSObject()
            .put("backup", DriveBackup.download(getContext(), account)).put("account", account)));
    }

    @PluginMethod public void restored(PluginCall call) {
        withCloud(call, account -> {
            synchronized (DriveBackup.LOCK) {
                if (!account.equals(call.getString("account"))) { call.reject("reconnect"); return; }
                var settings = DriveBackup.prefs(getContext());
                settings.edit().putString("version", call.getString("version"))
                    .putString("hash", DriveBackup.hash(call.getString("serialized")))
                    .putLong("synced", System.currentTimeMillis()).remove("error").commit();
                call.resolve(state(true));
            }
        });
    }

    @PluginMethod public void unlink(PluginCall call) {
        io.execute(() -> {
            synchronized (DriveBackup.LOCK) {
                WorkManager.getInstance(getContext()).cancelUniqueWork(WORK);
                DriveBackup.prefs(getContext()).edit().clear().commit();
            }
            call.resolve();
        });
    }

    @Override protected void handleOnDestroy() {
        if (authorizationLauncher != null) authorizationLauncher.unregister();
        if (billing != null) billing.endConnection();
        io.shutdown();
    }
}
