# social-engine

Autonomt multi-agent-system for innhold på sosiale medier, bygget for å
optimaliseres mot **margin**, ikke mot likes.

**Status: Fase 1 ferdig.** Fundamentet står og er testet. Agentene er fortsatt
mocks — de rapporterer realistisk tokenforbruk, men gjør ingen modellkall.

## Les dette først

| Dokument | Hva det svarer på |
|---|---|
| [MONETIZATION.md](./MONETIZATION.md) | Hvilke kanaler betaler faktisk penger til en skaper i Norge, og hva kreves |
| [UNIT_ECONOMICS.md](./UNIT_ECONOMICS.md) | Hva koster ett innlegg, og hva må det tjene inn |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Mappestruktur, datamodell, tilstandsmaskin, API-scopes |

Kortversjonen: **annonseinntekt bærer ikke det første året.** Systemet er verdt
å bygge fordi det kan skaffe coachingklienter til Clifford Coaching, ikke fordi
YouTube betaler. Break-even ligger på ca. én solgt 10-pakke i året.

## Kom i gang

```bash
cp .env.example .env          # fyll inn DATABASE_URL og REDIS_URL
docker compose up -d postgres redis
npm install
npm run db:migrate
npm run dry-run               # kjører en ukesplan uten å publisere noe
npm test
```

`npm run dry-run` er den ene kommandoen som er verdt å kjøre først. Den kjører
hele pipelinen med **reelle kostnadstall**, lagrer alt, og publiserer
ingenting — så du ser hva en uke koster før noe går ut.

Eksempel på utskrift ved 20 innlegg i uka:

```
--- Økonomi ---
  Uke, variabel:           183.12 NOK
  Måned, totalt:          1024.90 NOK
  År, totalt:            12306.08 NOK

--- Break-even ---
  1.0 coaching-10-pakker i året (kr 12 140)
  Til sammenlikning: 10 mill. YouTube Shorts-visninger ved RPM $0,05 = ca. 4 650 NOK.
```

## Hva som er bygget i Fase 1

- **Monorepo** (npm workspaces, TypeScript ESM, Node 22), Docker Compose med
  Postgres og Redis
- **Drizzle-skjema og migreringer** inkludert alle økonomitabellene:
  `cost_events`, `revenue_events`, `content_economics`, `budgets`,
  `portfolio_decisions`, `monetization_thresholds`
- **Tilstandsmaskin** med håndhevede vakter — blant annet at et innlegg ikke
  kan nå `settled` uten at både kostnad og inntekt er ført
- **Marginberegning** som ren, testet funksjon, inkludert pro rata-fordeling
  som ikke mister kroner i avrunding
- **Budsjettvakt** med dag-, uke- og månedstak, varsel ved 80 %, stopp ved 100 %
- **Konfigurasjonslasting** med Zod-validering og kryssvalidering mellom filene
- **Kostnadssporing** koblet på fra første agentkjøring
- **Orchestrator** som kjører hele pipelinen
- **Dry-run** som default
- **67 tester**, hvorav 16 ende-til-ende mot ekte Postgres

## Beslutninger som avviker fra det opprinnelige oppdraget

Tre bevisste avvik, alle avklart med eier og begrunnet i dokumentene:

1. **Ett godkjenningstrykk per innlegg** før publisering (ARCHITECTURE.md 9.1).
   Oppdraget ba om null menneskelig involvering. YouTube håndhever mot
   masseprodusert AI-innhold på kanalnivå, og TikTok diskvalifiserer fullt
   AI-genererte videoer fra Creator Rewards. Trykket er forskjellen på
   «masseprodusert» og «publisert av en skaper».
2. **Publiseringsspråk per kanal** (ARCHITECTURE.md 9.4). Oppdraget krevde
   engelsk uten unntak. Engelsk gir 10–20x RPM, men coachingen selges i Norge
   på norsk. LinkedIn publiserer derfor på norsk, alt annet på engelsk.
3. **Kapasitetstak på henvendelser** (ARCHITECTURE.md 9.5). Introsamtalen er
   gratis i kroner, men koster 45 minutter ubetalt per henvendelse.
   Etterspørsel skalerer med rekkevidde; timene i døgnet gjør ikke det.

## Neste

**Fase 2:** ekte Claude-kall for agent 1–5, med kostnadslogging fra første kall.
Systemprompter i egne markdown-filer så de kan endres uten redeploy.

Se `TODO(kristian):` i koden og dokumentene for det som trenger dine tall
eller din avklaring.
