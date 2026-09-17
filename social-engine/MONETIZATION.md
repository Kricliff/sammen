# MONETIZATION.md

**Undersøkt:** 2026-09-17 · **Eier:** Kristian Clifford (bosatt i Norge) · **Status:** Fase 0, grunnlagsdokument

Dette dokumentet svarer på ett spørsmål: **hvilke av kanalene betaler faktisk penger til en skaper som bor i Norge, hva kreves for å komme dit, og hvor langt unna er vi?**

---

## 0. Kildekritikk — les dette først

Miljøet dette ble undersøkt fra har **utgående nettverk låst til en allowlist**. Jeg fikk kjørt websøk, men ble blokkert fra å hente de offisielle supportsidene direkte (`support.google.com`, `support.tiktok.com`, `developers.facebook.com` returnerte alle 403 fra proxyen).

Det betyr konkret:

- Tallene under er triangulert fra **flere uavhengige sekundærkilder** som refererer de offisielle reglene, ikke lest fra primærkilden.
- Der kildene er samstemte, har jeg behandlet det som pålitelig.
- Der kildene **spriker**, har jeg skrevet det eksplisitt og markert det `⚠️ MÅ VERIFISERES`.
- Ingenting i dette dokumentet bør brukes som grunnlag for en søknad eller en investeringsbeslutning uten at Kristian har åpnet den offisielle siden selv.

`TODO(kristian):` Verifiser hver rad merket `⚠️` mot primærkilden før Fase 3. Det tar ca. 20 minutter totalt, og det er de 20 minuttene som avgjør hvilken kanal vi bygger først.

---

## 1. Kortversjonen

| Kanal | Deler annonseinntekt med skaper? | Tilgjengelig for Norge-bosatt? | Terskel | Vår vurdering |
|---|---|---|---|---|
| **YouTube Shorts** | **Ja** — YouTube Partner Program (YPP) | Ja | 1 000 abonnenter **+** 10 mill. Shorts-visninger på 90 dager *eller* 4 000 offentlige visningstimer på 12 mnd | **Eneste kanal med en klar, åpen, søkbar vei til annonsekroner.** Terskelen er brutal. |
| **TikTok** | Ja — Creator Rewards Program | **⚠️ Etter alt å dømme NEI for Norge** | 10 000 følgere + 100 000 visninger siste 30 dager + video ≥ 60 sek | **Ren rekkevidde, ingen direkte inntekt.** Se 3.2 — dette er det viktigste enkeltfunnet. |
| **Facebook** | Ja — Facebook Content Monetization | Norge er monetiseringsland, men **programmet er invitasjonsbasert** | ~10 000 følgere + 600 000 minutter sett siste 60 dager (ikke en garanti for invitasjon) | Kan ikke planlegges mot. Kan ikke søkes på. |
| **Instagram** | Delvis / bonusprogrammer, varierende | ⚠️ Uavklart for Norge | Uklart og i stadig endring | Rekkevidde + merkevare. Ikke regn med kroner. |
| **LinkedIn** | Ja — BrandLink (pre-roll på video) | Invitasjonsbasert, andel ikke offentliggjort | Ingen offentlig terskel; utvelgelse på kvalitet og annonsørrelevans | **Ingen annonseinntekt å planlegge mot — men den klart beste kanalen for kundehenvendelser.** |

**Konklusjonen i én setning:** Av fem kanaler har nøyaktig **én** en åpen, søkbar vei til annonseinntekt for en skaper i Norge, og dens terskel er 10 millioner visninger på 90 dager.

---

## 2. YouTube Shorts — den eneste åpne døren

### 2.1 Krav

YPP har to trinn:

| Trinn | Krav | Hva du får |
|---|---|---|
| Trinn 1 | 500 abonnenter + 3 mill. Shorts-visninger på 90 dager *(alternativt 3 000 visningstimer)* | Fan funding: medlemskap, Super Thanks, Super Chat. **Ingen annonseinntekt.** |
| Trinn 2 | 1 000 abonnenter **+** 10 mill. Shorts-visninger på 90 dager **eller** 4 000 offentlige visningstimer på 12 mnd | **Annonseinntektsdeling.** Dette er den vi er ute etter. |

Kritiske detaljer:

- **De to sporene kombineres aldri.** Du kvalifiserer på visningstimer *eller* på Shorts-visninger. Shorts-visninger teller ikke mot visningstimer. Det betyr at en ren Shorts-strategi har nøyaktig én vei: 10 millioner visninger på 90 dager.
- Monetiseringstellingen bruker **«engaged views»**, som er strengere enn visningstallet i dashboardet. Planlegg med margin.
- Ingen aktive advarsler mot retningslinjene på kanalen.

