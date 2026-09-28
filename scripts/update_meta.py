#!/usr/bin/env python3
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode

import requests
from lxml import html

ROOT = Path(__file__).resolve().parents[1]
META_PATH = ROOT / "external-meta.json"
DD_VERSIONS = "https://ddragon.leagueoflegends.com/api/versions.json"
LOLALYTICS_TIERLIST = "https://lolalytics.com/lol/tierlist/"

TEAM_POOL = {
    "top": ["Renekton","Malphite","Shen","Mordekaiser","Sion","Garen","Darius","Olaf","Trundle","Heimerdinger","Yorick","Galio"],
    "jungle": ["Xin Zhao","Jarvan IV","Viego","Volibear","Udyr","Lillia","Vi","Wukong","Graves","Kindred"],
    "mid": ["Ahri","Annie","Vex","Hwei","Taliyah","Viktor","Sylas","Anivia"],
    "adc": ["Ashe","Varus","Xayah","Jinx","Senna"],
    "support": ["Nautilus","Leona","Maokai"],
}
LANE_PARAM = {"top":"top","jungle":"jungle","mid":"middle","adc":"bottom","support":"support"}
EXPECTED = sum(len(v) for v in TEAM_POOL.values())
HEADERS = {
    "User-Agent": "Riftensraksallad-DraftBrain/1.0 (+https://github.com/Erok-Cyber/riftensraksallad-draft-sim)"
}

def source_patch(version):
    parts = str(version).split(".")
    return ".".join(parts[:2]) if len(parts) >= 2 else str(version)

def patch_key(patch):
    try:
        a,b = patch.split(".",1)
        return (int(a),int(re.match(r"\d+", b).group()))
    except Exception:
        return (0,0)

def display_patch(source):
    major, minor = patch_key(source)
    if major >= 15:
        major += 10
    return f"{major}.{minor}"

def compact(s):
    return " ".join((s or "").split())

def number(s):
    m = re.search(r"-?\d+(?:\.\d+)?", compact(s).replace(",", ""))
    return float(m.group()) if m else None

def load_existing():
    try:
        return json.loads(META_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}

def legacy_to_snapshot(old):
    if old.get("schema") == 1 and old.get("roles"):
        src = old.get("patch") or ""
        return {
            "patch": display_patch(src),
            "sourcePatch": src,
            "source": old.get("source","LoLalytics"),
            "sourceUrl": old.get("sourceUrl","https://lolalytics.com/"),
            "bracket": old.get("bracket","Gold / Gold+"),
            "region": old.get("region","GLOBAL"),
            "updated": old.get("updated"),
            "coverage": sum(len(v) for v in old.get("roles",{}).values()),
            "coverageRatio": round(sum(len(v) for v in old.get("roles",{}).values()) / EXPECTED, 3),
            "sampleCount": None,
            "confidence": "medium",
            "roles": old["roles"],
        }
    return None

def existing_snapshots(old):
    if old.get("schema") == 2:
        return old.get("patches") or []
    snap = legacy_to_snapshot(old)
    return [snap] if snap else []

def historical_row(old, role, champ):
    for snap in existing_snapshots(old):
        row = (snap.get("roles") or {}).get(role,{}).get(champ)
        if row:
            return row
    return {}

def fetch_role(session, source, role):
    params = {
        "lane": LANE_PARAM[role],
        "tier": "gold_plus",
        "view": "grid",
        "patch": source,
    }
    url = LOLALYTICS_TIERLIST + "?" + urlencode(params)
    r = session.get(url, headers=HEADERS, timeout=35)
    r.raise_for_status()
    tree = html.fromstring(r.content)
    body_text = compact(tree.text_content())
    sm = re.search(r"Champions Analysed:\s*([0-9,]+)", body_text, re.I)
    sample = int(sm.group(1).replace(",","")) if sm else 0

    found = {}
    targets = set(TEAM_POOL[role])

    def slug_key(value):
        return re.sub(r"[^a-z0-9]", "", value.lower())

    slug_to_champ = {slug_key(champ): champ for champ in targets}
    tier_re = re.compile(r"(?<![A-Z0-9])(S\\+|S-|S|A\\+|A-|A|B\\+|B-|B|C\\+|C-|C|D\\+|D-|D)(?![A-Z0-9])")

    # LoLalytics changes layout regularly. Instead of relying on one absolute
    # XPath, locate champion build links and walk up to the smallest ancestor
    # that contains a tier token plus a plausible win-rate value.
    for a in tree.xpath("//a[@href]"):
        href = a.get("href") or ""
        hm = re.search(r"/lol/([^/]+)/(?:build|guide)/?", href, re.I)
        if not hm:
            continue
        champ = slug_to_champ.get(slug_key(hm.group(1)))
        if not champ or champ in found:
            continue

        node = a
        for _ in range(8):
            node = node.getparent()
            if node is None:
                break
            text = compact(node.text_content())
            if not text or len(text) > 900:
                continue
            tm = tier_re.search(text)
            if not tm:
                continue
            after = text[tm.end():]
            nums = [float(x) for x in re.findall(r"\\d+(?:\\.\\d+)?", after)]
            wr = next((x for x in nums if 30 <= x <= 70), None)
            if wr is None:
                continue
            found[champ] = {"tier": tm.group(1), "winrate": wr}
            break

    return found, sample

