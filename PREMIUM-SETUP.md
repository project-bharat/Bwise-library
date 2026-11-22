# B-wise Library Premium setup

Premium uses the existing offline library snapshot. Manual CSV export and restore remain free. Premium backup uses the Google Drive `appDataFolder` for the account the user connects and keeps one copy of the library there. This is periodic backup with explicit restore, so it does not merge edits from multiple phones.

## Google Play Console

In the listing for `com.bharatrasve.bwiselibrary`, activate the following products and add a Play license tester:

| Product type | Product ID | Base plan | Intended India price |
| --- | --- | --- | --- |
| Auto-renewing subscription | `bwise_premium` | `monthly` | ₹119/month |
| Auto-renewing subscription | `bwise_premium` | `yearly` | ₹499/year |
| One-time non-consumable | `bwise_premium_lifetime` | — | ₹7,999 |

The paywall uses the current Google Play price for each available product. Purchase buttons require a returned offer. Test with a signing key and distribution track that the Play Console recognizes, using the account that owns the test purchase. Configure regional prices, the privacy policy, and listing disclosures in Play Console before release.

## Google OAuth

Enable Drive API in Google Cloud. Configure the OAuth consent screen and register an Android OAuth client for the package and the SHA-1 of the signing certificate used by the test or release build. Use the Play app signing certificate for Play-distributed builds. Add a web OAuth client in the same Cloud project for Credential Manager. The app requests only `https://www.googleapis.com/auth/drive.appdata` for Drive.

Set the repository Actions variable `GOOGLE_WEB_CLIENT_ID` to the web OAuth client ID. For a local build, pass `GOOGLE_WEB_CLIENT_ID` to `scripts/android-post-setup.py`, which writes the generated Android `default_web_client_id` string. If configuring the generated app by hand, set that string in `android/app/src/main/res/values/strings.xml`. A web client secret is unnecessary.

## Release checks

Use a Play-distributed test build to exercise purchase, cancellation, pending payment, acknowledgement, restore purchase after reinstall, subscription expiry, and the lifetime plan. Link a test Google account, verify manual and periodic backup, restore on a second phone using the same Play purchase and Drive account, then check the conflict message on the first phone. Test disconnecting, revoking Drive authorization, and opening the app offline. Check manual CSV backup with a free account.
