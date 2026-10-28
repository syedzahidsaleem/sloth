/**
 * Sloth LRC Lyrics Parser & String Utilities
 * Ported from Metrolist (GPL-3.0) and optimized for Sloth
 *
 * Provides LRC timestamp parsing, line/word synchronization,
 * credit line stripping, and title/artist normalization.
 */

export interface WordTiming {
  word: string;
  startMs: number;
  endMs?: number;
}

export interface SyncedLyricsLine {
  timeMs: number;
  text: string;
  words?: WordTiming[];
}

export interface ParsedLyrics {
  isSynced: boolean;
  lines: SyncedLyricsLine[];
  plainText: string;
  trackName?: string;
  artistName?: string;
  duration?: number;
}

/**
 * Regex patterns to clean noise from song titles (mirrored from Metrolist LrcLib.kt)
 */
export const TITLE_CLEANUP_PATTERNS: RegExp[] = [
  /\s*\(.*?(official|video|audio|lyrics|lyric|visualizer|hd|hq|4k|remaster|remix|live|acoustic|version|edit|extended|radio|clean|explicit).*?\)/gi,
  /\s*\[.*?(official|video|audio|lyrics|lyric|visualizer|hd|hq|4k|remaster|remix|live|acoustic|version|edit|extended|radio|clean|explicit).*?\]/gi,
  /\s*【.*?】/g,
  /\s*\|.*$/g,
  /\s*-\s*(official|video|audio|lyrics|lyric|visualizer).*$/gi,
  /\s*\(feat\..*?\)/gi,
  /\s*\(ft\..*?\)/gi,
  /\s*feat\..*$/gi,
  /\s*ft\..*$/gi,
];

/**
 * Separators used to isolate the primary artist
 */
export const ARTIST_SEPARATORS: string[] = [
  ' & ',
  ' and ',
  ', ',
  ' x ',
  ' X ',
  ' feat. ',
  ' feat ',
  ' ft. ',
  ' ft ',
  ' featuring ',
  ' with ',
];

/**
 * Regex to parse standard LRC timestamps: [mm:ss.xx] or [mm:ss.xxx]
 */
export const LRC_TIMESTAMP_REGEX = /\[(\d{1,2}):(\d{2})\.(\d{2,3})\]/g;
export const SINGLE_LRC_TIMESTAMP_REGEX = /^\[(\d{1,2}):(\d{2})\.(\d{2,3})\]/;

/**
 * Syllable or word-level timestamp: <mm:ss.xx> or <mm:ss.xxx>
 */
export const WORD_TIMESTAMP_REGEX = /<(\d{1,2}):(\d{2})\.(\d{2,3})>/g;

/**
 * Sanitizes song title for lyric search
 */
