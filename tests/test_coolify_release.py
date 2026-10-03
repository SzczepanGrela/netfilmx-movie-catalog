from __future__ import annotations

import argparse
import io
import json
import os
import sys
import unittest
import tempfile
import urllib.error
from pathlib import Path
from unittest.mock import patch, MagicMock

from infra import coolify_release as release
from infra import smokecheck


APPLICATION_UUID = "b" * 24
DEPLOYMENT_UUID = "d" * 24
ROLLBACK_UUID = "r" * 24
OLD_DIGEST = f"sha256:{'1' * 64}"
NEW_DIGEST = f"sha256:{'2' * 64}"
OLD_REVISION = "3" * 40
NEW_REVISION = "4" * 40


def sample_contract() -> dict[str, object]:
    return {
        "name": "netfilmx-movie-catalog",
        "build_pack": "dockerimage",
        "docker_registry_image_name": "ghcr.io/szczepangrela/netfilmx-movie-catalog",
        "fqdn": "https://catalogue.example.test:8080",
        "domains": None,
        "redirect": "both",
        "ports_exposes": "8080",
        "ports_mappings": None,
        "health_check_enabled": True,
        "health_check_type": "cmd",
        "health_check_command": "dotnet NetFilmx_Web.dll healthcheck",
        "health_check_interval": 5,
        "health_check_timeout": 5,
        "health_check_retries": 10,
        "health_check_start_period": 10,
        "custom_labels": None,
        "custom_network_aliases": None,
        "destination_type": "App\\Models\\StandaloneDocker",
        "destination_id": 42,
        "max_restart_count": 10,
        "limits_memory": "512m",
        "limits_memory_swap": "512m",
        "limits_memory_swappiness": 0,
        "limits_memory_reservation": "128m",
        "limits_cpus": "1",
        "limits_cpu_shares": 1024,
        "custom_docker_run_options": "--cap-drop=ALL --init",
        "settings": {
            "connect_to_docker_network": False,
            "docker_images_to_keep": 2,
            "is_consistent_container_name_enabled": False,
            "is_container_label_readonly_enabled": True,
            "is_force_https_enabled": False,
            "stop_grace_period": None,
        },
    }


class FakeClient:
    def __init__(self, expected: dict[str, object], statuses: list[list[str]]) -> None:
        self.application = expected | {
            "id": 1,
            "uuid": APPLICATION_UUID,
            "status": "running:healthy",
            "docker_registry_image_tag": release.digest_to_tag(OLD_DIGEST),
        }
        self.statuses_to_queue = [list(values) for values in statuses]
        self.deployment_statuses: dict[str, list[str]] = {}
        self.updates: list[str] = []
        self.queued: list[str] = []
        self.cancelled: list[str] = []
        self.application_deployments: list[dict[str, object]] = []
        self.live_revision = OLD_REVISION

    def get_application(self, application_uuid: str) -> dict[str, object]:
        assert application_uuid == APPLICATION_UUID
        return dict(self.application)

    def update_tag(self, application_uuid: str, tag: str) -> None:
        assert application_uuid == APPLICATION_UUID
        self.updates.append(tag)
        self.application["docker_registry_image_tag"] = tag

    def list_application_deployments(
        self,
        application_uuid: str,
    ) -> list[dict[str, object]]:
        assert application_uuid == APPLICATION_UUID
        return list(self.application_deployments)

    def queue_deployment(self, application_uuid: str) -> str:
        assert application_uuid == APPLICATION_UUID
        deployment_uuid = DEPLOYMENT_UUID if not self.queued else ROLLBACK_UUID
        self.queued.append(deployment_uuid)
        self.deployment_statuses[deployment_uuid] = self.statuses_to_queue.pop(0)
        return deployment_uuid

    def get_deployment(self, deployment_uuid: str) -> dict[str, object]:
        statuses = self.deployment_statuses[deployment_uuid]
        status = statuses.pop(0) if len(statuses) > 1 else statuses[0]
        if status == "finished":
            tag = self.application["docker_registry_image_tag"]
            self.live_revision = (
                NEW_REVISION
                if tag == release.digest_to_tag(NEW_DIGEST)
                else OLD_REVISION
            )
        return {"deployment_uuid": deployment_uuid, "status": status}

    def cancel_deployment(self, deployment_uuid: str) -> None:
        self.cancelled.append(deployment_uuid)
        self.deployment_statuses[deployment_uuid] = ["cancelled"]


