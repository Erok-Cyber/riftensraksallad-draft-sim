# Adaptiv banordning

Öppningsplanen är inte längre en hård sortering. Den första fortfarande styrkta och tillgängliga plan-bannen behålls bara om den ligger högst åtta poäng efter den bästa aktuella kandidaten. Det är en uttrycklig tolerans för att behålla förberedelsen, inte extra dolda poäng. Större skillnad ger avvikelse med namnet på det ersatta valet och poängskillnaden.

Inga vikter för spelarstyrka eller comp-hot ändras här. Spelarens uppmätta bidrag över minst tre tävlingsgames, championvana, tillgängliga alternativ, aktuella hot och eget pickskydd vägs fortfarande samman. Rank är en begränsad proxy, aldrig bevis på vem som är bäst. I fas 2 finns ingen öppningsprioritet.

Visningen följer samma ordning som motorn för scoutade bans. Valfri fjärr-AI får inte återställa en gammal banordning. AI-granskning av picks och gameplan är oförändrad. Planner visar fortfarande den förberedda planen; Brain förklarar avvikelser under draften.

Nytt regressionstest: adaptive-opening-bans.cjs. Kontrollerar att dokumenterad carry-påverkan slår en gammal plan och rankproxy, att nära planer behålls, att visningen inte återställer planen via AI, att borttagna picks omvärderas, att dive-hot ökar mot låst Ashe och att fyllda roller försvinner. Äldre test för ovillkorlig planprioritet uppdateras till det nya avsiktliga beteendet.
