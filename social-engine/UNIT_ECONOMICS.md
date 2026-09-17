# UNIT_ECONOMICS.md

**Regnet:** 2026-09-17 · **Valutakurs:** USD/NOK = **9,30** (spot lå 9,18–9,35 uken før; kursen er en konfigverdi, ikke en konstant)

Dette dokumentet svarer på: **hva koster ett innlegg, og hvor mange visninger må det ha for å gå i null?**

Alle tall er konservative. Der jeg har vært i tvil, har jeg valgt det dyreste alternativet. Regnestykkene står synlig slik at du kan overprøve hver forutsetning.

---

## 1. Inputpriser

### 1.1 Claude-modeller (per million tokens)

| Modell | Inn | Ut |
|---|---|---|
| Opus 5 (`claude-opus-5`) | $5,00 | $25,00 |
| Sonnet 5 (`claude-sonnet-5`) | $2,00 | $10,00 |
| Haiku 4.5 (`claude-haiku-4-5`) | $1,00 | $5,00 |

To rabatter som er relevante for oss:
- **Prompt caching:** cachede tokens leses til ~0,1x pris. `voice.md`, merkevareregler og systemprompter er identiske for hvert eneste innlegg — det er nøyaktig det caching er laget for.
- **Batch API:** 50 % rabatt mot asynkron kjøring. Research- og Analyst-jobber er ikke tidskritiske og kan batch-kjøres.

### 1.2 Videogenerering

Markedsspennet er $0,03–$0,70 per sekund.

| Modell | $/sek | 8-sek klipp (NOK) |
|---|---|---|
| Veo 3.1 Lite, 720p | $0,03 | 2,23 |
| Veo 3.1 Lite, 1080p | $0,05 | 3,72 |
| Kling 3.0 | ~$0,112 | 8,33 |
| Sora 2 Pro | $0,30–0,70 | 22–52 |

**Merk:** Sora 2s API stenges 24. september 2026. Ikke bygg mot den.

### 1.3 Everygen-kontoen din — et konkret funn

Jeg sjekket den faktiske kontoen din. Den står på **`starter_monthly`, 200 kreditter/mnd, 116 igjen** per i dag.

Faktiske priser hentet fra tjenesten:

| Generering | Kreditter |
|---|---|
| Veo 3.1 Lite, 8 sek, 9:16, 1080p | **14** |
| Kling 3.0 Turbo, 8 sek, 9:16 | **19** |
| Bilde (Gemini 3.1 Flash, 1K) | **2** |

Starter-planen koster i størrelsesorden $14–18/mnd ⚠️ `TODO(kristian): bekreft faktisk månedspris`. Med $18 blir det **$0,09 per kreditt**.

To konsekvenser, og den andre er viktigst:

1. **Everygen er ca. 3–4x dyrere enn å gå direkte på modell-API.** Et 8-sekunders Veo Lite-klipp: 14 kreditter ≈ $1,26 ≈ **11,72 NOK** via Everygen, mot **3,72 NOK** direkte.
2. **Taket er den reelle sperren.** 200 kreditter i måneden = **14 klipp à 8 sekunder**. En 30-sekunders Short trenger ~4 klipp. Det gir **3–4 ferdige Shorts i måneden**, ikke 90.

Everygen er utmerket for manuell produksjon. Som motor i en volumpipeline er det feil verktøy. **Anbefaling: bygg mot modell-API direkte, behold Everygen til enkeltstående, håndplukket innhold.**

### 1.4 Øvrige kostnader

| Post | Kostnad |
|---|---|
| TTS/voiceover, ~30 sek | ~$0,10 → **0,93 NOK** |
| Infrastruktur (VPS + Postgres + Redis + objektlagring) | ~$25/mnd → **232 NOK/mnd** |

---

## 2. Kostnad per innlegg — kortvideo

En 30-sekunders Short: 4 klipp à 8 sekunder, voiceover, tekstoverlegg.
Ett `content_item` distribueres til YouTube + Instagram + Facebook + TikTok. **Produksjonskostnaden betales én gang og fordeles på fire kanaler.**

### 2.1 Tokenkostnad — scenario A: alt på Opus 5

