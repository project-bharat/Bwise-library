package com.bharatrasve.bwiselibrary;

import android.content.Context;
import com.android.billingclient.api.*;
import java.util.*;
import java.util.concurrent.CompletableFuture;

final class PlayPremium {
    static final String SUBSCRIPTION = "bwise_premium";
    static final String MONTHLY = "monthly";
    static final String YEARLY = "yearly";
    static final String LIFETIME = "bwise_premium_lifetime";

    static BillingClient client(Context context, PurchasesUpdatedListener listener) {
        return BillingClient.newBuilder(context).setListener(listener)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .build();
    }

    static CompletableFuture<Void> connect(BillingClient client) {
        if (client.isReady()) return CompletableFuture.completedFuture(null);
        CompletableFuture<Void> result = new CompletableFuture<>();
        client.startConnection(new BillingClientStateListener() {
            @Override public void onBillingSetupFinished(BillingResult response) {
                if (ok(response)) result.complete(null);
                else result.completeExceptionally(new IllegalStateException("billingUnavailable"));
            }
            @Override public void onBillingServiceDisconnected() {
                result.completeExceptionally(new IllegalStateException("billingUnavailable"));
            }
        });
        return result;
    }

    static boolean ok(BillingResult response) {
        return response.getResponseCode() == BillingClient.BillingResponseCode.OK;
    }

    static CompletableFuture<List<Purchase>> purchases(BillingClient client, String type) {
        CompletableFuture<List<Purchase>> result = new CompletableFuture<>();
        client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(type).build(),
            (response, items) -> {
                if (ok(response)) result.complete(items);
                else result.completeExceptionally(new IllegalStateException("billingUnavailable"));
            });
        return result;
    }

    static boolean entitled(Purchase purchase) {
        return purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED
            && (purchase.getProducts().contains(SUBSCRIPTION) || purchase.getProducts().contains(LIFETIME));
    }

    static CompletableFuture<Boolean> acknowledge(BillingClient client, Purchase purchase) {
        if (purchase.isAcknowledged()) return CompletableFuture.completedFuture(true);
        CompletableFuture<Boolean> result = new CompletableFuture<>();
        client.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder()
            .setPurchaseToken(purchase.getPurchaseToken()).build(),
            response -> {
                if (ok(response)) result.complete(true);
                else result.completeExceptionally(new IllegalStateException("billingUnavailable"));
            });
        return result;
    }

    static CompletableFuture<Boolean> active(BillingClient client) {
        return purchases(client, BillingClient.ProductType.SUBS)
            .thenCombine(purchases(client, BillingClient.ProductType.INAPP), (subscriptions, products) -> {
                List<Purchase> all = new ArrayList<>(subscriptions);
                all.addAll(products);
                return all;
            })
            .thenCompose(items -> {
                List<CompletableFuture<Boolean>> acknowledgements = new ArrayList<>();
                for (Purchase purchase : items) {
                    if (entitled(purchase)) acknowledgements.add(acknowledge(client, purchase));
                }
                return CompletableFuture.allOf(acknowledgements.toArray(new CompletableFuture<?>[0]))
                    .thenApply(ignored -> !acknowledgements.isEmpty());
            });
    }

    static CompletableFuture<List<ProductDetails>> details(BillingClient client, String type, String id) {
        CompletableFuture<List<ProductDetails>> result = new CompletableFuture<>();
        client.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(
            Collections.singletonList(QueryProductDetailsParams.Product.newBuilder()
                .setProductType(type).setProductId(id).build())).build(),
            (response, details) -> {
                if (ok(response)) result.complete(details.getProductDetailsList());
                else result.completeExceptionally(new IllegalStateException("billingUnavailable"));
            });
        return result;
    }
}