export function cleanTitle(title: string): string {
  let cleaned = title.trim();
  for (const pattern of TITLE_CLEANUP_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  return cleaned.trim();
}

/**
 * Extracts primary artist name
 */
export function cleanArtist(artist: string): string {
  let cleaned = artist.trim();
  for (const separator of ARTIST_SEPARATORS) {
    const lower = cleaned.toLowerCase();
    const sepLower = separator.toLowerCase();
    const index = lower.indexOf(sepLower);
    if (index !== -1) {
      cleaned = cleaned.substring(0, index);
      break;
    }
  }
  return cleaned.trim();
}

/**
 * Levenshtein distance between two strings
 */
export function levenshteinDistance(s1: string, s2: string): number {
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix: number[][] = Array.from({ length: len1 + 1 }, () => new Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * String similarity score from 0.0 to 1.0 (mirrored from Metrolist)
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.trim().toLowerCase();
  const s2 = str2.trim().toLowerCase();

  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.8;
  }

  const maxLength = Math.max(s1.length, s2.length);
  const dist = levenshteinDistance(s1, s2);
  return 1.0 - dist / maxLength;
}

/**
 * Converts timestamp string components (mm, ss, xx) into total milliseconds.
 * Accurately parses centiseconds (2 digits) and milliseconds (3 digits).
 *
 * @param minutes - String representation of minutes
 * @param seconds - String representation of seconds
 * @param hundredths - String representation of centiseconds or milliseconds
 * @returns Total milliseconds integer
 */
export function parseTimestampToMs(minutes: string, seconds: string, hundredths: string): number {
  const min = parseInt(minutes, 10) || 0;
  const sec = parseInt(seconds, 10) || 0;
  let ms = parseInt(hundredths, 10) || 0;

  // If 2 digits, it's centiseconds (multiply by 10)
  if (hundredths.length === 2) {
    ms *= 10;
  }

  return min * 60 * 1000 + sec * 1000 + ms;
}

/**
 * Filter out credits and metadata tags from lyrics (from Metrolist)
 */
export function filterLyricsCreditLines(text: string): string {
  const lines = text.split('\n');
  const filtered = lines.filter((line) => {
    let content = line.trim();

    // Strip leading timestamps or markers
    let stripping = true;
    while (stripping) {
      const prevLen = content.length;
      content = content
        .replace(/^\[\d{1,2}:\d{2}\.\d{2,3}\]/, '')
        .replace(/^\{agent:[^}]+\}/, '')
        .replace(/^\{bg\}/, '')
        .replace(/^\[bg:.*\]/, '')
        .replace(/^v\d+:/, '')
        .trim();
      stripping = content.length < prevLen;
    }

    const lower = content.toLowerCase();
    const isCredit =
      lower.startsWith('synced by') ||
      lower.startsWith('lyrics by') ||
      lower.startsWith('music by') ||
      lower.startsWith('arranged by') ||
      (lower.startsWith('[') && lower.endsWith(']') && lower.length < 40 && lower.includes('synced by'));

    return !isCredit;
  });

  return filtered.join('\n');
}

/**
 * Parses word-level timestamps inside a line if enhanced LRC format is present:
 * [00:10.00] <00:10.00> Hello <00:10.50> World <00:11.00>
 */
export function parseWordTimings(line: string): WordTiming[] | undefined {
  if (!WORD_TIMESTAMP_REGEX.test(line)) {
    // Generate synthetic word timings across line duration if requested
    const words = line.replace(LRC_TIMESTAMP_REGEX, '').trim().split(/\s+/);
    if (words.length <= 1 || !words[0]) return undefined;
    return undefined;
  }

  WORD_TIMESTAMP_REGEX.lastIndex = 0;
  const segments: WordTiming[] = [];
  const parts = line.split(WORD_TIMESTAMP_REGEX);
  // Format: [pre, mm, ss, xx, word, mm, ss, xx, word...]

  for (let i = 1; i < parts.length; i += 4) {
    const min = parts[i];
    const sec = parts[i + 1];
    const xx = parts[i + 2];
    const wordText = (parts[i + 3] || '').trim();

    if (min && sec && xx) {
      const timing = parseTimestampToMs(min, sec, xx);
      if (wordText) {
        segments.push({
          word: wordText,
          startMs: timing,
        });
      }
    }
  }

  // Calculate approximate end times
  for (let i = 0; i < segments.length - 1; i++) {
    segments[i].endMs = segments[i + 1].startMs;
  }

  return segments.length > 0 ? segments : undefined;
}

/**
 * Parses raw LRC text into structured SyncedLyricsLine items
 */
export function parseLrc(rawLrc: string): ParsedLyrics {
  if (!rawLrc || typeof rawLrc !== 'string') {
    return { isSynced: false, lines: [], plainText: '' };
  }

  const cleanedText = filterLyricsCreditLines(rawLrc);
  const rawLines = cleanedText.split('\n');

  const parsedLines: SyncedLyricsLine[] = [];
  const plainTextLines: string[] = [];

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for ID tags like [ar: Artist], [ti: Title], [offset: 0]
    if (/^\[(ti|ar|al|by|offset|length):.*\]$/i.test(trimmed)) {
      continue;
    }

    // Check for timestamps in the line: [00:12.34][00:45.67] Lyrics text
    const matches = Array.from(trimmed.matchAll(LRC_TIMESTAMP_REGEX));

    if (matches.length > 0) {
      // Remove all timestamps from the line to extract the lyric text
      let lyricText = trimmed.replace(LRC_TIMESTAMP_REGEX, '').trim();

      // Check for word-level timings
      const wordTimings = parseWordTimings(trimmed);

      // Clean up syllable tags from display text
      lyricText = lyricText.replace(/<\d{1,2}:\d{2}\.\d{2,3}>/g, '').trim();

      for (const match of matches) {
        const timeMs = parseTimestampToMs(match[1], match[2], match[3]);
        parsedLines.push({
          timeMs,
          text: lyricText,
          words: wordTimings,
        });
      }

      if (lyricText) {
        plainTextLines.push(lyricText);
      }
    } else {
      // Plain line without timestamps
      plainTextLines.push(trimmed);
    }
  }

  // Sort lines by timestamp ascending
  parsedLines.sort((a, b) => a.timeMs - b.timeMs);

  return {
    isSynced: parsedLines.length > 0,
    lines: parsedLines,
    plainText: plainTextLines.join('\n'),
  };
}

