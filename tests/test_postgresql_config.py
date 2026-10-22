"""Guard the PG18 image/storage transition and ownership boundary without Docker."""
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import Mock

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('catalogue_recovery', ROOT / 'infra/catalogue-recovery.py')
recovery = importlib.util.module_from_spec(spec)
spec.loader.exec_module(recovery)


class PostgreSqlConfigurationTests(unittest.TestCase):
    def test_active_ci_compose_and_helpers_share_reviewed_pin_and_parent_mount(self):
        config = json.loads((ROOT / 'infra/postgresql.json').read_text())
        self.assertRegex(config['image'], r'^docker.io/library/postgres:18\.\d+-trixie@sha256:[a-f0-9]{64}$')
        self.assertTrue(config['pgdata'].startswith(config['volumeTarget'] + '/18/'))
        for path in ['.github/workflows/ci-cd.yml', 'docker-compose.yml']:
            content = (ROOT / path).read_text()
            self.assertIn(config['image'], content, path)
            self.assertIn(config['pgdata'], content, path)
            self.assertNotIn('/var/lib/postgresql/data', content, path)
        self.assertEqual(recovery.PG_IMAGE, config['image'])
        smoke = (ROOT / 'infra/image-smoke.sh').read_text()
        self.assertIn('infra/postgresql.json', smoke)
        self.assertNotIn('/var/lib/postgresql/data', smoke)
        self.assertIn('pg18data:/var/lib/postgresql', (ROOT / 'docker-compose.yml').read_text())

    def test_recreation_rejects_a_volume_not_created_by_this_run_before_docker(self):
        with tempfile.TemporaryDirectory() as output:
            harness = recovery.Harness('local', 'a' * 40, Path(output), database_only=True)
            harness.docker = Mock()
            harness.start = Mock()
            with self.assertRaisesRegex(recovery.Failure, 'created by this run'):
                harness.pg('pg-original', volume='old-pg16-or-live-volume')
            harness.docker.assert_not_called()
            harness.start.assert_not_called()

    def test_recreation_rechecks_ownership_label_before_starting_a_container(self):
        with tempfile.TemporaryDirectory() as output:
            harness = recovery.Harness('local', 'a' * 40, Path(output), database_only=True)
            harness.volumes.append('owned-once')
            harness.docker = Mock(return_value=subprocess.CompletedProcess([], 0, b'different-owner\n'))
            harness.start = Mock()
            with self.assertRaisesRegex(recovery.Failure, 'ownership differs'):
                harness.pg('pg-original', volume='owned-once')
            harness.start.assert_not_called()


if __name__ == '__main__':
    unittest.main()
