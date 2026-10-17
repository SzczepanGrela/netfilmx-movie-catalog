"""Bounded NetFilmx public probes; no account creation or media writes."""
from __future__ import annotations

import json
import re
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Mapping

REVISION_PATTERN = re.compile(r"^[a-f0-9]{40}$")


def _validate_inputs(base_url: str, expected_revision: str) -> None:
    parsed = urllib.parse.urlsplit(base_url)
    if parsed.scheme != "https" or not parsed.hostname or parsed.path not in {"", "/"}:
        raise ValueError("public base URL must be an HTTPS origin")
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError("public URL must not contain credentials, query or fragment")
    if not REVISION_PATTERN.fullmatch(expected_revision):
        raise ValueError("expected revision must be a full lowercase SHA")


def _open(request: urllib.request.Request, timeout: int):
    # A release probe must not accept an unrelated redirected page/health reply.
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            return None
    return urllib.request.build_opener(NoRedirect).open(request, timeout=timeout)


def _request(base_url: str, path: str, *, method: str = "GET"):
    return urllib.request.Request(base_url.rstrip("/") + path, method=method,
                                  headers={"Cache-Control": "no-cache", "User-Agent": "netfilmx-release-probe"})


def _read_json(request, timeout: int) -> Mapping[str, object]:
    with _open(request, timeout) as response:
        if response.status != 200:
            raise ValueError("JSON endpoint is unavailable")
        data = response.read(32769)
        if len(data) > 32768:
            raise ValueError("JSON endpoint exceeds probe limit")
        payload = json.loads(data)
    if not isinstance(payload, Mapping):
        raise ValueError("JSON endpoint returned an invalid payload")
    return payload


def check_health(base_url: str, revision: str, *, timeout: int = 10) -> None:
    payload = _read_json(_request(base_url, "/health/ready"), timeout)
    if payload.get("status") != "ready" or payload.get("revision") != revision:
        raise ValueError("readiness or revision does not match the release")


def _check_catalogue(base_url: str, timeout: int) -> None:
    for path in ("/", "/home/movies", "/home/series", "/favicon.ico", "/js/site.js"):
        with _open(_request(base_url, path), timeout) as response:
            if response.status != 200 or not response.read(1024):
                raise ValueError("a required catalogue page or asset is unavailable")


def check_baseline_release(base_url: str, revision: str, *, timeout: int = 10) -> None:
    _validate_inputs(base_url, revision)
    check_health(base_url, revision, timeout=timeout)
    _check_catalogue(base_url, timeout)


def check_release(base_url: str, revision: str, *, timeout: int = 10) -> None:
    check_baseline_release(base_url, revision, timeout=timeout)
    csrf = _read_json(_request(base_url, "/auth/csrf"), timeout)
    if not isinstance(csrf.get("token"), str) or not csrf["token"]:
        raise ValueError("antiforgery issuance is unavailable")
    try:
        with _open(_request(base_url, "/auth/login", method="POST"), timeout):
            raise ValueError("login accepted a request without antiforgery protection")
    except urllib.error.HTTPError as error:
        error.close()
        if error.code != 400:
            raise ValueError("login antiforgery rejection is unavailable") from error
