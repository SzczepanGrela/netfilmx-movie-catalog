#!/usr/bin/env python3
"""Qualify the committed image, real PostgreSQL manifest and public HLS locally."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import shlex
import subprocess
import threading
import time

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("recovery", ROOT / "infra/catalogue-recovery.py")
recovery = importlib.util.module_from_spec(spec)
spec.loader.exec_module(recovery)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("image"); p.add_argument("revision"); p.add_argument("packet", type=Path)
    p.add_argument("output", type=Path); p.add_argument("playwright", type=Path)
    p.add_argument("--app-origin", required=True); p.add_argument("--media-origin", required=True)
    p.add_argument("--record-sha256", required=True)
    args = p.parse_args()
    from urllib.parse import urlsplit
    app = urlsplit(args.app_origin); media = urlsplit(args.media_origin)
    if not re.fullmatch(r"[a-f0-9]{40}", args.revision) or any(
        u.scheme != "https" or not u.hostname or u.netloc != u.hostname or u.path or u.query or u.fragment
        for u in [app, media]) or app.hostname == media.hostname:
        p.error("Full revision and distinct HTTPS origins without ports/paths required")
    if subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip() != args.revision:
        p.error("Checkout must be at the image source revision")
    if subprocess.check_output(["git", "status", "--porcelain"], cwd=ROOT):
        p.error("Commit qualification inputs first")
    endpoint = subprocess.check_output(["docker", "context", "inspect", "--format", "{{.Endpoints.docker.Host}}"], text=True).strip()
    if not endpoint.startswith("unix://"):
        p.error("Local Docker socket required")
    from publish_hls import preflight
    preflight(args.packet.resolve(), args.record_sha256)
    packet = json.loads((args.packet / "publication-record.json").read_text())
    manifest = ROOT / "NetFilmx_Storage.PostgreSql/Catalogue/retained-media.json"
    if hashlib.sha256(manifest.read_bytes()).hexdigest() != packet["proposedManifestSha256"]:
        p.error("Shipping manifest must be byte-identical to the approved proposal")
    out = args.output.resolve()
    if not out.is_relative_to(ROOT / "artifacts"):
        p.error("New private artifacts output required")
    out.mkdir(mode=0o700)
    h = recovery.Harness(args.image, args.revision, out)
    h.deadline = time.monotonic() + 1800
    h.result["limits"]["maximum_seconds"] = 1800
    h.result.update(fixture="real embedded approved catalogue, published HLS", appOrigin=args.app_origin,
                    mediaOrigin=args.media_origin, approvedRecordSha256=args.record_sha256)
    monitor = threading.Thread(target=h.monitor, daemon=True)
    try:
        info = json.loads(h.docker("image", "inspect", "--format",
            '{"id":{{json .Id}},"revision":{{json (index .Config.Labels "org.opencontainers.image.revision")}}}', h.image).stdout)
        if info["revision"] != args.revision: raise recovery.Failure("Image revision mismatch")
        h.result["image"] = info
        h.command("docker", "build", "--file", "qualification/CatalogueRecovery/Dockerfile",
                  "--build-arg", "CANDIDATE_IMAGE=" + h.image, "--tag", h.tools, ".", timeout=300)
        for name in ["NetFilmx_Storage.dll", "NetFilmx_Storage.PostgreSql.dll"]:
            a = h.docker("run", "--rm", "--network", "none", "--entrypoint", "sha256sum", h.image, "/app/"+name).stdout.split()[0]
            b = h.docker("run", "--rm", "--network", "none", "--entrypoint", "sha256sum", h.tools, "/qualification/"+name).stdout.split()[0]
            if a != b: raise recovery.Failure("Helper rebuilt candidate storage library")
        h.docker("network", "create", "--internal", "--label", "netfilmx.qualification="+h.scope, h.network)
        monitor.start()
        pg, pg_cid = h.pg("pg-real")
        admin = h.env("admin", {"ConnectionStrings__DefaultConnection": h.connection(pg, admin=True)})
        h.cli(h.image, admin, "database", "migrate", "--confirm-reviewed-migrations")
        h.grants(pg, create_role=True)
        runtime = h.env("runtime", {"ConnectionStrings__DefaultConnection": h.connection(pg), "CloudflareR2__PublicUrl": args.media_origin})
        h.result["embeddedPlan"] = json.loads(h.cli(h.image, runtime, "catalogue", "plan").stdout)
        if h.result["embeddedPlan"]["pendingPlayback"] or h.result["embeddedPlan"]["pendingSubtitles"]:
            raise recovery.Failure("Incomplete embedded manifest")
        h.cli(h.image, runtime, "catalogue", "import", "--confirm-empty-database", "--confirm-reviewed-media")
        before = json.loads(h.cli(h.tools, runtime, "verify-retained").stdout)
        h.result["initialCatalogue"] = before
        repeat = h.cli(h.image, runtime, "catalogue", "import", "--confirm-empty-database", "--confirm-reviewed-media", check=False)
        if repeat.returncode != 1 or b"Database is not empty" not in repeat.stderr:
            raise recovery.Failure("Repeated import was not refused")
        if json.loads(h.cli(h.tools, runtime, "verify-retained").stdout) != before:
            raise recovery.Failure("Repeat import changed catalogue")
        h.result["repeatRefusedWithoutChanges"] = True
        h.result["emptyHistory"] = json.loads(h.cli(h.tools, runtime, "counts").stdout)
        if h.result["emptyHistory"] != dict(videos=7, series=1, episode_links=3, users=0, sessions=0, comments=0, likes=0, purchases=0, upload_intents=0):
            raise recovery.Failure("Fresh import introduced accounts/history/upload intents")
        h.phase("Real CLI migration/import: 7 films, 1 series, 3 links, 10 mapped subtitles; repeat refused")

        tls = out / "tls"; tls.mkdir(mode=0o700)
        h.command("openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1", "-subj", "/CN=NetFilmx local qualification CA",
                  "-addext", "basicConstraints=critical,CA:TRUE", "-keyout", str(tls/"ca.key"), "-out", str(tls/"ca.pem"))
        h.command("openssl", "req", "-newkey", "rsa:2048", "-nodes", "-subj", "/CN="+app.hostname,
                  "-keyout", str(tls/"server.key"), "-out", str(tls/"server.csr"))
        (tls/"extensions").write_text("subjectAltName=DNS:"+app.hostname+"\nbasicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n")
        h.command("openssl", "x509", "-req", "-in", str(tls/"server.csr"), "-CA", str(tls/"ca.pem"), "-CAkey", str(tls/"ca.key"),
                  "-CAcreateserial", "-days", "1", "-extfile", str(tls/"extensions"), "-out", str(tls/"server.pem"))
        h.command("openssl", "pkcs12", "-export", "-in", str(tls/"server.pem"), "-inkey", str(tls/"server.key"),
                  "-out", str(tls/"server.pfx"), "-passout", "pass:qualification")
        for f in tls.iterdir(): f.chmod(0o600)
        (out/"qualification-ca.pem").write_bytes((tls/"ca.pem").read_bytes())
        certs = h.private_volume("tls")
        h.docker("run", "--rm", "--network", "none", "--user", "0:0", "--entrypoint", "sh",
                 "--mount", f"type=volume,source={certs},target=/tls", "--mount", f"type=bind,source={tls},target=/input,readonly", h.image,
                 "-c", "cp /input/server.pfx /tls/server.pfx && chown 10001:10001 /tls/server.pfx && chmod 0600 /tls/server.pfx")
        h.docker("network", "create", "--label", "netfilmx.qualification="+h.scope, h.ingress_network)
        gateway, gateway_cid = h.start("gateway", ["--cpus", "0.5", "--memory", "256m", "--memory-swap", "256m", "--cap-drop", "ALL", "--init",
            "--no-healthcheck", "--publish", "127.0.0.1:443:8443", "--mount", f"type=volume,source={certs},target=/tls,readonly",
            "--env", "Qualification__SingleInstance=true", "--env", "Qualification__GatewayHost="+app.hostname, h.tools, "gateway"], network=h.ingress_network)
        h.docker("network", "connect", h.network, gateway_cid)
        bindings = json.loads(h.docker("inspect", "--format", '{{json (index .NetworkSettings.Ports "8443/tcp")}}', gateway_cid).stdout)
        if bindings != [{"HostIp": "127.0.0.1", "HostPort": "443"}]:
            raise recovery.Failure("Gateway is not exclusively bound to loopback:443")
        gateway_ip = h.docker("inspect", "--format", '{{with index .NetworkSettings.Networks "'+h.network+'"}}{{.IPAddress}}{{end}}', gateway_cid).stdout.decode().strip()
        keys = h.private_volume("keys")
        web_env = h.env("web", {"ConnectionStrings__DefaultConnection": h.connection(pg), "CloudflareR2__PublicUrl": args.media_origin,
            "DataProtection__KeyRingPath": "/var/lib/netfilmx/keyring", "JwtSettings__SecretKey": "SyntheticFinalCatalogueJwtKeyAtLeast32Bytes",
            "JwtSettings__Issuer": "qualification", "JwtSettings__Audience": "qualification", "Uploads__Enabled": "false", "Worker__Enabled": "false",
            "Database__SeedDemoData": "false", "AllowedHosts": app.hostname+";localhost;127.0.0.1", "Proxy__KnownProxies__0": gateway_ip, "Proxy__ForwardLimit": "1"})
        web, web_cid = h.start("web-a", ["--network-alias", "web-a", "--cpus", "1", "--memory", "512m", "--memory-swap", "512m",
            "--pids-limit", "128", "--cap-drop", "ALL", "--init", "--mount", f"type=volume,source={keys},target=/var/lib/netfilmx/keyring", "--env-file", web_env, h.image])
        def ready():
            for _ in range(50):
                if h.docker("inspect", "--format", "{{.State.Health.Status}}", web_cid).stdout.strip() == b"healthy": return
                time.sleep(1)
            raise recovery.Failure("Web readiness failed")
        ready()
        h.docker("restart", "--time", "25", web_cid)
        h.docker("restart", "--time", "25", pg_cid)
        ready()
        h.docker("exec", web_cid, "dotnet", "NetFilmx_Web.dll", "healthcheck")
        h.docker("exec", web_cid, "dotnet", "NetFilmx_Web.dll", "smokecheck")
        after = json.loads(h.cli(h.tools, runtime, "verify-retained").stdout)
        if after != before: raise recovery.Failure("Restart changed catalogue/IDs/links")
        h.result["afterRestartCatalogue"] = after
        h.result["readinessAfterWebAndPostgresRestart"] = True
        h.phase("Web/PostgreSQL restart preserves real catalogue and subtitle IDs/mappings")

        nss = out / "nss"; nss.mkdir(mode=0o700)
        h.command("certutil", "-N", "--empty-password", "-d", "sql:"+str(nss))
        h.command("certutil", "-A", "-d", "sql:"+str(nss), "-n", "NetFilmx local qualification CA", "-t", "C,,", "-i", str(tls/"ca.pem"))
        (out/"hosts").write_text(Path("/etc/hosts").read_text()+"\n127.0.0.1 "+app.hostname+"\n")
        (out/"nsswitch").write_text(re.sub(r"^hosts:.*$", "hosts: files dns", Path("/etc/nsswitch.conf").read_text(), flags=re.M))
        executable = json.loads(h.command("node", "-e", "const p=require(process.argv[1]);console.log(JSON.stringify({chromium:p.chromium.executablePath(),firefox:process.argv[2]}))",
            str(args.playwright.resolve()), str(ROOT/"artifacts/tools/playwright/firefox-1538/firefox/firefox")).stdout)
        config = {**executable, "output": str(out), "hosts": str(out/"hosts"), "nsswitch": str(out/"nsswitch"), "nss": str(nss), "ca": str(tls/"ca.pem"),
            "origin": args.app_origin, "mediaOrigin": args.media_origin, "image": info, "catalogue": before}
        config_path = out/"browser-config.json"; config_path.write_text(json.dumps(config, indent=2))
        h.result["localOriginSetup"] = dict(bindings=bindings, appHostname=app.hostname, mediaDns="unchanged public DNS",
            hostsFile=str(out/"hosts"), caPemSha256=hashlib.sha256((tls/"ca.pem").read_bytes()).hexdigest(),
            privateMountNamespace=True, privateNssTrust=True, ignoreHttpErrors=False, browserRequestInterception=False,
            forgedMediaHeaders=False, remoteProviderChanges=False)
        for engine in ["chromium", "firefox"]:
            wrapper = out/(engine+"-wrapper")
            wrapper.write_text("#!/bin/sh\nexec python3 "+shlex.quote(str(ROOT/"qualification/browser_namespace.py"))+" "+shlex.quote(str(config_path))+" "+engine+' "$@"\n')
            wrapper.chmod(0o700)
        h.command("node", "qualification/hls_browser.cjs", str((args.packet/"publication-record.json").resolve()), str(out/"browser"), str(args.playwright.resolve()), "remote", str(config_path), timeout=1200)
        h.result["browser"] = json.loads((out/"browser/browser-evidence.json").read_text())
        h.result["status"] = "passed"
    except Exception as error:
        h.result.update(status="failed", error=str(error))
        for cid in h.containers:
            log = h.docker("logs", "--tail", "100", cid, check=False)
            (out/(cid[:12]+".log")).write_bytes(log.stdout+log.stderr)
        raise
    finally:
        h.stop.set()
        if monitor.is_alive(): monitor.join(timeout=15)
        h.result["metrics"] = list(h.metrics.values())
        h.cleanup()
        (out/"result.json").write_text(json.dumps(h.result, indent=2)+"\n")


if __name__ == "__main__":
    main()
