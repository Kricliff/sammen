# Together: Men's Mental Health — Claude Code Context

## ⚠️ KRITISK: To lokale kopier av dette repoet

| Mappe | Rolle |
|---|---|
| `C:\Users\KristianClifford\Projects\sammen` | **AKTIV — all utvikling skjer her.** Har node_modules. |
| `C:\Users\KristianClifford\OneDrive - Great People\Dokumenter\App` | Stale klon (samme remote). **Ikke rediger her.** Mangler node_modules. Preview-panelet kan servere denne — sjekk `pwd` før du stoler på preview. |

Sjekk alltid hvilken mappe du står i før redigering. Codemagic bygger fra GitHub `origin/main` — endringer må committes OG pushes fra `Projects\sammen` for å nå CI.

**Bekreftet fellepunkt**: `preview_start` med `{name: "app"}` (Claude Browser-verktøyet) har resolvet `.claude/launch.json`/`serve.ps1` mot OneDrive-kopien i stedet for `Projects\sammen`, og servert utdatert innhold uten feilmelding. Sjekk `preview_logs` for linjen "Serving ..." og bekreft at stien er `Projects\sammen` — hvis ikke, stopp den serveren og start `serve.ps1` manuelt via PowerShell-verktøyet med `Set-Location "C:\Users\KristianClifford\Projects\sammen"` først, og pek nettleser-fanen til den porten med `navigate`/`{url:...}` i stedet.

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
- **Egne native plugins i `ios/App/App/*.swift` må registreres etter `cap copy`**: Capacitor 8 laster bare klasser i `packageClassList` (i den genererte `ios/App/App/capacitor.config.json`), og `cap copy` fyller den kun fra npm-pakker. Kjør `node scripts/register-ios-plugins.js` etterpå (eller `npm run cap:ios`). Codemagic gjør det som eget steg. Før dette (nov. 2026) ble ICloudSync og FirebaseAnalytics aldri lastet på iOS. Nye Swift-filer må også legges inn i `project.pbxproj`.
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
  - Skybackupen (`scheduleFirebaseBackup`, hele state inkl. humør og dagbok) er på som standard og kan slås av under Profil → Your data (`state.settings.cloudBackup`). Avslag sletter `backups/{uid}`. Dette er beskrevet i privacy.html og må stemme med App Privacy i App Store Connect.
  - Anonym auth overlever IKKE avinstallering+reinstallering på iOS (ny UID hver gang) — cloud backup er derfor et sikkerhetsnett mens appen er installert, ikke en løsning for reinstallering. Manuell backup/restore (Profile → Your data) er den ekte reinstalleringsveien.
  - Firestore rules bruker `hasOnly([...])`-allowlist på update-feltene — nye felt (f.eks. `replyCount`) må legges til i allowlisten der, ellers feiler writes stille med `permission-denied`.
- `IS_PRO` variabel styrer Pro-funksjoner
- `FREE_EXERCISE_IDS = new Set(['breath', 'ground'])` — gratis øvelser

## Nøkkelfunksjoner

- **Community**: Firestore sanntid, anonym. 5 poster gratis, resten Pro (paginering 6/side).
  - **UGC-moderasjon (Apple 1.2)**: guidelines-gate må godtas før visning/posting; `OBJECTIONABLE_PATTERNS`-filter blokkerer ved posting (gjelder både innlegg og svar); «⋯ More» → Report/Block/Hide; innlegg/svar med ≥3 rapporter auto-skjules (`REPORT_HIDE_THRESHOLD`); `SUPPORT_EMAIL`-konstant styrer kontakt-e-post overalt
  - **Svar-tråder**: `renderReplyThread`, `submitReply`, `reportReply`/`submitReplyReport`; egen `hiddenReplies`-liste i state. Egen post-eier varsles IKKE med ekte push — `checkNewReplies()` sjekker `replyCount` mot `state.seenReplyCounts` og viser en in-app toast neste gang appen åpnes (ingen native push-infrastruktur).
  - **Today's question** (`dailyPrompt()`, het tidligere «Today's prompt»): 60 spørsmål i `DAILY_PROMPTS`/`DAILY_PROMPTS_NO` roterer på lokal dato resten av året; i november brukes `NOVEMBER_PROMPTS` med ett spørsmål per kalenderdag (indeks = dato - 1, dag 19 = mannsdagen). EN- og NO-listene må ha samme lengde og rekkefølge. Refleksjonen i Training heter «Today's reflection» for å ikke forveksles.
  - Age rating i App Store Connect: **18+** (krav for anonymt UGC)
