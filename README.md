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
