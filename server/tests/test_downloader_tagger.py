"""
Tests for Sloth Downloader and Audio Tagger
Validates yt-dlp wrapper, SponsorBlock float precision, chapter prioritization,
and Mutagen ID3/Vorbis/MP4 tagging with ISRC and synced lyrics.
"""

import json
import os
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from server.downloader.downloader import (
    AudioContainer,
    AudioQuality,
    Downloader,
    DownloadOptions,
    SkipSegment,
    sanitize_filename,
)
from server.downloader.tagger import (
    AudioTagger,
    TrackMetadata,
    parse_lrc_to_synced_tuples,
)


class TestDownloader(unittest.TestCase):
    def test_sanitize_filename(self):
        self.assertEqual(sanitize_filename("Normal Title"), "Normal Title")
        self.assertEqual(
            sanitize_filename("AC/DC: Back in Black? *Remaster*"),
            "AC_DC_ Back in Black_ _Remaster",
        )
        # Test directory traversal prevention
        self.assertEqual(sanitize_filename("../../../etc/passwd"), "etc_passwd")
        self.assertEqual(sanitize_filename("..\\..\\windows\\system32"), "windows_system32")
        self.assertEqual(sanitize_filename("..."), "unnamed_track")

    def test_resolve_skip_segments_from_official_chapters(self):
        downloader = Downloader()

        video_info = {
            "chapters": [
                {"start_time": 0.0, "end_time": 15.42, "title": "Intro & Sponsor"},
                {"start_time": 15.42, "end_time": 195.2, "title": "Main Performance"},
                {"start_time": 195.2, "end_time": 210.0, "title": "Outro / Credits"},
            ]
        }

        segments = downloader.resolve_skip_segments("dummy_vid_123", video_info=video_info)

        self.assertEqual(len(segments), 2)
        # Check that float precision is retained (unlike Spotube's .toInt())
        self.assertEqual(segments[0].start, 0.0)
        self.assertEqual(segments[0].end, 15.42)
        self.assertEqual(segments[0].source, "chapter")
        self.assertEqual(segments[0].category, "Intro & Sponsor")

        self.assertEqual(segments[1].start, 195.2)
        self.assertEqual(segments[1].end, 210.0)
        self.assertEqual(segments[1].source, "chapter")

    @patch("urllib.request.urlopen")
    def test_resolve_skip_segments_sponsorblock_fallback(self, mock_urlopen):
        downloader = Downloader()

        # Mock SponsorBlock API response
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.read.return_value = json.dumps([
            {
                "category": "sponsor",
                "segment": [3.456, 28.789],
            },
            {
                "category": "selfpromo",
                "segment": [120.12, 135.95],
            }
        ]).encode("utf-8")
        mock_urlopen.return_value.__enter__.return_value = mock_response

        # No official chapters provided -> fallback to SponsorBlock
        segments = downloader.resolve_skip_segments("dummy_vid_456", video_info={"chapters": []})

        self.assertEqual(len(segments), 2)
        self.assertAlmostEqual(segments[0].start, 3.456, places=3)
        self.assertAlmostEqual(segments[0].end, 28.789, places=3)
        self.assertEqual(segments[0].source, "sponsorblock")
        self.assertEqual(segments[0].category, "sponsor")

        self.assertAlmostEqual(segments[1].start, 120.12, places=2)
        self.assertAlmostEqual(segments[1].end, 135.95, places=2)


class TestAudioTagger(unittest.TestCase):
    def test_parse_lrc_to_synced_tuples(self):
        raw_lrc = """
        [ti:Test Song]
        [ar:Test Artist]
        [00:04.50]First line of lyrics
        [00:15.80]Second line of lyrics
        [01:02.125]Third line in minute one
        """
        tuples = parse_lrc_to_synced_tuples(raw_lrc)
        self.assertEqual(len(tuples), 3)

        self.assertEqual(tuples[0][0], "First line of lyrics")
        self.assertEqual(tuples[0][1], 4500)

        self.assertEqual(tuples[1][0], "Second line of lyrics")
        self.assertEqual(tuples[1][1], 15800)

        self.assertEqual(tuples[2][0], "Third line in minute one")
        self.assertEqual(tuples[2][1], 62125)

    @patch("server.downloader.tagger.ID3")
    def test_tag_mp3_with_isrc_and_lyrics(self, mock_id3_cls):
        mock_id3 = MagicMock()
        mock_id3_cls.return_value = mock_id3

        meta = TrackMetadata(
            title="Bohemian Rhapsody",
            artist="Queen",
            album="A Night at the Opera",
            album_artist="Queen",
            year=1975,
            track_number=4,
            total_tracks=12,
            genre="Rock",
            isrc="GBUM71029606",
            plain_lyrics="Is this the real life?",
            synced_lyrics=[("Is this the real life?", 1000), ("Is this just fantasy?", 4500)],
            cover_art_bytes=b"\xff\xd8\xff\xe0" + b"\x00" * 20,
        )

        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
            f.write(b"dummy mp3 data")
            temp_path = f.name

        try:
            success = AudioTagger.tag_file(temp_path, meta)
            self.assertTrue(success)

            # Verify that tags were added to ID3
            tag_calls = mock_id3.add.call_args_list
            added_tag_types = [call[0][0].__class__.__name__ for call in tag_calls]

            self.assertIn("TIT2", added_tag_types)
            self.assertIn("TPE1", added_tag_types)
            self.assertIn("TALB", added_tag_types)
            self.assertIn("TPE2", added_tag_types)
            self.assertIn("TDRC", added_tag_types)
            self.assertIn("TRCK", added_tag_types)
            self.assertIn("TSRC", added_tag_types)  # ISRC frame
            self.assertIn("APIC", added_tag_types)  # Cover art frame
            self.assertIn("USLT", added_tag_types)  # Unsynced lyrics frame
            self.assertIn("SYLT", added_tag_types)  # Synchronized lyrics frame

            # Verify ISRC value
            tsrc_call = [call[0][0] for call in tag_calls if call[0][0].__class__.__name__ == "TSRC"][0]
            self.assertEqual(tsrc_call.text, ["GBUM71029606"])

            # Verify save was called
            mock_id3.save.assert_called_once()
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)


if __name__ == "__main__":
    unittest.main()
