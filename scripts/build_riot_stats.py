#!/usr/bin/env python3
import collections
import datetime as dt
import json
import os
import random
import time
import urllib.error
import urllib.parse
import urllib.request

API_KEY = os.environ.get("RIOT_API_KEY", "").strip()
PLATFORM = os.environ.get("RIOT_PLATFORM", "euw1")
REGION = os.environ.get("RIOT_REGION", "europe")
QUEUE = 420
DAYS = int(os.environ.get("RIOT_STATS_DAYS", "21"))
MATCHES_PER_SEED = int(os.environ.get("RIOT_MATCHES_PER_SEED", "3"))
TARGET_SEEDS = {"GOLD": 20, "PLATINUM": 12, "EMERALD": 6}
DIVISIONS = ["I", "II", "III", "IV"]
ROLE_MAP = {"TOP":"top","JUNGLE":"jungle","MIDDLE":"mid","BOTTOM":"adc","UTILITY":"support"}
MIN_DELAY = float(os.environ.get("RIOT_REQUEST_DELAY", "1.25"))

last_call = 0.0

def request_json(url, riot=True, retries=5):
    global last_call
    for attempt in range(retries):
        elapsed = time.time() - last_call
        if elapsed < MIN_DELAY:
            time.sleep(MIN_DELAY - elapsed)
        headers = {"User-Agent": "Riftensraksallad-Draft-Brain/1.0"}
        if riot:
            headers["X-Riot-Token"] = API_KEY
        req = urllib.request.Request(url, headers=headers)
        try:
            last_call = time.time()
            with urllib.request.urlopen(req, timeout=25) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = int(e.headers.get("Retry-After", "8"))
                print(f"Rate limited; sleeping {wait}s")
                time.sleep(wait + 1)
                continue
            if e.code in (500,502,503,504):
                time.sleep(2 + attempt * 2)
                continue
            print("HTTP", e.code, url)
            return None
        except Exception as e:
            print("Request failed:", e, url)
            time.sleep(2 + attempt)
    return None

def dd_version():
    try:
        data = request_json("https://ddragon.leagueoflegends.com/api/versions.json", riot=False)
        return data[0] if data else None
    except Exception:
        return None

def league_entries(tier):
    out = []
    for div in DIVISIONS:
        u = f"https://{PLATFORM}.api.riotgames.com/lol/league/v4/entries/RANKED_SOLO_5x5/{tier}/{div}?page=1"
        rows = request_json(u) or []
        out.extend(rows)
    random.Random(dt.date.today().isoformat() + tier).shuffle(out)
    return out[:TARGET_SEEDS[tier]]

def puuid_from_summoner_id(sid):
    q = urllib.parse.quote(sid, safe="")
    u = f"https://{PLATFORM}.api.riotgames.com/lol/summoner/v4/summoners/{q}"
    data = request_json(u) or {}
    return data.get("puuid")

def match_ids(puuid):
    start = int((dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=DAYS)).timestamp())
    q = urllib.parse.quote(puuid, safe="")
    u = (f"https://{REGION}.api.riotgames.com/lol/match/v5/matches/by-puuid/{q}/ids"
         f"?queue={QUEUE}&startTime={start}&start=0&count={MATCHES_PER_SEED}")
    return request_json(u) or []

def match_data(mid):
    q = urllib.parse.quote(mid, safe="")
    return request_json(f"https://{REGION}.api.riotgames.com/lol/match/v5/matches/{q}")

def nested():
    return collections.defaultdict(nested)

def finalize(obj):
    if isinstance(obj, collections.defaultdict):
        obj = dict(obj)
    if isinstance(obj, dict):
        return {k: finalize(v) for k,v in obj.items()}
    return obj

def add_counter(root, path, win):
    node = root
    for key in path:
        node = node[key]
    node["games"] = int(node.get("games", 0)) + 1
    node["wins"] = int(node.get("wins", 0)) + (1 if win else 0)

def process_match(seg, match):
    info = match.get("info", {})
    if info.get("queueId") != QUEUE:
        return False
    participants = info.get("participants", [])
    if len(participants) != 10:
        return False

    valid = []
    for p in participants:
        role = ROLE_MAP.get(p.get("teamPosition"))
        champ = p.get("championName")
        if role and champ:
            valid.append({
                "team": p.get("teamId"),
                "role": role,
                "champ": champ,
                "win": bool(p.get("win"))
            })
    if len(valid) < 8:
        return False

    for p in valid:
        add_counter(seg["champions"], [p["role"], p["champ"]], p["win"])

    by_role_team = {(p["team"],p["role"]):p for p in valid}
    for p in valid:
        other_team = 100 if p["team"] == 200 else 200
        enemy = by_role_team.get((other_team,p["role"]))
        if enemy:
            add_counter(seg["matchups"], [p["role"],p["champ"],enemy["champ"]], p["win"])

    teams = collections.defaultdict(list)
    for p in valid:
        teams[p["team"]].append(p)
    for members in teams.values():
        for p in members:
            for ally in members:
                if ally is p:
                    continue
                add_counter(seg["synergies"], [p["champ"],ally["champ"]], p["win"])
    return True

def main():
    if not API_KEY:
        print("RIOT_API_KEY is not configured; keeping existing riot-stats.json unchanged.")
        return

    seeds = {}
    for tier in TARGET_SEEDS:
        rows = league_entries(tier)
        print(tier, "seed entries:", len(rows))
        seeds[tier] = rows

    match_tiers = collections.defaultdict(list)
    for tier, rows in seeds.items():
        for row in rows:
            sid = row.get("summonerId")
            if not sid:
                continue
            puuid = puuid_from_summoner_id(sid)
            if not puuid:
                continue
            for mid in match_ids(puuid):
                match_tiers[mid].append(tier)

    # Cap the daily snapshot so even a low-rate personal key stays practical.
    mids = list(match_tiers.keys())[:90]
    data = {
        "schema": 1,
        "source": "Riot Games API",
        "status": "ready",
        "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "patch": dd_version(),
        "queue": QUEUE,
        "windowDays": DAYS,
        "profile": "Gold-heavy EUW sample",
        "summary": {"matches": 0},
        "segments": {}
    }
    buckets = {tier: nested() for tier in TARGET_SEEDS}
    counts = collections.Counter()

    for i, mid in enumerate(mids, 1):
        tiers = match_tiers[mid]
        tier = collections.Counter(tiers).most_common(1)[0][0]
        match = match_data(mid)
        if match and process_match(buckets[tier], match):
            counts[tier] += 1
            data["summary"]["matches"] += 1
        print(f"{i}/{len(mids)} matches processed", end="\r", flush=True)

    for tier in TARGET_SEEDS:
        seg = finalize(buckets[tier])
        seg["matches"] = counts[tier]
        data["segments"][tier] = seg

    with open("riot-stats.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",",":"))
    print("\nWrote riot-stats.json with", data["summary"]["matches"], "matches")

if __name__ == "__main__":
    main()
