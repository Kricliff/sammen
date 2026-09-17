# ARCHITECTURE.md

**Versjon:** Fase 0-utkast, 2026-09-17 · **Status:** venter på godkjenning før koding

Les [MONETIZATION.md](./MONETIZATION.md) og [UNIT_ECONOMICS.md](./UNIT_ECONOMICS.md) først. Dette dokumentet forutsetter funnene der.

---

## 1. Plassering i repoet

**Besluttet: eget repo.** Systemet hører ikke hjemme sammen med Together-appen, som eier resten av `Kricliff/sammen` og har sitt eget CI-oppsett mot Codemagic.

Fase 0-dokumentene ligger foreløpig i `sammen/social-engine/` fordi det var der de ble skrevet. **Første handling i Fase 1 er å flytte dem til et eget repo** og fjerne mappa herfra.

`TODO(kristian):` bekreft repo-navn. Forslaget er `Kricliff/social-engine`. Si fra om du vil opprette det selv, eller om jeg skal gjøre det.

## 2. Mappestruktur

```
social-engine/
├─ MONETIZATION.md
├─ UNIT_ECONOMICS.md
├─ ARCHITECTURE.md
├─ docker-compose.yml              # Postgres + Redis + api + worker + dashboard
├─ .env.example                    # alle nøkler, ingen verdier
├─ package.json                    # npm workspaces
│
├─ config/                         # endres uten redeploy
│  ├─ strategy.yaml                # temaer (allowed|blocked), kanalvekter, frekvens, tider,
│  │                              # kapasitetstak for henvendelser (se 9.5)
│  ├─ voice.en.md                  # ENGELSK — for video-kanalene. Tone, ordforråd, eksempler
│  ├─ voice.no.md                  # NORSK — for LinkedIn. Egen stemme, B2B-rettet
│  ├─ brand.json                   # farger, fonter, logo, sikre marger per format
│  ├─ channels.yaml                # per kanal: aktiv, rate limit, autopublish-modus
│  └─ budgets.yaml                 # dag/uke/måned-tak i NOK
│
├─ prompts/                        # systemprompter, én fil per agent, leses ved kjøring
│  ├─ strategist.md   ├─ research.md    ├─ copywriter.md
│  ├─ visual.md       ├─ quality.md     ├─ engagement.md
│  ├─ analyst.md      └─ portfolio.md
│
├─ assets/                         # mediebibliotek for gjenbruk (Visual-agenten søker her først)
│
├─ packages/
│  ├─ core/           # domenetyper, Zod-skjemaer, tilstandsmaskin, marginberegning
│  ├─ db/             # Drizzle-skjema, migreringer, repositories
│  ├─ agents/         # én mappe per agent: kontrakt, verktøy, kjøring
│  ├─ publishers/     # én adapter per kanal + token-lager
│  ├─ economics/      # cost-ledger, revenue-ledger, margin, terskelsporing
│  ├─ queue/          # BullMQ-køer, jobbdefinisjoner, dead-letter
│  └─ observability/  # Pino-logging, agent-beslutningslogg, metrics
│
├─ apps/
│  ├─ api/            # Fastify: REST for dashboard + webhooks
│  ├─ worker/         # BullMQ-workers + scheduler (repeatable jobs)
│  └─ dashboard/      # Next.js 15, App Router, Tailwind, shadcn/ui — NORSK
│
└─ tests/
   ├─ unit/           # marginberegning, tilstandsmaskin, kostnadsføring
   ├─ contract/       # Zod-kontrakt per agent mot faste testinput
   └─ e2e/            # full dry-run-pipeline med mock-agenter
```

**Språkregelen, håndhevet i struktur:** publiseringsspråk settes **per kanal** (se 9.4). `voice.en.md` former engelsk innhold til videokanalene, `voice.no.md` norsk innhold til LinkedIn. Alt i `apps/dashboard/`, alle logger, alle kodekommentarer og all dokumentasjon er på norsk uansett — det er kun det publikum ser som styres av kanalens språk.