export const SAMPLE_MIDNIGHT_CITY_LRC = `[00:00.00] (Instrumental Synthesizer Intro)
[00:28.50] Waiting in a car
[00:32.40] Waiting for a ride in the dark
[00:36.20] The night city grows
[00:40.10] Look and see her eyes, they glow
[00:44.00] Waiting in a car
[00:47.80] Waiting for a ride in the dark
[00:51.60] The night city grows
[00:55.50] Look and see her eyes, they glow
[01:00.00] Waiting in a car
[01:03.80] Waiting for a ride in the dark
[01:07.50] The night city grows
[01:11.40] Look and see her eyes, they glow
[01:15.50] The city is my church
[01:19.40] It wraps me in the blinding twilight
[01:23.20] Waiting in a car
[01:27.00] Waiting for a ride in the dark
[01:31.00] The night city grows
[01:35.00] Look and see her eyes, they glow
[01:40.00] (Electronic Saxophone Solo)
[02:15.00] The city is my church
[02:19.00] It wraps me in the blinding twilight
[02:23.00] Waiting in a car
[02:27.00] Waiting for a ride in the dark`;

export const SAMPLE_STARBOY_LRC = `[00:00.00] (Intro: Daft Punk synth groove)
[00:05.10] I'm tryna put you in the worst mood, ah
[00:08.50] P1 cleaner than your church shoes, ah
[00:11.90] Milli point two just to hurt you, ah
[00:15.30] All red Lamb' just to tease you, ah
[00:18.70] None of these toys on lease too, ah
[00:22.10] Made your whole year in a week too, yeah
[00:25.50] Main bitch out of your league too, ah
[00:28.90] Side bitch out of your league too, ah
[00:32.30] House so empty, need a centerpiece
[00:35.70] Twenty racks a table cut from ebony
[00:39.10] Cut that ivory into skinny pieces
[00:42.50] Then she clean it with her face, man, I love my baby
[00:46.00] You talkin' money, need a hearing aid
[00:49.40] You talkin' 'bout me, I don't see the shade
[00:52.80] Switch up my style, I take any lane
[00:56.20] I switch up my cup, I kill any pain
[01:00.00] Ha-ha-ha-ha-ha-ha-ha-ha-ha-ha
[01:03.50] Look what you've done!
[01:07.00] Ha-ha-ha-ha-ha-ha-ha-ha-ha-ha
[01:10.50] I'm a, I'm a, I'm a Starboy
[01:13.90] Ha-ha-ha-ha-ha-ha-ha-ha-ha-ha
[01:17.40] Look what you've done!
[01:20.80] Ha-ha-ha-ha-ha-ha-ha-ha-ha-ha
[01:24.30] I'm a, I'm a, I'm a Starboy
[01:27.70] Everyday somebody try to test me, ah
[01:31.10] Everyday somebody try to end me, ah
[01:34.50] Pull off in that Roadster SV, ah
[01:37.90] Pockets overweight, gettin' hefty, ah
[01:41.30] Coming for the king, that's a far cry, I
[01:44.70] I come alive in the fall time, I
[01:48.10] No competition, I don't really listen
[01:51.50] I'm in the blue Mulsanne bumping New Edition
[01:55.00] House so empty, need a centerpiece
[01:58.40] Twenty racks a table cut from ebony
[02:01.80] Cut that ivory into skinny pieces
[02:05.20] Then she clean it with her face, man, I love my baby
[02:08.60] Look what you've done!
[02:12.00] I'm a, I'm a, I'm a Starboy`;

