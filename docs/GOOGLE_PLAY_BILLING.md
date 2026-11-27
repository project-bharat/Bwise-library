# Google Play Billing

## Current status

The checked-in app does not currently integrate Google Play Billing. No billing SDK, purchase flow, product or entitlement handling, or purchase verification implementation is present in the app source or `package.json`. The app should not be described as supporting in-app purchases or subscriptions.

No Play Console products have been configured by this repository. Console configuration, pricing decisions, account access, and product publication are for the developer account owner.

## Decisions required before implementation

Before adding billing, decide:

1. Which app feature or digital content is paid, and whether the model is a one-time purchase or subscription.
2. What entitlement a successful purchase grants and how the app restores access after reinstall or device change.
3. How cancellations, refunds, pending purchases, account changes, and offline behavior are handled.
4. Whether a trusted backend is required for purchase verification and entitlement state. Do not treat a client-only success callback as authoritative proof of payment.

Then verify the current Google Play Payments policy and official Billing integration guidance, select a maintained compatible library, and implement/test the purchase lifecycle before creating corresponding Console products. Avoid collecting or storing payment-card data in the app.

## Release checks

- [ ] Confirm the current policy permits the proposed payment flow for the app, product, regions, and distribution channel.
- [ ] Implement purchase, acknowledgement, restore/query, pending, cancellation, and error flows with clear user-facing states.
- [ ] Verify purchases using the supported secure design; do not put service-account credentials or private keys in the app or repository.
- [ ] Test using Play's licensed tester and internal testing flows before release.
- [ ] Align the Play listing, in-app disclosures, privacy policy, and Console declarations with the implemented behavior.

This guide does not configure products or make changes in Play Console.

Official references:

- [Google Play Billing](https://developer.android.com/google/play/billing)
- [Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en)
- [Google Play Billing test purchases](https://developer.android.com/google/play/billing/test)