---

## 3. Datamodell

PostgreSQL + Drizzle. Alle pengebeløp lagres som `numeric(14,4)` — **aldri float**. Alle tidsstempler er `timestamptz` i UTC; visning skjer i Europe/Oslo.

### 3.1 Innholdsmodellen

**`content_plan`** — Strategist-agentens ukesplan
| Kolonne | Type | Merknad |
|---|---|---|
| `id` | uuid PK | |
| `week_start` | date | mandag, Europe/Oslo |
| `theme` | text | |
| `channel` | channel_enum | |
| `format` | format_enum | `short_video`, `long_video`, `image_post`, `text_post` |
| `angle` | text | vinkelen briefen ber om |
| `target_rpm_nok` | numeric(10,4) | målet innlegget måles mot |
| `cost_cap_nok` | numeric(10,2) | **hard grense — Visual-agenten stopper ved overskridelse** |
| `scheduled_for` | timestamptz | |
| `rationale` | text | hvorfor Strategist allokerte hit |
| `created_at` | timestamptz | |

**`content_items`** — sannhetskilden. Ett rad = ett stykke innhold gjennom hele livsløpet.
| Kolonne | Type | Merknad |
|---|---|---|
| `id` | uuid PK | |
| `plan_id` | uuid FK → content_plan | |
| `state` | state_enum | se 4 |
| `channel` | channel_enum | |
| `format` | format_enum | |
| `language` | text | `en` eller `no`, **må matche kanalens språk i `channels.yaml`** — validert ved overgang til `drafted` |
| `script` | text | manus/brødtekst, engelsk |
| `caption` | text | |
| `hashtags` | text[] | |
| `variant` | smallint | 1 eller 2, for A/B |
| `ab_group_id` | uuid | binder de to variantene sammen |
| `media_urls` | text[] | |
| `idempotency_key` | text UNIQUE | **hindrer dobbeltposting** |
| `external_post_id` | text | plattformens ID etter publisering |
| `published_at` | timestamptz | |
| `dry_run` | boolean | true = alt kjørte, ingenting gikk ut |
| `created_at` / `updated_at` | timestamptz | |

**`research_sources`** — «ingen påstander uten kilde» gjort til en tabell
| `id`, `content_item_id` FK, `claim` text, `url` text, `publisher` text, `retrieved_at` timestamptz, `verified` boolean |

**`qa_reviews`** — Quality-agentens vetohistorikk
| `id`, `content_item_id` FK, `round` smallint, `verdict` (`approved`/`revise`/`blocked`), `checks` jsonb *(én rad per sjekk: språk, fakta, GDPR, helsepåstand, monetiseringsvennlighet, plagiat, kanalregler)*, `reasoning` text, `created_at` |

**`state_transitions`** — full revisjonslogg
| `id`, `content_item_id` FK, `from_state`, `to_state`, `agent` text, `reasoning` text, `created_at` |

**`agent_runs`** — hver agentkjøring, koblet til kostnad
| `id`, `content_item_id` FK (nullbar), `agent` text, `model` text, `input_tokens` int, `output_tokens` int, `cached_tokens` int, `duration_ms` int, `status`, `error` text, `created_at` |

### 3.2 Økonomimodellen — førsteklasses, som spesifisert

**`cost_events`**
| Kolonne | Type | Merknad |
|---|---|---|
| `id` | uuid PK | |
| `occurred_at` | timestamptz | |
| `content_item_id` | uuid FK, **nullbar** | null = fellesk./infrastruktur |
| `agent` | text | |
| `type` | cost_type_enum | `tokens`, `media_image`, `media_video`, `tts`, `storage`, `infra`, `api_call` |
| `quantity` | numeric(14,4) | tokens, sekunder, kreditter, GB |
| `unit_price_usd` | numeric(14,8) | |
| `amount_usd` | numeric(14,4) | |
| `fx_rate` | numeric(10,4) | USD/NOK på tidspunktet |
| `amount_nok` | numeric(14,4) | |