| Agent | Inn-tokens | Ut-tokens | USD |
|---|---|---|---|
| Research | 25 000 | 2 000 | 0,175 |
| Copywriter (2 varianter) | 12 000 | 3 000 | 0,135 |
| Visual (promptbygging) | 6 000 | 1 000 | 0,055 |
| Quality & Compliance | 15 000 | 1 500 | 0,113 |
| Revisjonsrunde (snitt 0,5) | — | — | 0,120 |
| Strategist (amortisert over 20 innlegg) | — | — | 0,028 |
| Analyst/Revenue/Cost/Portfolio (amortisert) | — | — | 0,050 |
| **Sum** | | | **$0,676** → **6,28 NOK** |

### 2.2 Tokenkostnad — scenario B: blandet modellvalg + caching

Research, Visual og Quality på Sonnet 5. Copywriter blir på Opus 5 (det er der morsmålskvaliteten avgjøres — dette er ikke stedet å spare). `voice.md` og systemprompter caches.

| Agent | Modell | USD |
|---|---|---|
| Research | Sonnet 5 | 0,070 |
| Copywriter | Opus 5 + cache | 0,099 |
| Visual | Sonnet 5 | 0,022 |
| Quality | Sonnet 5 | 0,045 |
| Revisjonsrunde (snitt 0,5) | Sonnet 5 | 0,050 |
| Strategist (amortisert) | Opus 5 | 0,028 |
| Økonomiagenter (amortisert) | Haiku/Sonnet | 0,025 |
| **Sum** | | **$0,339** → **3,16 NOK** |

Tokenkostnaden halveres. Men merk størrelsesordenen: **tokens er ikke hovedkostnaden. Video er.**

### 2.3 Full kostnad per kortvideo

| Post | A: konservativ | B: optimalisert | C: via Everygen |
|---|---|---|---|
| Agent-tokens | 6,28 | 3,16 | 6,28 |
| Video (4 × 8 sek) | 14,88 *(Veo Lite 1080p)* | 8,93 *(Veo Lite 720p)* | 46,90 *(56 kreditter)* |
| Voiceover | 0,93 | 0,93 | 0,93 |
| Infrastruktur (ved 90 innlegg/mnd) | 2,58 | 2,58 | 2,58 |
| **Sum per innlegg** | **24,67 NOK** | **15,60 NOK** | **56,69 NOK** |

Scenario C er dessuten begrenset til ~3 innlegg i måneden av kredittaket. Den er tatt med for å vise hvorfor vi ikke velger den.

**Vi planlegger med scenario B: 15,60 NOK per kortvideo**, og bruker scenario A som budsjettak.

### 2.4 Kostnad per LinkedIn-/bildeinnlegg

| Post | NOK |
|---|---|
| Agent-tokens (blandet, ingen videoprompting) | 2,60 |
| Ett bilde (direkte API) | 0,35 |
| Infrastruktur | 2,58 |
| **Sum** | **~5,50 NOK** |

Tekst- og bildeinnlegg koster under en tredjedel av en kortvideo. Det er relevant for kanalvektingen: LinkedIn er både billigst å produsere for **og** den kanalen som ligger nærmest faktisk omsetning for Kristians virksomhet.

---

## 3. Break-even: hvor mange visninger må ett innlegg ha?

RPM i NOK: $0,05 RPM = **0,465 NOK per 1 000 visninger**. $0,12 RPM = **1,116 NOK per 1 000 visninger**.

Formel: `break-even visninger = kostnad_NOK / (RPM_NOK / 1000)`

### 3.1 Kun YouTube Shorts-annonseinntekt

| Kostnadsscenario | Ved RPM $0,05 (konservativt) | Ved RPM $0,12 (optimistisk) |
|---|---|---|
| B: 15,60 NOK | **33 500 visninger** | **14 000 visninger** |
| A: 24,67 NOK | **53 100 visninger** | **22 100 visninger** |

### 3.2 Hvis Facebook Content Monetization også er aktiv

Da tjener samme asset på to kanaler. Antar vi grovt at Facebook bidrar tilsvarende YouTube, halveres break-even:

| Kostnadsscenario | RPM $0,05 samlet | RPM $0,12 samlet |
|---|---|---|
| B: 15,60 NOK | ~16 800 visninger | ~7 000 visninger |
| A: 24,67 NOK | ~26 500 visninger | ~11 100 visninger |

**Men:** Facebook Content Monetization er invitasjonsbasert. Dette scenarioet kan vi håpe på, ikke planlegge mot. Jeg har ikke funnet pålitelige RPM-tall for Facebook Content Monetization — `TODO(kristian): noter faktisk RPM fra Meta Business Suite så snart det finnes data`.

### 3.3 Hva betyr 14 000–33 500 visninger?

Det er tallet **hvert eneste innlegg** må treffe, i snitt, hele tiden, bare for å dekke sin egen produksjonskostnad.

