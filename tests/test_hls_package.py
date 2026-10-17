import pathlib
import sys
import tempfile
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / 'qualification'))
from hls_package import media_graph, safe_reference, peak_segment_bitrate


class HlsPublicationGraphTests(unittest.TestCase):
    def test_one_frame_tail_is_combined_with_a_valid_peak_window(self):
        segments = [{'duration': 6, 'bytes': 1000000}, {'duration': .04, 'bytes': 125000}]
        self.assertAlmostEqual(1125000 * 8 / 6.04, peak_segment_bitrate(segments))

    def test_references_cannot_escape_bundle_or_hide_query_credentials(self):
        for name in ['../private.ts', 'https://other.test/a.ts', '/absolute.ts', 'a.ts?token=secret', 'a%2fts', 'dir/a.ts']:
            with self.subTest(name=name), self.assertRaises(ValueError):
                safe_reference(name, '.ts')

    def test_missing_segment_blocks_publication_graph(self):
        with tempfile.TemporaryDirectory() as folder:
            file = pathlib.Path(folder) / 'stream.m3u8'
            file.write_text('#EXTM3U\n#EXT-X-PLAYLIST-TYPE:VOD\n#EXT-X-INDEPENDENT-SEGMENTS\n#EXT-X-TARGETDURATION:6\n#EXTINF:6,\nmissing.ts\n#EXT-X-ENDLIST\n')
            with self.assertRaises(ValueError): media_graph(file)

    def test_unfinished_playlist_is_not_a_publishable_vod(self):
        with tempfile.TemporaryDirectory() as folder:
            file = pathlib.Path(folder) / 'stream.m3u8'
            file.write_text('#EXTM3U\n#EXT-X-PLAYLIST-TYPE:VOD\n#EXT-X-INDEPENDENT-SEGMENTS\n#EXTINF:6,\na.ts\n')
            (file.parent / 'a.ts').write_bytes(b'local-test')
            with self.assertRaises(ValueError): media_graph(file)

    def test_complete_graph_lists_exact_local_segments_and_durations(self):
        with tempfile.TemporaryDirectory() as folder:
            file = pathlib.Path(folder) / 'stream.m3u8'
            file.write_text('#EXTM3U\n#EXT-X-PLAYLIST-TYPE:VOD\n#EXT-X-INDEPENDENT-SEGMENTS\n#EXT-X-TARGETDURATION:6\n#EXTINF:6,\na.ts\n#EXTINF:1,\nb.ts\n#EXT-X-ENDLIST\n')
            (file.parent / 'a.ts').write_bytes(b'first')
            (file.parent / 'b.ts').write_bytes(b'last')
            graph = media_graph(file)
            self.assertEqual(['a.ts', 'b.ts'], [s['name'] for s in graph])
            self.assertEqual([6, 1], [s['duration'] for s in graph])

    def test_hidden_key_uri_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            file = pathlib.Path(folder) / 'stream.m3u8'
            file.write_text('#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="https://other.test/key"\n')
            with self.assertRaises(ValueError): media_graph(file)