export const SAMPLE_INSTANT_CRUSH_LRC = `[00:00.00] (Synth Arpeggio Intro)
[00:15.50] I didn't want to be the one to forget
[00:19.40] I thought of everything I'd never regret
[00:23.20] A little time with you is all that I get
[00:27.10] That's all we need because it's all we can take
[00:31.00] One taste of you and I am already hooked
[00:34.90] I never thought that I would ever look back
[00:38.80] But now you're gone and I am feeling the cold
[00:42.70] It's like a story that has already been told
[00:46.50] And we will never be alone again
[00:50.40] 'Cause it doesn't happen every day
[00:54.30] Kinda counted on you being a friend
[00:58.20] Can I speak or should I be on my way?
[01:02.00] Now I'd tell you what you wanted to see
[01:05.90] Don't you worry 'cause it's all about me
[01:09.80] Now I'd tell you what you wanted to hear
[01:13.70] Don't you worry 'cause I'm already here
[01:17.50] (Synthesizer Solo & Vocoder)
[01:48.50] And we will never be alone again
[01:52.40] 'Cause it doesn't happen every day
[01:56.30] Kinda counted on you being a friend
[02:00.20] Can I speak or should I be on my way?`;

export const SAMPLE_ONE_MORE_TIME_LRC = `[00:00.00] (Groovy French House Intro)
[00:15.00] One more time
[00:18.50] Music's got me feeling so free
[00:22.50] We're gonna celebrate
[00:26.50] Celebrate and dance so free
[00:30.50] One more time
[00:34.50] Music's got me feeling so free
[00:38.50] We're gonna celebrate
[00:42.50] Celebrate and dance so free
[00:46.50] One more time
[00:50.00] Music's got me feeling so free
[00:54.00] We're gonna celebrate
[00:58.00] Celebrate and dance so free
[01:02.00] One more time
[01:06.00] We're gonna celebrate
[01:10.00] Oh yeah, all right, don't stop the dancing
[01:18.00] One more time
[01:22.00] We're gonna celebrate
[01:26.00] Oh yeah, all right, don't stop the dancing`;

export const SAMPLE_VERIDIS_QUO_LRC = `[00:00.00] (Melodic Pipe Organ & Synthesizer Intro)
[00:30.00] (Arpeggiated Harpsichord & Ambient Strings)
[01:00.00] (Deep Electronic Bassline Entrance)
[01:30.00] (Harmonic Synth Layering)
[02:00.00] (Instrumental Melodic Peak)
[02:30.00] (Atmospheric Melancholic Resolution)
[03:00.00] (Gentle Fade Out)`;

export const SAMPLE_BAARISHEIN_LRC = `[00:00.00] (Gentle Acoustic Guitar Picking Intro)
[00:12.50] Hawaaon mein bahenge
[00:18.20] Ghataon mein rahenge
[00:24.00] Tu barkha meri, main tera baadal piya
[00:35.50] Jo barse toh sardi ke din thande lagein
[00:47.00] Teri baahon mein aake yeh mann saansein bhare
[00:58.50] Yeh baarishein aisi hain
[01:04.20] Bheega rahi hain yaadein
[01:10.00] Yeh baarishein aisi hain
[01:15.80] Keh rahi hain baatein
[01:21.50] Tu sun le zara, tu sun le zara
[01:27.20] Mere dil ki yeh daastaan
[01:33.00] Yeh baarishein aisi hain
[01:38.80] Bheega rahi hain yaadein`;

export const SAMPLE_PEE_LOON_LRC = `[00:00.00] (Acoustic Guitar & Flute Intro)
[00:14.20] Pee loon tere neele neele naino se shabnam
[00:21.00] Pee loon tere geele geele hoto ki sargam
[00:27.80] Pee loon hai peene ka mausam
[00:34.50] Tere sang ishq taari hai
[00:38.00] Tere sang ik khumari hai
[00:41.50] Tere sang chain bhi mujhko
[00:45.00] Tere sang bekaraari hai
[00:48.50] Tere sang ishq taari hai
[00:52.00] Tere sang ik khumari hai
[00:55.50] Tere sang chain bhi mujhko
[00:59.00] Tere sang bekaraari hai
[01:02.50] Pee loon tere neele neele naino se shabnam
[01:09.50] Pee loon tere geele geele hoto ki sargam
[01:16.50] Pee loon hai peene ka mausam`;

