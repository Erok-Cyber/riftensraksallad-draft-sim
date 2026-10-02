# Produktgenomgång 2026-10-02

## Omfattning och verifieringsnivå

Genomgång av sidornas kopplingar, gemensam roster, draftmotor, scouting,
AI-policy, matchlagring, review, statistik och befintliga regressioner.
Detta är inte ett påstående att varje möjlig kombination av draft, nätverksfel
och enhet har testats manuellt. Livekontroll och slutlig Pages-status redovisas
i leveransmeddelandet. Inga riktiga spelare eller matcher har raderats under testen.

## Systemkarta

| Del | Ansvar och dataflöde | Granskning |
| --- | --- | --- |
| Home / navigation | body[data-workspace], URL, matchplan, träningssession per flik | Kod, regressioner, live |
| Våra champs | Stabilt spelar-ID, roll, pool, comfort, pausning, aktiv femma | Modelltester, servervalidering, läsning live |
| Roster-sync | Offentlig läsning, lagkod vid publicering, revisionskonflikter | Befintliga mockade handler-/synktester |
| Trainer / Test | Separata sessioner, unik rolltilldelning, scenarier, comp-feedback | Regressioner och kod |
| Draft Brain / Live Coach | Samma live-vy; lagliga kandidater, comfort, struktur, scouting, turordning | Scenariotester och kod |
| Groq | Begränsad omrankning av tillåtna kandidater, separat slutgameplan | Policy-/handlertester; prompt uppdaterad |
| Ban Planner | Matchplan, starter/sub, OP.GG och CM, riktade bans | Delade scoutingtester och live läsning |
| Comp Library | Kärnidentitet, aktiva alternativ, guider | Modelltester och kod |
| Matchhistorik / Review | Sparad draft/roster, resultat, serie, tre eftermatchfrågor | Mockade lagrings-/reviewtester |
| Analytics / Learning | Filter, små sample, spelaridentitet, avgränsade review-signaler | Regressioner och kod |
| Patch/meta | Aktuell/föregående snapshot, svagare vikt för osäker/gammal data | Kod och befintlig testtäckning |
| Supabase | team_rosters, team_plans, team_matches; skrivning via Edge Functions | RLS aktiverat på samtliga tre tabeller kontrollerat med läsfråga |

## Buggar och beteenden korrigerade

- En sen matchplanshämtning kunde återvisa Home-kortet inne i Ban Planner.
  Matchkortet kontrollerar nu aktiv workspace innan det visas.
- Intern navigation ersatte alltid historiken. Vyer pushas nu vid verkligt byte;
  popstate återställer rätt vy utan en ny historikpost.
- Ny spelarprofil fick tidigare comfort 8 på kopierade champions. Nya profiler
  börjar på 5; befintliga personliga värden lämnas kvar.
- Träningslägets damagekontroll skickade enbart namn och kunde räkna support-AP
  som en andra carry. Roll följer nu med till strukturbedömningen.
- Advanced-lagrets antal damagehot räknar inte längre support som carry.
- Träningsfeedback använde en äldre championlista trots uppdaterad compmodell.
  Aktuella rollspecifika alternativ används nu också i feedbacken.
- En stabiliserad rekommendation kunde samtidigt visas som sitt eget alternativ.
  Alternativlistan utesluter nu det faktiskt visade förstavalet.
- Match-/plancache med giltig JSON men fel datatyp kunde krascha listor.
  Sådana värden behandlas som tom cache.
- Match- och plananrop har en tidsgräns så att ett hängande nätverksanrop kan
  återgå till befintlig felhantering.

## Draftmotor och AI

- 84 befintliga kitprofiler har gemensamma roll- och taktiska egenskaper.
- Automatisk comp-affinity bedömer roll, tidig styrka, engage, uppföljning,
  damage, waveclear och skydd utifrån dessa profiler.
- Kärnor och manuellt bedömda alternativ behålls. Automatiska kit-alternativ
  får en svagare fitvikt (0,7) än bedömda alternativ (1).
- Gragas jungle är ett regressionstest för ett nytt PRESS R-alternativ utan
  tillägg i en namnlista för just den compen.
- Fel roll, pausad champion och okänd kitprofil får ingen automatisk comp-bonus.
  Okänd kitprofil är fortfarande valbar och kan bedömas efter comfort.
- Jungle Carry-bedömningen använder nu aktiva comp-alternativ i stället för
  en separat lista med fyra junglers.
