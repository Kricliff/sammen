# Together: Men's Mental Health — Claude Code Context

## Prosjektoversikt

Kristian Clifford (coach og mental trener) bygger en mental helse-app for menn. Appen heter **Together: Men's Mental Health** og er en Capacitor-app (iOS + Android) med vanilla JS og localStorage.

- **GitHub**: https://github.com/Kricliff/sammen
- **GitHub Pages demo**: https://kricliff.github.io/sammen/en.html (alltid Pro, engelsk)
- **Privacy Policy**: https://kricliff.github.io/sammen/privacy.html
- **Kontakt**: kricliff@gmail.com
- **Coaching-side**: https://cliffordcoaching.no

## Filstruktur

| Fil/mappe | Beskrivelse |
|---|---|
| `www/index.html` | Capacitor-appen (norsk, produksjon) |
| `en.html` | GitHub Pages demo (engelsk, alltid Pro) |
| `privacy.html` | Personvernside for App Store |
| `ios/` | Xcode-prosjekt for iOS |
| `android/` | Android-prosjekt (under oppsett) |
| `codemagic.yaml` | CI/CD — ios-workflow og android-workflow |
| `capacitor.config.json` | App ID: `com.kricliff.together` |

## App-arkitektur

- Vanilla JS + localStorage (ingen React/Vue)
- Capacitor 8 wrapper for iOS og Android
- RevenueCat (`@revenuecat/purchases-capacitor`) for abonnementer
- `npm install --legacy-peer-deps` (påkrevd pga RevenueCat v9 + Capacitor v8)
- `IS_PRO` variabel styrer Pro-funksjoner
- `FREE_EXERCISE_IDS = new Set(['breath', 'ground'])` — gratis øvelser

## Nøkkelfunksjoner

- **Community**: 5 poster gratis, resten Pro. Paginering for Pro (6 per side). Inline translate-knapp (MyMemory API, `en|{lang}`)
- **Translate**: `https://api.mymemory.translated.net/get?q=TEXT&langpair=en|LANG` — bruker `en` som kildespråk (ikke `auto`, støttes ikke)
- **Abonnement**: Together Pro Monthly (`com.kricliff.together.pro.monthly`), Together Pro Yearly
- **Notifications**: `@capacitor/local-notifications`

## App Store

- **App ID**: 6780441989
- **Bundle ID**: com.kricliff.together
- **Status**: Under review (build 49, versjon 1.0)
- **TestFlight**: Tilgjengelig for testing
- **TARGETED_DEVICE_FAMILY = "1"**: iPhone-only (ikke iPad)

## Codemagic

- Workflow: `ios-workflow` (bruk denne for iOS-builds)
- `android-workflow` er satt opp men ikke klar (mangler Google Play-konto)
- Bygg kjøres manuelt fra Codemagic-dashboardet
- Uploader automatisk til TestFlight

## RevenueCat

- API-nøkkel er satt opp i Xcode-prosjektet
- Produkter konfigurert i App Store Connect og RevenueCat-dashboardet
- Paid Apps Agreement godtatt i App Store Connect

## Android (under oppsett)

- `@capacitor/android` installert, android-mappe generert
- Mangler: Google Play Console-konto (krever adressedokumentasjon)
- Mangler: Android keystore i Codemagic
- Mangler: Google Play service account

## Markedsføring

- Instagram: together_mensmentalhealth (eller tilsvarende)
- Facebook: Together — Men's Mental Health
- Product Hunt: Klar til launch day (tekst forberedt)
- GitHub Pages brukes som testlink for ikke-iOS-brukere

## Git

- To lokale mapper peker på samme GitHub-remote — alltid `git pull --rebase` før push
- Primær arbeidsmappe (Mac): klone fra https://github.com/Kricliff/sammen.git

## Viktige konvensjoner

- Ingen em-streker (—) i brukervendt tekst
- All app-tekst på engelsk
- Norsk brukes kun i Claude-samtaler og interne kommentarer
