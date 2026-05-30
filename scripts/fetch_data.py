#!/usr/bin/env python3
"""
fetch_data.py — Descarga y limpia todos los datos de Data Dragon de Riot Games.
Ejecutar con: python3 scripts/fetch_data.py

Genera en src/data/:
  - champions.json   → datos limpios de campeones del pool
  - items.json       → datos limpios de items con stats normalizados
  - version.json     → versión descargada

Descarga en public/assets/:
  - champions/       → splash arts (loading screen) + iconos
  - items/           → iconos de items
  - abilities/       → iconos de habilidades (Q/W/E/R/Passive)
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

# ─── CONFIG ───────────────────────────────────────────────────────────────────
BASE_DIR    = Path(__file__).parent.parent
DATA_DIR    = BASE_DIR / "src" / "data"
ASSETS_DIR  = BASE_DIR / "public" / "assets"
CHAMP_DIR   = ASSETS_DIR / "champions"
ITEMS_DIR   = ASSETS_DIR / "items"
ABIL_DIR    = ASSETS_DIR / "abilities"
UI_DIR      = ASSETS_DIR / "ui"

DDRAGON_BASE = "https://ddragon.leagueoflegends.com"
LANG         = "en_US"   # Cambia a "es_ES" si quieres todo en español

# Campeones que usamos en el juego (pool curado)
CHAMPION_POOL = [
    "Garen", "Darius", "Ashe", "Lux", "Akali",
    "Jinx", "Tryndamere", "Soraka", "Yasuo", "Vi",
    "Caitlyn", "Zed", "Leona", "Thresh", "Fiora"
]

# IDs de items que usamos en el juego
ITEM_IDS = [
    1001, 1004, 1006, 1011, 1018, 1026, 1028, 1029, 1031, 1036, 1037,
    1038, 1042, 1043, 1052, 1053, 1054, 1055, 1056, 1057, 1058,
    2003, 2055, 3006, 3009, 3020, 3031, 3035, 3036, 3040, 3041,
    3046, 3050, 3053, 3057, 3065, 3067, 3068, 3071, 3072, 3074,
    3075, 3076, 3083, 3085, 3089, 3091, 3100, 3102, 3107, 3109,
    3110, 3111, 3115, 3116, 3124, 3135, 3139, 3143, 3145, 3153,
    3156, 3157, 3161, 3179, 3181, 3190, 3222, 3742, 3748, 3814,
    6029, 6630, 6631, 6632, 6653, 6655, 6656, 6657, 6660, 6662,
    6664, 6665, 6667, 6670, 6671, 6672, 6673, 6675, 6676, 6677,
    6690, 6691, 6692, 6693, 6694, 6695, 6696, 6697, 6698, 6699,
]

# ─── UTILIDADES ───────────────────────────────────────────────────────────────
def dl(url: str, dest: Path, retries: int = 3) -> bool:
    """Descarga url → dest. Devuelve True si éxito."""
    if dest.exists():
        return True
    dest.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=15) as r, open(dest, "wb") as f:
                f.write(r.read())
            return True
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(1.5)
            else:
                print(f"  ✗ Failed: {url} → {e}")
    return False

def fetch_json(url: str) -> dict | list:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())

def progress(label: str, i: int, total: int):
    bar_len = 30
    filled = int(bar_len * i / total)
    bar = "█" * filled + "░" * (bar_len - filled)
    print(f"\r  [{bar}] {i}/{total} {label}", end="", flush=True)
    if i == total:
        print()

# ─── PASO 1: Versión ──────────────────────────────────────────────────────────
def get_latest_version() -> str:
    print("→ Fetching latest DDragon version...")
    versions = fetch_json(f"{DDRAGON_BASE}/api/versions.json")
    v = versions[0]
    print(f"  Latest version: {v}")
    return v

# ─── PASO 2: Datos de campeones ───────────────────────────────────────────────
def fetch_champion_data(version: str) -> dict:
    print(f"\n→ Fetching champion data ({LANG})...")
    result = {}

    for i, champ_id in enumerate(CHAMPION_POOL):
        progress(champ_id, i + 1, len(CHAMPION_POOL))
        try:
            url = f"{DDRAGON_BASE}/cdn/{version}/data/{LANG}/champion/{champ_id}.json"
            raw = fetch_json(url)
            c = raw["data"][champ_id]

            # Stats base del juego
            stats = c["stats"]

            # Habilidades (passive + Q/W/E/R)
            abilities = []

            # Pasiva
            passive = c.get("passive", {})
            abilities.append({
                "key": "P",
                "name": passive.get("name", ""),
                "description": clean_html(passive.get("description", "")),
                "image": passive.get("image", {}).get("full", ""),
                "imageUrl": f"/assets/abilities/{champ_id}_P.png",
                "cost": 0,
                "costType": "none",
            })

            # Q W E R
            spell_keys = ["Q", "W", "E", "R"]
            for j, spell in enumerate(c.get("spells", [])):
                key = spell_keys[j] if j < 4 else str(j)
                # Coste de maná/energía/etc.
                cost_type = "none"
                cost_val = 0
                resource = c.get("partype", "None").lower()
                if resource in ("mana", "maná"):
                    cost_type = "mana"
                elif resource == "energy":
                    cost_type = "energy"
                elif resource == "fury":
                    cost_type = "fury"
                elif resource == "heat":
                    cost_type = "heat"
                elif resource == "blood well":
                    cost_type = "blood"

                cost_arr = spell.get("costBurn", "0")
                try:
                    cost_val = int(float(cost_arr.split("/")[0]))
                except Exception:
                    cost_val = 0

                abilities.append({
                    "key": key,
                    "name": spell.get("name", ""),
                    "description": clean_html(spell.get("description", "")),
                    "image": spell.get("image", {}).get("full", ""),
                    "imageUrl": f"/assets/abilities/{champ_id}_{key}.png",
                    "cost": cost_val,
                    "costType": cost_type,
                    "cooldown": float(spell.get("cooldownBurn", "0").split("/")[0]) if spell.get("cooldownBurn") else 0,
                    "range": int(spell.get("rangeBurn", "0").split("/")[0]) if spell.get("rangeBurn") else 0,
                })

            result[champ_id] = {
                "id": champ_id,
                "name": c["name"],
                "title": c["title"],
                "lore": c.get("lore", "")[:300],
                "tags": c.get("tags", []),
                "resource": c.get("partype", "None"),
                "type": "melee" if c.get("tags", []) and any(
                    t in c.get("tags", []) for t in ["Fighter", "Tank", "Assassin"]
                ) and "Marksman" not in c.get("tags", []) and "Mage" not in c.get("tags", []) and champ_id not in ["Lux","Soraka","Akali","Zed"]
                else "range",
                "stats": {
                    "hp":       stats.get("hp", 500),
                    "hpPerLvl": stats.get("hpperlevel", 80),
                    "mp":       stats.get("mp", 0),
                    "mpPerLvl": stats.get("mpperlevel", 0),
                    "ad":       stats.get("attackdamage", 55),
                    "adPerLvl": stats.get("attackdamageperlevel", 3),
                    "ap":       0,
                    "armor":    stats.get("armor", 25),
                    "mr":       stats.get("spellblock", 30),
                    "moveSpeed":stats.get("movespeed", 340),
                    "attackRange": stats.get("attackrange", 150),
                    "hpRegen":  stats.get("hpregen", 5),
                },
                "abilities": abilities,
                "splashUrl": f"/assets/champions/{champ_id}_splash.jpg",
                "iconUrl":   f"/assets/champions/{champ_id}_icon.png",
                "loadingUrl":f"/assets/champions/{champ_id}_loading.jpg",
            }
        except Exception as e:
            print(f"\n  ✗ Error fetching {champ_id}: {e}")

    return result

def clean_html(text: str) -> str:
    """Elimina tags HTML de las descripciones de DDragon."""
    import re
    text = re.sub(r'<br\s*/?>', ' ', text)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

# ─── PASO 3: Imágenes de campeones ────────────────────────────────────────────
def fetch_champion_images(version: str, champions: dict):
    print(f"\n→ Downloading champion images...")
    total = len(champions) * 3  # splash + icon + loading
    done = 0

    for champ_id in champions:
        # Splash art (0 = skin base)
        dl(
            f"{DDRAGON_BASE}/cdn/img/champion/splash/{champ_id}_0.jpg",
            CHAMP_DIR / f"{champ_id}_splash.jpg"
        )
        # Icono cuadrado
        dl(
            f"{DDRAGON_BASE}/cdn/{version}/img/champion/{champ_id}.png",
            CHAMP_DIR / f"{champ_id}_icon.png"
        )
        # Loading screen portrait (crop más vertical)
        dl(
            f"{DDRAGON_BASE}/cdn/img/champion/loading/{champ_id}_0.jpg",
            CHAMP_DIR / f"{champ_id}_loading.jpg"
        )
        done += 3
        progress("champions", done, total)

# ─── PASO 4: Iconos de habilidades ────────────────────────────────────────────
def fetch_ability_images(version: str, champions: dict):
    print(f"\n→ Downloading ability icons...")
    all_abilities = []
    for champ_id, champ in champions.items():
        for ab in champ["abilities"]:
            if ab["image"]:
                all_abilities.append((champ_id, ab["key"], ab["image"]))

    for i, (champ_id, key, img_file) in enumerate(all_abilities):
        progress("abilities", i + 1, len(all_abilities))
        if key == "P":
            url = f"{DDRAGON_BASE}/cdn/{version}/img/passive/{img_file}"
        else:
            url = f"{DDRAGON_BASE}/cdn/{version}/img/spell/{img_file}"
        dl(url, ABIL_DIR / f"{champ_id}_{key}.png")

# ─── PASO 5: Datos de items ───────────────────────────────────────────────────
STAT_MAP = {
    "FlatHPPoolMod":              "hp",
    "FlatHPRegenMod":             "hpRegen5",
    "FlatMPPoolMod":              "mp",
    "FlatArmorMod":               "armor",
    "FlatSpellBlockMod":          "mr",
    "FlatPhysicalDamageMod":      "ad",
    "FlatMagicDamageMod":         "ap",
    "FlatCritChanceMod":          "critChance",
    "FlatAttackSpeedMod":         "attackSpeed",
    "FlatMovementSpeedMod":       "moveSpeed",
    "PercentAttackSpeedMod":      "attackSpeedPct",
    "PercentLifeStealMod":        "lifeSteal",
    "FlatMagicPenetrationMod":    "magicPen",
    "FlatArmorPenetrationMod":    "armorPen",
    "PercentArmorPenetrationMod": "armorPenPct",
    "PercentBonusArmorPenetrationMod": "lethality",
    "FlatCritDamageMod":          "critDmg",
    "FlatEXPBonus":               "expBonus",
}

def fetch_item_data(version: str) -> dict:
    print(f"\n→ Fetching item data ({LANG})...")
    url = f"{DDRAGON_BASE}/cdn/{version}/data/{LANG}/item.json"
    raw = fetch_json(url)
    all_items = raw.get("data", {})

    result = {}
    for item_id_str, item in all_items.items():
        item_id = int(item_id_str)
        if item_id not in ITEM_IDS:
            continue

        # Filtrar items sin nombre o de sistema
        name = item.get("name", "").strip()
        if not name or "Quick Charge" in name:
            continue

        # Tags de categoría
        tags = item.get("tags", [])

        # Stats normalizados
        raw_stats = item.get("stats", {})
        stats = {}
        for ddragon_key, our_key in STAT_MAP.items():
            if ddragon_key in raw_stats:
                val = raw_stats[ddragon_key]
                # Algunos valores de DDragon ya son fracciones (critChance = 0.15 = 15%)
                stats[our_key] = round(val, 4)

        # Gold
        gold = item.get("gold", {})

        # From / into (árbol de crafteo)
        from_items = [int(x) for x in item.get("from", [])]
        into_items = [int(x) for x in item.get("into", [])]

        result[item_id] = {
            "id": item_id,
            "name": name,
            "description": clean_html(item.get("description", ""))[:250],
            "plaintext": item.get("plaintext", ""),
            "tags": tags,
            "stats": stats,
            "gold": {
                "base":  gold.get("base", 0),
                "total": gold.get("total", 0),
                "sell":  gold.get("sell", 0),
                "purchasable": gold.get("purchasable", True),
            },
            "from": from_items,
            "into": into_items,
            "consumable": item.get("consumed", False),
            "imageUrl": f"/assets/items/{item_id}.png",
            "image":    item.get("image", {}).get("full", ""),
        }

    print(f"  Found {len(result)} items from pool")
    return result

# ─── PASO 6: Imágenes de items ────────────────────────────────────────────────
def fetch_item_images(version: str, items: dict):
    print(f"\n→ Downloading item images...")
    items_list = list(items.values())
    for i, item in enumerate(items_list):
        progress("items", i + 1, len(items_list))
        if item["image"]:
            dl(
                f"{DDRAGON_BASE}/cdn/{version}/img/item/{item['image']}",
                ITEMS_DIR / f"{item['id']}.png"
            )

# ─── PASO 7: Iconos de UI ─────────────────────────────────────────────────────
CDRAGON = "https://raw.communitydragon.org/latest"

UI_ICONS = [
    {
        "name": "gold_coin",
        "dest": "coin.png",
        "url": f"{CDRAGON}/game/assets/ux/floatingtext/goldicon.png",
    },
    {
        "name": "missing_ping",
        "dest": "missing_ping.png",
        "url": f"{CDRAGON}/game/data/images/ui/pingmia.png",
    },
]

def fetch_ui_icons():
    print(f"\n→ Downloading UI icons...")
    UI_DIR.mkdir(parents=True, exist_ok=True)
    for icon in UI_ICONS:
        dest = UI_DIR / icon["dest"]
        ok = dl(icon["url"], dest)
        print(f"  {'✓' if ok else '✗'} {icon['name']}")

# ─── PASO 8: Guardar JSONs ────────────────────────────────────────────────────
def save_json(data: dict | list, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    kb = path.stat().st_size // 1024
    print(f"  Saved {path.name} ({kb} KB, {len(data) if isinstance(data, dict) else len(data)} entries)")

# ─── MAIN ─────────────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("  Runeterra Roguelike — Data Fetcher")
    print("=" * 60)

    # Directorios
    for d in [DATA_DIR, CHAMP_DIR, ITEMS_DIR, ABIL_DIR, UI_DIR]:
        d.mkdir(parents=True, exist_ok=True)

    try:
        # Versión
        version = get_latest_version()
        save_json({"version": version, "lang": LANG}, DATA_DIR / "version.json")

        # Campeones
        champions = fetch_champion_data(version)
        save_json(champions, DATA_DIR / "champions.json")

        # Imágenes de campeones
        fetch_champion_images(version, champions)

        # Iconos de habilidades
        fetch_ability_images(version, champions)

        # Items
        items = fetch_item_data(version)
        save_json(items, DATA_DIR / "items.json")

        # Imágenes de items
        fetch_item_images(version, items)

        # Iconos de UI
        fetch_ui_icons()

        # Download Runeterra map background
        # NOTE: The original leagueoflegends.com hash URL is dead.
        # Place your own runeterra.jpg at public/assets/map/runeterra.jpg to use it.
        # The SVG component has a procedural fallback that works without the image.
        map_dest = ASSETS_DIR / "map" / "runeterra.jpg"
        if not map_dest.exists():
            print(f"\n→ Runeterra map image not found.")
            print(f"  Place the image at: {map_dest}")
            print(f"  The map SVG will use its built-in gradient background otherwise.")
        else:
            print(f"\n→ Runeterra map already downloaded ✓")

        print("\n" + "=" * 60)
        print("  ✓ Data fetch complete!")
        print(f"  Champions: {len(champions)}")
        print(f"  Items:     {len(items)}")
        print(f"  Version:   {version}")
        print("=" * 60)

    except KeyboardInterrupt:
        print("\n\nInterrupted by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Fatal error: {e}")
        import traceback; traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