### 2.2 Terskelen stiger 1. februar 2027 ⚠️

Flere kilder melder at YouTube fra **1. februar 2027** dobler inngangsbaren for nye søkere: **8 000 visningstimer eller 20 millioner Shorts-visninger**.

Konsekvensen er konkret og tidsbestemt: **om vi ikke er gjennom YPP-nåløyet før 1. februar 2027, dobles avstanden.** Det er 4,5 måneder fra i dag. Vi kommer ikke til å rekke det, og det bør stå svart på hvitt.

### 2.3 Utbetalingsmodell

Shorts bruker en **pool-modell**, ikke per-annonse: annonseinntekter fra Shorts-feeden samles i en pott, musikklisenser trekkes fra, og resten fordeles etter skaperens andel av kvalifiserte visninger. **Skaperen får 45 %** av sin tildelte andel.

Praktisk betyr det at RPM ikke er noe vi styrer direkte — den følger av hvor publikum bor og hvor hardt annonsørene byr det kvartalet.

### 2.4 Faktisk RPM

| Situasjon | RPM (USD per 1 000 visninger) |
|---|---|
| Globalt snitt | $0,01–$0,07 |
| Vanligst rapportert | $0,03–$0,05 |
| Høyverdinisjer (finans, B2B, tech, eiendom) med USA-publikum | $0,15–$0,25 |

En visning fra USA/UK/Canada/Australia er verdt **10–20x** en visning fra et lavinntektsland. Dette er hele begrunnelsen for at alt innhold skal være på engelsk og rettet mot et angloamerikansk publikum — det er ikke en stilpreferanse, det er en 10–20x forskjell på inntektssiden.

Kristians nisje (mental trening, karriere, prestasjon) grenser til «self-improvement/B2B». **Vi planlegger konservativt med $0,05 og regner $0,12 som et optimistisk, men ikke urimelig, tak.**

### 2.5 API-begrensning — gode nyheter ⚠️

YouTube Data API v3 ga historisk 10 000 kvoteenheter per dag, og en opplasting kostet 1 600 → maks 6 opplastinger per dag.

Flere kilder melder at dette er endret: kostnaden ble kuttet i desember 2025, og fra **1. juni 2026 ligger opplastinger i sin egen bøtte** — ca. 1 enhet mot en egen grense på **100 opplastinger per dag**, uten å trekke fra hovedkvoten.

Hvis dette stemmer, er opplastingskvote **ikke lenger en arkitektonisk begrensning** for oss. Jeg bygger likevel kvotesporing inn i Publisher-agenten, fordi lesekall (analytics, kommentarer) fortsatt trekker fra 10 000-potten, og fordi denne typen endring kan gå begge veier.

---

## 3. TikTok — det viktigste enkeltfunnet

### 3.1 Krav til Creator Rewards Program

- 10 000 følgere
- 100 000 visninger siste 30 dager
- Minst 18 år, personlig konto i god stand
- **Videoen må være over 60 sekunder** — kortere videoer tjener ingenting
- Betaling: $0,40–$1,20 RPM avhengig av nisje og publikumsland (betydelig høyere enn YouTube Shorts)

### 3.2 Norge er etter alt å dømme ikke med ⚠️ MÅ VERIFISERES

Her spriker kildene, og det er verdt å være presis om hvordan:

- Én kilde (juli 2026) lister **åtte** land: USA, UK, Tyskland, Frankrike, Japan, Sør-Korea, Brasil, Mexico.
- En annen lister en bredere gruppe inkludert Canada, Australia, Italia, Spania og flere asiatiske markeder.
- **Ingen av listene inneholder Norge.**
- Norge dukker opp i én liste — men det er **Effect Creator Rewards**, et helt annet program for AR-effekter, ikke for video.

To uavhengige lister som er uenige med hverandre, men enige om at Norge mangler, er et sterkt signal.

**Konsekvens for arkitekturen:** TikTok vektes som **ren rekkeviddekanal uten direkte inntekt**. Systemet må kunne representere «kanal med visninger men strukturelt null annonseinntekt» uten at Portfolio-agenten automatisk kutter den — for rekkevidde på TikTok kan fortsatt drive følgere til YouTube og henvendelser til innboksen. Det er en eksplisitt datamodell-konsekvens, ikke en fotnote.

**Det som *ikke* er en løsning:** å oppgi et annet bostedsland eller rute utbetaling via et annet marked. Det er svindel mot plattformen, det bryter norsk skatterett, og det setter hele kontoen i spill. Vi gjør det ikke.

