/**
 * Sloth UI Component
 * Author: Syed Zahid Saleem <syedzahidsaleem2@gmail.com>
 */

import { useState } from 'react';
import { LyricsView } from '@/components/lyrics';
import { parseLrc, SAMPLE_MIDNIGHT_CITY_LRC } from '@/lyrics/parser';

export interface LyricsPageProps {
  trackTitle?: string;
  artistName?: string;
  albumName?: string;
  progressSeconds?: number;
  onSeek?: (seconds: number) => void;
  onClose?: () => void;
}

export default function LyricsPage({
  trackTitle = 'Midnight City',
  artistName = 'M83',
  albumName = "Hurry Up, We're Dreaming",
  progressSeconds = 45,
  onSeek = () => {},
  onClose = () => {},
}: LyricsPageProps) {
  const [lyrics] = useState(() => parseLrc(SAMPLE_MIDNIGHT_CITY_LRC));

  return (
    <div className="surface-background h-full w-full select-none" data-testid="lyrics-page">
      <LyricsView
        trackTitle={trackTitle}
        artistName={artistName}
        albumName={albumName}
        lyrics={lyrics}
        progressSeconds={progressSeconds}
        onSeek={onSeek}
        onClose={onClose}
      />
    </div>
  );
}
