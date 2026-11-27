# Google Play Billing

## Approved product model and current status

Billing is approved but not integrated. No purchase flow, entitlement handling, or server verification is currently available. Do not advertise Pro or imply that payment can be made until the complete flow is implemented and tested.

- Free: local storage and export/restore up to 50 books and 20 people.
- Pro: unlimited books and people, plus on-demand Drive sync.
- Intended price points: ₹29 monthly, ₹265 annual, and ₹2,049 lifetime. Monthly and annual are subscriptions; lifetime is a one-time purchase.
- Product IDs have not been created. Keep IDs configurable and pending; do not invent or hard-code plausible-looking IDs. Display prices from Play product details.
- On expiry, preserve all data and allow reading/export. Block new additions only when the Free caps are exceeded and pause Drive sync; never delete existing data.

Use Firebase Auth for app identity and a trusted Cloud Function to verify Play purchase tokens with the Google Play Developer API before granting entitlements. The client must not make purchase callbacks authoritative. Keep service-account credentials out of the app and repository. Treat pending, cancelled, refunded, revoked, account-changed, and offline states explicitly.

The app's Play Console products, service-account access, Firebase project, and billing setup are controlled by the account owner. Do not deploy or publish resources from this guide.

## Release checks

- [ ] Create Play products with owner-approved IDs and prices; keep monthly/annual recurring and lifetime one-time.
- [ ] Confirm current policy permits the proposed payment flow for the app, product, regions, and distribution channel.
- [ ] Implement purchase, acknowledgement, restore/query, pending, cancellation, and error flows with clear user-facing states.
- [ ] Verify purchases using a trusted backend; do not put service-account credentials or private keys in the app or repository.
- [ ] Test using Play's licensed tester and internal testing flows before release.
- [ ] Align the Play listing, in-app disclosures, privacy policy, and Console declarations with the implemented behavior.

This guide does not configure products or make changes in Play Console.

Official references:

- [Google Play Billing](https://developer.android.com/google/play/billing)
- [Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en)
- [Google Play Billing test purchases](https://developer.android.com/google/play/billing/test)