- Groq instrueras att comp-tillhörighet kan vara kitbaserad och inte bevisar
  att laget har tränat championen. Individuell comfort förblir separat.
- Befintliga regler för lagliga picks, faktisk motståndardraft, starters före
  subs, begränsad scoutingvikt, små sample och gamla AI-svar behålls.

## UX, design och prestanda

- Rosterstatus visar **Lagets sparade roster**, utan tekniskt versionsnummer.
  Den interna revisionen finns kvar för konfliktkontroll.
- Namn kan ändras på en vald spelare utan nytt ID eller ändrad matchhistorik.
- Spelarknappar grupperas; långa namn kan radbrytas och kontroller har 44 px höjd.
- Comp-passform visas även när en reservspelares pool redigeras.
- Automatiska comp-alternativ märks med **(kit)** och förklaras i samma vy.
- Träningslägets inledande råd använder den aktiva poolen.
- Aktiva rosterchampions läggs även i sökkatalogen när sidans reservkatalog saknar dem.
- Comp-planer cachas tills rostern ändras. En comp-guide gör inte längre
  samma sökning separat för varje roll. Returnerade planer är kopior.
- Ändrade frontendreferenser cache-bustas i alla tre ingångssidor.

## Tester

Alla JavaScript-filer syntaxkontrolleras. Elva testsuiter körs i Pages-workflow:
brain-regression, roster-sync, player-delete, product-audit, groq-policy,
postmatch, planner-review, decision-scenarios, quality-policy, integrity,
match-api. Nya testfall täcker kit-affinity, fel roll, okänd kitdata,
pausning/cacheinvalidering, rename/reload, comfort 5, gemensam practice/Brain,
support-damage, historiknavigation och asynkron workspace-isolering.

## Kvarvarande begränsningar och manuell kontroll

- Alla champions har inte djupa kit-/matchupprofiler. Generiska DDragon-klasser
  räcker inte för att dra säkra slutsatser om early, engage eller comp-passform.
- De fyra strategiska comp-identiteterna kan ännu inte redigeras fritt i UI.
- Spelarens roll kan inte flyttas fritt i UI; byte måste bevara minst en spelare
  per roll och hantera aktiv ersättare tydligt.
- Befintlig scouting kan verifieras utan att starta en ny import. Färsk CM/OP.GG-
  import och verkligt Groq-svar med lagkod behöver separat livekontroll.
- RLS-flaggan och mockad auth är inte en fullständig säkerhetsrevision av alla
  driftkonfigurationer och rättigheter.
- Responsiva CSS-regler granskade; samtliga begärda skärmstorlekar är inte
  verifierade med riktiga viewporttester. Firefox och mobil bör kontrolleras.
- Draftmotorerna är förklarbara heuristiker, inte bevis för optimal draft eller
  kalibrerad vinstchans. Överlagrade funktioner i live.js är teknisk skuld.

## Förslag att överväga, prioriterade

| Funktion | Problem / nytta | Komplexitet | Placering |
| --- | --- | --- | --- |
| Täckningslista för aktiva pooler | Visar exakt vilka nya champs som saknar kit- eller matchupdata; styr nästa datainsats | Låg | Våra champs |
| Sparade draftfall för jämförelse | Mät om motorändringar ger bättre beslut utan regressioner | Medel | Tester, senare Analys |
| Redigera roll med ersättare | Smidigare flex/sub-hantering med bibehållna spelar-ID:n | Medel | Våra champs |
| Comp-preferenser per lag | Markera tränade alternativ utan att göra en ny global compmotor | Medel | Comp Library |
| Bekräfta matchprep före draft | Samlad kontroll av femma, scoutens ålder och banplan | Låg/medel | Befintlig matchplan |

## Förenkling och fortsatt prioritet

1. Fyll kit-/matchuptäckningen för de champions laget faktiskt lägger till.
2. Utöka mätbara draftscenarier innan ytterligare vikter eller AI-funktioner läggs på.
3. Konsolidera överlagrade motorfunktioner stegvis, bakom regressionstester.
4. Bygg rollbyte och enkla comp-preferenser i befintliga vyer.
5. Kör en särskild Firefox-/mobil-/nätverksfelrunda med de riktiga skrivflödena.

Ingen extra Match Prep-tab eller separat Live Coach-sida införs: de överlappar
befintlig Ban Planner och Draft Brain. Nästa förbättring bör stärka kopplingen
mellan dem. Inga använda funktioner tas bort enbart för att koden är stor.