export const SAMPLE_LEVITATING_LRC = `[00:00.00] (Funk Bassline & Handclaps Intro)
[00:04.50] If you wanna run away with me, I know a galaxy
[00:09.00] And I can take you for a ride
[00:13.20] I had a premonition that we fell into a rhythm
[00:17.60] Where the music don't stop for life
[00:21.80] Glitter in the sky, glitter in my eyes
[00:26.00] Shining just the way I like
[00:30.20] If you're feeling like you need a little bit of company
[00:34.50] You met me at the perfect time
[00:38.80] You want me, I want you, baby
[00:43.00] My sugarboo, I'm levitating
[00:47.40] The Milky Way, we're renegading
[00:51.60] Yeah, yeah, yeah, yeah, yeah
[00:55.80] I got you, moonlight, you're my starlight
[01:00.00] I need you all night, come on, dance with me
[01:04.40] I'm levitating`;

export const SAMPLE_BLINDING_LIGHTS_LRC = `[00:00.00] (Retro 80s Synth Intro)
[00:14.20] Yeah
[00:18.50] I've been tryna call
[00:21.20] I've been on my own for long enough
[00:25.80] Maybe you can show me how to love, maybe
[00:32.40] I'm going through withdrawals
[00:35.80] You don't even have to do too much
[00:40.40] You can turn me on with just a touch, baby
[00:46.50] I look around and Sin City's cold and empty
[00:51.50] No one's around to judge me
[00:55.00] I can't see clearly when you're gone
[01:01.20] I said, ooh, I'm blinded by the lights
[01:08.00] No, I can't sleep until I feel your touch
[01:14.50] I said, ooh, I'm drowning in the night
[01:21.80] Oh, when I'm like this, you're the one I trust`;

export const SAMPLE_KESARIYA_LRC = `[00:00.00] (Acoustic Guitar & Santoor Intro)
[00:15.50] Mujhko itna bataye koi
[00:21.20] Kaise tujhse dil na lagaye koi
[00:28.00] Rabba ne tujhko banane mein
[00:32.50] Kardi hai husn ki khaali tijoriyaan
[00:38.00] Kaajal ki siyaahi se likhi
[00:42.50] Hai tune jaane kitno ki love storiyaan
[00:49.00] Kesariya tera ishq hai piya
[00:54.50] Rang jaaun jo main haath lagaun
[00:59.80] Din beete saara teri fikr mein
[01:05.20] Rain saari teri khair manaun
[01:10.50] Kesariya tera ishq hai piya
[01:16.00] Rang jaaun jo main haath lagaun`;

/**
 * Returns matching curated offline fallback LRC if available
 */
export function getCuratedFallbackLrc(title: string, artist = ''): string | null {
  const t = title.toLowerCase();
  const a = artist.toLowerCase();

  if (t.includes('midnight city')) return SAMPLE_MIDNIGHT_CITY_LRC;
  if (t.includes('starboy')) return SAMPLE_STARBOY_LRC;
  if (t.includes('instant crush')) return SAMPLE_INSTANT_CRUSH_LRC;
  if (t.includes('one more time')) return SAMPLE_ONE_MORE_TIME_LRC;
  if (t.includes('veridis quo')) return SAMPLE_VERIDIS_QUO_LRC;
  if (t.includes('levitating')) return SAMPLE_LEVITATING_LRC;
  if (t.includes('baarishein') || a.includes('anuv jain')) return SAMPLE_BAARISHEIN_LRC;
  if (t.includes('pee loon')) return SAMPLE_PEE_LOON_LRC;
  if (t.includes('kesariya')) return SAMPLE_KESARIYA_LRC;
  if (t.includes('blinding lights')) return SAMPLE_BLINDING_LIGHTS_LRC;

  return null;
}