En ny kanal uten publikum ligger typisk på noen hundre til noen tusen visninger per Short. **Vi snakker om en faktor på 10–100x fra start til break-even per innlegg.**

Og det er break-even på **variabel kostnad alene** — det forutsetter at annonseinntekten allerede flyter. Den gjør den ikke før YPP-terskelen er passert.

---

## 4. Veien til terskelen — der regnestykket virkelig blir ubehagelig

### 4.1 YouTube-terskelen, oversatt til produksjon

Kravet er 1 000 abonnenter **+** 10 millioner Shorts-visninger på 90 dager.

Med 3 innlegg per dag i 90 dager = 270 innlegg:

```
10 000 000 visninger / 270 innlegg = 37 037 visninger per innlegg, i snitt, hver dag i 90 dager
```

Det er ikke et mål en ny kanal jobber seg mot gradvis. Det er tallet til en kanal som allerede har lyktes.

### 4.2 Det alternative sporet er billigere — og det bør vurderes

Den andre veien inn i YPP er **1 000 abonnenter + 4 000 offentlige visningstimer på 12 måneder**.

4 000 timer = 240 000 minutter. Med 8-minutters langvideo og 40 % retensjon (3,2 min sett per visning):

```
240 000 minutter / 3,2 minutter = 75 000 visninger av langformat, fordelt over 12 måneder
```

**75 000 visninger på ett år mot 10 000 000 visninger på 90 dager.** De to tallene er ikke i samme univers.

Langformat koster mer per enhet å produsere, og oppdraget spesifiserer kortvideo som hovedmotor. Men forskjellen er så stor at den bør ligge på bordet før vi bygger: en hybrid der Shorts driver rekkevidde og noen få langvideoer i måneden driver visningstimene, kan være den raskeste veien til at annonsepengene i det hele tatt begynner å flyte.

### 4.3 Terskelen stiger 1. februar 2027

Da dobles kravet for nye søkere til 8 000 visningstimer eller 20 millioner Shorts-visninger. Det er **4,5 måneder fra i dag**. Vi rekker det ikke. Planlegg mot de nye tallene, ikke de gamle.

---

## 5. Tolvmånedersregnskapet

Volum: 3 kortvideoer per dag (~90/mnd) + 3 LinkedIn-innlegg per uke (~13/mnd).

### 5.1 Kostnad

| Post | Scenario B | Scenario A |
|---|---|---|
| 90 kortvideoer (variabel, uten infra) | 1 172 | 1 988 |
| 13 LinkedIn-innlegg (variabel) | 38 | 38 |
| Infrastruktur | 232 | 232 |
| **Per måned** | **1 442 NOK** | **2 258 NOK** |
| **Over 12 måneder** | **17 300 NOK** | **27 100 NOK** |

### 5.2 Inntekt

Fra MONETIZATION.md:

- **YouTube:** ingen annonseinntekt før YPP-terskelen. Realistisk i år 1: **0 NOK**.
- **TikTok:** Norge er etter alt å dømme ikke i Creator Rewards. **0 NOK.**
- **Facebook/Instagram:** invitasjonsbasert. Kan ikke budsjetteres. **0 NOK** som planforutsetning.
- **LinkedIn:** BrandLink er invitasjonsbasert, andel ikke offentliggjort. **0 NOK.**
- **Sponsorsamarbeid:** mulig, men krever et publikum vi ikke har ennå.

**Forventet annonse- og sponsorinntekt de første 12 månedene: nær null.**

### 5.3 Svaret du ba om

> *«Hvis regnestykket viser at modellen ikke kan gå i pluss på realistiske volum, si det rett ut.»*

**Den kan ikke det. Ikke som annonsedrevet forretning, ikke det første året.**

Presist hvorfor:

1. **Fire av fem kanaler betaler strukturelt ingenting** til en skaper i Norge i dag — enten fordi programmet ikke finnes her (TikTok), eller fordi det er invitasjonsbasert (Facebook, Instagram, LinkedIn).
2. **Den femte kanalen har en terskel på 10 millioner visninger på 90 dager**, som dobles om 4,5 måneder.
3. **Selv etter terskelen** må hvert innlegg ha 14 000–33 500 visninger bare for å dekke sin egen produksjonskostnad.
4. **Og den autonome formen motarbeider målet.** YouTube har skjerpet håndhevingen mot masseprodusert AI-innhold til kanalnivå og terminerte 16 kanaler i én bølge i januar 2026 — 4,7 milliarder visninger borte. TikTok diskvalifiserer fullt AI-generert video fra Creator Rewards eksplisitt. Et system definert ved fravær av menneskelig involvering beskriver akkurat det de to største inntektskanalene har skrevet regler for å ekskludere.

