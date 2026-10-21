/**
 * Sloth Dynamic Synchronized Lyrics View
 * Fetches real synced/timed LRC lyrics from LRCLib with Metrolist cascade & offline fallback for the currently playing track.
 * Author: Syed Zahid Saleem <syedzahidsaleem2@gmail.com>
 */

import { useState, useEffect } from 'react';
import { LyricsView } from '@/components/lyrics';
import { ParsedLyrics, parseLrc, getCuratedFallbackLrc } from '@/lyrics/parser';
import { MetrolistLyricsFetcher } from '@/lyrics/metrolist-fetcher';

const clientLyricsFetcher = new MetrolistLyricsFetcher();

export interface LyricsPageProps {
  trackTitle?: string;
  artistName?: string;
  albumName?: string;
  durationSeconds?: number;
  progressSeconds?: number;
  onSeek?: (seconds: number) => void;
  onClose?: () => void;
  trackId?: string;
}

export default function LyricsPage({
  trackTitle = '',
  artistName = '',
  albumName = '',
  durationSeconds = 0,
  progressSeconds = 0,
  onSeek = () => {},
  onClose = () => {},
  trackId,
}: LyricsPageProps) {
  const [lyrics, setLyrics] = useState<ParsedLyrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const cleanT = trackTitle.trim();
    const cleanA = artistName.trim();
    if (!cleanT || cleanT === 'No track playing') {
      setLyrics(null);
      setIsLoading(false);
      return;
    }

    // Check offline curated fallback first for instantaneous response
    const fallbackLrc = getCuratedFallbackLrc(cleanT, cleanA);
    if (fallbackLrc) {
      const parsed = parseLrc(fallbackLrc);
      parsed.trackName = cleanT;
      parsed.artistName = cleanA;
      setLyrics(parsed);
    }

    let isCancelled = false;
    setIsLoading(true);

    const fetchLyrics = async () => {
      try {
        const fetched = await clientLyricsFetcher.getLyrics({
          title: cleanT,
          artist: cleanA,
          album: albumName,
          duration: durationSeconds > 0 ? durationSeconds : undefined,
        });

        if (!isCancelled && fetched && (fetched.lines.length > 0 || fetched.plainText)) {
          setLyrics(fetched);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Lyrics fetch error:', err);
      }

      if (!isCancelled) {
        if (fallbackLrc) {
          const parsed = parseLrc(fallbackLrc);
          parsed.trackName = cleanT;
          parsed.artistName = cleanA;
          setLyrics(parsed);
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
  }, [trackTitle, artistName, albumName, durationSeconds, trackId]);

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
        trackId={trackId}
      />
    </div>
  );
}