**`revenue_events`**
| Kolonne | Type | Merknad |
|---|---|---|
| `id` | uuid PK | |
| `occurred_at` | timestamptz | |
| `channel` | channel_enum | |
| `content_item_id` | uuid FK, **nullbar** | null = kanalinntekt som fordeles pro rata |
| `type` | revenue_type_enum | `ad`, `sponsor`, **`lead`** |
| `amount` | numeric(14,4) | |
| `currency` | text | |
| `fx_rate` | numeric(10,4) | |
| `amount_nok` | numeric(14,4) | |
| `source` | text | `youtube_analytics_api`, `meta_insights`, `manual` |
| `attribution` | attribution_enum | `direct` (plattformen oppga per innlegg) eller `pro_rata` (fordelt på visningsandel) |

> `type = 'lead'` er tillegget fra UNIT_ECONOMICS.md 6.3 — en attribuert henvendelse til Clifford Coaching. Uten den kutter Portfolio-agenten LinkedIn som nullinntektskanal, som ville vært feil beslutning på riktig data.

**`content_metrics`** — tidsserie per innlegg per kanal
| `id`, `content_item_id` FK, `channel`, `measured_at`, `views` bigint, `engaged_views` bigint, `watch_time_seconds` bigint, `retention_pct` numeric, `likes`, `comments`, `shares`, `follows` |

**`content_economics`** — materialisert visning, oppdateres ved `measured` og `settled`
| `content_item_id` PK, `total_cost_nok`, `total_revenue_nok`, `views`, `rpm_nok`, `margin_nok`, `margin_pct`, `settled_at` |

**`budgets`**
| `id`, `period` (`day`/`week`/`month`), `period_start` date, `cap_nok`, `spent_nok`, `status` (`ok`/`warning`/`exceeded`), `updated_at` |

**`portfolio_decisions`**
| `id`, `decided_at`, `decision` (`scale_up`/`scale_down`/`pause`/`resume`/`explore`), `subject_type` (`channel`/`theme`/`format`), `subject` text, `evidence` jsonb *(n innlegg, snitt-RPM, margin, periode)*, `reasoning` text, `enacted_by` text, `overridden_by_owner` boolean |

**`monetization_thresholds`** — «vei til terskel» som eksplisitt delmål
| `id`, `channel`, `metric` (`subscribers`/`shorts_views_90d`/`watch_hours_12m`/`followers`/`watch_minutes_60d`), `required` bigint, `current` bigint, `measured_at`, `projected_reach_date` date |

### 3.3 Drift og sikkerhet

**`oauth_tokens`** — `channel`, `access_token` *(kryptert at rest)*, `refresh_token` *(kryptert)*, `scopes` text[], `expires_at`, `last_refreshed_at`. Varsel 7 dager før `expires_at`.

**`system_flags`** — kill switch. `key` (`SYSTEM_ENABLED`, `CHANNEL_ENABLED:youtube`, …), `value` boolean, `changed_by`, `changed_at`.

**`notifications`** — `type`, `severity`, `payload` jsonb, `sent_at`, `acknowledged_at`.

### 3.4 Marginberegningen

Ren funksjon i `packages/core`, uten I/O, med enhetstester på kjente tall:

```ts
margin_nok  = sum(revenue_events.amount_nok) - sum(cost_events.amount_nok)
rpm_nok     = (sum(revenue_events.amount_nok) / views) * 1000
margin_pct  = margin_nok / sum(cost_events.amount_nok)
```

Pro rata-fordeling når plattformen kun oppgir kanalinntekt for en periode:

```ts
andel_i = visninger_i / sum(visninger for kanalen i perioden)
inntekt_i = kanalinntekt_periode * andel_i
```

Kantene som **skal** ha egne tester: null visninger (RPM er udefinert, ikke 0 — returner `null`), null kostnad (margin_pct udefinert), inntekt som ankommer etter `settled` (åpner raden på nytt), og valutakurs som endrer seg mellom kostnads- og inntektsføring.