Det er ikke et argument mot å bygge systemet. Det er et argument mot å måle det på annonsekroner.

---

## 6. Går det opp på noen annen måte?

**Rettelse 2026-09-17:** En tidligere versjon av dette avsnittet regnet rekrutteringshonorarer som Kristians inntekt og landet på 135 000–180 000 NOK per oppdrag. **Det er feil.** Kristian er fast ansatt i et rekrutteringsselskap og kjører ikke oppdrag alene. Honorarene tilfaller arbeidsgiver, ikke ham. Tallet er fjernet, og konklusjonen under er svakere enn den var.

**Årlig systemkostnad, scenario B: ~17 300 NOK.**

Den eneste inntekten Kristian selv tar ut av synlighet på sosiale medier, går gjennom **Clifford Coaching og Mentaltrening** — hans eget selskap. Det er der en henvendelse kan bli til omsetning.

| Utfall | Verdi | Merknad |
|---|---|---|
| 10 mill. YouTube Shorts-visninger ved RPM $0,05 | **4 650 NOK** | Krever at YPP-terskelen alt er passert |
| Årlig systemkostnad | **17 300 NOK** | Scenario B, 90 kortvideoer + 13 LinkedIn-innlegg i måneden |
| Coaching 10-pakke | **12 140 NOK** | Break-even på 1,4 pakker i året |

### 6.1 Hvor mange coachingklienter må systemet skaffe for å betale for seg selv?

Faktiske priser fra Clifford Coaching, per 2026-09-17:

| Produkt | Pris | Merknad |
|---|---|---|
| Introsamtale, 45 min | **kr 0** | Gratis i kroner. **Ikke gratis i tid.** Se 6.1.2 |
| Enkelttime, 60 min | **kr 1 349** | |
| 5-pakke | **kr 6 399** | 5 % rabatt |
| 10-pakke | **kr 12 140** | 10 % rabatt |

#### 6.1.1 Break-even i solgte pakker

```
pakker per år = årlig systemkostnad / pris per pakke
```

| Produkt | Scenario B (17 300 NOK/år) | Scenario A (27 100 NOK/år) |
|---|---|---|
| 10-pakke (12 140) | **1,4 pakker** | 2,2 pakker |
| 5-pakke (6 399) | **2,7 pakker** | 4,2 pakker |
| Enkelttimer (1 349) | **12,8 timer** | 20,1 timer |

**Halvannen 10-pakke i året.** Det er hele kravet for at et helt års systematisk, daglig synlighet skal betale for seg selv.

Målt i leveringstid: 1,4 × 10 timer ≈ **14 fakturerbare timer i året**, altså drøyt én time i måneden. Det er godt innenfor det som er mulig ved siden av full jobb.

#### 6.1.2 Den gratis introsamtalen er systemets egentlige flaskehals

Dette er den viktigste konsekvensen av prislista, og den er lett å overse fordi tallet er null.

Hver henvendelse koster **45 minutter av din tid, ubetalt**, uavhengig av om den konverterer. Systemet genererer henvendelser. Det genererer ikke timer i døgnet.

Regnestykket ved ulike konverteringsrater, for å nå break-even med 10-pakker:

| Intro → betalende | Introsamtaler kreves | Ubetalt tid | Levert tid | **Sum timer/år** |
|---|---|---|---|---|
| 30 % | 5 | 3,8 t | 14 t | **17,8 t** |
| 20 % | 7 | 5,3 t | 14 t | **19,3 t** |
| 10 % | 14 | 10,5 t | 14 t | **24,5 t** |

Fullt håndterbart — **på dette volumet.** Problemet oppstår hvis systemet virker bedre enn break-even krever:

| Introsamtaler/år | Ubetalt tid bare på intro |
|---|---|
| 50 | 37,5 t |
| 100 | **75 t** |
| 200 | **150 t** |

Ved 200 henvendelser i året bruker du nesten én arbeidsmåned ubetalt på introsamtaler, ved siden av full jobb. **Etterspørselen skalerer med rekkevidde. Timene dine gjør ikke det.**

