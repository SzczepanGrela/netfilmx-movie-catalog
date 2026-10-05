import io
import json
import unittest
import urllib.error
from unittest.mock import patch

from infra import smokecheck

ORIGIN = "https://catalogue.example.test"
REVISION = "a" * 40


class Response(io.BytesIO):
    status = 200


class TestPublicReleaseProbes(unittest.TestCase):
    @patch("infra.smokecheck._open")
    def test_full_probe_checks_revision_catalogue_and_antiforgery(self, open_request):
        def respond(request, timeout):
            path = request.full_url.removeprefix(ORIGIN)
            if path == "/health/ready":
                return Response(json.dumps({"status": "ready", "revision": REVISION}).encode())
            if path == "/auth/csrf":
                return Response(b'{"token":"synthetic-antiforgery-token"}')
            if path == "/auth/login":
                self.assertEqual(request.method, "POST")
                raise urllib.error.HTTPError(request.full_url, 400, "Rejected", {}, None)
            return Response(b"catalogue or asset")

        open_request.side_effect = respond
        smokecheck.check_release(ORIGIN, REVISION)
        self.assertEqual([call.args[0].full_url.removeprefix(ORIGIN) for call in open_request.call_args_list],
                         ["/health/ready", "/", "/home/movies", "/home/series", "/favicon.ico", "/js/site.js", "/auth/csrf", "/auth/login"])

    @patch("infra.smokecheck._open")
    def test_invalid_origins_are_rejected_before_network(self, open_request):
        for origin in ("http://catalogue.example.test", ORIGIN + "/path", ORIGIN + "?query=1",
                       "https://user:secret@catalogue.example.test", ORIGIN + "#fragment"):
            with self.subTest(origin=origin), self.assertRaises(ValueError):
                smokecheck.check_release(origin, REVISION)
        open_request.assert_not_called()

    @patch("infra.smokecheck._open")
    def test_another_revision_is_rejected(self, open_request):
        open_request.return_value = Response(json.dumps({"status": "ready", "revision": "b" * 40}).encode())
        with self.assertRaises(ValueError):
            smokecheck.check_release(ORIGIN, REVISION)
        self.assertEqual(open_request.call_count, 1)

    @patch("infra.smokecheck._open")
    def test_oversized_health_is_rejected(self, open_request):
        open_request.return_value = Response(b"x" * 32769)
        with self.assertRaisesRegex(ValueError, "limit"):
            smokecheck.check_release(ORIGIN, REVISION)

    @patch("infra.smokecheck._open")
    def test_redirected_catalogue_is_rejected(self, open_request):
        open_request.side_effect = [Response(json.dumps({"status": "ready", "revision": REVISION}).encode()),
                                   urllib.error.HTTPError(ORIGIN, 302, "Moved", {}, None)]
        with self.assertRaises(urllib.error.HTTPError):
            smokecheck.check_release(ORIGIN, REVISION)

    @patch("infra.smokecheck.check_baseline_release")
    @patch("infra.smokecheck._open")
    def test_missing_antiforgery_token_is_rejected(self, open_request, baseline):
        open_request.return_value = Response(b'{"token":""}')
        with self.assertRaises(ValueError):
            smokecheck.check_release(ORIGIN, REVISION)

    @patch("infra.smokecheck.check_baseline_release")
    @patch("infra.smokecheck._open")
    def test_unprotected_login_is_rejected(self, open_request, baseline):
        open_request.side_effect = [Response(b'{"token":"synthetic"}'), Response(b"login page")]
        with self.assertRaisesRegex(ValueError, "without antiforgery"):
            smokecheck.check_release(ORIGIN, REVISION)