---

## 4. Tilstandsmaskinen

```
planned → researched → drafted → visual_ready → qa_passed → awaiting_approval → scheduled → published → measured → settled
```

`awaiting_approval` er gaten fra 9.1. Kanaler satt til `AUTOPUBLISH_MODE=auto` passerer rett gjennom uten opphold.

Sideutganger:

| Tilstand | Betydning |
|---|---|
| `needs_review` | Research fant ingen kilde til en påstand. Venter på eier. |
| `revising` | Quality sa `revise`. **Maks 2 runder**, så `blocked`. |
| `blocked` | Quality sa `blocked`, eller budsjett-/kostnadstak truffet. Varsler eier. |
| `failed` | Publisering feilet endelig etter retry. Havner i dead-letter. |
| `cancelled` | Eier avlyste, kill switch var av da turen kom, eller godkjenningsfristen løp ut. |

Regler som håndheves i kode, ikke i konvensjon:

- Overgang skjer kun gjennom `transition(item, to, agent, reasoning)`. Den skriver `state_transitions` i samme transaksjon som tilstandsendringen. Ingen agent får sette `state` direkte.
- **`settled` krever at både kostnad og inntekt er registrert.** Et innlegg uten kostnadstall kan ikke nå `settled`. Det er oppdragets «ingen innlegg uten kostnadstall», håndhevet av tilstandsmaskinen.
- `published` er idempotent på `idempotency_key`. Andre forsøk er en no-op som returnerer eksisterende `external_post_id`.
- Timeout per tilstand. Et innlegg som blir hengende, plukkes opp av en reaper-jobb og flyttes til `failed` med begrunnelse.

---

## 5. Sekvens for én innleggssyklus

```mermaid
sequenceDiagram
    autonumber
    participant S as Strategist
    participant O as Orchestrator
    participant R as Research
    participant C as Copywriter
    participant V as Visual
    participant Q as Quality
    participant P as Publisher
    participant A as Analyst
    participant Rev as Revenue
    participant CC as Cost Controller
    participant DB as content_items

    Note over S: Mandag 06:00 Europe/Oslo
    S->>DB: skriver content_plan (brief, mål-RPM, kostnadstak)
    S->>O: køer én jobb per brief

    O->>DB: opprett content_item (state=planned)
    O->>R: research(brief)
    R->>R: web search + RSS + trendsignaler
    R->>DB: research_sources (påstand + URL + hentet)
    alt påstand uten kilde
        R->>DB: state=needs_review
        R->>O: varsle eier, stopp
    end
    R->>CC: cost_event(tokens)
    R->>DB: state=researched

    O->>C: copywrite(brief, kilder, voice.md)
    Note over C: Skriver på kanalens språk FRA START.<br/>Aldri utkast på ett språk som oversettes.
    C->>DB: 2 varianter, samme ab_group_id, state=drafted
    C->>CC: cost_event(tokens)

    O->>V: visual(utkast, brand.json, kostnadstak)
    V->>V: søk i /assets først
    alt gjenbruk er like bra
        V->>DB: media_urls fra bibliotek (kostnad ~0)
    else må genereres
        V->>CC: forhåndssjekk mot cost_cap_nok
        alt taket ville blitt overskredet
            V->>DB: state=blocked
            V->>O: varsle eier, IKKE fortsett
        end
        V->>V: generer (billigste modell som holder kravet)
        V->>CC: cost_event(media_video / media_image)
    end
    V->>DB: state=visual_ready

    O->>Q: qa(innlegg, kilder, media)
    Note over Q: VETORETT.<br/>Riktig språk for kanalen, på morsmålsnivå ·<br/>fakta mot kilder · GDPR · ingen helsepåstander ·<br/>monetiseringsvennlighet · plagiat 90 dager ·<br/>tema mot allowed-lista · kanalregler · reklamemerking
    Q->>DB: qa_reviews (hver sjekk, med begrunnelse)
    alt revise
        Q->>O: tilbake til Copywriter (maks 2 runder)
    else blocked
        Q->>DB: state=blocked
        Q->>O: varsle eier
    end
    Q->>DB: state=qa_passed
    Q->>CC: cost_event(tokens)

    O->>O: sjekk SYSTEM_ENABLED + CHANNEL_ENABLED + rate limit + budsjett
    O->>DB: state=scheduled

    Note over P: På publiseringstidspunktet
    P->>P: token-refresh ved behov
    alt dry_run = true
        P->>DB: lagre resultat, state=published (dry_run)
    else
        P->>P: publiser via offisielt API (idempotency_key)
        P->>DB: external_post_id, published_at, state=published
    end

    Note over A: Daglig
    A->>A: hent metrics per kanal
    A->>DB: content_metrics
    A->>DB: state=measured

    Note over Rev: Fast intervall, med etterslep
    Rev->>Rev: hent inntekt, normaliser til NOK
    Rev->>DB: revenue_events (direct eller pro_rata)
    Rev->>DB: oppdater monetization_thresholds

    Note over O: Når kostnad OG inntekt finnes
    O->>DB: content_economics (kostnad, inntekt, RPM, margin)
    O->>DB: state=settled

    Note over A: Fredag 15:00
    A->>DB: learnings (hooks, temaer, lengder, tidspunkt vs RPM)
    Note over A: Strategist og Copywriter leser disse neste uke
```

