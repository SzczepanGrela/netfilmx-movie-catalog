#!/usr/bin/env python3
"""Bounded local Docker catalogue recovery. No production or provider access."""
from __future__ import annotations

import argparse
import copy
import html
import http.cookiejar
import json
import os
from pathlib import Path
import re
import shutil
import ssl
import subprocess
import threading
import time
import traceback
import urllib.error
import urllib.parse
import urllib.request
import uuid

MIB = 1024 * 1024
ROOT = Path(__file__).resolve().parent.parent
PG_CONFIG = json.loads((ROOT / "infra/postgresql.json").read_text())
PG_IMAGE = PG_CONFIG["image"]
PG_DATA = PG_CONFIG["pgdata"]
PG_VOLUME = PG_CONFIG["volumeTarget"]


class Failure(RuntimeError):
    pass


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class Browser:
    def __init__(self, url, ca):
        self.url = url
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(NoRedirect(),
            urllib.request.HTTPSHandler(context=ssl.create_default_context(cafile=ca)),
            urllib.request.HTTPCookieProcessor(self.jar))

    def request(self, instance, path, *, form=None, csrf=None, status=200):
        headers = {"X-Qualification-Instance": instance, "Cache-Control": "no-cache"}
        if csrf:
            headers["X-CSRF-TOKEN"] = csrf
        data = urllib.parse.urlencode(form).encode() if form is not None else None
        if data is not None:
            headers["Content-Type"] = "application/x-www-form-urlencoded"
        request = urllib.request.Request(self.url + path, data=data, headers=headers)
        try:
            response = self.opener.open(request, timeout=10)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            if response.status != status:
                raise Failure(f"HTTP {path}: expected {status}, received {response.status}")
            body = response.read(512 * 1024 + 1)
            if len(body) > 512 * 1024:
                raise Failure("HTTP reply exceeds fixture bound")
            return body

    def token(self, instance, path):
        body = self.request(instance, path).decode()
        tag = re.search(r'<input[^>]*name="__RequestVerificationToken"[^>]*>', body)
        value = re.search(r'value="([^"]+)"', tag.group() if tag else "")
        if not value:
            raise Failure("MVC form token missing")
        return html.unescape(value.group(1))

    def csrf(self, instance):
        return json.loads(self.request(instance, "/auth/csrf"))["token"]


