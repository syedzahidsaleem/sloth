# SPEC-002: Sloth Download Pipeline, SponsorBlock Chapter Accuracy, Piped/Invidious Proxy, and Web Audio Player Architecture

## 1. Objective

Extract and modernize Spotube's download, tagging, proxy, and playback architecture into Sloth.
This specification establishes:
1. A resilient Python download engine (`server/downloader/downloader.py`) wrapping `yt-dlp` with format selection (`mp3`, `flac`, `opus`, `m4a`) and concurrency control.
2. Resolution of the **Spotube SponsorBlock Bug**: Spotube truncates SponsorBlock timestamps to integer seconds and prioritizes crowdsourced estimates over official `yt-dlp` chapter timestamps. Sloth extracts official `chapters` from `yt-dlp --write-info-json` and only falls back to sub-second SponsorBlock segments if no chapters are defined.
3. Mutagen-powered audio tagger (`server/downloader/tagger.py`) embedding all standard tags, embedded cover art, ISRC, and both USLT (unsynced) and SYLT (synchronized) lyrics.
4. Resilient Piped/Invidious proxy client in TypeScript (`src/sources/piped/index.ts`) with active instance health monitoring, latency scoring, and automatic failover rotation.
5. High-fidelity Web Audio Player architecture (`src/player/web-audio-player.ts`) supporting dual-channel equal-power crossfading, dynamic audio normalization (`dynaudnorm` compressor model), and OS MediaSession / SMTC integration.

---

## 2. Capability Map

| Module ID | Files | Responsibility |
|---|---|---|
| `downloader` | `server/downloader/downloader.py` | `yt-dlp` orchestration, format conversion, queue/retry, chapter extraction |
| `tagger` | `server/downloader/tagger.py` | ID3v2.4 / Vorbis / MP4 metadata tagging with cover art, ISRC, USLT, SYLT lyrics |
| `piped` | `src/sources/piped/index.ts` | Piped & Invidious proxy client, instance health check, rotation, audio stream extraction |
| `player` | `src/player/web-audio-player.ts` | Dual-bus Web Audio graph, equal-power crossfade, normalization compressor, MediaSession API |

---

## 3. Spotube SponsorBlock Analysis & Architectural Fix

### The Spotube Implementation Bug
In Spotube `skip_segments.dart`:
```dart
final start = obj["segment"].first.toInt();
final end = obj["segment"].last.toInt();
```
And in `audio_player_streams.dart`:
```dart
for (final segment in currentSegments!.segments) {
  final seconds = position.inSeconds;
  if (seconds < segment.start || seconds >= segment.end) continue;
  await audioPlayer.seek(Duration(seconds: segment.end + 1));
}
```
**Issues identified:**
1. **Precision loss**: Timestamps are truncated to integer seconds (`.toInt()`), resulting in jumps $\pm 999\text{ms}$ off from actual sponsor/non-music boundaries.
2. **Ignored official chapters**: Creators frequently include exact YouTube chapter timestamps in the video metadata (e.g., Intro, Music, Outro). Spotube ignores `chapters` in `yt-dlp` info JSON completely and relies solely on crowd-sourced SponsorBlock estimates.
3. **Audio clipping**: The `seek(Duration(seconds: segment.end + 1))` skips an extra full second after the segment, clipping the first notes of the intro or guitar riffs.

### The Sloth Architectural Fix
In `server/downloader/downloader.py`:
1. Use `yt-dlp --write-info-json` (or JSON extraction) to parse the official `chapters` list (`start_time`, `end_time`, `title`).
2. If official chapters identify non-music sections (e.g. `Intro`, `Sponsor`, `Outro`, `Credits`), use exact floating-point chapter boundaries.
3. If no official chapters exist, query SponsorBlock and preserve floating-point millisecond accuracy, avoiding arbitrary $+1\text{s}$ offsets.

---

## 4. Audio Metadata Tagger Contract (`tagger.py`)

Supported audio formats:
- MP3 (ID3v2.4 via `mutagen.id3`)
- FLAC (`mutagen.flac`)
- OGG / Opus (`mutagen.oggopus` / `mutagen.flac`)
- M4A / AAC (`mutagen.mp4`)

Metadata fields written:
- `title` (`TIT2` / `\xa9nam`)
- `artist` (`TPE1` / `\xa9ART`)
- `album` (`TALB` / `\xa9alb`)
- `album_artist` (`TPE2` / `aART`)
- `year` (`TDRC` / `\xa9day`)
- `track_number` & `total_tracks` (`TRCK` / `trkn`)
- `isrc` (`TSRC`)
- `artwork` (`APIC` / `covr`)
- `unsynced_lyrics` (`USLT`)
- `synced_lyrics` (`SYLT`)

---

## 5. Security & Input Hardening

1. **Subprocess Isolation**: When invoking `yt-dlp`, always use `shell=False` and pass arguments as a structured array (`List[str]`). Never concatenate shell strings.
2. **Path Traversal Guards**: Sanitize target filenames by removing path traversal characters (`../`, `..\`, control chars) and verify that the resolved target directory is strictly within the designated download directory.
3. **URL Validation**: Validate video IDs and proxy instance URLs using strict regexes before constructing network requests.