---

## 6. API-scopes som må søkes om

Dette er listen fra oppdraget. Det kritiske er kolonnen lengst til høyre: **hvor lang tid det tar før scopet faktisk er brukbart.**

### 6.1 YouTube (Google Cloud Console → OAuth consent screen)

| Scope | Til hva | Merknad |
|---|---|---|
| `.../auth/youtube.upload` | Laste opp Shorts | Sensitivt scope |
| `.../auth/youtube.readonly` | Lese kanal- og videodata | Sensitivt |
| `.../auth/yt-analytics.readonly` | Visninger, retensjon, følgere | Sensitivt |
| `.../auth/yt-analytics-monetary.readonly` | **Faktisk inntekt per video** | Sensitivt — dette er scopet hele Revenue-agenten hviler på |

**Ledetid:** Sensitive scopes krever verifisering av OAuth-samtykkeskjermen hos Google. For én egen kanal kan du kjøre i testmodus med deg selv som testbruker og slippe unna — men testmodus gir refresh-tokens som **utløper etter 7 dager**. Det er en reell drifts­smerte og må avklares før Fase 3.

### 6.2 TikTok (TikTok for Developers)

| Scope | Til hva |
|---|---|
| `user.info.basic` | Kontoinfo |
| `video.upload` | Laste opp til utkast |
| `video.publish` | **Direktepublisering** |
| `video.list` | Lese egne videoer for metrics |

**Ledetid:** Klienten må gjennom **TikToks revisjon** før noe kan publiseres offentlig. Uten revisjon er alt `SELF_ONLY`, og kontoen må være privat. Se MONETIZATION.md 3.3. Dette er en forretningsgjennomgang hos TikTok, ikke en teknisk bryter.

### 6.3 Meta (Instagram + Facebook)

| Scope | Til hva |
|---|---|
| `instagram_business_basic` | Kontoinfo |
| `instagram_business_content_publish` | Publisere Reels og feed |
| `instagram_manage_insights` | Metrics |
| `pages_manage_posts` | Publisere til Facebook-side |
| `pages_read_engagement` | Kommentarer, reaksjoner |
| `read_insights` | Side- og videoinnsikt |
| `business_management` | Knytte side og IG-konto |

**Forutsetninger:** Instagram må være **Business- eller Creator-konto**, koblet til en Facebook-side Kristian er admin for. Personlige kontoer har ingen programmatisk publisering.

**Ledetid:** App Review, **5+ virkedager per innsending**, og avvisning er vanlig første gang.