### 3.3 Content Posting API krever revisjon — hard sperre for autonom publisering

Dette er en reell blokkering for Fase 3:

- **Ikke-reviderte API-klienter kan kun publisere med `SELF_ONLY` synlighet** — altså privat.
- Alle brukerkontoer som publiserer via en ikke-revidert klient **må være satt til privat** på publiseringstidspunktet.
- Ikke-reviderte klienter kan betjene **maks 5 brukere per 24 timer**.
- For å gjøre innholdet offentlig må kontoeieren **manuelt** sette kontoen til offentlig og deretter endre personverninnstillingen på hver enkelt video.

Med andre ord: **autonom, offentlig publisering til TikTok er ikke mulig før TikTok har godkjent klienten i en revisjon.** Det er en forretnings- og juridisk gjennomgang hos TikTok, ikke noe vi koder oss forbi. Det må søkes om, og svartiden er utenfor vår kontroll.

### 3.4 Originalitetskravet treffer oss direkte

Creator Rewards krever innhold som er «original content and produced entirely by the creator and/or adds new ideas to preexisting content», og ekskluderer eksplisitt innhold med **«minimal original input»**.

Den skarpeste formuleringen jeg fant i kildene:

> En skaper som bruker AI til å rense lyd, generere undertekster eller justere fargene beholder full programkvalifisering. En skaper som bruker AI til å generere hele videoen, fra bilde til voiceover, gjør det ikke.

Det er nøyaktig systemet vi er i ferd med å bygge. Se seksjon 6.

---

## 4. Meta (Facebook + Instagram)

### 4.1 Facebook Content Monetization

- Erstatter de gamle programmene (Reels Play, in-stream ads) med ett samlet program som betaler på tvers av Reels, lengre video, Stories, bilder og tekstinnlegg.
- **Fortsatt invitasjonsbasert per juli 2026.**
- Typiske kriterier som nevnes: ~10 000 følgere, 600 000 minutter sett siste 60 dager, minst 5 videoer på siden, 18+ i et kvalifisert land.
- **Men:** det finnes ingen offentlig regel som sier at en gitt følgermengde utløser invitasjon. Du kan treffe alle tallene og aldri bli invitert.

Norge er bekreftet som monetiseringsland hos Meta for verktøyene generelt. Det er ikke det samme som at Kristian får invitasjon.

### 4.2 Creator Fast Track — relevant, men ikke for oss ennå

Meta lanserte i mars 2026 et program som garanterer:

- **$1 000/mnd** ved minst 100 000 følgere på Instagram, TikTok eller YouTube
- **$3 000/mnd** ved over 1 million følgere på minst én av dem
- Krav: minst 15 Reels på Facebook i en 30-dagersperiode, fordelt på minst 10 ulike dager
- Garantien varer 3 måneder, men gir varig tilgang til Content Monetization og et vedvarende rekkeviddeløft

To ting er verdt å merke seg:

1. **Det krever 100 000 følgere et annet sted først.** Det er ikke en inngang, det er en belønning for noen som allerede har lyktes. Men det er det mest konkrete inntektstallet i hele dette dokumentet, og det er verdt å modellere som et eksplisitt delmål.
2. **Meta sier eksplisitt at innholdet kan være AI-generert**, så lenge det er originalt fra skaperen. Meta er dermed den **klart mest tillatende** plattformen for det systemet vi bygger. Det er et argument for å vekte Meta tyngre enn ren RPM skulle tilsi.

### 4.3 Instagram

Instagram-monetisering er i bevegelse og dårlig dokumentert for Norge spesifikt. Kildene sier i praksis «sjekk i Meta Business Suite». `TODO(kristian):` Åpne Meta Business Suite → Monetisering og skriv av nøyaktig hvilke programmer som står som tilgjengelige for kontoen din. Det er raskere og mer pålitelig enn noe søk.

### 4.4 API-begrensninger

- Krever **Business- eller Creator-konto** koblet til en Facebook-side du er admin for. Personlige kontoer har ingen programmatisk publisering.
- Tillatelser `instagram_business_basic` og `instagram_business_content_publish` krever appgjennomgang — **regn med 5+ virkedager per innsending**.
- Publiseringsgrense: dokumentasjonen motsier seg selv (50 vs. 100 innlegg per 24 t). Reels og Stories teller mot samme grense. Ingen nullstilling ved midnatt — det er et rullerende vindu.
- **Arkitektonisk konsekvens:** ikke hardkod grensen. Spør `GET /<IG_ID>/content_publishing_limit` før publisering.

---

## 5. LinkedIn