- **Translate**: MyMemory API, `langpair=en|{lang}` (kildespråk `en`, `auto` støttes ikke)
- **Abonnement**: KUN Together Pro Monthly (`com.kricliff.together.pro.monthly`, $4.99), med 3 dagers gratis prøveperiode for nye abonnenter. Yearly/Lifetime er fjernet fra RevenueCat-offering (de fantes ikke i ASC og knakk getOfferings → avvisning 2.1(b)). Prøveperioden er konfigurert i App Store Connect → Subscriptions → Introductory Offers (IKKE i kode); paywallen viser trial-vilkår automatisk når `pkg.product.introPrice` finnes på RevenueCat-pakken.
- **Notifications**: `@capacitor/local-notifications` — daglig påminnelse 45 dager planlagt fram; ukentlig refleksjonspåminnelse (id-range 4000-4099, neste 10 søndager); av-knapp kansellerer begge; Android-kanal `daily-reminder` opprettes før planlegging
- **Deling og vurdering**: `shareApp(source)` (Web Share, ellers kopierer lenken) fra delekortet øverst i Profil og fra fullført-vinduet når et program er ferdig. `maybeAskForReview()` kaller Apples egen vurderingsdialog (`AppReviewPlugin.swift`, SKStoreReviewController, krav i retningslinje 5.6.1) etter 7 dager på rad med humør «Okay» eller bedre, eller når et program er fullført. Maks én gang per 120 dager (`state.reviewAskedAt`).
- **Today's question på Hjem**: `homeQuestionCard()` under humørkortet. Svar-knappen sender via Community-porten hvis retningslinjene ikke er godtatt.
- **Spillet «Skip stones» / «Kast smutt»** (Training → Switch off): canvas-spill med én knapp i `openStoneGame()`, uten tid og uten å tape. Rekorden ligger i `state.stoneBest`. Teller ikke som øvelse.
- **Coach-kontaktskjema**: kun synlig når `L() === "no"` (norsk språkinnstilling, uavhengig av App Store-locale); oversettelsesnøkler (`coach_contact_*`) finnes derfor kun i `no:`-ordboken; mailer til together@cliffordcoaching.no

## App Store

- **App ID**: 6780441989 · **Bundle ID**: com.kricliff.together
- **TARGETED_DEVICE_FAMILY = "1"**: iPhone-only (ikke iPad)
- Avvisningshistorikk: 2.1(b) + 3.1.2(c) (RC-offering + pris — fikset), 1.2 UGC (moderasjon — fikset)
- Review Notes-mal: ingen innlogging kreves; paywall via Profile → Go Pro; Community-test via gate → «⋯ More»
- **Versjonsstatus**: 1.0.4 og 1.0.5 ble laget på Macen (aug. 2026, se git-loggen). 1.0.6 (okt. 2026, `review-notes-1.0.6.md`): programmene «30 små steg» (`steps30`) og «Gjennom mørketiden» (`winter`), søvn/humør-innsiktskort i Fremgang, november-spørsmål i Fellesskap, november-kort på Hjem, og `logEvent()`-sporing av `program_start`/`program_day_complete` i Firebase Analytics.
- **Alt er gratis siden 2026-08-03**: `IS_PRO = true` er hardkodet og `initRevenueCat()` kalles ikke. Ingen betalingsmur vises. Butikktekstene for 1.0.7 ligger i `appstore-listing-en.txt`, `appstore-listing-no.txt` og `playstore-listing-*.txt` (ingen Pro, inkl. «What's New»).
- **Sesongstyrt innhold** går på `isNovember()` (november-spørsmål, Hjem-kortet) og 19. november (mannsdag-melding i `todayMessage()`). Unngå varemerket «Movember» i appteksten, bruk «måneden for menns helse».

## Codemagic

- Workflow: `ios-workflow` — bygg startes manuelt fra dashboardet, laster opp til TestFlight
- `android-workflow` satt opp men ikke klar (mangler Google Play-konto)
- Rekkefølge i ios-workflow: npm install → **cap copy** → pod install → build number → signing → build-ipa (--workspace) → publish

## Android (under oppsett)

- `@capacitor/android` installert, android-mappe generert
- **Klart i kode**: ekte app-ikon + splash (generert med `npx @capacitor/assets generate --android` fra `assets/icon*.png`, kilder laget av `assets/make-android-icons.ps1` — kjør på nytt hvis merkevarefargene endres), `signingConfigs.release` i `android/app/build.gradle` som leser Codemagic sine env-variabler (`CM_KEYSTORE_PATH` m.fl.) når `together_keystore`-integrasjonen er satt opp, `versionName` synket med iOS, platform-bevisst RevenueCat-nøkkel i `REVENUECAT_KEYS` (www/index.html, rundt `initRevenueCat()`)
- **Mangler fortsatt**: Google Play Console-konto er under identitetsverifisering (status per 2026-07-25). Deretter: opprette appen i konsollen, keystore lastet opp i Codemagic som `together_keystore`, `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS` service-account, RevenueCat Android-app + goog_-nøkkel limt inn i `REVENUECAT_KEYS.android` (er en placeholder nå), Play Store feature graphic (1024x500) + Android-tilpassede skjermbilder
- Butikktekst klar til innliming: `playstore-listing-en.txt`, `playstore-listing-no.txt`; Data Safety-skjema forhåndsutfylt i `playstore-data-safety.md`

## Markedsføring

- Instagram: together_mensmentalhealth · Facebook: Together — Men's Mental Health
- Product Hunt: klar til launch day · GitHub Pages som testlink for ikke-iOS

## Viktige konvensjoner

- Ingen em-streker (—) i brukervendt tekst
- All app-tekst på engelsk; norsk kun i Claude-samtaler og interne kommentarer
- Git-identitet er satt globalt (Kristian Clifford / kricliff@gmail.com)

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
