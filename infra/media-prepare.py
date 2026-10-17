#!/usr/bin/env python3
"""Prepare two private offline playback proposals; no provider access or activation."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import time
import uuid

ROOT = Path(__file__).resolve().parent.parent
MIB = 1024**2


def run(*args):
    return subprocess.check_output(args, timeout=30).decode().strip()


def digest(path):
    with path.open("rb") as file:
        return hashlib.file_digest(file, "sha256").hexdigest()


def probe(path):
    return json.loads(run("ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", str(path)))


def headroom(output):
    info = dict(line.split(":", 1) for line in Path("/proc/meminfo").read_text().splitlines())
    if int(info["MemAvailable"].split()[0])*1024 < 4096*MIB or shutil.disk_usage(output).free < 4096*MIB:
        raise RuntimeError("Local media headroom guard reached")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("image", help="Previously qualified local image with FFmpeg")
    parser.add_argument("--originals", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    endpoint = os.environ.get("DOCKER_HOST") or run("docker", "context", "inspect", "--format",
        '{{(index .Endpoints "docker").Host}}')
    if not endpoint.startswith("unix://"):
        parser.error("Only local Docker is permitted")
    originals, output = args.originals.resolve(), args.output.resolve()
    if not originals.is_relative_to(ROOT/"artifacts") or not output.is_relative_to(ROOT/"artifacts"):
        parser.error("Use private ignored artifacts for both retained copies and proposals")
    output.mkdir(mode=0o700, parents=True)  # Never reuse/overwrite a previous proposal.
    os.chmod(output, 0o700)
    headroom(output)
    image = json.loads(run("docker", "image", "inspect", "--format",
        '{"id":{{json .Id}},"revision":{{json (index .Config.Labels "org.opencontainers.image.revision")}}}', args.image))
    version = run("docker", "run", "--rm", "--network", "none", "--cpus", "1", "--memory", "512m",
        "--memory-swap", "512m", "--entrypoint", "ffmpeg", args.image, "-version").splitlines()[0]
    report = {"observed_at_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "image": image,
        "ffmpeg": version, "rights_accepted": False, "provider_writes": False, "entries": []}
    for slug, suffix, video, seconds in [("sintel", ".mkv", ["-c:v", "copy"], 180),
        ("caminandes-llama-drama", ".ogv", ["-c:v", "libx264", "-preset", "fast", "-crf", "20",
            "-pix_fmt", "yuv420p", "-threads:v", "1"], 600)]:
        source = originals/(slug+suffix)
        source_probe = probe(source)
        path = output/(slug+".mp4")
        options = ["-hide_banner", "-loglevel", "error", "-nostdin", "-n", "-threads", "1",
            "-i", "/input/"+source.name, "-map", "0:v:0", "-map", "0:a:0", *video,
            "-c:a", "aac", "-b:a", "192k", "-ac", "2", "-threads:a", "1", "-movflags", "+faststart",
            "-map_metadata", "0", "/output/"+path.name]
        scope = "netfilmx-media-"+uuid.uuid4().hex[:12]
        cid = run("docker", "run", "--detach", "--name", scope, "--label", "netfilmx.qualification="+scope,
            "--network", "none", "--read-only", "--cap-drop", "ALL", "--security-opt", "no-new-privileges",
            "--cpus", "1", "--memory", "512m", "--memory-swap", "512m", "--pids-limit", "128",
            "--user", f"{os.getuid()}:{os.getgid()}", "--workdir", "/output", "--no-healthcheck",
            "--mount", f"type=bind,source={originals},target=/input,readonly",
            "--mount", f"type=bind,source={output},target=/output", "--entrypoint", "ffmpeg", args.image, *options)
        started, peak = time.monotonic(), 0
        try:
            while True:
                state = json.loads(run("docker", "inspect", "--format",
                    '{"running":{{.State.Running}},"oom":{{.State.OOMKilled}},"exit":{{.State.ExitCode}}}', cid))
                if not state["running"]:
                    if state["oom"] or state["exit"] != 0:
                        raise RuntimeError("Offline conversion failed within fixed limits")
                    break
                headroom(output)
                if time.monotonic()-started > seconds or (path.exists() and path.stat().st_size > 1536*MIB):
                    raise RuntimeError("Offline media wall/byte guard reached")
                sample = run("docker", "exec", cid, "sh", "-c",
                    "cat /sys/fs/cgroup/memory.peak /sys/fs/cgroup/memory.max /sys/fs/cgroup/memory.swap.max /sys/fs/cgroup/cpu.max").splitlines()
                if list(map(int, sample[1:3])) != [512*MIB, 0] or sample[3] != "100000 100000":
                    raise RuntimeError("Offline effective cgroup limits differ")
                peak = max(peak, int(sample[0]))
                time.sleep(1)
        finally:
            owned = run("docker", "inspect", "--format", '{{index .Config.Labels "netfilmx.qualification"}}', cid)
            if owned != scope:
                raise RuntimeError("Offline cleanup ownership changed")
            subprocess.run(["docker", "rm", "--force", cid], capture_output=True, check=True, timeout=30)
        path.chmod(0o600)
        target_probe = probe(path)
        if abs(float(source_probe["format"]["duration"])-float(target_probe["format"]["duration"])) > 0.1:
            raise RuntimeError("Derivative duration differs")
        sha = digest(path)
        report["entries"].append({"slug": slug, "file": path.name, "bytes": path.stat().st_size,
            "sha256": sha, "source_sha256": digest(source), "source_probe": source_probe, "probe": target_probe,
            "proposed_key": f"videos/derivatives/{slug}/{sha}.mp4", "options": options,
            "cpu": 1, "ram_bytes": 512*MIB, "swap_bytes": 0, "wall_limit_seconds": seconds,
            "sampled_peak_memory_bytes": peak, "elapsed_seconds": round(time.monotonic()-started, 3),
            "selected_tracks": "first video and first audio; stereo AAC; complete duration, no trim",
            "omitted_tracks": [s.get("tags", {}).get("language", s["codec_type"]) for s in source_probe["streams"]
                if s["codec_type"] not in {"video", "audio"}]})
        print(slug+": private offline proposal complete", flush=True)
    manifest = json.loads((ROOT/"NetFilmx_Storage.PostgreSql/Catalogue/retained-media.json").read_text())
    for entry in report["entries"]:
        next(v for v in manifest["videos"] if v["slug"] == entry["slug"])["playbackObjectKey"] = entry["proposed_key"]
    for name, data in [("derivative-evidence.json", report), ("proposed-retained-media.json", manifest)]:
        path = output/name
        path.write_text(json.dumps(data, indent=2)+"\n"); path.chmod(0o600)
    print("Proposal remains private; embedded fail-closed manifest unchanged", flush=True)


if __name__ == "__main__":
    main()