**BrandLink** er LinkedIns annonseinntektsdeling: annonsører betaler for 15-sekunders pre-roll foran skaperes video, og skaperen får en andel.

- Lansert mai 2025, **invitasjonsbasert**, utvelgelse på innholdskvalitet og annonsørrelevans.
- **LinkedIn har ikke offentliggjort hvor stor andelen er.** Da forgjengeren (Wire-programmet for forlag) var i drift, lå den nær 50 %.
- Tidlige deltakere er navn som Steven Bartlett og Gary Vaynerchuk — altså etablerte storskapere, ikke folk som akkurat har startet.

**Vurdering:** LinkedIn gir ingen annonseinntekt vi kan planlegge mot. Men det er den kanalen som ligger nærmest faktisk omsetning for Kristian — gjennom henvendelser til **Clifford Coaching og Mentaltrening**, hans eget selskap. Rekrutteringsoppdrag er *ikke* en inntektsvei her: Kristian er fast ansatt, og honorarene tilfaller arbeidsgiver. Systemet må kunne måle coachinghenvendelser som inntekt. Se UNIT_ECONOMICS.md seksjon 6.

---

## 6. Den største risikoen: plattformenes regler mot masseprodusert AI-innhold

Dette hører hjemme i et monetiseringsdokument, fordi det er en **inntektsrisiko**, ikke en compliance-detalj.

### 6.1 YouTube

15. juli 2025 omdøpte YouTube retningslinjen «repetitious content» til **«inauthentic content»**, og presiserte at den dekker innhold som er repetitivt eller masseprodusert.

Retningslinjen retter seg mot masseprodusert, lavinnsats, malbasert innhold som kan replikeres i skala med lite menneskelig input. Tre kategorier nevnes:

1. Generisk, repetitivt eller malbasert innhold
2. Frastøtende eller urovekkende innhold
3. **Innhold der AI-personas diskuterer sensitive temaer som helse og økonomi**

Kategori 3 er verdt å stoppe ved. Kristians felt er mental trening. Det ligger nærme nok helse til at en AI-generert forteller som snakker om mental helse kan treffe denne kategorien direkte.

**Håndhevingen er skjerpet fra video-nivå til kanal-nivå.** I januar 2026 terminerte YouTube 16 masse-AI-kanaler i én bølge — 4,7 milliarder visninger, 35 millioner abonnenter og nær $10 millioner i årlig inntekt slettet.

Det finnes en åpning: AI-assistert innhold **er** monetiserbart hvis det oppgir syntetiske elementer og tilfører «significant original and authentic value».

### 6.2 TikTok

Se 3.4. Fullt AI-generert video (bilde + voiceover) diskvalifiserer fra Creator Rewards. AI-merking er påkrevd.

### 6.3 Meta

Mest tillatende. Creator Fast Track sier eksplisitt at innholdet kan være AI-generert så lenge det er originalt fra skaperen.

### 6.4 Hva dette betyr for oppdraget

Oppdraget spesifiserer et system som håndterer hele livssyklusen **«uten menneskelig involvering i normal drift»**.

På YouTube og TikTok er «masseprodusert innhold laget med minimal menneskelig input» ikke en risiko systemet kan styre unna med en streng Quality-agent. **Det er definisjonen på det de to plattformene har skrevet regler for å ekskludere fra monetisering.** Quality-agenten kan fange dårlig språk og feil fakta. Den kan ikke gjøre innholdet menneskeskapt.

Et blokkert innlegg koster lite. En kanalterminering koster alt — inkludert de månedene med produksjonskostnad som lå bak den. Jeg har regnet på begge deler i UNIT_ECONOMICS.md seksjon 5.

Anbefalingen min står der, men kort: **behold hele autonomien i pipelinen, men legg inn ett menneskelig godkjenningstrykk før publisering.** Det koster Kristian 30 sekunder per innlegg på mobilen. Det er den billigste forsikringen i hele systemet, og det er forskjellen mellom «masseprodusert» og «publisert av en skaper» i plattformenes øyne.

---

## 7. Anbefalt kanalvekting

| Prioritet | Kanal | Begrunnelse |
|---|---|---|
| **1** | **YouTube Shorts** | Eneste åpne, søkbare vei til annonsekroner. Bygg publiseringen hit først. |
| **2** | **LinkedIn** | Ingen annonseinntekt, men den korteste veien til coachinghenvendelser. Lavest produksjonskostnad (tekst + ett bilde). |
| **3** | **Facebook / Instagram** | Mest tillatende AI-regler, og Creator Fast Track er det mest konkrete inntektstallet vi har funnet. Reels gjenbruker YouTube-assetet gratis. |
| **4** | **TikTok** | Ren rekkevidde. Krever API-revisjon før autonom publisering i det hele tatt er mulig. Bygges sist. |