**Arkitekturkonsekvens:** kapasitetstaket i `strategy.yaml` uttrykkes i **introsamtaler per måned**, ikke i klienter per år. Det er den bindende ressursen. Når taket nås, skal Strategist flytte produksjonsbudsjett fra leadgenererende temaer over på ren rekkevidde, og Portfolio-agenten må kjenne taket — ellers ser den at LinkedIn gir best margin og skalerer den rett mot en vegg den ikke vet finnes.

`TODO(kristian): hvor mange introsamtaler i måneden er realistisk for deg? Det tallet styrer hvor mye systemet får lov til å produsere.` Inntil du sier noe annet settes taket til **4 per måned** — én i uka — som et konservativt utgangspunkt.

#### 6.1.3 Tre forbehold

1. **Marginen er ikke lenger komfortabel.** Med det feilaktige rekrutteringstallet lå forholdet på omtrent 1:8 i systemets favør. Nå er det omtrent 1:1–1:3. Systemet må faktisk levere halvannen pakke i året, ellers er det en utgift.
2. **Annonseinntekt forblir uaktuelt som hovedinntekt.** Seksjon 5.3 står uendret. Å nå hele YouTube-terskelen er verdt 4 650 NOK — mindre enn **halvparten** av én 10-pakke.
3. **Bedriftssiden er ikke med i tallene over.** LinkedIn når beslutningstakere. Ett bedriftsoppdrag er trolig verdt flere private pakker. `TODO(kristian): pris på bedriftsoppdrag mangler fortsatt.`

### 6.2 En føring ansettelsesforholdet legger på innholdet

Du er ansatt i et rekrutteringsselskap. Det har en konsekvens for temavalget som bør ligge i `config/strategy.yaml` fra dag én, ikke oppdages senere:

- **Mental trening, prestasjonspsykologi og coaching** er ditt eget selskaps domene. Rene baner, og det er der henvendelsene kan bli til din omsetning.
- **Rekrutteringsfaglig innhold** ligger tett på arbeidsgivers virksomhet. Det kan være helt uproblematisk, og det kan være regulert i arbeidsavtalen din. `TODO(kristian): sjekk hva avtalen sier om egen næringsvirksomhet og offentlig profilering på fagfeltet.`
- **Arbeidsinkludering** — som du har sagt du vil satse på — ligger i grenselandet og er verdt en egen vurdering.

Systemet skal ikke ta den avgjørelsen for deg. Men Strategist-agenten allokerer produksjonsbudsjett mellom temaer, og hvis ett tema er ute av spill, må den vite det. Det løses med en `allowed`/`blocked`-markering per tema i `strategy.yaml`, og Quality-agenten får en sjekk mot den.

### 6.3 Hva jeg foreslår at vi endrer i arkitekturen

**Fortsatt ingenting av substans. Bare hva `revenue_events` har lov til å inneholde.**

Alt du har spesifisert — kostnad per innlegg, RPM, margin, Portfolio-agentens kutt-og-skaler, budsjettak, kill switch — er riktig bygget og verdt å bygge. Det eneste som ikke stemmer, er antagelsen om at annonser er hovedinntekten.

1. **`revenue_events.type` utvides med `lead`** — en attribuert henvendelse til Clifford Coaching, med verdi satt av deg når forløpet lukkes. Marginformelen er uendret. Uten den kutter Portfolio-agenten LinkedIn som nullinntektskanal.
2. **RPM forblir hovedmetrikken for kanaler som faktisk betaler RPM.** For LinkedIn måles **kostnad per kvalifisert henvendelse**. Begge er marginmålinger, bare med ulik nevner.
3. **Terskelfremdrift beholdes som eksplisitt delmål.** Når YouTube-terskelen passeres, slår annonseinntekten inn som en reell andre inntektsstrøm, og systemet er allerede bygget for den.

### 6.4 Og det ene menneskelige trykket — besluttet

Kostnaden ved en kanalterminering er ikke bare de 17 300 kronene. Det er publikummet, tiden og opsjonen på all fremtidig inntekt fra kontoen. YouTube håndhever på **kanalnivå**.

**Besluttet 2026-09-17: ett godkjenningstrykk per innlegg.** Hele pipelinen er autonom fram til publisering; der venter innlegget på deg. Det koster ~30 sekunder på mobilen og er det som skiller «masseprodusert med minimal menneskelig input» fra «publisert av en skaper» i plattformenes egne formuleringer.

Det bryter bokstaven i «uten menneskelig involvering i normal drift», og det er et bevisst avvik fra oppdraget. `AUTOPUBLISH_MODE` settes per kanal, så bryteren finnes begge veier om du ombestemmer deg. Arkitekturkonsekvensene står i ARCHITECTURE.md 9.1.