class TestCoolifyRelease(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.contract_path = Path(self.directory.name) / "contract.json"
        self.contract_path.write_text(json.dumps(sample_contract()))

    def test_contract_loaded_matches_sample(self):
        loaded = release.load_contract(self.contract_path)
        sample = sample_contract()
        mismatches = release._compare_contract(loaded, sample)
        self.assertEqual(mismatches, [])

    def test_digest_and_tag_conversion(self):
        digest = f"sha256:{'a' * 64}"
        tag = f"sha256-{'a' * 64}"
        self.assertEqual(release.digest_to_tag(digest), tag)
        self.assertEqual(release.tag_to_digest(tag), digest)

        with self.assertRaises(release.ReleaseError):
            release.digest_to_tag("invalid:123")
        with self.assertRaises(release.ReleaseError):
            release.tag_to_digest("invalid-123")

    def test_contract_drift_detection(self):
        app = sample_contract() | {"uuid": APPLICATION_UUID, "limits_memory": "256m"}
        with self.assertRaises(release.ReleaseError) as ctx:
            release.verify_application(app, sample_contract(), APPLICATION_UUID)
        self.assertIn("limits_memory", str(ctx.exception))

    @patch.dict(os.environ, {"COOLIFY_TOKEN": "test-token"})
    @patch("infra.coolify_release.verify_image_revision")
    @patch("infra.coolify_release.check_public_baseline")
    @patch("infra.coolify_release.check_public_release")
    def test_happy_path_deployment(
        self,
        mock_release_smoke,
        mock_baseline_smoke,
        mock_verify_img,
    ):
        client = FakeClient(sample_contract(), [["in_progress", "finished"]])
        args = argparse.Namespace(
            coolify_url="https://coolify.internal",
            application_uuid=APPLICATION_UUID,
            public_url="https://netfilmx-movie-catalog.grela.dev",
            digest=NEW_DIGEST,
            expected_revision=NEW_REVISION,
            contract=self.contract_path,
            deployment_timeout=5,
            poll_interval=0.001,
            settle_checks=1,
            settle_attempts=3,
            soak_checks=1,
        )

        with patch("infra.coolify_release.CoolifyClient", return_value=client):
            with patch(
                "infra.coolify_release.read_public_revision",
                side_effect=lambda url: client.live_revision,
            ):
                release.deploy_release(args)

        self.assertEqual(client.updates, [release.digest_to_tag(NEW_DIGEST)])
        self.assertEqual(client.queued, [DEPLOYMENT_UUID])
        self.assertEqual(client.cancelled, [])
        mock_baseline_smoke.assert_called_once()
        mock_release_smoke.assert_called_once()

    @patch.dict(os.environ, {"COOLIFY_TOKEN": "test-token"})
    def test_active_deployment_conflict(self):
        client = FakeClient(sample_contract(), [])
        client.application_deployments = [{"status": "in_progress"}]
        args = argparse.Namespace(
            coolify_url="https://coolify.internal",
            application_uuid=APPLICATION_UUID,
            public_url="https://netfilmx-movie-catalog.grela.dev",
            digest=NEW_DIGEST,
            expected_revision=NEW_REVISION,
            contract=self.contract_path,
            deployment_timeout=5,
            poll_interval=0.001,
            settle_checks=1,
            settle_attempts=3,
            soak_checks=1,
        )

        with patch("infra.coolify_release.CoolifyClient", return_value=client):
            with self.assertRaises(release.ReleaseError) as ctx:
                release.deploy_release(args)
            self.assertIn("already running", str(ctx.exception))

    @patch.dict(os.environ, {"COOLIFY_TOKEN": "test-token"})
    @patch("infra.coolify_release.verify_image_revision")
    @patch("infra.coolify_release.check_public_baseline")
    @patch("infra.coolify_release.check_public_release")
    def test_already_configured_and_active_noop(
        self,
        mock_release_smoke,
        mock_baseline_smoke,
        mock_verify_img,
    ):
        client = FakeClient(sample_contract(), [])
        client.application["docker_registry_image_tag"] = release.digest_to_tag(NEW_DIGEST)
        client.live_revision = NEW_REVISION

        args = argparse.Namespace(
            coolify_url="https://coolify.internal",
            application_uuid=APPLICATION_UUID,
            public_url="https://netfilmx-movie-catalog.grela.dev",
            digest=NEW_DIGEST,
            expected_revision=NEW_REVISION,
            contract=self.contract_path,
            deployment_timeout=5,
            poll_interval=0.001,
            settle_checks=1,
            settle_attempts=3,
            soak_checks=1,
        )

        with patch("infra.coolify_release.CoolifyClient", return_value=client):
            with patch(
                "infra.coolify_release.read_public_revision",
                return_value=NEW_REVISION,
            ):
                release.deploy_release(args)

        self.assertEqual(client.updates, [])
        self.assertEqual(client.queued, [])
        mock_release_smoke.assert_called_once()

    @patch.dict(os.environ, {"COOLIFY_TOKEN": "test-token"})
    @patch("infra.coolify_release.verify_image_revision")
    @patch("infra.coolify_release.check_public_baseline")
    @patch("infra.coolify_release.check_public_release")
    def test_rollback_on_deployment_failure(
        self,
        mock_release_smoke,
        mock_baseline_smoke,
        mock_verify_img,
    ):
        client = FakeClient(
            sample_contract(),
            [
                ["in_progress", "failed"],   # Candidate fails
                ["in_progress", "finished"], # Rollback succeeds
            ],
        )

        args = argparse.Namespace(
            coolify_url="https://coolify.internal",
            application_uuid=APPLICATION_UUID,
            public_url="https://netfilmx-movie-catalog.grela.dev",
            digest=NEW_DIGEST,
            expected_revision=NEW_REVISION,
            contract=self.contract_path,
            deployment_timeout=5,
            poll_interval=0.001,
            settle_checks=1,
            settle_attempts=3,
            soak_checks=1,
        )

        with patch("infra.coolify_release.CoolifyClient", return_value=client):
            with patch(
                "infra.coolify_release.read_public_revision",
                side_effect=lambda url: client.live_revision,
            ):
                with self.assertRaises(release.ReleaseError) as ctx:
                    release.deploy_release(args)
                self.assertIn("rollback", str(ctx.exception))

        self.assertEqual(
            client.updates,
            [release.digest_to_tag(NEW_DIGEST), release.digest_to_tag(OLD_DIGEST)],
        )
        self.assertEqual(client.queued, [DEPLOYMENT_UUID, ROLLBACK_UUID])

    @patch.dict(os.environ, {"COOLIFY_TOKEN": "test-token"})
    @patch("infra.coolify_release.verify_image_revision")
    @patch("infra.coolify_release.check_public_baseline")
    def test_rollback_on_consecutive_probe_failures_during_overlap(
        self,
        mock_baseline_smoke,
        mock_verify_img,
    ):
        client = FakeClient(
            sample_contract(),
            [
                ["in_progress", "in_progress", "in_progress", "in_progress"], # Candidate
                ["in_progress", "finished"],                                   # Rollback
            ],
        )

        probe_responses = [
            OLD_REVISION,  # Baseline
            release.ReleaseError("down"), # Failure 1
            release.ReleaseError("down"), # Failure 2
            release.ReleaseError("down"), # Failure 3 -> triggers cancel & rollback
            OLD_REVISION,  # Rollback revision checks
            OLD_REVISION,
            OLD_REVISION,
            OLD_REVISION,
        ]

        def dynamic_probe(url):
            if probe_responses:
                val = probe_responses.pop(0)
                if isinstance(val, Exception):
                    raise val
                return val
            return OLD_REVISION

        args = argparse.Namespace(
            coolify_url="https://coolify.internal",
            application_uuid=APPLICATION_UUID,
            public_url="https://netfilmx-movie-catalog.grela.dev",
            digest=NEW_DIGEST,
            expected_revision=NEW_REVISION,
            contract=self.contract_path,
            deployment_timeout=5,
            poll_interval=0.001,
            settle_checks=1,
            settle_attempts=3,
            soak_checks=1,
        )

        with patch("infra.coolify_release.CoolifyClient", return_value=client):
            with patch("infra.coolify_release.read_public_revision", side_effect=dynamic_probe):
                with self.assertRaises(release.ReleaseError) as ctx:
                    release.deploy_release(args)
                self.assertIn("three consecutive deployment probes", str(ctx.exception))

        self.assertEqual(client.cancelled, [DEPLOYMENT_UUID])
        self.assertEqual(client.queued, [DEPLOYMENT_UUID, ROLLBACK_UUID])




class TestCoolifyReleaseEdgeCases(unittest.TestCase):
    setUp = TestCoolifyRelease.setUp
    @patch.dict(os.environ, {"COOLIFY_TOKEN": "test-token"})
    @patch("infra.coolify_release.verify_image_revision")
    @patch("infra.coolify_release.check_public_baseline")
    def test_uncertain_deployment_request_stops_mutation(
        self,
        mock_baseline,
        mock_verify_img,
    ):
        class UncertainClient(FakeClient):
            def queue_deployment(self, application_uuid: str) -> str:
                raise release.UncertainDeployment("network dropped during deploy request")

        client = UncertainClient(sample_contract(), [])
        args = argparse.Namespace(
            coolify_url="https://coolify.internal",
            application_uuid=APPLICATION_UUID,
            public_url="https://netfilmx-movie-catalog.grela.dev",
            digest=NEW_DIGEST,
            expected_revision=NEW_REVISION,
            contract=self.contract_path,
            deployment_timeout=5,
            poll_interval=0.001,
            settle_checks=1,
            settle_attempts=3,
            soak_checks=1,
        )

        with patch("infra.coolify_release.CoolifyClient", return_value=client):
            with patch("infra.coolify_release.read_public_revision", return_value=OLD_REVISION):
                with self.assertRaises(release.UncertainDeployment) as ctx:
                    release.deploy_release(args)
                self.assertIn("network dropped", str(ctx.exception))

        self.assertEqual(client.updates, [release.digest_to_tag(NEW_DIGEST)])
        self.assertEqual(client.queued, [])

    def test_cancellation_must_reach_terminal_state(self):
        client = FakeClient(sample_contract(), [])
        client.deployment_statuses[DEPLOYMENT_UUID] = ["in_progress", "cancelled"]

        with patch("infra.coolify_release.time.sleep", return_value=None):
            release.cancel_and_confirm(
                client,
                DEPLOYMENT_UUID,
                timeout=1,
                interval=0.001,
            )

        self.assertEqual(client.cancelled, [DEPLOYMENT_UUID])

    @patch.dict(os.environ, {"COOLIFY_TOKEN": "test-token"})
    @patch("infra.coolify_release.verify_image_revision")
    @patch("infra.coolify_release.check_public_baseline")
    def test_lost_active_status_does_not_queue_rollback(self, baseline, image):
        class LostStatusClient(FakeClient):
            def get_deployment(self, deployment_uuid):
                raise release.ReleaseError("status request failed")

        client = LostStatusClient(sample_contract(), [["in_progress"]])
        args = argparse.Namespace(
            coolify_url="https://coolify.internal", application_uuid=APPLICATION_UUID,
            public_url="https://catalogue.example.test", digest=NEW_DIGEST,
            expected_revision=NEW_REVISION, contract=self.contract_path,
            deployment_timeout=5, poll_interval=0.001, settle_checks=1,
            settle_attempts=3, soak_checks=1,
        )
        with patch("infra.coolify_release.CoolifyClient", return_value=client), patch(
            "infra.coolify_release.read_public_revision", return_value=OLD_REVISION
        ):
            with self.assertRaises(release.UncertainDeployment):
                release.deploy_release(args)
        self.assertEqual(client.queued, [DEPLOYMENT_UUID])
        self.assertEqual(client.updates, [release.digest_to_tag(NEW_DIGEST)])
        self.assertEqual(client.cancelled, [])


    def test_cancellation_reconciles_error_with_terminal_state(self):
        class ErrorOnCancelClient(FakeClient):
            def cancel_deployment(self, deployment_uuid: str) -> None:
                self.cancelled.append(deployment_uuid)
                raise release.ReleaseError("HTTP 502 Bad Gateway")

        client = ErrorOnCancelClient(sample_contract(), [])
        client.deployment_statuses[DEPLOYMENT_UUID] = ["cancelled-by-user"]
        with patch("infra.coolify_release.time.sleep", return_value=None):
            release.cancel_and_confirm(client, DEPLOYMENT_UUID, timeout=1, interval=0.001)
        self.assertEqual(client.cancelled, [DEPLOYMENT_UUID])


class TestCoolifyTransport(unittest.TestCase):
    def setUp(self):
        self.client = release.CoolifyClient("https://coolify.example.test", "synthetic-token")

    def response(self, body: bytes):
        response = MagicMock()
        response.status = 200
        response.read.return_value = body
        response.__enter__.return_value = response
        return response

    @patch("infra.coolify_release.urllib.request.build_opener")
    def test_mutation_server_error_is_not_retried(self, build):
        build.return_value.open.side_effect = urllib.error.HTTPError(
            "https://coolify.example.test/api/v1/deploy", 502, "Bad Gateway", {}, None
        )
        with self.assertRaises(release.UncertainDeployment):
            self.client.queue_deployment(APPLICATION_UUID)
        self.assertEqual(build.return_value.open.call_count, 1)

    @patch("infra.coolify_release.urllib.request.build_opener")
    def test_truncated_mutation_response_is_uncertain(self, build):
        response = self.response(b"")
        response.read.side_effect = release.http.client.IncompleteRead(b"partial")
        build.return_value.open.return_value = response
        with self.assertRaises(release.UncertainDeployment):
            self.client.queue_deployment(APPLICATION_UUID)
        self.assertEqual(build.return_value.open.call_count, 1)

    @patch("infra.coolify_release.urllib.request.build_opener")
    def test_bounded_mutation_response_is_uncertain(self, build):
        build.return_value.open.return_value = self.response(b"x" * 1_048_577)
        with self.assertRaises(release.UncertainDeployment):
            self.client.queue_deployment(APPLICATION_UUID)
        self.assertEqual(build.return_value.open.call_count, 1)

    @patch("infra.coolify_release.time.sleep")
    @patch("infra.coolify_release.urllib.request.build_opener")
    def test_read_can_retry_a_transient_server_failure(self, build, sleep):
        build.return_value.open.side_effect = [
            urllib.error.HTTPError("https://coolify.example.test", 503, "Unavailable", {}, None),
            self.response(json.dumps({"uuid": APPLICATION_UUID}).encode()),
        ]
        self.assertEqual(self.client.get_application(APPLICATION_UUID)["uuid"], APPLICATION_UUID)
        self.assertEqual(build.return_value.open.call_count, 2)

    def test_incomplete_runtime_contract_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "contract.json"
            contract = sample_contract()
            del contract["limits_memory"]
            path.write_text(json.dumps(contract))
            with self.assertRaises(release.ReleaseError):
                release.load_contract(path)

    def test_drift_error_contains_field_names_only(self):
        expected = sample_contract()
        actual = expected | {"uuid": APPLICATION_UUID, "fqdn": "private-topology-value"}
        with self.assertRaises(release.ReleaseError) as caught:
            release.verify_application(actual, expected, APPLICATION_UUID)
        self.assertIn("fqdn", str(caught.exception))
        self.assertNotIn("private-topology-value", str(caught.exception))


if __name__ == "__main__":
    unittest.main()