**Rate limit:** Dokumentasjonen motsier seg selv (50 vs. 100 per 24 t). Vi hardkoder ingenting — Publisher-adapteren spør `GET /<IG_ID>/content_publishing_limit` før hver publisering.

### 6.4 LinkedIn

| Scope | Til hva |
|---|---|
| `openid`, `profile` | Identitet |
| `w_member_social` | **Publisere som medlem** |
| `r_member_social` | Lese egne innlegg og engasjement — **begrenset scope** |

**Ledetid:** `w_member_social` krever tilgang til Community Management API, som må søkes om og begrunnes. `r_member_social` er strengere. Regn med at metrics fra LinkedIn må hentes manuelt i starten.

### 6.5 Oppsummert ledetid

| Kanal | Kan kode mot | Kan publisere offentlig |
|---|---|---|
| YouTube | Umiddelbart (testmodus) | Umiddelbart for egen kanal, med 7-dagers token-smerte |
| LinkedIn | Etter API-søknad | Etter godkjenning |
| Meta | Etter App Review | 5+ virkedager per runde |
| TikTok | Umiddelbart (privat) | **Kun etter TikToks revisjon** |

Dette er hele begrunnelsen for kanalrekkefølgen i Fase 3: **YouTube først, LinkedIn deretter, Meta tredje, TikTok sist.** Det sammenfaller med inntektsprioriteringen i MONETIZATION.md seksjon 7, noe som er beleilig, men ikke tilfeldig — det er de samme plattformene som er restriktive på begge sider.

---

## 7. Kø og planlegging

BullMQ over Redis, ikke cron, av grunnene oppdraget nevner: retry, dead-letter og observabilitet.

| Kø | Concurrency | Retry | Merknad |
|---|---|---|---|
| `strategy` | 1 | 2 | Repeatable: mandag 06:00 Europe/Oslo |
| `research` | 3 | 3, eksponentiell | Batch-API der det går |
| `copywrite` | 3 | 2 | |
| `visual` | 2 | 2 | Dyrest — lav concurrency, hardt kostnadstak |
| `qa` | 4 | 2 | |
| `publish` | 1 per kanal | 5, eksponentiell | Serialisert per kanal for å respektere rate limit |
| `metrics` | 2 | 3 | Daglig |
| `revenue` | 1 | 3 | Fast intervall, tåler plattformetterslep |
| `economics` | 1 | 2 | Fredag 15:00 + daglig |

Alle køer har dead-letter. En jobb som ender der, varsler eier — den forsvinner ikke i stillhet.

---

## 8. Styring og sikkerhet

| Krav | Hvordan |
|---|---|
| **Temagating** | `strategy.yaml` markerer hvert tema `allowed` eller `blocked`. Begrunnelsen står i UNIT_ECONOMICS.md 6.2: Kristian er fast ansatt i et rekrutteringsselskap, og rekrutteringsfaglig innhold kan være regulert av arbeidsavtalen. Quality-agenten får en egen sjekk mot lista. |
| **Kill switch** | `system_flags`. Sjekkes i `publish`-jobben, ikke bare i dashboardet. Av = alt køes, ingenting publiseres. |
| **Rate limits** | `config/channels.yaml`, håndhevet i Publisher. Hard stopp, ikke advarsel. |
| **Budsjettstopp** | Cost Controller skriver `budgets`. Ved 80 %: varsel. Ved 100 %: `strategy`, `research`, `copywrite` og `visual` pauses. Køen tømmes ferdig. |
| **Dry-run** | `DRY_RUN=true` er **default ved første oppstart**. Hele pipelinen kjører med reelle kostnadstall, Publisher skriver resultatet uten å kalle plattformen. |
| **Revisjonslogg** | `state_transitions` + `agent_runs` + `qa_reviews` + `research_sources` + `cost_events` + `revenue_events`. Ethvert innlegg kan spores fullt tilbake. |
| **Angre** | Publisher-adapterne implementerer `delete`/`unpublish`. Ett klikk i dashboardet. |
| **Sekreter** | `.env` lokalt, Doppler/Vault i prod. `oauth_tokens` krypteres at rest. **Ingen nøkler i kode, noen gang.** |
| **Varsling** | E-post + push ved `blocked`, API-feil, token-utløp om 7 dager, budsjettvarsel, negativ margin to uker på rad, eller brått inntektsfall. |

