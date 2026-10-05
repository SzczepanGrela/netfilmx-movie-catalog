#!/usr/bin/env python3
import os
import subprocess
import json
from pathlib import Path

videos_dir = Path("r2_assets/videos")
manifest_path = Path("r2_assets/manifest.json")

print("============================================================")
print("  NetFilmx — Web Streaming Optimizer (Faststart & MP4)")
print("============================================================")

def run_cmd(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

for f in videos_dir.iterdir():
    if not f.is_file() or f.stat().st_size == 0: continue
    
    if f.suffix == '.mkv':
        out = f.with_suffix(".mp4")
        print(f"🎬 Remuxowanie (szybkie) {f.name} do {out.name}...")
        # Kopiujemy wideo (H.264), transkodujemy audio do AAC, dodajemy faststart
        run_cmd(["ffmpeg", "-y", "-i", str(f), "-c:v", "copy", "-c:a", "aac", "-movflags", "+faststart", str(out)])
        f.unlink()
    
    elif f.suffix == '.ogv':
        out = f.with_suffix(".mp4")
        print(f"🎬 Transkodowanie {f.name} do {out.name}...")
        # Pełny transcode do H.264/AAC z faststart
        run_cmd(["ffmpeg", "-y", "-i", str(f), "-c:v", "libx264", "-c:a", "aac", "-preset", "fast", "-crf", "23", "-movflags", "+faststart", str(out)])
        f.unlink()

    elif f.suffix == '.mp4':
        print(f"⚡ Dodawanie flagi faststart do {f.name}...")
        tmp = f.with_suffix(".tmp.mp4")
        run_cmd(["ffmpeg", "-y", "-i", str(f), "-c", "copy", "-movflags", "+faststart", str(tmp)])
        tmp.replace(f)
        
    elif f.suffix == '.webm':
        # WebM jest optymalizowane pod web z natury
        print(f"⏭  Format WebM ({f.name}) pominięto (jest natywnie gotowy na web).")

# Update manifest
print("\n📝 Aktualizacja manifestu...")
with open(manifest_path, "r", encoding="utf-8") as file:
    manifest = json.load(file)

def update_paths(items):
    for item in items:
        if "cdn_paths" in item and "video" in item["cdn_paths"]:
            v_path = item["cdn_paths"]["video"]
            if v_path and (v_path.endswith(".mkv") or v_path.endswith(".ogv")):
                item["cdn_paths"]["video"] = v_path.rsplit('.', 1)[0] + ".mp4"

update_paths(manifest.get("videos", []))
for s in manifest.get("series", []):
    update_paths(s.get("episodes", []))

with open(manifest_path, "w", encoding="utf-8") as file:
    json.dump(manifest, file, indent=2, ensure_ascii=False)

print("✅ Wszystkie wideo zostały zoptymalizowane pod streaming internetowy (HTML5)!")
