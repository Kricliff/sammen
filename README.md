# Sammen — mental trening for menn

Prototype (PWA) av appen «Sammen»: fellesskap og mental trening for menn.
Et støtteverktøy — ikke en erstatning for behandling.

- **Test-appen:** https://kricliff.github.io/sammen/
- Åpne lenken i Safari (iPhone) eller Chrome (Android) og velg «Legg til på Hjem-skjerm» for å installere den som app.
- All data (humørlogg, innlegg) lagres kun lokalt på din egen enhet.

## Utvikling
Hele appen er én avhengighetsfri fil: `index.html`. Lokal testing: kjør `serve.ps1`
(server på port 8123) eller `start-test.ps1` (server + midlertidig offentlig tunnel-URL).
Publisering: push til `main` — GitHub Pages oppdaterer automatisk.

Visuell identitet og logofiler ligger i `assets/` (se `assets/identitet.md`).
