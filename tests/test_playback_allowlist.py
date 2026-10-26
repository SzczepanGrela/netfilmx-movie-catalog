"""Tie both runtimes to the immutable reviewed catalogue, without media/network."""
import hashlib
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
class PlaybackAllowlistTests(unittest.TestCase):
    def test_version_manifest_counts_and_film_boundaries(self):
        data=json.loads((ROOT/'media-worker/catalogue.json').read_text())
        version=data.pop('version')
        self.assertEqual(version,hashlib.sha256(json.dumps(data,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest())
        self.assertEqual(data['manifestSha256'],hashlib.sha256((ROOT/'NetFilmx_Storage.PostgreSql/Catalogue/retained-media.json').read_bytes()).hexdigest())
        self.assertEqual(len(data['films']),7)
        protected={k:o for k,o in data['objects'].items() if o['film'] is not None}
        self.assertEqual(len(protected),1398)
        self.assertEqual(sum(o['size'] for o in protected.values()),1083549423)
        self.assertEqual(sum(o['film'] is None for o in data['objects'].values()),13)
        self.assertEqual(sum(len(f['subtitles']) for f in data['films'].values()),10)
        for slug,film in data['films'].items():
            self.assertEqual(protected[film['master']]['film'],slug)
            self.assertEqual(protected[film['master']]['mime'],'application/vnd.apple.mpegurl')
            for track in film['subtitles']:
                self.assertEqual(protected[track['objectKey']]['film'],slug)
        for key,obj in protected.items():
            self.assertTrue(key.startswith('videos/hls/'+obj['film']+'/') or key.startswith('subtitles/'+obj['film']+'/'))
            self.assertRegex(obj['sha256'],r'^[a-f0-9]{64}$')
            self.assertNotIn('..',key)