---

## 9. Avklarte valg og hva de medfører

Besluttet 2026-09-17.

### 9.1 Ett godkjenningstrykk per innlegg før publisering

Hele pipelinen er autonom fram til publisering. Der stopper innlegget og venter på eier.

Konsekvenser i koden:

- **Ny tilstand `awaiting_approval`**, mellom `qa_passed` og `scheduled`. Se seksjon 4.
- `AUTOPUBLISH_MODE` per kanal i `config/channels.yaml`: `manual` (default), `auto`, `off`.
- Dashboardets kø-visning blir en **primærflate, ikke en unntaksflate** — den må fungere godt på mobil, med forhåndsvisning per kanal og godkjenn/avvis i ett trykk.
- Push-varsel når noe venter, og et **utløp**: et innlegg som ikke er godkjent innen `scheduled_for` går til `cancelled` med begrunnelse, slik at gamle innlegg ikke publiseres på feil tidspunkt.
- Eierens avvisninger er **treningsdata**. `qa_reviews` får en rad med `verdict = 'owner_rejected'` og fritekstbegrunnelse, som Analyst-agenten leser inn i `learnings`. Det er den raskeste veien til at Copywriter-agenten treffer stemmen din.

### 9.2 Hybrid: kortvideo som hovedmotor, langformat mot visningstimer

Begrunnelsen står i UNIT_ECONOMICS.md 4.2: 75 000 langformat-visninger på 12 måneder mot 10 millioner Shorts-visninger på 90 dager.

Konsekvenser i koden:

- `format_enum` utvides med `long_video`.
- **Strategist-agenten får et eksplisitt delmål per YPP-spor.** Den allokerer ikke bare mellom temaer og kanaler, men mellom de to tersklene, og leser `monetization_thresholds` for å se hvilket spor som er nærmest.
- **Visual-agenten trenger en egen langformat-vei.** En 8-minutters video kan ikke genereres som 60 klipp à 8 sekunder — det ville kostet ~180 NOK per video. Realistisk produksjonsform er talking-head eller skjermopptak med generert b-roll i utvalgte partier. `TODO(kristian):` dette er den største åpne posten i Fase 2, og det er verdt en egen samtale.
- **Kostnadstaket per innlegg må være formatavhengig**, ikke én global verdi. `cost_cap_nok` ligger allerede per brief i `content_plan`, så datamodellen tåler det.
- `content_metrics` må skille `watch_time_seconds` for langformat fra `engaged_views` for Shorts, siden de teller mot hvert sitt YPP-spor. Begge felt finnes allerede.

### 9.3 Video genereres mot modell-API direkte, ikke via Everygen

3–4x billigere, og uten 200-kredittaket som ville begrenset oss til 3–4 Shorts i måneden. Se UNIT_ECONOMICS.md 1.3.

Visual-agenten bygges mot en leverandøradapter med Veo 3.1 Lite som første implementasjon. Everygen beholdes som et manuelt verktøy utenfor pipelinen.

### 9.4 Publiseringsspråk settes per kanal, ikke globalt

Oppdraget krevde engelsk på alt publisert innhold, uten unntak. **Dette er et bevisst, godkjent avvik**, av samme type som godkjenningsgaten i 9.1.

Begrunnelsen står i UNIT_ECONOMICS.md 6.1: engelsk gir 10–20x RPM og et globalt publikum, men coachingen selges i Norge, på norsk, som 60-minutters timer i norsk tidssone. Et engelskspråklig publikum kjøper den ikke.

