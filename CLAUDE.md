# Together: Men's Mental Health — Claude Code Context

## ⚠️ KRITISK: To lokale kopier av dette repoet

| Mappe | Rolle |
|---|---|
| `C:\Users\KristianClifford\Projects\sammen` | **AKTIV — all utvikling skjer her.** Har node_modules. |
| `C:\Users\KristianClifford\OneDrive - Great People\Dokumenter\App` | Stale klon (samme remote). **Ikke rediger her.** Mangler node_modules. Preview-panelet kan servere denne — sjekk `pwd` før du stoler på preview. |

Sjekk alltid hvilken mappe du står i før redigering. Codemagic bygger fra GitHub `origin/main` — endringer må committes OG pushes fra `Projects\sammen` for å nå CI.

## Prosjektoversikt

Kristian Clifford (coach og mental trener) bygger en mental helse-app for menn. Appen heter **Together: Men's Mental Health** og er en Capacitor-app (iOS + Android) med vanilla JS og localStorage.

- **GitHub**: https://github.com/Kricliff/sammen
- **GitHub Pages demo**: https://kricliff.github.io/sammen/en.html (alltid Pro, engelsk)
- **Privacy Policy**: https://kricliff.github.io/sammen/privacy.html
- **Support/kontakt (i appen og mot Apple)**: together@cliffordcoaching.no
- **Coaching-side**: https://cliffordcoaching.no

## Filstruktur

| Fil/mappe | Beskrivelse |
|---|---|
| `www/index.html` | Capacitor-appen (produksjon — dette er fila som bygges) |
| `index.html` (rot) | Gammel norsk prototype — brukes IKKE av bygget |
| `en.html` | GitHub Pages demo (engelsk, alltid Pro) |
| `privacy.html` | Personvernside for App Store |
| `ios/` | Xcode-prosjekt (CocoaPods — se build-lærdommer) |
| `android/` | Android-prosjekt (under oppsett) |
| `codemagic.yaml` | CI/CD — ios-workflow og android-workflow |
| `capacitor.config.json` | App ID: `com.kricliff.together`, webDir: `www` |

## Build-lærdommer (dyrekjøpte — ikke gjenta feilene)

- **Bruk `npx cap copy ios`, ALDRI `cap sync ios`** — sync overskriver Podfile og fjerner post_install-hooken.
- **iOS bruker CocoaPods, ikke SPM.** RevenueCat v9 har ingen Package.swift; SPM-referansene er fjernet fra project.pbxproj. Rør dem ikke.
- **Podfile har en `post_install`-hook som tvinger `IPHONEOS_DEPLOYMENT_TARGET = 15.0`** — uten den feiler bygget («compiling for iOS 13.0, but module Capacitor…»).
- **`xcode: latest` i codemagic.yaml** — Apple krever iOS 26 SDK for opplasting. Aldri pin til gammel Xcode.
- **Alltid `git pull --rebase --autostash` før push** — CI/andre kilder oppdaterer remote; push uten fetch ble avvist 17 ganger i én økt.
- **Valider codemagic.yaml lokalt før push** — 4 schema-feil gikk gjennom full CI-runde unødvendig.
- `npm install --legacy-peer-deps` (påkrevd pga RevenueCat v9 + Capacitor v8).
- **Node v24 / npm 11 ER installert lokalt** (`C:\Program Files\nodejs`) — npx-kommandoer fungerer i `Projects\sammen`.

## App-arkitektur

- Vanilla JS + localStorage (ingen React/Vue)
- Capacitor 8 wrapper for iOS og Android
- RevenueCat (`@revenuecat/purchases-capacitor`, API-nøkkel `appl_…` i www/index.html) for abonnement
- Firebase (web-SDK via CDN — ingen native pods): Firestore + Anonymous Auth for Community
  - Prosjekt: `together-4188b`; samlinger: `posts` (innlegg) og `reports` (moderasjonsrapporter)
- `IS_PRO` variabel styrer Pro-funksjoner
- `FREE_EXERCISE_IDS = new Set(['breath', 'ground'])` — gratis øvelser

## Nøkkelfunksjoner

- **Community**: Firestore sanntid, anonym. 5 poster gratis, resten Pro (paginering 6/side).
  - **UGC-moderasjon (Apple 1.2)**: guidelines-gate må godtas før visning/posting; `OBJECTIONABLE_PATTERNS`-filter blokkerer ved posting; «⋯ More» → Report/Block/Hide; innlegg med ≥3 rapporter auto-skjules (`REPORT_HIDE_THRESHOLD`); `SUPPORT_EMAIL`-konstant styrer kontakt-e-post overalt
  - Age rating i App Store Connect: **18+** (krav for anonymt UGC)
- **Translate**: MyMemory API, `langpair=en|{lang}` (kildespråk `en`, `auto` støttes ikke)
- **Abonnement**: KUN Together Pro Monthly (`com.kricliff.together.pro.monthly`, $4.99). Yearly/Lifetime er fjernet fra RevenueCat-offering (de fantes ikke i ASC og knakk getOfferings → avvisning 2.1(b))
- **Notifications**: `@capacitor/local-notifications` — 45 dager planlagt fram; av-knapp kansellerer; Android-kanal `daily-reminder` opprettes før planlegging

## App Store

- **App ID**: 6780441989 · **Bundle ID**: com.kricliff.together
- **TARGETED_DEVICE_FAMILY = "1"**: iPhone-only (ikke iPad)
- Avvisningshistorikk: 2.1(b) + 3.1.2(c) (RC-offering + pris — fikset), 1.2 UGC (moderasjon — fikset)
- Review Notes-mal: ingen innlogging kreves; paywall via Profile → Go Pro; Community-test via gate → «⋯ More»

## Codemagic

- Workflow: `ios-workflow` — bygg startes manuelt fra dashboardet, laster opp til TestFlight
- `android-workflow` satt opp men ikke klar (mangler Google Play-konto)
- Rekkefølge i ios-workflow: npm install → **cap copy** → pod install → build number → signing → build-ipa (--workspace) → publish

## Android (under oppsett)

- `@capacitor/android` installert, android-mappe generert
- Mangler: Google Play Console-konto (krever adressedokumentasjon), keystore i Codemagic, service account

## Markedsføring

- Instagram: together_mensmentalhealth · Facebook: Together — Men's Mental Health
- Product Hunt: klar til launch day · GitHub Pages som testlink for ikke-iOS

## Viktige konvensjoner

- Ingen em-streker (—) i brukervendt tekst
- All app-tekst på engelsk; norsk kun i Claude-samtaler og interne kommentarer
- Git-identitet er satt globalt (Kristian Clifford / kricliff@gmail.com)