def confidence_for(coverage_ratio, role_samples):
    positive = [x for x in role_samples.values() if x > 0]
    min_sample = min(positive) if positive else 0
    if coverage_ratio >= 0.90 and min_sample >= 1_000_000:
        return "high"
    if coverage_ratio >= 0.70 and min_sample >= 150_000:
        return "medium"
    return "low"

def fetch_snapshot(session, source, old):
    roles = {}
    role_samples = {}
    total_found = 0

    for role in TEAM_POOL:
        rows, sample = fetch_role(session, source, role)
        role_samples[role] = sample
        roles[role] = {}
        for champ in TEAM_POOL[role]:
            row = rows.get(champ)
            if not row:
                continue
            prev = historical_row(old, role, champ)
            roles[role][champ] = {
                "tier": row.get("tier"),
                "winrate": row.get("winrate"),
                "strong": prev.get("strong", []),
                "weak": prev.get("weak", []),
            }
            total_found += 1
        time.sleep(0.8)

    coverage_ratio = total_found / EXPECTED
    if coverage_ratio < 0.60:
        raise RuntimeError(
            f"Rejected {source}: only {total_found}/{EXPECTED} team-pool rows parsed "
            f"({coverage_ratio:.0%}). Keeping last-known-good snapshot."
        )

    return {
        "patch": display_patch(source),
        "sourcePatch": source,
        "source": "LoLalytics",
        "sourceUrl": "https://lolalytics.com/",
        "bracket": "Gold+",
        "region": "GLOBAL",
        "updated": datetime.now(timezone.utc).date().isoformat(),
        "coverage": total_found,
        "coverageRatio": round(coverage_ratio, 3),
        "sampleCount": sum(role_samples.values()),
        "roleSamples": role_samples,
        "confidence": confidence_for(coverage_ratio, role_samples),
        "roles": roles,
    }

def main():
    old = load_existing()
    session = requests.Session()
    versions = session.get(DD_VERSIONS, headers=HEADERS, timeout=25).json()

    wanted = []
    for v in versions:
        p = source_patch(v)
        if p not in wanted:
            wanted.append(p)
        if len(wanted) == 2:
            break
    if len(wanted) < 2:
        raise RuntimeError("Could not resolve the latest two Data Dragon patches.")

    existing = {s.get("sourcePatch"): s for s in existing_snapshots(old) if s and s.get("sourcePatch")}
    fetched = {}
    errors = []
    for src in wanted:
        try:
            print(f"Fetching LoLalytics Gold+ snapshot for {src}...")
            fetched[src] = fetch_snapshot(session, src, old)
            print(f"  accepted: {fetched[src]['coverage']}/{EXPECTED}, confidence={fetched[src]['confidence']}")
        except Exception as exc:
            errors.append(f"{src}: {exc}")
            print(f"WARNING: {src}: {exc}", file=sys.stderr)

    if not fetched:
        print("No valid fresh snapshots; preserving external-meta.json exactly as-is.")
        return 0

    merged = {**existing, **fetched}
    patches = []
    for src in wanted:
        if src in merged:
            patches.append(merged[src])

    # If the live patch is too new/unavailable, retain the newest older last-known-good snapshot.
    if len(patches) < 2:
        extras = sorted(
            [s for k,s in merged.items() if k not in wanted],
            key=lambda s: patch_key(s.get("sourcePatch","")),
            reverse=True,
        )
        for snap in extras:
            if len(patches) >= 2:
                break
            patches.append(snap)

    if not patches:
        print("No valid snapshots available; leaving external-meta.json unchanged.", file=sys.stderr)
        return 0

    bundle = {
        "schema": 2,
        "strategy": "two-patch-confidence-blend",
        "source": "LoLalytics",
        "sourceUrl": "https://lolalytics.com/",
        "livePatch": display_patch(wanted[0]),
        "liveSourcePatch": wanted[0],
        "previousPatch": display_patch(wanted[1]),
        "previousSourcePatch": wanted[1],
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00","Z"),
        "notes": "Current patch is primary. Previous patch is blended as fallback when the live patch is fresh, incomplete, or unavailable. Invalid fetches never replace last-known-good data.",
        "patches": patches[:2],
    }
    if errors:
        bundle["warnings"] = errors

    new_text = json.dumps(bundle, ensure_ascii=False, indent=2) + "\n"
    old_text = META_PATH.read_text(encoding="utf-8") if META_PATH.exists() else ""
    if new_text != old_text:
        META_PATH.write_text(new_text, encoding="utf-8")
        print("external-meta.json updated.")
    else:
        print("No meta changes.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
