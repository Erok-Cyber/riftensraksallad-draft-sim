# Riftensräksallad Draft Sim

En enkel picks-only 5v5 draftsimulator för att träna lagdraft.

## Funktioner
- Blue / Red side och riktig draftordning med live bans/picks
- Draft Brain v2 med multi-factor scoring
- Automatisk inferens av sannolika enemy-roller när rollen är okänd
- Rekommendationer som väger team-comfort, comp-fit, counters, synergy och draft timing
- Blindpick-/counterpick-värde och roll-scarcity i pickordningen
- Dynamiska comp-behov: frontline, engage, peel, waveclear, damage split och anti-tank
- Enemy-profil: dive, poke, melee/short range, tanks, hypercarry + enchanter, splitpush och jungle power curve
- Confidence på comp-riktning och förklaringar till toppvalet
- Smartare phase-2 bans som undviker redan fyllda enemy-roller
- Jungle-pathing som väger lane setup, target access och enemy jungle
- Kort wincon/watch/gameplan efter draften
- Era fyra standardcomps finns kvar som ankare:
  - Early Skirmish
  - Hard Engage / PRESS R
  - Objective Control
  - Jungle Carry

## Kör online
Projektet är förberett för GitHub Pages via GitHub Actions. När Pages är aktiverat publiceras `main` automatiskt.

## Kör lokalt
Öppna `index.html` direkt i webbläsaren. Ingen installation behövs.

## Tanke
Draft Brain är fortfarande ett beslutstöd, inte en garanti för en matematisk "optimal draft". v2 försöker däremot resonera mer som en coach: först teamets faktiska champion pool och comfort, sedan draftstruktur, enemy threats, synergy, countervärde, damage profile, execution och win condition. Reglerna är förklarbara och kan fortsätta finjusteras när laget samlar fler drafts.


## Hybrid AI layer
Live Draft Brain använder nu ett separat `draft-ai.js`-lager ovanpå de vanliga reglerna. Lagret gör explainable lookahead över kommande egna picks, väger draftens struktur, enemy threats, team comfort, blind/counter-värde, risk och hur många av lagets core-comp-pivots som fortfarande hålls öppna.

Detta är ett lokalt heuristiskt AI/search-lager, inte en modell som påstår sig vara tränad på miljontals Riot-matcher. Core comps fungerar som starka priors/ankare och AI-lagret får justera rekommendationerna när draftläget motiverar det.


## Riot-statistik

Draft Brain har ett separat statistiklager som kan väga in riktig Riot Games API-data utan att exponera API-nyckeln i webbläsaren.

Standardprofilen är **Gold/Plat team**:
- övriga roller: Gold 70 %, Platinum 25 %, Emerald 5 %
- jungle: Gold 35 %, Platinum 30 %, Emerald 20 %, Diamond 15 %

Statistiken används som ett extra lager ovanpå team-comfort, comp fit, frontline/engage, damage split, matchupregler och Hybrid AI/lookahead. Den ersätter alltså inte lagets core-strategier.

### Aktivera riktig Riot-data

1. Skapa/ha en giltig Riot API-nyckel i Riot Developer Portal.
2. I GitHub: **Settings → Secrets and variables → Actions → New repository secret**.
3. Namn: `RIOT_API_KEY`.
4. Kör workflowet **Refresh Riot draft stats** manuellt under Actions, eller låt schemat köra automatiskt.
5. Workflowet bygger `riot-stats.json` från EUW ranked Solo/Duo-data och Draft Brain börjar använda snapshoten automatiskt.

API-nyckeln ska aldrig läggas direkt i JavaScript eller committas till repot.
