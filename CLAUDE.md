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
| `support.html` | Support-side for App Store Connects påkrevde Support URL per locale |
| `serve.js` | Avhengighetsfri statisk server (`node serve.js`) — brukes for live testing i browser, unngår at `npx` blokkeres av PowerShell execution policy |

## Build-lærdommer (dyrekjøpte — ikke gjenta feilene)

- **Bruk `npx cap copy ios`, ALDRI `cap sync ios`** — sync overskriver Podfile og fjerner post_install-hooken.
- **iOS bruker CocoaPods, ikke SPM.** RevenueCat v9 har ingen Package.swift; SPM-referansene er fjernet fra project.pbxproj. Rør dem ikke.
- **Podfile har en `post_install`-hook som tvinger `IPHONEOS_DEPLOYMENT_TARGET = 15.0`** — uten den feiler bygget («compiling for iOS 13.0, but module Capacitor…»).
- **`xcode: latest` i codemagic.yaml** — Apple krever iOS 26 SDK for opplasting. Aldri pin til gammel Xcode.
- **Alltid `git pull --rebase --autostash` før push** — CI/andre kilder oppdaterer remote; push uten fetch ble avvist 17 ganger i én økt.
- **Valider codemagic.yaml lokalt før push** — 4 schema-feil gikk gjennom full CI-runde unødvendig.
- `npm install --legacy-peer-deps` (påkrevd pga RevenueCat v9 + Capacitor v8).
- **Node v24 / npm 11 ER installert lokalt** (`C:\Program Files\nodejs`) — npx-kommandoer fungerer i `Projects\sammen`.
- **`@capacitor/local-notifications` API er `LN.getPending()`, IKKE `getPendingNotifications()`** — sistnevnte finnes ikke og feiler stille inn i try/catch. Denne bugen lot daglige påminnelser aldri trigges i en hel økt før den ble oppdaget ved å sammenligne med Keelstone.
- Én gang en App Store-versjon er "Ready for Distribution", er dens pre-release train stengt (feil 90062/90186) — krever å bumpe `MARKETING_VERSION` til neste versjon og opprette en ny versjonsoppføring i ASC for å laste opp nye builds. App Information-feltene (navn/subtitle) er også låst til ny versjon opprettes.

## App-arkitektur

- Vanilla JS + localStorage (ingen React/Vue)
- Capacitor 8 wrapper for iOS og Android
- RevenueCat (`@revenuecat/purchases-capacitor`, API-nøkkel `appl_…` i www/index.html) for abonnement
- Firebase (web-SDK via CDN — ingen native pods): Firestore + Anonymous Auth for Community + cloud backup
  - Prosjekt: `together-4188b`; samlinger: `posts` (innlegg, inkl. `replyCount`), `posts/{id}/replies` (svar-tråder), `reports` (moderasjonsrapporter), `backups/{uid}` (skybackup)
  - Anonym auth overlever IKKE avinstallering+reinstallering på iOS (ny UID hver gang) — cloud backup er derfor et sikkerhetsnett mens appen er installert, ikke en løsning for reinstallering. Manuell backup/restore (Profile → Your data) er den ekte reinstalleringsveien.
  - Firestore rules bruker `hasOnly([...])`-allowlist på update-feltene — nye felt (f.eks. `replyCount`) må legges til i allowlisten der, ellers feiler writes stille med `permission-denied`.
- `IS_PRO` variabel styrer Pro-funksjoner
- `FREE_EXERCISE_IDS = new Set(['breath', 'ground'])` — gratis øvelser

## Nøkkelfunksjoner

- **Community**: Firestore sanntid, anonym. 5 poster gratis, resten Pro (paginering 6/side).
  - **UGC-moderasjon (Apple 1.2)**: guidelines-gate må godtas før visning/posting; `OBJECTIONABLE_PATTERNS`-filter blokkerer ved posting (gjelder både innlegg og svar); «⋯ More» → Report/Block/Hide; innlegg/svar med ≥3 rapporter auto-skjules (`REPORT_HIDE_THRESHOLD`); `SUPPORT_EMAIL`-konstant styrer kontakt-e-post overalt
  - **Svar-tråder**: `renderReplyThread`, `submitReply`, `reportReply`/`submitReplyReport`; egen `hiddenReplies`-liste i state. Egen post-eier varsles IKKE med ekte push — `checkNewReplies()` sjekker `replyCount` mot `state.seenReplyCounts` og viser en in-app toast neste gang appen åpnes (ingen native push-infrastruktur).
  - Age rating i App Store Connect: **18+** (krav for anonymt UGC)
- **Translate**: MyMemory API, `langpair=en|{lang}` (kildespråk `en`, `auto` støttes ikke)
- **Abonnement**: KUN Together Pro Monthly (`com.kricliff.together.pro.monthly`, $4.99), med 3 dagers gratis prøveperiode for nye abonnenter. Yearly/Lifetime er fjernet fra RevenueCat-offering (de fantes ikke i ASC og knakk getOfferings → avvisning 2.1(b)). Prøveperioden er konfigurert i App Store Connect → Subscriptions → Introductory Offers (IKKE i kode); paywallen viser trial-vilkår automatisk når `pkg.product.introPrice` finnes på RevenueCat-pakken.
- **Notifications**: `@capacitor/local-notifications` — daglig påminnelse 45 dager planlagt fram; ukentlig refleksjonspåminnelse (id-range 4000-4099, neste 10 søndager); av-knapp kansellerer begge; Android-kanal `daily-reminder` opprettes før planlegging
- **Coach-kontaktskjema**: kun synlig når `L() === "no"` (norsk språkinnstilling, uavhengig av App Store-locale); oversettelsesnøkler (`coach_contact_*`) finnes derfor kun i `no:`-ordboken; mailer til together@cliffordcoaching.no

## App Store

- **App ID**: 6780441989 · **Bundle ID**: com.kricliff.together
- **TARGETED_DEVICE_FAMILY = "1"**: iPhone-only (ikke iPad)
- Avvisningshistorikk: 2.1(b) + 3.1.2(c) (RC-offering + pris — fikset), 1.2 UGC (moderasjon — fikset)
- Review Notes-mal: ingen innlogging kreves; paywall via Profile → Go Pro; Community-test via gate → «⋯ More»
- **Versjonsstatus**: 1.0.2 er sist godkjente/live versjon. 1.0.3 (`MARKETING_VERSION`) er under arbeid med et større feature-batch (se `review-notes-1.0.3.md`) — ikke sendt inn til review ennå da dette ble skrevet.

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
