#!/usr/bin/env python3
"""Launch a browser with private hosts/NSS mounts; never relax TLS or CORS."""
import json
import os
from pathlib import Path
import subprocess
import sys

config = json.loads(Path(sys.argv[1]).read_text())
engine, args = sys.argv[2], sys.argv[3:]
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
