# Riftensräksallad Draft Sim

En enkel 5v5 draftsimulator och live Draft Brain för lagdraft.

## Funktioner
- Blue / Red side och riktig draftordning med bans/picks
- Draft Brain med multi-factor scoring
- Automatisk inferens av sannolika enemy-roller
- Rekommendationer som väger team-comfort, comp-fit, counters, synergy, draft timing och extern meta
- Blindpick-/counterpick-värde och roll-scarcity
- Dynamiska comp-behov: frontline, engage, peel, waveclear, damage split och anti-tank
- Enemy-profil: dive, poke, melee/short range, tanks, hypercarry + enchanter, splitpush och jungle power curve
- Confidence på comp-riktning och score breakdown för toppvalen
- Smartare phase-2 bans
- Jungle-pathing som väger lane setup, target access och enemy jungle
- Kort gameplan efter draften
- Era fyra standardcomps som ankare:
  - Early Skirmish
  - Hard Engage / PRESS R
  - Objective Control
  - Jungle Carry

## Hybrid AI layer
Live Draft Brain använder ett separat `draft-ai.js`-lager ovanpå reglerna. Det gör explainable lookahead över kommande picks, väger draftstruktur, enemy threats, comfort, blind/counter-värde, risk och hur många core-comp-pivots som fortfarande hålls öppna.

Detta är ett lokalt heuristiskt AI/search-lager, inte en modell som påstår sig vara tränad på miljontals Riot-matcher.

## Extern meta-statistik
Draft Brain använder en liten, transparent snapshot i `external-meta.json` baserad på LoLalytics Gold/Gold+ statistik för aktuell patch. Där det finns verifierad EUW-data används den; annars används Gold/Gold+ global data.

Meta-statistiken är ett **bonuslager**, inte huvudmotorn. Team-comfort, comp-fit, engage/frontline, damage split, matchup och execution väger fortfarande tyngre.

Snapshoten kan innehålla:
- tier
- win rate
- dokumenterade starka matchups
- dokumenterade svaga matchups

Om en champion saknas i snapshoten får den **0 meta-adjustment** i stället för att straffas.

Källa: https://lolalytics.com/

## Kör online
GitHub Pages publicerar `main` automatiskt.

## Kör lokalt
Öppna `index.html` direkt i webbläsaren. Ingen installation behövs.

## Tanke
Draft Brain är ett beslutstöd, inte en garanti för en matematisk optimal draft. Målet är att kombinera lagets riktiga champion pools och strategier med aktuell meta utan att en soloqueue-winrate får styra över en bättre 5v5-comp.


## Test Mode
Live Draft Brain har ett 🧪 **TEST MODE** i headern. När det är på kan man fritt prova drafts utan att:
- spara draften i history
- påverka recent-picks
- påverka framtida team-learning
- autospara den aktiva testdraften

`?test=1` i URL:en öppnar också sidan direkt i Test Mode.

## Advanced automatic engine
`advanced-engine.js` lägger ett automatiskt lager ovanpå grundmotorn och före Hybrid AI. Det analyserar bland annat comp completeness, damage profile, pick dependencies, role responsibility, frontline/engage/peel-kvalitet, objective DPS/turn style, side-lane, vision/fog dependency, cooldown dependency, hybrid identity och mönster från tidigare riktiga drafts.


## Shared team database (Supabase)


### Current shared storage
The production site uses a Supabase project in `eu-north-1` and the `rift-team-matches` Edge Function.
The browser never contains a service-role/secret database key. Each device enters the team code once; the function verifies it server-side and then performs list/upsert/delete operations.

`shared-data.js` is cloud-first with a localStorage cache:
- existing local real matches migrate on first successful sync
- offline saves remain local and upload on next sync
- match IDs deduplicate across devices
- Test Mode never writes match data
- Analysis reads the synced local cache for fast rendering

### Beslutsregler och lagreview

Draftmotorn begränsar överlapp mellan comp-prioritet, egna följdpicks och scoutade svar. Banvärde väger in nästa observerade alternativ; saknad scouting behandlas inte som en tom championpool. Jämna rekommendationer behålls bara inom samma draft-, roster-, roll- och motståndarkontext.

Eftermatchreview kan frivilligt markera brist på engage, peel eller waveclear. Minst tre unika matcher med exakt samma fem spelare under de senaste 90 dagarna krävs, bland de 20 senaste matcherna med den femman. Bonusen är högst två poäng, bara för ett olöst behov. Fritext och förlustresultat skapar aldrig en sådan markering automatiskt. `tests/quality-policy.cjs` testar dessa gränser offline.
