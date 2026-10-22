#!/usr/bin/env python3
"""
NetFilmx — Blender Foundation Media Asset Downloader v3
========================================================
Uses Wikimedia Commons API to resolve REAL file URLs.
Adds delays between downloads to avoid rate limiting.

Usage:
    python3 download_blender_assets.py [--output-dir ./r2_assets] [--skip-videos]
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error
import urllib.parse
import argparse
from pathlib import Path

DELAY_BETWEEN_DOWNLOADS = 3  # seconds between each download


def wikimedia_resolve(filename: str) -> str:
    """Use Wikimedia Commons API to resolve a filename to its real upload URL."""
    api_url = (
        "https://commons.wikimedia.org/w/api.php?"
        "action=query&titles=File:{}&prop=imageinfo&iiprop=url&format=json"
    ).format(urllib.parse.quote(filename))
    
    req = urllib.request.Request(api_url, headers={
        "User-Agent": "NetFilmxBot/1.0 (https://netfilmx.grela.dev; educational project)"
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
            pages = data.get("query", {}).get("pages", {})
            for page in pages.values():
                ii = page.get("imageinfo", [])
                if ii:
                    url = ii[0].get("url", "")
                    # Strip tracking params
                    if "?" in url:
                        url = url.split("?")[0]
                    return url
    except Exception as e:
        print(f"    ⚠  API error for '{filename}': {e}")
    return ""


# ============================================================
# ASSET CATALOG — Wikimedia filenames (NOT full URLs)
# The API will resolve these to real upload.wikimedia.org URLs
# ============================================================

CATALOG = [
    {
        "type": "video", "slug": "sintel",
        "title": "Sintel", "year": 2010, "duration_minutes": 15,
        "director": "Colin Levy", "cast": "Halina Reijn, Thom Hoffman",
        "genre": "Fantasy / Akcja", "age_rating": "13+",
        "quality_badge": "4K HDR", "maturity_warning": "Przemoc, Sceny Walki",
        "description": "Samotna młoda wojowniczka imieniem Sintel ratuje i wychowuje rannego małego smoka, którego nazywa Scales. Kiedy dorosły smok porywa Scales, Sintel wyrusza w pełną niebezpieczeństw podróż przez surowe krajobrazy, by go uratować.",
        # Wikimedia filenames (API resolves to real URLs)
        "poster_wm": "Sintel poster.jpg",
        "backdrop_wm": "Sintel 1920x1080.png",
        # Direct URL (non-Wikimedia)
        "video_url": "https://download.blender.org/demo/movies/Sintel.2010.1080p.mkv",
        "license": "CC BY 3.0",
    },
    {
        "type": "video", "slug": "tears-of-steel",
        "title": "Tears of Steel", "year": 2012, "duration_minutes": 12,
        "director": "Ian Hubert",
        "cast": "Derek de Lint, Sergio Hasselbaink, Denise Rebergen",
        "genre": "Sci-Fi / Akcja", "age_rating": "13+",
        "quality_badge": "HD", "maturity_warning": "Przemoc, Wulgaryzmy",
        "description": "W dystopijnym Amsterdamie grupa naukowców i wojowników zbiera się w Oude Kerk, aby odtworzyć kluczowe wspomnienie z przeszłości i ocalić ludzkość przed armią destrukcyjnych robotów.",
        "poster_wm": "Tos-poster.png",
        "backdrop_wm": "Tears of Steel frame 08 4a.jpg",
        "video_url": "https://archive.org/download/Tears-of-Steel/tears_of_steel_720p.mp4",
        "license": "CC BY 3.0",
    },
    {
        "type": "video", "slug": "big-buck-bunny",
        "title": "Big Buck Bunny", "year": 2008, "duration_minutes": 10,
        "director": "Sacha Goedegebure", "cast": "Jan Morgenstern",
        "genre": "Animacja / Komedia", "age_rating": "7+",
        "quality_badge": "4K", "maturity_warning": None,
        "description": "Spokojny dzień olbrzymiego królika w lesie zostaje zrujnowany przez trzy złośliwe gryzonie, które niszczą motyla i nękają go. Królik planuje serię pomysłowych i komicznych pułapek, by się zemścić.",
        "poster_wm": "Big buck bunny poster big.jpg",
        "backdrop_wm": "Big.Buck.Bunny.-.Frank.Rinky.Gimera.png",
        "video_url": "https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4",
        "license": "CC BY 3.0",
    },
    {
        "type": "video", "slug": "spring",
        "title": "Spring", "year": 2019, "duration_minutes": 8,
        "director": "Andreas Goralczyk", "cast": "Sander Houtman (dźwięk)",
        "genre": "Fantasy / Animacja", "age_rating": "7+",
        "quality_badge": "4K HDR", "maturity_warning": None,
        "description": "Młoda pasterka i jej wierny pies wędrują w górski las spowity mgłą, by stawić czoła pradawnym duchom i odprawić rytuał przodków, który zwiastuje nadejście wiosny.",
        "poster_wm": "Spring - Blender Open Movie.jpg",
        "backdrop_wm": "Spring Open Movie Screenshot.png",
        "video_url": "https://video.blender.org/download/videos/3d95fb3d-c866-42c8-9db1-fe82f48ccb95-804.mp4",
        "license": "CC BY 4.0",
    },
    {
        "type": "video", "slug": "charge",
        "title": "Charge", "year": 2022, "duration_minutes": 3,
        "director": "Hjalti Hjálmarsson", "cast": "Sander Houtman (dźwięk)",
        "genre": "Sci-Fi / Cyberpunk", "age_rating": "13+",
        "quality_badge": "4K HDR", "maturity_warning": "Przemoc",
        "description": "W dystopijnej przyszłości wątły staruszek włamuje się do zautomatyzowanej stacji ładowania baterii, by pozyskać energię, co wywołuje konfrontację ze śmiercionośnym robotem ochronnym.",
        "poster_wm": "Charge - Blender Open Movie.webm",
        "backdrop_wm": None,  # Will extract from video via ffmpeg
        "video_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Charge_-_Blender_Open_Movie-full_movie.webm",
        "license": "CC BY 4.0",
    },
    {
        "type": "video", "slug": "elephants-dream",
        "title": "Elephants Dream", "year": 2006, "duration_minutes": 11,
        "director": "Bassam Kurdali", "cast": "Tygo Gernandt, Cas Jansen",
        "genre": "Sci-Fi / Eksperymentalny", "age_rating": "13+",
        "quality_badge": "HD", "maturity_warning": "Surrealizm",
        "description": "Proog i Emo eksplorują dziwaczny, mechaniczny świat znany jako 'Maszyna'. Przemierzając jej zmieniające się, surrealistyczne pokoje, ich odmienne światopoglądy prowadzą do dramatycznego punktu zwrotnego.",
        "poster_wm": "Elephants Dream s1 prance.jpg",
        "backdrop_wm": "Elephants Dream s5 both.jpg",
        "video_url": "https://archive.org/download/ElephantsDream/ed_1024_512kb.mp4",
        "license": "CC BY 2.5",
    },
    {
        "type": "video", "slug": "agent-327",
        "title": "Agent 327: Operation Barbershop", "year": 2017, "duration_minutes": 4,
        "director": "Colin Levy, Hjalti Hjálmarsson",
        "cast": "Sander Houtman (dźwięk)",
        "genre": "Akcja / Komedia Szpiegowska", "age_rating": "7+",
        "quality_badge": "4K", "maturity_warning": None,
        "description": "Holenderski tajny agent 327 bada salon fryzjerski będący przykrywką dla syndykatu przestępczego w Amsterdamie. Czeka go pełna akcji walka z groźnym fryzjerem-złoczyńcą.",
        "poster_wm": "Blender 2.79-splash.jpg",
        "backdrop_wm": None,  # Will extract from video via ffmpeg
        "video_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Agent_327_-_Operation_Barbershop.webm",
        "license": "CC BY 4.0",
    },
    {
        "type": "video", "slug": "coffee-run",
        "title": "Coffee Run", "year": 2020, "duration_minutes": 3,
        "director": "Hjalti Hjálmarsson", "cast": "Sander Houtman (dźwięk)",
        "genre": "Animacja / Dramat", "age_rating": "7+",
        "quality_badge": "4K", "maturity_warning": None,
        "description": "Młoda kobieta wychodzi kupić kawę, co prowadzi do napędzanej kofeiną emocjonalnej sekwencji, w której przeżywa kluczowe momenty i wspomnienia z dawnego romansu.",
        "poster_wm": None,  # Will extract from video via ffmpeg
        "backdrop_wm": None,
        "video_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Coffee_Run_-_Blender_Open_Movie.webm",
        "license": "CC BY 4.0",
    },

    # ── SERIES EPISODES (Caminandes) ─────────────────────────
    {
        "type": "series_episode", "series_slug": "caminandes", "episode": 1,
        "slug": "caminandes-llama-drama",
        "title": "Caminandes: Llama Drama", "year": 2013, "duration_minutes": 2,
        "director": "Pablo Vázquez", "cast": "Jan Morgenstern (dźwięk)",
        "genre": "Animacja / Komedia Slapstickowa", "age_rating": "7+",
        "quality_badge": "HD", "maturity_warning": None,
        "description": "Lama Koro próbuje przejść przez opustoszałą drogę gruntową w Patagonii, napotykając serię komicznych zagrożeń, w tym uparty płot i pędzące samochody.",
        "poster_wm": "Caminandes - Llama Drama.jpg",
        "backdrop_wm": None,
        "video_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Caminandes-_Llama_Drama_-_Short_Movie.ogv",
        "license": "CC BY 3.0",
    },
    {
        "type": "series_episode", "series_slug": "caminandes", "episode": 2,
        "slug": "caminandes-gran-dillama",
        "title": "Caminandes: Gran Dillama", "year": 2013, "duration_minutes": 2,
        "director": "Pablo Vázquez", "cast": "Jan Morgenstern (dźwięk)",
        "genre": "Animacja / Komedia Slapstickowa", "age_rating": "7+",
        "quality_badge": "HD", "maturity_warning": None,
        "description": "Lama Koro odkrywa soczystą jagodę po drugiej stronie ogrodzenia z drutu kolczastego, podejmując absurdalne próby dotarcia do przysmaku.",
        "poster_wm": None,
        "backdrop_wm": None,
        "video_url": "https://download.blender.org/demo/movies/caminandes_gran_dillama.mp4.zip",
        "license": "CC BY 3.0",
    },
    {
        "type": "series_episode", "series_slug": "caminandes", "episode": 3,
        "slug": "caminandes-llamigos",
        "title": "Caminandes: Llamigos", "year": 2016, "duration_minutes": 3,
        "director": "Pablo Vázquez", "cast": "Sander Houtman (dźwięk)",
        "genre": "Animacja / Komedia Slapstickowa", "age_rating": "7+",
        "quality_badge": "HD", "maturity_warning": None,
        "description": "W śnieżnej scenerii lama Koro spotyka pingwina Oti. Dwie ekscentryczne postacie wdają się w slapstickową rywalizację o jedną czerwoną jagodę na lodzie.",
        "poster_wm": None,
        "backdrop_wm": None,
        "video_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Caminandes_3_-_Llamigos_-_Blender_Animated_Short.webm",
        "license": "CC BY 3.0",
    },
]

SERIES_META = {
    "caminandes": {
        "name": "Caminandes",
        "description": "Seria trzech zabawnych krótkometrażówek o lamie Koro, która w Patagonii napotyka coraz bardziej absurdalne przeszkody.",
        "year": 2013, "director": "Pablo Vázquez",
        "cast": "Jan Morgenstern, Sander Houtman (dźwięk)",
        "age_rating": "7+", "quality_badge": "HD",
    },
}

BUNDLES = [
    {"slug": "blender-classics", "name": "Blender Studio Classics",
     "description": "Sintel, Big Buck Bunny i Elephants Dream w jednym pakiecie.",
     "price": 600, "videos": ["sintel", "big-buck-bunny", "elephants-dream"], "series": []},
    {"slug": "sci-fi-cyberpunk", "name": "Sci-Fi & Cyberpunk Collection",
     "description": "Tears of Steel i Charge — dwie wizje przyszłości.", 
     "price": 300, "videos": ["tears-of-steel", "charge"], "series": []},
    {"slug": "full-experience", "name": "NetFilmx Full Experience",
     "description": "Wszystkie filmy i seriale w jednym pakiecie.",
     "price": 1200,
     "videos": ["sintel", "tears-of-steel", "big-buck-bunny", "spring", "charge", "elephants-dream", "agent-327", "coffee-run"],
     "series": ["caminandes"]},
]


def download_file(url: str, dest: Path, retries: int = 3) -> bool:
    if dest.exists() and dest.stat().st_size > 1000:
        size_mb = dest.stat().st_size / (1024 * 1024)
        print(f"  ⏭  Istnieje ({size_mb:.1f} MB): {dest.name}")
        return True
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": "NetFilmxBot/1.0 (https://netfilmx.grela.dev; educational project)"
            })
            print(f"  ⬇  [{attempt}/{retries}] {dest.name} ...", end="", flush=True)
            with urllib.request.urlopen(req, timeout=300) as resp:
                data = resp.read()
                dest.write_bytes(data)
                size_mb = len(data) / (1024 * 1024)
                print(f" ✅ {size_mb:.1f} MB")
                return True
        except Exception as e:
            print(f" ❌ {e}")
            if attempt < retries:
                wait = attempt * 5
                print(f"     ⏳ Czekam {wait}s...")
                time.sleep(wait)
    print(f"  ⚠️  SKIP: {url}")
    return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", default="./r2_assets")
    parser.add_argument("--skip-videos", action="store_true")
    args = parser.parse_args()

    base = Path(args.output_dir)
    dirs = {"posters": base / "posters", "backdrops": base / "backdrops", "videos": base / "videos"}
    for d in dirs.values():
        d.mkdir(parents=True, exist_ok=True)

    results = {"cdn_base": "https://cdn.grela.dev", "videos": [], "series": [], "bundles": []}
    total_size = 0
    ok = 0
    failed = []
    needs_ffmpeg = []

    print("=" * 60)
    print("  NetFilmx — Blender Asset Downloader v3 (API-resolved)")
    print("=" * 60, "\n")

    for item in CATALOG:
        slug = item["slug"]
        print(f"📽  {item['title']} ({item['year']})")

        pf = bf = None

        # --- Poster ---
        if item.get("poster_wm"):
            print(f"  🔍 Resolving poster via API: {item['poster_wm']}")
            real_url = wikimedia_resolve(item["poster_wm"])
            if real_url:
                ext = real_url.rsplit(".", 1)[-1][:4]
                pf = f"{slug}_poster.{ext}"
                time.sleep(DELAY_BETWEEN_DOWNLOADS)
                if download_file(real_url, dirs["posters"] / pf):
                    total_size += (dirs["posters"] / pf).stat().st_size
                    ok += 1
                else:
                    failed.append(f"{slug} poster")
                    pf = None
            else:
                print(f"  ⚠️  API nie znalazło pliku '{item['poster_wm']}'")
                needs_ffmpeg.append((slug, "poster"))
        else:
            needs_ffmpeg.append((slug, "poster"))

        # --- Backdrop ---
        if item.get("backdrop_wm"):
            print(f"  🔍 Resolving backdrop via API: {item['backdrop_wm']}")
            real_url = wikimedia_resolve(item["backdrop_wm"])
            if real_url:
                ext = real_url.rsplit(".", 1)[-1][:4]
                bf = f"{slug}_backdrop.{ext}"
                time.sleep(DELAY_BETWEEN_DOWNLOADS)
                if download_file(real_url, dirs["backdrops"] / bf):
                    total_size += (dirs["backdrops"] / bf).stat().st_size
                    ok += 1
                else:
                    failed.append(f"{slug} backdrop")
                    bf = None
            else:
                print(f"  ⚠️  API nie znalazło pliku '{item['backdrop_wm']}'")
                needs_ffmpeg.append((slug, "backdrop"))
        else:
            needs_ffmpeg.append((slug, "backdrop"))

        # --- Video ---
        vf = None
        if not args.skip_videos and item.get("video_url"):
            ext = item["video_url"].rsplit(".", 1)[-1][:4]
            vf = f"{slug}.{ext}"
            time.sleep(DELAY_BETWEEN_DOWNLOADS)
            if download_file(item["video_url"], dirs["videos"] / vf):
                total_size += (dirs["videos"] / vf).stat().st_size
                ok += 1
            else:
                failed.append(f"{slug} video")
                vf = None

        # --- Manifest ---
        entry = {
            "slug": slug, "title": item["title"],
            "description": item["description"],
            "year": item["year"],
            "duration_minutes": item.get("duration_minutes"),
            "director": item["director"], "cast": item["cast"],
            "genre": item["genre"], "age_rating": item["age_rating"],
            "quality_badge": item["quality_badge"],
            "maturity_warning": item["maturity_warning"],
            "license": item["license"],
            "cdn_paths": {
                "poster": f"/posters/{pf}" if pf else None,
                "backdrop": f"/backdrops/{bf}" if bf else None,
                "video": f"/videos/{vf}" if vf else None,
            },
        }
        if item["type"] == "video":
            entry["price_credits"] = max(50, item["duration_minutes"] * 15)
            results["videos"].append(entry)
        elif item["type"] == "series_episode":
            entry["series_slug"] = item["series_slug"]
            entry["episode"] = item["episode"]
            ss = item["series_slug"]
            se = next((s for s in results["series"] if s["slug"] == ss), None)
            if not se:
                meta = SERIES_META[ss]
                se = {"slug": ss, "name": meta["name"], "description": meta["description"],
                      "year": meta["year"], "director": meta["director"], "cast": meta["cast"],
                      "age_rating": meta["age_rating"], "quality_badge": meta["quality_badge"],
                      "price_credits": 250, "cdn_paths": {}, "episodes": []}
                results["series"].append(se)
            se["episodes"].append(entry)
        print()

    for b in BUNDLES:
        results["bundles"].append(b)

    manifest_path = base / "manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print("=" * 60)
    print(f"  📊 Podsumowanie:")
    print(f"     ✅ Udane: {ok}  |  ❌ Nieudane: {len(failed)}")
    print(f"     💾 Łączny rozmiar: {total_size / (1024*1024):.1f} MB")
    if failed:
        print(f"     ⚠️  Nieudane pobierania:")
        for f_item in failed:
            print(f"        - {f_item}")
    if needs_ffmpeg:
        print(f"     🎬 Do ekstrakcji z wideo (ffmpeg):")
        for slug, kind in needs_ffmpeg:
            print(f"        - {slug} {kind}")
        print(f"\n  Aby wyciągnąć brakujące grafiki z pobranych filmów, uruchom:")
        print(f"  python3 extract_frames.py --input-dir {base}/videos --output-dir {base}")
    print(f"     📄 Manifest: {manifest_path}")
    print("=" * 60)


if __name__ == "__main__":
    main()
