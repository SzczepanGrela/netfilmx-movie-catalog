#!/usr/bin/env python3
import os
import sys
import argparse
import subprocess
from pathlib import Path
import json

def run_ffmpeg(video_path: Path, output_path: Path, timestamp: str, crop_filter: str = ""):
    """Extract a frame using ffmpeg."""
    vf_arg = []
    if crop_filter:
        vf_arg = ["-vf", crop_filter]

    cmd = [
        "ffmpeg", "-y",
        "-ss", timestamp,
        "-i", str(video_path),
        "-vframes", "1",
        "-q:v", "2"
    ] + vf_arg + [str(output_path)]
    
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True
    except subprocess.CalledProcessError:
        return False
    except FileNotFoundError:
        print("BŁĄD: ffmpeg nie jest zainstalowany!")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-dir", required=True)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()

    videos_dir = Path(args.input_dir)
    posters_dir = Path(args.output_dir) / "posters"
    backdrops_dir = Path(args.output_dir) / "backdrops"
    manifest_path = Path(args.output_dir) / "manifest.json"

    if not videos_dir.exists():
        print(f"Katalog z wideo nie istnieje: {videos_dir}")
        sys.exit(1)

    print("=" * 60)
    print("  NetFilmx — FFMPEG Frame Extractor")
    print("=" * 60, "\n")

    # Load manifest to update it
    manifest = {}
    if manifest_path.exists():
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)

    # All media items
    all_items = manifest.get("videos", [])
    for series in manifest.get("series", []):
        all_items.extend(series.get("episodes", []))

    for video_file in videos_dir.iterdir():
        if not video_file.is_file() or video_file.suffix not in ['.mp4', '.webm', '.mkv', '.ogv']:
            continue
            
        slug = video_file.stem
        print(f"🎬 Analiza wideo: {slug}")
        
        # Znajdź w manifeście
        item = next((i for i in all_items if i["slug"] == slug), None)
        if not item:
            print(f"  ⚠  Nie znaleziono w manifeście, pomijam.")
            continue
            
        cdn_paths = item.get("cdn_paths", {})
        
        # --- Ekstrakcja Tła (16:9) ---
        has_backdrop = False
        for ext in ['.jpg', '.png']:
            if (backdrops_dir / f"{slug}_backdrop{ext}").exists():
                has_backdrop = True
                break
                
        if not has_backdrop:
            print(f"  🖼  Ekstrakcja tła...")
            out_path = backdrops_dir / f"{slug}_backdrop.jpg"
            if run_ffmpeg(video_file, out_path, "00:00:30"):
                print("    ✅ Tło wygenerowane.")
                cdn_paths["backdrop"] = f"/backdrops/{slug}_backdrop.jpg"
            else:
                print("    ❌ Błąd ekstrakcji tła.")
        else:
            print(f"  ⏭  Tło już istnieje.")

        # --- Ekstrakcja Plakatu (2:3 crop) ---
        has_poster = False
        for ext in ['.jpg', '.png']:
            if (posters_dir / f"{slug}_poster{ext}").exists():
                has_poster = True
                break
                
        if not has_poster:
            print(f"  🖼  Ekstrakcja plakatu (crop 2:3)...")
            out_path = posters_dir / f"{slug}_poster.jpg"
            # Crop do proporcji 2:3, wyśrodkowane. Zakładając input 16:9 (np. 1920x1080), crop to ih*2/3 x ih
            # h = ih, w = ih * (2/3) -> "crop=in_h*2/3:in_h"
            if run_ffmpeg(video_file, out_path, "00:00:45", crop_filter="crop=in_h*2/3:in_h"):
                print("    ✅ Plakat wygenerowany.")
                cdn_paths["poster"] = f"/posters/{slug}_poster.jpg"
            else:
                print("    ❌ Błąd ekstrakcji plakatu.")
        else:
            print(f"  ⏭  Plakat już istnieje.")
            
        print()

    # Zapisz zaktualizowany manifest
    if manifest:
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, ensure_ascii=False, indent=2)
        print("📄 Zaktualizowano manifest.json")

    print("=" * 60)
    print("  Gotowe!")
    print("=" * 60)

if __name__ == "__main__":
    main()