class Harness:
    def __init__(self, image, revision, output, *, database_only=False, media_origin="https://media.example.test"):
        self.image, self.revision = image, revision
        self.database_only, self.media_origin = database_only, media_origin
        self.pg_volumes = {}
        self.pg_instances = []
        self.scope = "netfilmx-catalogue-" + uuid.uuid4().hex[:12]
        self.network = self.scope + "-network"
        self.ingress_network = self.scope + "-loopback"
        self.tools = "netfilmx:catalogue-tools-" + revision[:12]
        self.output = output
        self.containers, self.volumes = [], []
        self.active, self.metrics = {}, {}
        self.previous = {}
        self.lock, self.stop = threading.Lock(), threading.Event()
        self.guard_error = None
        self.deadline = time.monotonic() + 480
        self.result = {"revision": revision, "fixture": "synthetic completed retained metadata; no real media",
            "scope": self.scope, "cases": [], "status": "running", "limits": {
                "web_cpu_each": 1, "web_ram_and_swap_bytes_each": 512 * MIB,
                "pg_cpu_each": 1, "pg_ram_and_swap_bytes_each": 512 * MIB,
                "pg_disk_guard_bytes_each": 512 * MIB, "hard_pg_filesystem_quota": False,
                "gateway_cpu": 0.5, "gateway_ram_and_swap_bytes": 256 * MIB,
                "transient_tool_cpu": 1, "transient_tool_ram_and_swap_bytes": 512 * MIB,
                "maximum_container_cpu_sum": 5.5, "maximum_container_ram_sum_bytes": 2816 * MIB,
                "minimum_host_available_memory_bytes": 4096 * MIB,
                "minimum_host_free_disk_bytes": 4096 * MIB, "maximum_seconds": 480}}

        if database_only:
            self.result["fixture"] = "NP18-1 real embedded catalogue; synthetic account; no media requests"
        self.result["postgres_selection"] = PG_CONFIG
        self.result["postgres_instances"] = self.pg_instances

    def check(self):
        if self.guard_error:
            raise Failure(self.guard_error)
        if time.monotonic() > self.deadline:
            raise Failure("Fixture wall deadline reached")

    def command(self, *args, data=None, check=True, stdout=None, timeout=60):
        self.check()
        result = subprocess.run(args, input=data, stdout=stdout or subprocess.PIPE,
            stderr=subprocess.PIPE, cwd=ROOT, timeout=min(timeout, max(1, self.deadline-time.monotonic())))
        self.check()
        if check and result.returncode:
            raise Failure(f"Fixture operation failed: {args[0]} (exit {result.returncode})")
        return result

    def docker(self, *args, **kwargs):
        return self.command("docker", *args, **kwargs)

    def phase(self, name):
        self.result["cases"].append(name)
        print(name, flush=True)

    def env(self, name, values):
        path = self.output / (name + ".env")
        descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, "w") as file:
            file.write("".join(f"{key}={value}\n" for key,value in values.items()))
        return str(path)

    def volume(self, suffix):
        name = self.scope + "-" + suffix
        self.docker("volume", "create", "--label", "netfilmx.qualification=" + self.scope, name)
        self.volumes.append(name)
        return name

    def private_volume(self, suffix):
        name = self.volume(suffix)
        self.docker("run", "--rm", "--network", "none", "--user", "0:0", "--entrypoint", "sh",
            "--mount", f"type=volume,source={name},target=/keys", self.image,
            "-c", "chown 10001:10001 /keys && chmod 0700 /keys")
        return name

    def start(self, suffix, args, *, database=False, network=None):
        name = self.scope + "-" + suffix
        cid = self.docker("run", "--detach", "--name", name, "--network", network or self.network,
            "--label", "netfilmx.qualification=" + self.scope, *args).stdout.decode().strip()
        self.containers.append(cid)
        with self.lock:
            self.active[cid] = {"name": suffix, "database": database}
            self.metrics[cid] = {"name": suffix, "peak_memory_bytes": 0, "peak_pids": 0,
                "cpu_usage_usec": 0, "maximum_sample_cpu_percent": 0, "peak_pg_disk_bytes": 0}
        return name, cid

    def retire(self, cid):
        self.sample(cid)
        with self.lock:
            self.active.pop(cid, None)
        self.docker("stop", "--time", "25", cid)
        state = json.loads(self.docker("inspect", "--format",
            '{"running":{{.State.Running}},"oom":{{.State.OOMKilled}},"exit":{{.State.ExitCode}}}', cid).stdout)
        self.result.setdefault("orderly_stops", []).append({"container":cid, **state,
            "restartCount":int(self.docker("inspect", "--format", '{{.RestartCount}}', cid).stdout)})
        if state != {"running": False, "oom": False, "exit": 0}:
            raise Failure("Scoped orderly shutdown did not exit cleanly")

    def remove(self, cid):
        self.docker("rm", cid)
        self.containers.remove(cid)

    def sample(self, cid):
        state = subprocess.run(["docker", "inspect", "--format",
            '{{.State.Running}} {{.State.OOMKilled}}', cid], capture_output=True, timeout=5)
        sample = subprocess.run(["docker", "exec", cid, "sh", "-c",
            "cat /sys/fs/cgroup/memory.peak /sys/fs/cgroup/pids.current "
            "/sys/fs/cgroup/memory.max /sys/fs/cgroup/memory.swap.max "
            "/sys/fs/cgroup/cpu.max /sys/fs/cgroup/cpu.stat"], capture_output=True, timeout=5)
        with self.lock:
            # An intentional stop/remove may overlap reads on the monitor thread.
            spec = self.active.get(cid)
            if spec is None:
                return
            if state.returncode or state.stdout.strip() != b"true false" or sample.returncode:
                raise Failure("Unexpected container exit/OOM or unreadable cgroup sample")
            lines = sample.stdout.decode().splitlines()
            memory = (256 if spec["name"] == "gateway" else 512) * MIB
            quota, period = map(int, lines[4].split())
            cpu = 0.5 if spec["name"] == "gateway" else 1
            if int(lines[2]) != memory or int(lines[3]) != 0 or quota / period != cpu:
                raise Failure("Effective cgroup memory/swap/CPU limits differ")
            metric = self.metrics[cid]
            metric.update(memory_max_bytes=memory, swap_max_bytes=0, cpu_quota=quota, cpu_period=period)
            metric["peak_memory_bytes"] = max(metric["peak_memory_bytes"], int(lines[0]))
            metric["peak_pids"] = max(metric["peak_pids"], int(lines[1]))
            usage = int(dict(line.split() for line in lines[5:])["usage_usec"])
            now = time.monotonic()
            if cid in self.previous:
                old_usage, old_time = self.previous[cid]
                if usage >= old_usage and now > old_time:
                    metric["maximum_sample_cpu_percent"] = round(max(metric["maximum_sample_cpu_percent"],
                        (usage-old_usage)/(now-old_time)/10000), 2)
            self.previous[cid] = usage, now
            metric["cpu_usage_usec"] = max(metric["cpu_usage_usec"], usage)
        if spec["database"]:
            disk = subprocess.run(["docker", "exec", cid, "du", "-sb", PG_VOLUME],
                capture_output=True, timeout=5)
            with self.lock:
                if cid not in self.active:
                    return
                if disk.returncode:
                    raise Failure("PG disk budget unreadable")
                size = int(disk.stdout.split()[0])
                metric["peak_pg_disk_bytes"] = max(metric["peak_pg_disk_bytes"], size)
                if size > 512*MIB:
                    raise Failure("PG monitored disk budget reached")

    def monitor(self):
        while not self.stop.wait(1):
            try:
                info = dict(line.split(":", 1) for line in Path("/proc/meminfo").read_text().splitlines())
                if int(info["MemAvailable"].split()[0])*1024 < 4096*MIB:
                    raise Failure("Host memory headroom guard reached")
                if shutil.disk_usage(self.output).free < 4096*MIB:
                    raise Failure("Host free disk guard reached")
                with self.lock:
                    active = dict(self.active)
                for cid in active:
                    self.sample(cid)
            except Exception as error:
                self.guard_error = str(error) if isinstance(error, Failure) else "Resource monitor failed"
                return

    def pg(self, suffix, *, volume=None):
        if volume is None:
            volume = self.volume(suffix + "-data")
        else:
            # Recreate only this run's named volume, never a discovered/dev/PG16 volume.
            if volume not in self.volumes:
                raise Failure("PG reuse requires a volume created by this run")
            label = self.docker("volume", "inspect", "--format",
                '{{index .Labels "netfilmx.qualification"}}', volume).stdout.decode().strip()
            if label != self.scope:
                raise Failure("PG volume ownership differs")
        self.pg_volumes[suffix] = volume
        name,cid = self.start(suffix, ["--cpus", "1", "--memory", "512m", "--memory-swap", "512m",
            "--pids-limit", "128", "--mount", f"type=volume,source={volume},target={PG_VOLUME}",
            "--env", "PGDATA=" + PG_DATA,
            "--env", "POSTGRES_USER=qual_admin", "--env", "POSTGRES_PASSWORD=local-qualification",
            "--env", "POSTGRES_DB=catalogue", PG_IMAGE,
            *[value for setting in PG_CONFIG["settings"] for value in ("-c", setting)]], database=True)
        for _ in range(45):
            if self.docker("exec", name, "pg_isready", "-h", "127.0.0.1", "-U", "qual_admin", "-d", "catalogue", check=False).returncode == 0:
                info = json.loads(self.docker("inspect", "--format",
                    '{"image":{{json .Config.Image}},"mounts":{{json .Mounts}},"restartCount":{{.RestartCount}}}', cid).stdout)
                mounts = [m for m in info["mounts"] if m["Destination"].startswith(PG_VOLUME)]
                if len(mounts) != 1 or mounts[0]["Type"] != "volume" or mounts[0].get("Name") != volume or mounts[0]["Destination"] != PG_VOLUME:
                    raise Failure("PG parent volume missing or anonymous/nested data mount")
                settings = json.loads(self.sql(name, """SELECT json_build_object(
                    'version', current_setting('server_version'),
                    'server_version_num', current_setting('server_version_num'),
                    'data_directory', current_setting('data_directory'),
                    'max_wal_size', current_setting('max_wal_size'),
                    'min_wal_size', current_setting('min_wal_size'),
                    'temp_file_limit', current_setting('temp_file_limit'),
                    'shared_buffers', current_setting('shared_buffers'),
                    'work_mem', current_setting('work_mem'),
                    'max_connections', current_setting('max_connections'));""").stdout)
                if not settings["version"].startswith(PG_CONFIG["version"] + " ") or settings["data_directory"] != PG_DATA:
                    raise Failure("Effective PG version/data_directory differs")
                tools = {tool:self.docker("exec", name, tool, "--version").stdout.decode().strip()
                    for tool in ["postgres", "pg_dump", "pg_restore"]}
                if not all(PG_CONFIG["version"] in version for version in tools.values()):
                    raise Failure("Dump/restore tool version differs from selected PG")
                self.pg_instances.append({"name": suffix, "volume": volume, **info, "settings": settings, "tools": tools})
                return name,cid
            time.sleep(1)
        raise Failure("PG readiness deadline reached")

    def sql(self, pg, text, db="catalogue", *, role="qual_admin", check=True):
        return self.docker("exec", "-i", pg, "psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1",
            "--set", "VERBOSITY=sqlstate", "-U", role, "-d", db, data=text.encode(), check=check)

    def grants(self, pg, db="catalogue", *, create_role=False):
        if create_role:
            self.sql(pg, "CREATE ROLE qual_runtime LOGIN PASSWORD 'local-runtime-qualification' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOINHERIT;")
        if not re.fullmatch(r"[a-z][a-z0-9_]*", db):
            raise Failure("Unsafe fixture database identifier")
        self.sql(pg, f'''GRANT CONNECT ON DATABASE "{db}" TO qual_runtime;
            GRANT USAGE ON SCHEMA public TO qual_runtime;
            GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO qual_runtime;
            GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO qual_runtime;
            REVOKE INSERT, UPDATE, DELETE ON TABLE "__EFMigrationsHistory" FROM qual_runtime;''', db)
        denied = self.sql(pg, "CREATE TABLE public.qualification_ddl_forbidden(id int);", db,
            role="qual_runtime", check=False)
        if denied.returncode == 0 or b"42501" not in denied.stderr:
            raise Failure("Runtime unexpectedly has schema DDL permissions")
        for statement in [
            'INSERT INTO "__EFMigrationsHistory" SELECT * FROM "__EFMigrationsHistory" LIMIT 1;',
            "UPDATE \"__EFMigrationsHistory\" SET \"ProductVersion\" = '18-fixture' WHERE false;",
            'DELETE FROM "__EFMigrationsHistory" WHERE false;']:
            denied = self.sql(pg, "BEGIN; " + statement + " ROLLBACK;", db, role="qual_runtime", check=False)
            if denied.returncode == 0 or b"42501" not in denied.stderr:
                raise Failure("Runtime unexpectedly can modify migration history")
        flags = self.sql(pg, "SELECT rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication FROM pg_roles WHERE rolname='qual_runtime';", db).stdout.strip()
        if flags != b"f":
            raise Failure("Runtime role capabilities exceed fixture contract")

    def connection(self, pg, db="catalogue", *, admin=False):
        role,password = ("qual_admin","local-qualification") if admin else ("qual_runtime","local-runtime-qualification")
        return f"Host={pg};Database={db};Username={role};Password={password};Timeout=5;Command Timeout=30"

    def cli(self, image, env, *args, check=True):
        return self.docker("run", "--rm", "--network", self.network, "--cpus", "1", "--memory", "512m",
            "--memory-swap", "512m", "--pids-limit", "128", "--cap-drop", "ALL", "--init",
            "--env-file", env, image, *args, check=check)

    def web(self, instance, pg, keys, gateway_ip):
        values = {"ConnectionStrings__DefaultConnection": self.connection(pg),
            "DataProtection__KeyRingPath": "/var/lib/netfilmx/keyring",
            "JwtSettings__SecretKey": "SyntheticQualificationJwtKeyAtLeast32Bytes",
            "JwtSettings__Issuer": "qualification", "JwtSettings__Audience": "qualification",
            "CloudflareR2__PublicUrl": self.media_origin, "Uploads__Enabled": "false",
            "Worker__Enabled": "false", "Database__SeedDemoData": "false",
            "AllowedHosts": "netfilmx.test;localhost;127.0.0.1", "Proxy__KnownProxies__0": gateway_ip,
            "Proxy__ForwardLimit": "1"}
        env = self.env("web-" + instance + "-" + uuid.uuid4().hex[:6], values)
        name,cid = self.start("web-" + instance, ["--network-alias", "web-" + instance, "--cpus", "1",
            "--memory", "512m", "--memory-swap", "512m", "--pids-limit", "128", "--cap-drop", "ALL", "--init",
            "--mount", f"type=volume,source={keys},target=/var/lib/netfilmx/keyring", "--env-file", env, self.image])
        contract = json.loads(self.docker("inspect", "--format",
            '{"user":{{json .Config.User}},"memory":{{.HostConfig.Memory}},"swap":{{.HostConfig.MemorySwap}},"cpu":{{.HostConfig.NanoCpus}}}',cid).stdout)
        if contract != {"user":"appuser","memory":512*MIB,"swap":512*MIB,"cpu":1_000_000_000}:
            raise Failure("Effective web identity/budgets drift")
        for _ in range(50):
            health = self.docker("inspect", "--format", '{{.State.Health.Status}}', cid).stdout.strip()
            if health == b"healthy":
                return name,cid
            if health == b"unhealthy":
                break
            time.sleep(1)
        raise Failure("Web readiness deadline reached")

    def execute(self):
        started = time.monotonic()
        image_info = json.loads(self.docker("image", "inspect", "--format",
            '{"id":{{json .Id}},"revision":{{json (index .Config.Labels "org.opencontainers.image.revision")}}}', self.image).stdout)
        if image_info["revision"] != self.revision:
            raise Failure("Image revision differs from requested source")
        self.result["image"] = image_info
        # Helper compilation is included in the wall deadline, before runtime sampling.
        build = self.command("docker", "build", "--file", "qualification/CatalogueRecovery/Dockerfile",
            "--build-arg", "CANDIDATE_IMAGE=" + self.image, "--tag", self.tools, ".", timeout=180, check=False)
        (self.output / "helper-build.log").write_bytes(build.stdout + build.stderr)
        if build.returncode:
            raise Failure("Helper compilation failed; see helper-build.log")
        pg_image = json.loads(self.docker("image", "inspect", "--format",
            '{"id":{{json .Id}},"os":{{json .Os}},"architecture":{{json .Architecture}},"env":{{json .Config.Env}},"volumes":{{json .Config.Volumes}}}', PG_IMAGE).stdout)
        if pg_image["os"] + "/" + pg_image["architecture"] != PG_CONFIG["platform"] or "PGDATA=" + PG_DATA not in pg_image["env"] or list(pg_image["volumes"]) != [PG_VOLUME]:
            raise Failure("Selected PG image platform/default storage differs")
        self.result["postgres_image"] = pg_image
        for library in ["NetFilmx_Storage.dll", "NetFilmx_Storage.PostgreSql.dll"]:
            one = self.docker("run", "--rm", "--network", "none", "--entrypoint", "sha256sum", self.image, "/app/"+library).stdout.split()[0]
            two = self.docker("run", "--rm", "--network", "none", "--entrypoint", "sha256sum", self.tools, "/qualification/"+library).stdout.split()[0]
            if one != two:
                raise Failure("Fixture uses rebuilt application library")
        self.phase("Tool uses byte-identical candidate storage/import libraries")
        self.docker("network", "create", "--internal", "--label", "netfilmx.qualification="+self.scope, self.network)
        thread = threading.Thread(target=self.monitor, daemon=True)
        thread.start()
        try:
            pg,pg_cid = self.pg("pg-original")
            admin = self.env("admin", {"ConnectionStrings__DefaultConnection":self.connection(pg,admin=True)})
            self.cli(self.image, admin, "database", "migrate", "--confirm-reviewed-migrations")
            self.grants(pg, create_role=True)
            runtime = self.env("runtime", {"ConnectionStrings__DefaultConnection":self.connection(pg), "CloudflareR2__PublicUrl":self.media_origin})
            plan = json.loads(self.cli(self.image, runtime, "catalogue", "plan").stdout)
            if len(plan["pendingPlayback"]) not in (0, 2):
                raise Failure("Unexpected embedded manifest; review fixture assumptions")
            if plan["pendingPlayback"]:
                refused = self.cli(self.image,runtime,"catalogue","import","--confirm-empty-database","--confirm-reviewed-media",check=False)
                if refused.returncode != 1 or b"pending playback derivatives" not in refused.stderr:
                    raise Failure("Shipped incomplete manifest must refuse before import")
            # NP18 uses the production CLI. Default recovery retains synthetic URLs.
            if self.database_only:
                if plan["pendingPlayback"] or plan["pendingSubtitles"]:
                    raise Failure("NP18 requires the approved complete manifest")
                self.cli(self.image, runtime, "catalogue", "import", "--confirm-empty-database", "--confirm-reviewed-media")
                snapshot = json.loads(self.cli(self.tools, runtime, "verify-retained").stdout)
                refused = self.cli(self.image, runtime, "catalogue", "import", "--confirm-empty-database", "--confirm-reviewed-media", check=False)
                if refused.returncode != 1:
                    raise Failure("Real catalogue repeat did not refuse")
                if snapshot != json.loads(self.cli(self.tools, runtime, "verify-retained").stdout):
                    raise Failure("Real catalogue changed after repeat refusal")
                self.result["catalogue_after_import"] = snapshot
                self.result["repeat_import_refused"] = True
            else:
                self.cli(self.tools, runtime, "import-fixture")
                self.cli(self.tools, runtime, "refuse-repeat")
            initial = json.loads(self.cli(self.tools, runtime, "counts").stdout)
            if initial != {"videos":7,"series":1,"episode_links":3,"users":0,"sessions":0,"comments":0,"likes":0,"purchases":0,"upload_intents":0}:
                raise Failure("Fixture catalogue counts/empty history differ")
            self.result["initial_counts"] = initial
            self.sql(pg, "CREATE DATABASE nonempty OWNER qual_admin;")
            nonempty_admin = self.env("nonempty-admin", {"ConnectionStrings__DefaultConnection":self.connection(pg,"nonempty",admin=True)})
            self.cli(self.image,nonempty_admin,"database","migrate","--confirm-reviewed-migrations")
            self.grants(pg,"nonempty")
            nonempty = self.env("nonempty-runtime", {"ConnectionStrings__DefaultConnection":self.connection(pg,"nonempty")})
            self.cli(self.tools,nonempty,"refuse-account")
            self.phase("Migration, catalogue import/counts/relations, repeat/account refusal, runtime DDL/history denial pass")

            keys = self.private_volume("keys")
            tls = self.output / "tls"
            tls.mkdir(mode=0o700)
            self.command("openssl","req","-x509","-newkey","rsa:2048","-nodes","-days","1","-subj","/CN=netfilmx.test",
                "-addext","subjectAltName=IP:127.0.0.1,DNS:netfilmx.test","-keyout",str(tls/"key.pem"),"-out",str(tls/"cert.pem"))
            self.command("openssl","pkcs12","-export","-in",str(tls/"cert.pem"),"-inkey",str(tls/"key.pem"),"-out",str(tls/"server.pfx"),"-passout","pass:qualification")
            for path in tls.iterdir():path.chmod(0o600)
            tls_volume = self.private_volume("tls")
            self.docker("run","--rm","--network","none","--user","0:0","--entrypoint","sh",
                "--mount",f"type=volume,source={tls_volume},target=/tls","--mount",f"type=bind,source={tls},target=/input,readonly",self.image,
                "-c","cp /input/server.pfx /tls/server.pfx && chown 10001:10001 /tls/server.pfx && chmod 0600 /tls/server.pfx")
            # An internal bridge does not allocate the loopback publication on this engine.
            # Only the fixture gateway joins this second owned network; PG/web stay internal.
            self.docker("network","create","--label","netfilmx.qualification="+self.scope,self.ingress_network)
            gateway,gateway_cid = self.start("gateway",["--cpus","0.5","--memory","256m","--memory-swap","256m",
                "--pids-limit","128","--cap-drop","ALL","--init","--no-healthcheck","--publish","127.0.0.1::8443",
                "--mount",f"type=volume,source={tls_volume},target=/tls,readonly",self.tools,"gateway"],network=self.ingress_network)
            self.docker("network","connect",self.network,gateway_cid)
            gateway_ip = self.docker("inspect","--format",'{{with index .NetworkSettings.Networks "'+self.network+'"}}{{.IPAddress}}{{end}}',gateway_cid).stdout.decode().strip()
            bindings=json.loads(self.docker("inspect","--format",'{{json (index .NetworkSettings.Ports "8443/tcp")}}',gateway_cid).stdout)
            if not gateway_ip or not bindings:
                raise Failure("Fixture gateway IP/loopback publication missing")
            binding=bindings[0]
            if binding["HostIp"] != "127.0.0.1":raise Failure("Gateway exposed beyond loopback")
            url="https://127.0.0.1:"+binding["HostPort"]
            browser=Browser(url,str(tls/"cert.pem"))
            a,a_cid=self.web("a",pg,keys,gateway_ip)
            b,b_cid=self.web("b",pg,keys,gateway_ip)
            sources=[self.docker("inspect","--format",'{{range .Mounts}}{{if eq .Destination "/var/lib/netfilmx/keyring"}}{{.Source}}{{end}}{{end}}',cid).stdout for cid in [a_cid,b_cid]]
            if not sources[0] or sources[0] != sources[1]:raise Failure("Two webs do not share effective key mount")
            for instance in ["a","b"]:
                ready=json.loads(browser.request(instance,"/health/ready"))
                if ready != {"status":"ready","revision":self.revision}:raise Failure("HTTPS readiness/revision differs")
                for path in ["/", "/home/movies", "/home/series", "/js/site.js"]:browser.request(instance,path)
            token=browser.token("a","/auth/register")
            browser.request("b","/auth/register",form={"Username":"qualification_user","Email":"qualification@example.test",
                "Password":"Qualification123!","__RequestVerificationToken":token},status=302)
            cookie_flags=[{"name":c.name,"secure":c.secure,
                "http_only":c.has_nonstandard_attr("HttpOnly") or c.has_nonstandard_attr("httponly")} for c in browser.jar]
            self.result["session_cookie_flags"]=cookie_flags
            if not all(any(c["name"]==name and c["secure"] and c["http_only"] for c in cookie_flags)
                for name in ["access_token","refresh_token"]):
                raise Failure("Secure session cookies missing")
            browser.request("a","/admin/category",status=403)
            browser.request("b","/auth/refresh",form={},csrf=browser.csrf("a"))
            form_browser=Browser(url,str(tls/"cert.pem"))
            saved_form=form_browser.token("a","/auth/login")
            invalid_login={"Username":"qualification_user","Password":"WrongFixture123!","__RequestVerificationToken":saved_form}
            form_browser.request("b","/auth/login",form=invalid_login)
            # Successful login must be exercised separately from registration and invalid-form checks.
            login_browser = Browser(url,str(tls/"cert.pem"))
            login_token = login_browser.token("a", "/auth/login")
            login_browser.request("b", "/auth/login", form={"Username":"qualification_user", "Password":"Qualification123!",
                "__RequestVerificationToken":login_token}, status=302)
            login_browser.request("a", "/auth/refresh", form={}, csrf=login_browser.csrf("b"))
            login_browser.request("b", "/auth/logout", form={}, csrf=login_browser.csrf("a"), status=302)
            self.phase("Two actual webs: shared keys, HTTPS MVC registration/login, session and cross-instance CSRF/refresh/logout pass")

            self.retire(b_cid)
            self.remove(b_cid)
            browser.request("a","/health/ready")
            b,b_cid=self.web("b",pg,keys,gateway_ip)
            form_browser.request("b","/auth/login",form=invalid_login)
            browser.request("b","/admin/category",status=403)
            self.phase("Web recreation retains existing MVC form and session; peer remains ready")
            saved_authenticated_csrf=browser.csrf("a")
            before=json.loads(self.cli(self.tools,runtime,"counts").stdout)
            self.retire(a_cid); self.retire(b_cid)
            for cid in [a_cid,b_cid]:self.remove(cid)
            if self.database_only:
                before_recreation = json.loads(self.cli(self.tools,runtime,"snapshot-retained").stdout)
                volume = self.pg_volumes["pg-original"]
                self.retire(pg_cid); self.remove(pg_cid)
                pg,pg_cid = self.pg("pg-original", volume=volume)
                if before_recreation != json.loads(self.cli(self.tools,runtime,"snapshot-retained").stdout):
                    raise Failure("Same-volume PG recreation changed IDs/mappings")
                self.result["same_volume_recreation"] = {"volume":volume, "catalogue_unchanged":True}
                a,a_cid=self.web("a",pg,keys,gateway_ip)
                b,b_cid=self.web("b",pg,keys,gateway_ip)
                for instance in ["a", "b"]:
                    ready=json.loads(browser.request(instance,"/health/ready"))
                    if ready != {"status":"ready","revision":self.revision}:
                        raise Failure("Readiness after PG recreation differs")
                    form_browser.request(instance,"/auth/login",form=invalid_login)
                browser.request("a","/auth/refresh",form={},csrf=browser.csrf("b"))
                saved_authenticated_csrf=browser.csrf("a")
                before=json.loads(self.cli(self.tools,runtime,"counts").stdout)
                self.retire(a_cid); self.retire(b_cid)
                for cid in [a_cid,b_cid]:self.remove(cid)
                before_snapshot=json.loads(self.cli(self.tools,runtime,"snapshot-retained").stdout)
                self.phase("Same named PG18 parent volume survives container recreation; IDs, 17 mappings, readiness, keys/session/CSRF retained")
            dump=self.output/"catalogue.dump"
            restore_started=time.monotonic()
            with dump.open("xb") as file:
                self.docker("exec",pg,"pg_dump","--format=custom","--no-owner","-U","qual_admin","-d","catalogue",stdout=file)
            dump.chmod(0o600)
            if not 0 < dump.stat().st_size <= 64*MIB:raise Failure("Dump size outside bound")
            ring=self.output/"keyring.tar"
            if not self.database_only:
                with ring.open("xb") as file:
                    self.docker("run","--rm","--network","none","--entrypoint","tar","--mount",f"type=volume,source={keys},target=/keys,readonly",
                        self.image,"-C","/keys","-cf","-",".",stdout=file)
                ring.chmod(0o600)
                if not 0 < ring.stat().st_size <= MIB:raise Failure("Key archive size outside bound")
            self.retire(pg_cid)
            restored,restored_cid=self.pg("pg-restored")
            self.sql(restored,"CREATE ROLE qual_runtime LOGIN PASSWORD 'local-runtime-qualification' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOINHERIT;")
            self.docker("exec","-i",restored,"pg_restore","--exit-on-error","--single-transaction","--no-owner","-U","qual_admin","-d","catalogue",data=dump.read_bytes())
            self.grants(restored)
            restored_keys=keys
            if not self.database_only:
                restored_keys=self.private_volume("keys-restored")
                self.docker("run","--rm","--network","none","--interactive","--entrypoint","tar","--mount",f"type=volume,source={restored_keys},target=/keys",
                    self.image,"-C","/keys","-xf","-",data=ring.read_bytes())
            restored_runtime=self.env("restored-runtime",{"ConnectionStrings__DefaultConnection":self.connection(restored), "CloudflareR2__PublicUrl":self.media_origin})
            after=json.loads(self.cli(self.tools,restored_runtime,"counts").stdout)
            if before != after:raise Failure("Restored database counts differ")
            self.result.update(before_restore_counts=before,after_restore_counts=after,dump_bytes=dump.stat().st_size,
                keyring_archive_bytes=0 if self.database_only else ring.stat().st_size, keyring_reused=self.database_only,restore_seconds=round(time.monotonic()-restore_started,3))
            if self.database_only:
                after_snapshot=json.loads(self.cli(self.tools,restored_runtime,"snapshot-retained").stdout)
                if before_snapshot != after_snapshot:
                    raise Failure("Restored catalogue IDs/relations/media mappings differ")
                self.result["catalogue_after_restore"]=after_snapshot
            a,a_cid=self.web("a",restored,restored_keys,gateway_ip)
            b,b_cid=self.web("b",restored,restored_keys,gateway_ip)
            form_browser.request("a","/auth/login",form=invalid_login)
            form_browser.request("b","/auth/login",form=invalid_login)
            browser.request("b","/admin/category",status=403)
            browser.request("b","/auth/refresh",form={},csrf=saved_authenticated_csrf)
            self.phase("Consistent persistent PG/keyring restore: counts, runtime grants, old MVC form and live session pass on both webs")
            if not self.database_only:
                self.retire(b_cid);self.remove(b_cid)
                wrong_keys=self.private_volume("keys-wrong")
                b,b_cid=self.web("b",restored,wrong_keys,gateway_ip)
                form_browser.request("b","/auth/login",form=invalid_login,status=400)
                self.retire(b_cid);self.remove(b_cid)
                b,b_cid=self.web("b",restored,restored_keys,gateway_ip)
                form_browser.request("b","/auth/login",form=invalid_login)
            replay=Browser(url,str(tls/"cert.pem"))
            for cookie in browser.jar:replay.jar.set_cookie(copy.copy(cookie))
            browser.request("a","/auth/logout",form={},csrf=browser.csrf("b"),status=302)
            replay.request("b","/auth/refresh",form={},csrf=replay.csrf("a"),status=401)
            self.phase("Restored DB and matching keys preserve forms/session; cross-web logout revokes restored refresh session")
            self.result["final_container_states"] = []
            for cid in list(self.active):
                self.sample(cid)
                state = json.loads(self.docker("inspect", "--format",
                    '{"running":{{.State.Running}},"oom":{{.State.OOMKilled}},"restartCount":{{.RestartCount}}}', cid).stdout)
                if not state["running"] or state["oom"] or state["restartCount"]:
                    raise Failure("Final container state differs")
                self.result["final_container_states"].append({"name":self.active[cid]["name"], **state})
            self.check()
            self.result["status"]="passed"
        finally:
            self.stop.set();thread.join(timeout=15)
            self.result["metrics"]=list(self.metrics.values())
            self.result["elapsed_seconds"]=round(time.monotonic()-started,3)

    def cleanup(self):
        # Only identifiers created here and still bearing this run's ownership label.
        self.stop.set()
        for cid in reversed(self.containers):
            label=subprocess.run(["docker","inspect","--format",'{{index .Config.Labels "netfilmx.qualification"}}',cid],capture_output=True,timeout=10)
            if label.returncode==0 and label.stdout.decode().strip()==self.scope:
                subprocess.run(["docker","rm","--force",cid],capture_output=True,timeout=40,check=True)
        for volume in reversed(self.volumes):
            label=subprocess.run(["docker","volume","inspect","--format",'{{index .Labels "netfilmx.qualification"}}',volume],capture_output=True,timeout=10)
            if label.returncode==0 and label.stdout.decode().strip()==self.scope:
                subprocess.run(["docker","volume","rm",volume],capture_output=True,timeout=15,check=True)
        for network in [self.ingress_network,self.network]:
            owned=subprocess.run(["docker","network","inspect","--format",'{{index .Labels "netfilmx.qualification"}}',network],capture_output=True,timeout=10)
            if owned.returncode==0 and owned.stdout.decode().strip()==self.scope:
                subprocess.run(["docker","network","rm",network],capture_output=True,timeout=15,check=True)
        for path in self.output.glob("*.env"):path.unlink()
        # Synthetic recovery material still contains private keys/session hashes.
        for name in ["keyring.tar","catalogue.dump"]:
            (self.output/name).unlink(missing_ok=True)
        shutil.rmtree(self.output/"tls",ignore_errors=True)
        self.result["temporary_resources"]="scoped containers/volumes/networks and synthetic secrets removed; images retained"


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("image")
    parser.add_argument("revision")
    parser.add_argument("--output",type=Path)
    parser.add_argument("--database-only", action="store_true", help="NP18: real embedded catalogue, same-volume PG recreation, DB-only restore with original keyring; no media requests")
    parser.add_argument("--media-origin", default="https://media.example.test", help="Reviewed origin used to verify stored mappings; not fetched")
    args=parser.parse_args()
    if not re.fullmatch(r"[a-f0-9]{40}",args.revision):parser.error("Full lowercase source SHA required")
    # A remote Docker context would violate this assignment's local-only scope.
    endpoint=os.environ.get("DOCKER_HOST") or subprocess.check_output(["docker","context","inspect","--format",
        '{{(index .Endpoints "docker").Host}}'],text=True).strip()
    if not endpoint.startswith("unix://"):parser.error("Only a local Unix Docker socket is permitted")
    if os.cpu_count()<6:parser.error("At least six local logical CPUs required for aggregate headroom")
    output=(args.output or ROOT/"artifacts/catalogue-recovery"/(time.strftime("%Y%m%dT%H%M%S")+"-"+uuid.uuid4().hex[:6])).resolve()
    if not output.is_relative_to(ROOT/"artifacts"):parser.error("Output must stay inside ignored artifacts")
    output.mkdir(parents=True,mode=0o700)
    os.chmod(output,0o700)
    origin=urllib.parse.urlsplit(args.media_origin)
    if origin.scheme != "https" or not origin.netloc or origin.username or origin.password or origin.query or origin.fragment or origin.path not in ("", "/"):
        parser.error("A credential-free HTTPS media origin is required")
    harness=Harness(args.image,args.revision,output,database_only=args.database_only,media_origin=args.media_origin.rstrip("/"))
    try:
        harness.execute()
    except Exception as error:
        harness.result["status"]="failed"
        harness.result["failure"]=str(error) if isinstance(error,Failure) else type(error).__name__
        harness.result["failure_frames"]=[{"file":Path(frame.filename).name,"line":frame.lineno,"function":frame.name}
            for frame in traceback.extract_tb(error.__traceback__)]
        print("Local qualification stopped: "+harness.result["failure"],flush=True)
    finally:
        try:harness.cleanup()
        except Exception:
            harness.result["status"]="failed"
            harness.result["cleanup_error"]="Scoped cleanup incomplete; retain identifiers for reconciliation"
        result=output/"results.json"
        result.write_text(json.dumps(harness.result,indent=2)+"\n")
        result.chmod(0o600)
        print("Private results: "+str(result.relative_to(ROOT)),flush=True)
    return 0 if harness.result["status"]=="passed" else 1


if __name__=="__main__":
    raise SystemExit(main())
