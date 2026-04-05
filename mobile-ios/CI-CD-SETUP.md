# AnimalDot iOS — Build & Deploy Guide

You're on Windows 11 with a free Apple Developer account. Here's what that means and how to get the app on your iPhone 15 Pro Max.

## What the GitHub Actions workflow does

The workflow at `.github/workflows/ios-publish.yml` builds the app for the **iOS Simulator** on every push to `main` that touches `mobile-ios/`. This verifies that the code compiles and SPM dependencies resolve. No secrets are needed.

It runs automatically on:
- Pushes to `main` that change files in `mobile-ios/`
- Pull requests targeting `main`
- Manual trigger (Actions tab > iOS Build > Run workflow)

**It does NOT produce an installable IPA.** A free developer account can't do code signing in CI — signing requires Xcode on a Mac logged into your Apple ID.

## How to install on your iPhone

Since you don't have a Mac, you have two options:

### Option A: Use a cloud Mac (recommended)

Services that give you a remote macOS desktop:

1. **MacStadium / AWS EC2 Mac** — paid, but some offer free trials
2. **GitHub Codespaces** — doesn't support macOS yet, but watch for it
3. **Codemagic CI** — has a free tier that can build and sign iOS apps with automatic signing

Once you have Xcode access:

1. Open `mobile-ios/AnimalDot.xcodeproj`
2. Select the **AnimalDot** target > **Signing & Capabilities**
3. Check **Automatically manage signing**
4. Sign in with your Apple ID and select your **Personal Team**
5. Change the **Bundle Identifier** to something unique (e.g., `com.yourname.animaldot`) — free accounts can't use IDs claimed by others
6. Connect your iPhone (or select it as a destination via network)
7. Build & Run (Cmd+R)

> Free accounts require the device to be registered and the app re-signed every 7 days.

### Option B: AltStore (sideload from Windows)

[AltStore](https://altstore.io) lets you install IPAs from a Windows PC to your iPhone.

1. Install **AltServer** on your Windows 11 PC from https://altstore.io
2. Install **AltStore** on your iPhone via AltServer (requires iTunes + iCloud for Windows)
3. To get an IPA, you need a one-time Mac to archive the project:
   - On a Mac (borrowed or cloud): `xcodebuild archive` then `xcodebuild -exportArchive` with the `ExportOptions.plist`
   - Transfer the `.ipa` to your Windows PC
4. Open AltServer > Install the `.ipa` through AltStore

> AltStore also requires re-signing every 7 days (free account limit). AltServer running on your PC can auto-refresh.

### Option C: Codemagic CI (easiest no-Mac path)

[Codemagic](https://codemagic.io) is a CI/CD service specifically built for mobile apps. Their free tier includes 500 build minutes/month on macOS.

1. Sign up at https://codemagic.io and connect your GitHub repo
2. Select the Xcode project at `mobile-ios/AnimalDot.xcodeproj`
3. Under code signing, choose **Automatic** and sign in with your Apple ID
4. Add your iPhone's UDID to your Apple Developer account (Settings > General > About > copy the UDID)
5. Codemagic can build a development IPA and let you download or install it via a QR code

## Free developer account limitations

| Limitation | Detail |
|---|---|
| No App Store uploads | Need a paid account ($99/year) to distribute on the App Store |
| 7-day signing | Apps expire after 7 days, must be re-installed |
| 3 app limit | Only 3 active app IDs at a time |
| No push notifications | APNs requires a paid account |
| Device registration | Must register your specific device's UDID |
| No provisioning profiles | Can't create them manually — Xcode automatic signing only |

## When you're ready for the App Store

Upgrade to a paid Apple Developer account ($99/year), then:

1. Create a distribution certificate and provisioning profile in the Apple Developer Portal
2. Create an App Store Connect API key
3. Update `ExportOptions.plist` to use `method: app-store` and `signingStyle: manual`
4. Add the signing secrets to GitHub (see below) and switch to a full CI/CD pipeline

### Secrets needed for App Store CI/CD (future)

| Secret | What it is |
|---|---|
| `BUILD_CERTIFICATE_BASE64` | Base64 of your `.p12` distribution certificate |
| `P12_PASSWORD` | Password for the `.p12` |
| `BUILD_PROVISION_PROFILE_BASE64` | Base64 of your `.mobileprovision` |
| `KEYCHAIN_PASSWORD` | Any random string |
| `APPSTORE_ISSUER_ID` | From App Store Connect API Keys page |
| `APPSTORE_KEY_ID` | 10-char key ID |
| `APPSTORE_P8_PRIVATE_KEY` | Contents of the `.p8` API key file |

## Finding your iPhone's UDID

You'll need this for any signing method:

1. Connect your iPhone to your PC via USB
2. Open **iTunes** (or Apple Devices app on Windows 11)
3. Click the phone icon
4. Click the **Serial Number** area until it shows **UDID**
5. Right-click > Copy
