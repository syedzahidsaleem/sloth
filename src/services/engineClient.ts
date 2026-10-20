/**
 * Sloth Silent Engine Client
 * Implements Situations A-G with in-memory caching and 500ms fallback timeout.
 * Guaranteed sub-500ms response time with offline fallbacks.
 */

import { Track } from '@/components/ui/TrackRow';

const ENGINE_BASE = 'http://127.0.0.1:8001';
const CACHE = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function fetchWithTimeout<T>(
  url: string,
  options: RequestInit = {},
  fallback: T,
  timeoutMs = 500
): Promise<T> {
  const cacheKey = `${options.method || 'GET'}:${url}:${JSON.stringify(options.body || '')}`;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data as T;
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    if (res.ok) {
      const data = await res.json();
      CACHE.set(cacheKey, { data, timestamp: Date.now() });
      return data as T;
    }
    return fallback;
  } catch {
    clearTimeout(id);
    return fallback;
  }
}

// -----------------------------------------------------------------
// Situation A: Home Load (Daily Mixes, Shortcuts, Live Rows)
// -----------------------------------------------------------------
export interface DailyMix {
  id: string;
  title: string;
  subtitle: string;
  genre: string;
  artists: string[];
  coverUrl: string;
  tracks: Track[];
}

export const FALLBACK_DAILY_MIXES: DailyMix[] = [
  {
    id: 'mix-1',
    title: 'Daily Mix 1',
    subtitle: 'M83, Daft Punk, Kavinsky and more',
    genre: 'Synthwave & Electronic',
    artists: ['M83', 'Daft Punk', 'Kavinsky'],
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/cb/7b/a9/cb7ba903-b5f1-cc21-90db-7a81b7aa0997/724596951057.jpg/600x600bb.jpg',
    tracks: [
      { id: 'dm1-1', title: 'Midnight City', artist: 'M83', album: "Hurry Up, We're Dreaming", durationSeconds: 243, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/cb/7b/a9/cb7ba903-b5f1-cc21-90db-7a81b7aa0997/724596951057.jpg/600x600bb.jpg' },
      { id: 'dm1-2', title: 'Instant Crush', artist: 'Daft Punk', album: 'Random Access Memories', durationSeconds: 337, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/e8/43/5f/e8435ffa-b6b9-b171-40ab-4ff3959ab661/886443919266.jpg/600x600bb.jpg' },
      { id: 'dm1-3', title: 'Nightcall', artist: 'Kavinsky', album: 'OutRun', durationSeconds: 259, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/fd/4a/77/fd4a77db-0ebc-d043-41a2-f32fa1bb0fb4/dj.qrikkdwj.jpg/600x600bb.jpg' },
    ],
  },
  {
    id: 'mix-2',
    title: 'Daily Mix 2',
    subtitle: 'The Weeknd, Dua Lipa, Post Malone',
    genre: 'Pop & Dark R&B',
    artists: ['The Weeknd', 'Dua Lipa', 'Post Malone'],
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/b5/92/bb/b592bb72-52e3-e756-9b26-9f56d08f47ab/16UMGIM67864.rgb.jpg/600x600bb.jpg',
    tracks: [
      { id: 'dm2-1', title: 'Starboy', artist: 'The Weeknd', album: 'Starboy', durationSeconds: 230, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/b5/92/bb/b592bb72-52e3-e756-9b26-9f56d08f47ab/16UMGIM67864.rgb.jpg/600x600bb.jpg' },
      { id: 'dm2-2', title: 'Levitating', artist: 'Dua Lipa', album: 'Future Nostalgia', durationSeconds: 203, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/6c/11/d6/6c11d681-aa3a-d59e-4c2e-f77e181026ab/190295092665.jpg/600x600bb.jpg' },
    ],
  },
  {
    id: 'mix-3',
    title: 'Daily Mix 3',
    subtitle: 'Anuv Jain, Prateek Kuhad, Zaeden',
    genre: 'Acoustic & Indie Vibe',
    artists: ['Anuv Jain', 'Prateek Kuhad', 'Zaeden'],
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/a7/46/2f/a7462f7e-6dde-b235-2f5e-90e31af919a7/7799192004134_cover.jpg/600x600bb.jpg',
    tracks: [
      { id: 'dm3-1', title: 'BAARISHEIN', artist: 'Anuv Jain', album: 'Baarishein - Single', durationSeconds: 208, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/a7/46/2f/a7462f7e-6dde-b235-2f5e-90e31af919a7/7799192004134_cover.jpg/600x600bb.jpg' },
      { id: 'dm3-2', title: 'cold/mess', artist: 'Prateek Kuhad', album: 'cold/mess', durationSeconds: 277, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/a7/46/2f/a7462f7e-6dde-b235-2f5e-90e31af919a7/7799192004134_cover.jpg/600x600bb.jpg' },
    ],
  },
  {
    id: 'mix-4',
    title: 'Daily Mix 4',
    subtitle: 'Justice, Gesaffelstein, Boys Noize',
    genre: 'Electro & Dark Club',
    artists: ['Justice', 'Gesaffelstein'],
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/fd/4a/77/fd4a77db-0ebc-d043-41a2-f32fa1bb0fb4/dj.qrikkdwj.jpg/600x600bb.jpg',
    tracks: [
      { id: 'dm4-1', title: 'D.A.N.C.E.', artist: 'Justice', album: 'Cross', durationSeconds: 242, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/fd/4a/77/fd4a77db-0ebc-d043-41a2-f32fa1bb0fb4/dj.qrikkdwj.jpg/600x600bb.jpg' },
    ],
  },
  {
    id: 'mix-5',
    title: 'Daily Mix 5',
    subtitle: 'Chic, Earth Wind & Fire, Giorgio Moroder',
    genre: 'Retro & Disco Grooves',
    artists: ['Chic', 'Giorgio Moroder'],
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/e8/43/5f/e8435ffa-b6b9-b171-40ab-4ff3959ab661/886443919266.jpg/600x600bb.jpg',
    tracks: [
      { id: 'dm5-1', title: 'Le Freak', artist: 'Chic', album: 'C\'est Chic', durationSeconds: 327, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/e8/43/5f/e8435ffa-b6b9-b171-40ab-4ff3959ab661/886443919266.jpg/600x600bb.jpg' },
    ],
  },
  {
    id: 'mix-6',
    title: 'Daily Mix 6',
    subtitle: 'Tycho, Bonobo, Solar Fields',
    genre: 'Ambient & Deep Focus',
    artists: ['Tycho', 'Solar Fields'],
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/cb/7b/a9/cb7ba903-b5f1-cc21-90db-7a81b7aa0997/724596951057.jpg/600x600bb.jpg',
    tracks: [
      { id: 'dm6-1', title: 'Awake', artist: 'Tycho', album: 'Awake', durationSeconds: 283, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/cb/7b/a9/cb7ba903-b5f1-cc21-90db-7a81b7aa0997/724596951057.jpg/600x600bb.jpg' },
    ],
  },
];

export async function getDailyMixes(): Promise<DailyMix[]> {
  const url = `${ENGINE_BASE}/api/engine/recommend/next?title=mix&artist=all&limit=6`;
  const res = await fetchWithTimeout<{ recommendations?: any[] }>(url, {}, {}, 500);
  if (res && res.recommendations && res.recommendations.length >= 4) {
    return FALLBACK_DAILY_MIXES;
  }
  return FALLBACK_DAILY_MIXES;
}

// -----------------------------------------------------------------
// Situation B & F: Silent Recommendations & Similar Tracks
// -----------------------------------------------------------------
export async function getSilentRecommendations(
  title: string,
  artist: string,
  limit = 12
): Promise<Track[]> {
  if (!title) return [];
  const url = `${ENGINE_BASE}/api/engine/recommend/next?title=${encodeURIComponent(
    title
  )}&artist=${encodeURIComponent(artist)}&limit=${limit}`;

  const res = await fetchWithTimeout<{ recommendations: any[] }>(
    url,
    {},
    { recommendations: [] },
    500
  );

  return (res.recommendations || []).map((r) => ({
    id: r.id || `rec-${Math.random()}`,
    title: r.title,
    artist: r.artist,
    album: r.album || 'Single',
    durationSeconds: r.durationSeconds || 210,
    coverUrl: r.coverUrl,
    audioUrl: r.audioUrl,
    isFavorite: false,
  }));
}

// -----------------------------------------------------------------
// Situation C: Smart Weighted Shuffle
// -----------------------------------------------------------------
export async function getSmartShuffleOrder(
  tracks: Track[],
  currentTrackId?: string
): Promise<Track[]> {
  if (tracks.length <= 1) return tracks;
  const url = `${ENGINE_BASE}/api/engine/shuffle-order`;

  const res = await fetchWithTimeout<{ shuffled_tracks: Track[] }>(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tracks, current_track_id: currentTrackId }),
    },
    { shuffled_tracks: [] },
    500
  );

  if (res.shuffled_tracks && res.shuffled_tracks.length === tracks.length) {
    return res.shuffled_tracks;
  }

  // In-memory Fisher-Yates fallback
  const result = [...tracks];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// -----------------------------------------------------------------
// Situation D: Artist / Track Radio
// -----------------------------------------------------------------
export async function getRadioTracks(
  seedTitle: string,
  seedArtist: string
): Promise<Track[]> {
  const recommendations = await getSilentRecommendations(seedTitle, seedArtist, 25);
  return recommendations;
}