To ting det gir oss gratis:

- **Avvisningene dine blir treningsdata.** Hver gang du forkaster et utkast, lagres begrunnelsen og mates inn i `learnings`. Det er den raskeste veien til at Copywriter-agenten treffer stemmen din — raskere enn noen mengde finpussing av `voice.md`.
- **Dry-run-modus blir mindre nødvendig som sikkerhetsnett**, siden du uansett ser hvert innlegg før det går ut. Den beholdes likevel som default ved første oppstart, for å vise deg kostnadstallene før noe produseres.

### 6.5 Formatvalg — besluttet

**Hybrid.** Kortvideo forblir hovedmotoren for volum og rekkevidde, men noen få langvideoer i måneden jobber mot YPPs visningstime-spor (se 4.2). 75 000 langformat-visninger på 12 måneder er en vesentlig mer oppnåelig terskel enn 10 millioner Shorts-visninger på 90 dager, og det er den terskelen som avgjør om annonseinntekten i det hele tatt begynner å flyte.

Kostnadskonsekvensen er ikke triviell og må måles i Fase 2: en 8-minutters video kan ikke genereres som 60 klipp à 8 sekunder — det ville kostet ~180 NOK per video og ødelagt enhetsøkonomien. Produksjonsformen for langformat er den største åpne posten i budsjettet.

## 6.6 Målt mot estimert — Fase 1

Estimatene over ble skrevet før systemet fantes. Nå kjører `npm run dry-run`
hele pipelinen med reell prising, og tallene kan sammenliknes:

| Post | Estimert (scenario B) | Målt i dry-run | Avvik |
|---|---|---|---|
| Kortvideo, uten infrastruktur | 13,02 NOK | **12,04 NOK** | -8 % |
| LinkedIn tekstinnlegg, uten infrastruktur | 2,92 NOK | **2,42 NOK** | -17 % |
| Årskostnad ved ~1 040 innlegg | 17 300 NOK | **12 306 NOK** | -29 % |

Estimatene holdt, og lå konservativt an — som de skulle. Det målte
årstallet gir:

**Break-even: 1,0 solgt coaching-10-pakke i året.**

Forbeholdene fra 6.1.3 står uendret. Særlig dette: å nå hele YouTube-terskelen
på 10 millioner Shorts-visninger er verdt ca. 4 650 NOK — under 40 % av én
10-pakke. Rangeringen mellom inntektsveiene er ikke nær.

`npm run dry-run` bør kjøres på nytt hver gang en leverandør endrer pris, og
tabellen over oppdateres. Det er billigere enn å oppdage prisendringen på
fakturaen.

## 7. Forutsetninger du bør overprøve

| # | Forutsetning | Konsekvens hvis feil |
|---|---|---|
| 1 | USD/NOK = 9,30 | Lineær på alle kostnadstall |
| 2 | Everygen starter = $18/mnd for 200 kreditter | Endrer kun scenario C, som vi forkaster uansett |
| 3 | Veo 3.1 Lite til $0,03–0,05/sek holder kvalitetskravet | **Største enkeltrisiko.** Dobles videokostnaden, dobles break-even |
| 4 | 4 klipp per 30-sekunders Short | Færre klipp med lengre varighet kan være billigere — mål det |
| 4b | Langformat produseres ikke som ren klippgenerering | Uavklart. Ren generering gir ~180 NOK per 8-minutters video og velter regnestykket |
| 5 | Snitt 0,5 revisjonsrunder | Hvis Quality-agenten avviser mye oftere, stiger tokenkostnaden raskt |
| 6 | Norge er ikke i TikTok Creator Rewards | Hvis feil: TikTok blir plutselig den beste inntektskanalen ($0,40–1,20 RPM) |
| 7 | RPM $0,05 konservativt / $0,12 optimistisk for nisjen | Måles fra faktiske tall så snart YPP er på plass |
| 8 | Kapasitetstak: 4 introsamtaler/mnd — **antatt, ikke bekreftet** | Den bindende ressursen. For lavt tak kveler systemet, for høyt tak kveler deg. Se 6.1.2 |
| 9 | Konverteringsrate intro → betalende, antatt 10–30 % | Måles fra faktiske tall. Under 10 % blir ubetalt tid den dominerende kostnaden |

Forutsetning **8 og 9** er nå de viktigste: de avgjør om systemet skalerer inn i en vegg. Deretter 3 og 6.
