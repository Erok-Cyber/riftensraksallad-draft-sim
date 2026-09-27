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
