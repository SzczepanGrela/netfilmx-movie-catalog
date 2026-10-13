#!/usr/bin/env python3
"""Inventory retained local bytes and optionally read public media; never writes R2."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parent.parent


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def checksum(path):
    with path.open("rb") as file:
        return hashlib.file_digest(file, "sha256").hexdigest()


def probe(path):
    return json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-show_format", "-show_streams",
        "-of", "json", str(path)], timeout=30))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--local-assets", type=Path, required=True)
    parser.add_argument("--origin-manifest", type=Path, help="Private legacy manifest; reads only cdn_base")
    parser.add_argument("--download-originals", action="store_true")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    output = args.output.resolve()
    if not output.is_relative_to(ROOT / "artifacts"):
        parser.error("Use ignored artifacts for private evidence and retained copies")
    output.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(output, 0o700)
    manifest = json.loads((ROOT / "NetFilmx_Storage.PostgreSql/Catalogue/retained-media.json").read_text())
    origin = None
    if args.origin_manifest:
        origin = json.loads(args.origin_manifest.read_text())["cdn_base"].rstrip("/")
        parsed = urllib.parse.urlsplit(origin)
        if parsed.scheme != "https" or not parsed.hostname or parsed.path not in {"", "/"} or parsed.username or parsed.password or parsed.query or parsed.fragment:
            parser.error("Media origin must be HTTPS without credentials, path or query")
    elif args.download_originals:
        parser.error("Original download requires a reviewed public origin")
    opener = urllib.request.build_opener(NoRedirect())
    report = {"observed_at_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "private_origin": origin, "rights_accepted": False, "provider_writes": False,
        "download_budget_bytes": 2 * 1024**3, "maximum_seconds": 900, "entries": []}
    deadline, downloaded = time.monotonic() + 900, 0
    for entry in manifest["videos"]:
        record = {"slug": entry["slug"], "source_key": entry["sourceObjectKey"], "local": [], "remote": []}
        for folder in ["videos", "posters", "backdrops"]:
            for path in sorted((args.local_assets / folder).glob(entry["slug"] + "*")):
                if path.is_file():
                    item = {"relative_path": str(path.relative_to(args.local_assets)), "bytes": path.stat().st_size,
                        "sha256": checksum(path)}
                    if folder == "videos":
                        item["probe"] = probe(path)
                    record["local"].append(item)
        if origin:
            keys = {entry["sourceObjectKey"], entry["posterObjectKey"]}
            if entry.get("backdropObjectKey"):
                keys.add(entry["backdropObjectKey"])
            # Existing local conversions are separate candidate keys, not substituted originals.
            keys.update(item["relative_path"] for item in record["local"] if item["relative_path"].startswith("videos/"))
            for key in sorted(keys):
                if time.monotonic() > deadline:
                    parser.error("Media read wall budget exhausted")
                url = origin + "/" + key
                remote = {"key": key}
                try:
                    request = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "NetFilmx-media-review"})
                    with opener.open(request, timeout=15) as response:
                        remote.update(status=response.status, bytes=response.headers.get("Content-Length"),
                            content_type=response.headers.get("Content-Type"), etag=response.headers.get("ETag"),
                            accept_ranges=response.headers.get("Accept-Ranges"))
                    request = urllib.request.Request(url, headers={"Range": "bytes=0-4095", "User-Agent": "NetFilmx-media-review"})
                    with opener.open(request, timeout=15) as response:
                        prefix = response.read(4097)
                        remote.update(range_status=response.status, content_range=response.headers.get("Content-Range"),
                            prefix_bytes=len(prefix), range_bounded=len(prefix) <= 4096)
                    if args.download_originals and key == entry["sourceObjectKey"]:
                        declared = int(remote.get("bytes") or 0)
                        if declared <= 0 or declared > 1536*1024**2 or downloaded + declared > report["download_budget_bytes"]:
                            raise ValueError("Object outside declared download budget")
                        destination = output / (entry["slug"] + Path(key).suffix)
                        if destination.exists():
                            if destination.stat().st_size != declared:
                                raise ValueError("Existing retained copy differs in length")
                        else:
                            partial = destination.with_suffix(destination.suffix + ".part")
                            count = 0
                            descriptor = os.open(partial, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
                            try:
                                with os.fdopen(descriptor, "wb") as file, opener.open(url, timeout=15) as response:
                                    if response.status != 200:
                                        raise ValueError("Unexpected original download response")
                                    while chunk := response.read(1024*1024):
                                        count += len(chunk)
                                        if count > declared or downloaded + count > report["download_budget_bytes"] or time.monotonic() > deadline:
                                            raise ValueError("Download byte/wall bound reached")
                                        file.write(chunk)
                                    file.flush(); os.fsync(file.fileno())
                                if count != declared:
                                    raise ValueError("Original download incomplete")
                                partial.rename(destination)
                            except Exception:
                                partial.unlink(missing_ok=True)
                                raise
                        downloaded += declared
                        remote["download"] = {"file": destination.name, "bytes": declared, "sha256": checksum(destination), "probe": probe(destination)}
                except urllib.error.HTTPError as error:
                    remote["status"] = error.code
                    error.close()
                except Exception as error:
                    remote["unresolved"] = type(error).__name__
                record["remote"].append(remote)
        report["entries"].append(record)
        print(entry["slug"] + ": local inventory/read-only probes recorded", flush=True)
    report["downloaded_bytes"] = downloaded
    destination = output / "media-evidence.json"
    destination.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    destination.chmod(0o600)
    print("Private media evidence: " + str(destination.relative_to(ROOT)), flush=True)


if __name__ == "__main__":
    main()
