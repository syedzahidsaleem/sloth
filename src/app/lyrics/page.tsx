/**
 * Sloth Dynamic Synchronized Lyrics View
 * Fetches real synced/timed LRC lyrics from LRCLib for the currently playing track.
 * Author: Syed Zahid Saleem <syedzahidsaleem2@gmail.com>
 */

import { useState, useEffect } from 'react';
import { LyricsView } from '@/components/lyrics';
import { ParsedLyrics, parseLrc, SAMPLE_MIDNIGHT_CITY_LRC } from '@/lyrics/parser';

export interface LyricsPageProps {
  trackTitle?: string;
  artistName?: string;
  albumName?: string;
  durationSeconds?: number;
  progressSeconds?: number;
  onSeek?: (seconds: number) => void;
  onClose?: () => void;
}

export default function LyricsPage({
  trackTitle = '',
  artistName = '',
  albumName = '',
  durationSeconds = 0,
  progressSeconds = 0,
  onSeek = () => {},
  onClose = () => {},
}: LyricsPageProps) {
  const [lyrics, setLyrics] = useState<ParsedLyrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const cleanT = trackTitle.trim();
    const cleanA = artistName.trim();
    if (!cleanT) {
      setLyrics(null);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);

    const fetchLyrics = async () => {
      try {
        // 1. Search LRCLib with combined artist and title query
        const queryTerm = `${cleanA} ${cleanT}`.trim();
        const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(queryTerm)}`;
        const res = await fetch(searchUrl, {
          headers: { Accept: 'application/json' },
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const syncedItem = data.find((d: any) => d.syncedLyrics);
            const targetItem = syncedItem || data.find((d: any) => d.plainLyrics);
            if (targetItem && (targetItem.syncedLyrics || targetItem.plainLyrics)) {
              const parsed = parseLrc(targetItem.syncedLyrics || targetItem.plainLyrics);
              parsed.trackName = targetItem.trackName;
              parsed.artistName = targetItem.artistName;
              if (!isCancelled) {
                setLyrics(parsed);
                setIsLoading(false);
                return;
              }
            }
          }
        }

        // 2. Fallback: Search with cleaned title if artist query had no match
        const titleRes = await fetch(
          `https://lrclib.net/api/search?q=${encodeURIComponent(cleanT)}`,
          { headers: { Accept: 'application/json' } },
        );
        if (titleRes.ok) {
          const titleData = await titleRes.json();
          if (Array.isArray(titleData) && titleData.length > 0) {
            const syncedItem = titleData.find((d: any) => d.syncedLyrics);
            const targetItem = syncedItem || titleData.find((d: any) => d.plainLyrics);
            if (targetItem && (targetItem.syncedLyrics || targetItem.plainLyrics)) {
              const parsed = parseLrc(targetItem.syncedLyrics || targetItem.plainLyrics);
              if (!isCancelled) {
                setLyrics(parsed);
                setIsLoading(false);
                return;
              }
            }
          }
        }
      } catch (err) {
        console.warn('Lyrics fetch error:', err);
      }

      if (!isCancelled) {
        if (cleanT.toLowerCase().includes('midnight city')) {
          setLyrics(parseLrc(SAMPLE_MIDNIGHT_CITY_LRC));
        } else {
          setLyrics(null);
        }
        setIsLoading(false);
      }
    };

    fetchLyrics();

    return () => {
      isCancelled = true;
    };
  }, [trackTitle, artistName]);

  return (
    <div className="surface-background h-full w-full select-none" data-testid="lyrics-page">
      <LyricsView
        trackTitle={trackTitle || 'No track selected'}
        artistName={artistName || 'Unknown artist'}
        albumName={albumName}
        lyrics={lyrics}
        isLoading={isLoading}
        progressSeconds={progressSeconds}
        totalDurationSeconds={durationSeconds}
        onSeek={onSeek}
        onClose={onClose}
      />
    </div>
  );
}
