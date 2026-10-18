#!/usr/bin/env python3
"""Launch a browser with private hosts/NSS mounts; never relax TLS or CORS."""
import json
import os
from pathlib import Path
import subprocess
import sys

config = json.loads(Path(sys.argv[1]).read_text())
engine, args = sys.argv[2], sys.argv[3:]
for variable, suffix in [("XDG_CONFIG_HOME", "config"), ("XDG_CACHE_HOME", "cache"), ("XDG_DATA_HOME", "data")]:
    directory = Path(config["output"]) / (engine + "-" + suffix)
    directory.mkdir(mode=0o700, exist_ok=True)
    os.environ[variable] = str(directory)
# Chromium versions may use either NSS location. Both are private to this run.
pki = Path(os.environ["XDG_DATA_HOME"]) / "pki"
pki.mkdir(mode=0o700, exist_ok=True)
if not (pki / "nssdb").exists():
    (pki / "nssdb").symlink_to(config["nss"], target_is_directory=True)
if engine == "firefox":
    profile = args[args.index("-profile") + 1]
    subprocess.run(["certutil", "-N", "--empty-password", "-d", "sql:" + profile], check=True)
    subprocess.run(["certutil", "-A", "-d", "sql:" + profile, "-n", "NetFilmx local qualification CA",
                    "-t", "C,,", "-i", config["ca"]], check=True)
command = ["bwrap", "--ro-bind", "/", "/", "--bind", "/tmp", "/tmp",
           "--bind", config["output"], config["output"],
           "--ro-bind", config["hosts"], "/etc/hosts",
           "--ro-bind", config["nsswitch"], "/etc/nsswitch.conf",
           "--bind", config["nss"], str(Path.home() / ".pki/nssdb"),
           "--dev-bind", "/dev", "/dev", "--proc", "/proc",
           "--", config[engine], *args]
os.execvp(command[0], command)