---

## 8. Kilder

Alle hentet 2026-09-17 via websøk. Ingen er lest fra primærkilden — se seksjon 0.

**YouTube**
- [YouTube Partner Program Requirements 2026 — AIR Media-Tech](https://air.io/en/monetization/youtube-partner-program-requirements-2026-the-complete-guide)
- [YouTube Partner Program overview & eligibility — YouTube Help](https://support.google.com/youtube/answer/72851?hl=en&co=GENIE.Platform%3DAndroid)
- [YouTube Shorts Monetization Requirements 2026 — Unkoa](https://www.unkoa.com/youtube-shorts-monetization-requirements/)
- [YouTube Shorts RPM in 2026 — Mediacube](https://mediacube.io/en-US/blog/youtube-shorts-rpm)
- [YouTube CPM & RPM Rates 2026 — Lenos](https://www.lenostube.com/en/youtube-cpm-rpm-rates/)
- [YouTube clarifies policies around AI slop — TechCrunch, 2026-07-20](https://techcrunch.com/2026/07/20/youtube-clarifies-policies-around-ai-slop-and-upsetting-videos/)
- [YouTube's AI Slop Crackdown — OutlierKit](https://outlierkit.com/resources/youtube-ai-slop-crackdown-2026/)
- [YouTube API Quota Limits 2026 — Phyllo](https://www.getphyllo.com/post/youtube-api-limits-how-to-calculate-api-usage-cost-and-fix-exceeded-api-quota)
- [YouTube API Quota Explained 2026 — OutlierKit](https://outlierkit.com/resources/youtube-api-quota/)

**TikTok**
- [TikTok Creator Rewards Program Explained 2026 — Make Influence](https://www.makeinfluence.com/en/academy/tiktok-creator-rewards-program-how-organic-monetization-works-in-2026)
- [TikTok Creator Rewards Program 2026 — Creators Agency](https://creatorsagency.co/blog/tiktok-creator-rewards-program-2026)
- [TikTok Creator Rewards eligible countries 2026 — Quasa](https://quasa.io/media/tiktok-creator-rewards-program-eligible-countries-in-2026)
- [TikTok Creator Fund Countries 2026 — ttcalculator](https://ttcalculator.net/learn/creator-fund-countries/)
- [Direct Post — TikTok for Developers](https://developers.tiktok.com/docs/en/content-posting-api-reference-direct-post)
- [Content Sharing Guidelines — TikTok for Developers](https://developers.tiktok.com/docs/en/content-sharing-guidelines)
- [TikTok Content Posting API: private-only until audited — Vorp Labs](https://vorplabs.com/agent-tools/tiktok-content-posting-api)
- [Fixing the TikTok Creator Rewards «Unoriginal Content» flag — Social Boost Digital](https://socialboostdigital.com/blog/tiktok-creator-rewards-unoriginal-content-flag)

**Meta**
- [Introducing Facebook Content Monetization — Facebook for Creators](https://creators.facebook.com/introducing-facebook-content-monetization)
- [Creator Fast Track — Meta Newsroom, 2026-03](https://about.fb.com/news/2026/03/creator-fast-track-grow-your-audience-earn-money-on-facebook/)
- [Meta will pay creators to post on Facebook — CNBC, 2026-03-18](https://www.cnbc.com/2026/03/18/meta-creator-pay-instagram-tiktok-youtube-facebook.html)
- [Facebook Content Monetization 2026 requirements — Creators Agency](https://creatorsagency.co/blog/facebook-content-monetization-requirements-2026)
- [Facebook Content Monetization: Country and language availability — Meta Business Help](https://www.facebook.com/business/help/267128784014981)
- [Publish Content using the Instagram Platform — Meta Developer Docs](https://developers.facebook.com/docs/instagram-platform/content-publishing/)
- [Instagram API Rate Limits: The Real Caps — bundle.social](https://bundle.social/blog/instagram-api-rate-limits)

**LinkedIn**
- [LinkedIn Takes First Steps Toward Creator Monetization With BrandLink — Social Media Today](https://www.socialmediatoday.com/news/linkedin-enables-advertisers-influencer-content-brandlink-wire/746928/)
- [LinkedIn to share ad revenue with creators — BuzzInContent](https://www.buzzincontent.com/news/linkedin-to-share-ad-revenue-with-creators-in-new-video-monetisation-push-9024724)
- [LinkedIn BrandLink: How Creators Are Earning from Pre-Roll Ads — Artha](https://artha.link/blog/linkedin-brandlink/)
