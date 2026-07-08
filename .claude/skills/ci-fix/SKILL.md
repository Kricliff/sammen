---
name: ci-fix
description: Diagnose a pasted Codemagic build log, altool/App Store Connect upload error, or Apple rejection for the Together iOS app. Use whenever the user pastes CI output containing "Build failed", "Failed to archive", "Validation failed", "UPLOAD FAILED", or an Apple review message. Contains the known-error catalog from previous debugging so diagnosis starts from known causes instead of from scratch.
---

# CI-fix: known-error catalog for Together iOS builds

The user pastes a Codemagic/altool/Apple log. Match it against this catalog
FIRST — every entry below has already happened in this project and cost a full
CI round (or an App Review round) to diagnose. Only investigate from scratch if
nothing matches.

## Error catalog

| Symptom in log | Root cause | Fix |
|---|---|---|
| `SDK version issue. This app was built with the iOS X SDK` (altool 409) | codemagic.yaml pins an old Xcode | Set `xcode: latest` in the workflow environment |
| `compiling for iOS 13.0, but module 'Capacitor' has a minimum deployment target of iOS 15.0` | Podfile lost its `post_install` hook forcing `IPHONEOS_DEPLOYMENT_TARGET = 15.0` — almost always because `cap sync ios` regenerated the Podfile | Restore the post_install hook in `ios/App/Podfile`; ensure codemagic.yaml uses `npx cap copy ios`, never `cap sync ios` |
| `[warn] @revenuecat/purchases-capacitor does not have a Package.swift` + `cap sync` finishing in <1s | Project in SPM mode; RevenueCat v9 has no SPM support, so the native plugin is silently excluded (symptom in app: `window.Capacitor.Plugins.Purchases` is null, paywall stuck on "Loading…") | iOS must use CocoaPods: Podfile lists Capacitor, CapacitorCordova, CapacitorLocalNotifications, RevenuecatPurchasesCapacitor; project.pbxproj must have NO CapApp-SPM / XCLocalSwiftPackageReference remnants; build with `--workspace`, not `--project` |
| `npm ERESOLVE` dependency conflict | RevenueCat v9 vs Capacitor v8 peer deps | `npm install --legacy-peer-deps` (already in codemagic.yaml — check it wasn't removed) |
| `1 validation error in codemagic.yaml` | YAML schema/syntax error pushed unvalidated | Fix the YAML; from now on validate locally: `npx --yes js-yaml codemagic.yaml` (the /ship skill does this) |
| `! [rejected] main -> main (fetch first)` | Remote has commits this clone lacks (CI build-number bumps) | `git pull --rebase --autostash` then push |
| `.p8` / private key / issuer-id errors during publish | App Store Connect API key misconfigured in Codemagic | Check the `app_store_connect: Codemagic` integration and the `APP_STORE_CONNECT_*` variables; key file must be the original ASC `.p8` |
| Apple rejection 2.1(b): purchase button non-functional / offering empty | RevenueCat offering contains packages without matching App Store Connect products | Offering must contain ONLY products that exist and are approved in ASC (currently: `com.kricliff.together.pro.monthly` only) |
| Apple rejection 3.1.2(c): missing price/terms | Paywall must show price, billing period, Privacy Policy + Terms (EULA) links before purchase | Already implemented in showProModal() with $4.99 fallback — verify it renders |
| Apple rejection 1.2: UGC safeguards | Anonymous community requires: accept-terms gate, content filter, report/block/hide, 24h moderation, in-app contact, 18+ age rating | Implemented in www/index.html (guidelines gate, OBJECTIONABLE_PATTERNS, postMenu, REPORT_HIDE_THRESHOLD, SUPPORT_EMAIL). Age rating 18+ is set in ASC, not code |

## Project constants (for checking configs)

- Bundle ID `com.kricliff.together`, App ID 6780441989, iPhone-only
- Min iOS: 15.0 (Podfile post_install) — build SDK: latest Xcode
- Workflow order: npm install → cap copy → pod install → build number → signing → build-ipa --workspace → publish
- Firebase is web-SDK via CDN: it needs NO pods and never affects the native build

## After fixing

Use the /ship skill to publish, then remind the user to start the Codemagic
build manually.