| Kanal | Språk | Formål |
|---|---|---|
| YouTube Shorts, TikTok, Instagram | **Engelsk** | Rekkevidde og annonseinntekt. Globalt publikum. |
| Facebook | **Engelsk** | Samme asset som over, gjenbrukt gratis. |
| LinkedIn | **Norsk** | Henvendelser fra norske beslutningstakere som faktisk kan kjøpe. |

Konsekvenser i koden:

- `config/channels.yaml` får `language: en|no` per kanal. Det er sannhetskilden.
- **To voice-filer.** `voice.en.md` og `voice.no.md`. De er ikke oversettelser av hverandre — stemmen mot et globalt selvutviklingspublikum og stemmen mot norske ledere er ikke den samme stemmen, og skal ikke være det.
- **Copywriter-agenten skriver på målspråket fra start.** Regelen fra oppdraget står uendret, bare generalisert: aldri skrive på ett språk og oversette. Agenten får kanalens språk i briefen og laster riktig voice-fil.
- **Quality-agentens språksjekk blir toveis og kanalbevisst.** Den må avvise norsk tekst på en engelsk kanal *og* engelsk tekst på LinkedIn, og i begge retninger avvise oversettelsespreg: direkte oversatte idiomer, feil preposisjonsbruk, setningsstruktur fra feil språk. Sjekken gjelder også tekst i bilder, tekstoverlegg og undertekster.
- `content_items.language` valideres mot kanalens språk ved overgang til `drafted`. Feil språk er en hard feil, ikke en advarsel.

**Empirisk bekreftelse (2026-09-17).** Kristians tre siste LinkedIn-innlegg:

| Innlegg | Språk | Visninger |
|---|---|---|
| Together gratis | Norsk + engelsk | 1 462 |
| «Tungt.» | Norsk | 1 108 |
| Together lansering | **Kun engelsk** | **181** |

Det engelske innlegget nådde 6–8 ganger færre enn de norske, på samme profil,
i samme periode. Antakelsen bak språksplitten var at LinkedIn-nettverket hans
er norsk. Den holder, og med større margin enn ventet.

**Det som *ikke* endres:** kravet om morsmålsnivå. Engelsk innhold skal fortsatt være skrevet som av en engelsktalende, ikke som oversatt norsk. Kravet gjelder nå bare begge veier.

### 9.5 B2B prioriteres på LinkedIn, med et eksplisitt kapasitetstak

Bedriftsoppdrag (workshop, foredrag, lederutvikling) er trolig høyest verdi per henvendelse i hele porteføljen, men kapasiteten er begrenset ved siden av full jobb.

Konsekvenser i koden:

- LinkedIn vektes **høyere enn ren RPM-logikk tilsier**, fordi RPM er null der og verdien ligger i `revenue_events.type = 'lead'`.
- `strategy.yaml` får et **kapasitetstak**: maks antall åpne henvendelser systemet skal jobbe mot samtidig. Nås taket, skal Strategist flytte produksjonsbudsjett bort fra leadgenererende temaer og over på rekkevidde — det er ingen verdi i å skape etterspørsel du ikke kan ta imot.
- **Portfolio-agenten må kjenne taket.** Uten det ser den at LinkedIn leverer best margin og skalerer den til himmels, mot en kapasitetsvegg den ikke vet finnes.
- Engagement-agenten eskalerer alle sponsor- og bedriftshenvendelser til eier uansett, som allerede spesifisert. Den forhandler aldri.

---

## 10. Det som fortsatt er åpent

| # | Spørsmål | Når det må avgjøres |
|---|---|---|
| 1 | Repo-navn, og hvem som oppretter det | Før Fase 1 starter |
| 2 | Hvordan langformat faktisk produseres (se 9.2) | Fase 2 |
| 3 | Holder Veo 3.1 Lite kvalitetskravet til $0,03–0,05/sek? | Fase 2 — må måles, ikke antas |
| 4 | Er Norge virkelig utenfor TikTok Creator Rewards? | Før Fase 3 — snur hele kanalprioriteringen hvis nei |
