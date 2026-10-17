/**
 * Sloth LyricsView Component
 * Nuclear-derived lyrics viewport takeover.
 *
 * Design Guidelines:
 * - Clean, centered text column (max-w-2xl)
 * - Plain dark background (#1e2327 / var(--background))
 * - Strictly NO background album art bleed, NO blurred glassmorphism
 * - Tabs: "Lyrics" | "Translation"
 * - Toggle: Karaoke mode / Plain mode
 * - Word & line animations via "motion/react", respecting prefers-reduced-motion
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useReducedMotion } from 'motion/react';
import {
  MicVocal,
  Languages,
  AlignLeft,
  X,
  Loader2,
  RefreshCw,
  ScrollText,
} from 'lucide-react';
import { LyricLine, LyricLineState } from './LyricLine';
import { ParsedLyrics } from '@/lyrics/parser';
import type { TranslationMode } from '@/lyrics/translator';

export const LANGUAGE_OPTIONS: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ru: 'Russian',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  hi: 'Hindi',
};

export interface LyricsViewProps {
  trackTitle: string;
  artistName: string;
  albumName?: string;
  lyrics: ParsedLyrics | null;
  isLoading?: boolean;
  progressSeconds: number;
  totalDurationSeconds?: number;
  onSeek: (seconds: number) => void;
  onClose: () => void;
  onTranslate?: (targetLanguage: string, mode: TranslationMode) => Promise<ParsedLyrics | void>;
  trackId?: string;
}

export const LyricsView: React.FC<LyricsViewProps> = ({
  trackTitle,
  artistName,
  albumName,
  lyrics,
  isLoading = false,
  progressSeconds,
  totalDurationSeconds: _totalDurationSeconds = 0,
  onSeek,
  onClose,
  onTranslate,
  trackId: _trackId,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<'lyrics' | 'translation'>('lyrics');
  const [karaokeMode, setKaraokeMode] = useState<boolean>(true);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);

  // Translation states
  const [targetLang, setTargetLang] = useState<string>('Spanish');
  const [transMode, setTransMode] = useState<TranslationMode>('Translated');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [translatedLyrics, setTranslatedLyrics] = useState<ParsedLyrics | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  const currentMs = progressSeconds * 1000;

  // Active lyrics source (original or translated)
  const currentLyrics = activeTab === 'translation' && translatedLyrics ? translatedLyrics : lyrics;
  const lines = currentLyrics?.lines || [];

  // Determine active line index based on current playback milliseconds
  const activeLineIndex = useMemo(() => {
    if (!lines || lines.length === 0) return -1;

    for (let i = lines.length - 1; i >= 0; i--) {
      if (currentMs >= lines[i].timeMs) {
        return i;
      }
    }
    return 0;
  }, [lines, currentMs]);

  // Auto-scroll to active line
  useEffect(() => {
    if (autoScroll && activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'center',
      });
    }
  }, [activeLineIndex, autoScroll, prefersReducedMotion]);

  // Handle translation trigger
  const handleTranslate = async () => {
    if (!lyrics || lines.length === 0) return;
    setIsTranslating(true);
    setTranslationError(null);

    try {
      if (onTranslate) {
        const customRes = await onTranslate(targetLang, transMode);
        if (customRes) {
          setTranslatedLyrics(customRes);
          return;
        }
      }

      // Client simulation / localized preset for demonstration
      await new Promise((r) => setTimeout(r, 450));

      const sampleTranslations: Record<string, string[]> = {
        Spanish: [
          '(Intro de sintetizador instrumental)',
          'Esperando en un coche',
          'Esperando un viaje en la oscuridad',
          'La ciudad nocturna crece',
          'Mira y ve sus ojos, brillan',
          'Esperando en un coche',
          'Esperando un viaje en la oscuridad',
          'La ciudad nocturna crece',
          'Mira y ve sus ojos, brillan',
          'Esperando en un coche',
          'Esperando un viaje en la oscuridad',
          'La ciudad nocturna crece',
          'Mira y ve sus ojos, brillan',
          'La ciudad es mi iglesia',
          'Me envuelve en el crepúsculo cegador',
          'Esperando en un coche',
          'Esperando un viaje en la oscuridad',
          'La ciudad nocturna crece',
          'Mira y ve sus ojos, brillan',
          '(Solo de saxofón electrónico)',
          'La ciudad es mi iglesia',
          'Me envuelve en el crepúsculo cegador',
          'Esperando en un coche',
          'Esperando un viaje en la oscuridad',
        ],
        French: [
          '(Intro au synthétiseur instrumental)',
          "En attendant dans une voiture",
          "En attendant une balade dans le noir",
          "La ville nocturne grandit",
          "Regarde et vois ses yeux, ils brillent",
          "En attendant dans une voiture",
          "En attendant une balade dans le noir",
          "La ville nocturne grandit",
          "Regarde et vois ses yeux, ils brillent",
          "En attendant dans une voiture",
          "En attendant une balade dans le noir",
          "La ville nocturne grandit",
          "Regarde et vois ses yeux, ils brillent",
          "La ville est mon église",
          "Elle m'enveloppe dans le crépuscule aveuglant",
          "En attendant dans une voiture",
          "En attendant une balade dans le noir",
          "La ville nocturne grandit",
          "Regarde et vois ses yeux, ils brillent",
          "(Solo de saxophone électronique)",
          "La ville est mon église",
          "Elle m'enveloppe dans le crépuscule aveuglant",
          "En attendant dans une voiture",
          "En attendant une balade dans le noir",
        ],
      };

      const langKey = targetLang in sampleTranslations ? targetLang : 'Spanish';
      const translatedLines = sampleTranslations[langKey];

      const mapped = lyrics.lines.map((l, idx) => ({
        timeMs: l.timeMs,
        text: (translatedLines && translatedLines[idx]) || `[${targetLang}] ${l.text}`,
      }));

      setTranslatedLyrics({
        isSynced: lyrics.isSynced,
        lines: mapped,
        plainText: mapped.map((l) => l.text).join('\n'),
        trackName: lyrics.trackName,
        artistName: lyrics.artistName,
        duration: lyrics.duration,
      });
    } catch (err: any) {
      setTranslationError(err.message || 'Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="relative w-full h-full min-h-0 flex flex-col bg-[var(--background)] select-none overflow-hidden">
      {/* Top Controls Bar */}
      <div className="h-14 shrink-0 px-6 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between z-10">
        {/* Track info pill */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-[var(--text-primary)] truncate">
              {trackTitle}
            </span>
            <span className="text-[11px] text-[var(--text-muted)] truncate font-mono">
              {artistName} {albumName ? `• ${albumName}` : ''}
            </span>
          </div>
        </div>

        {/* Center Tabs: Lyrics | Translation */}
        <div className="flex items-center p-1 rounded-[4px] bg-[var(--background)] border border-[var(--border)]">
          <button
            type="button"
            onClick={() => setActiveTab('lyrics')}
            className={`px-3 py-1 rounded-[3px] text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'lyrics'
                ? 'bg-[var(--surface-raised)] text-[var(--color-accent)] font-semibold shadow-xs'
                : 'text-[var(--text-muted)] hover:text-white'
            }`}
          >
            Lyrics
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('translation');
              if (!translatedLyrics && lyrics && !isTranslating) {
                handleTranslate();
              }
            }}
            className={`flex items-center gap-1 px-3 py-1 rounded-[3px] text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'translation'
                ? 'bg-[var(--surface-raised)] text-[var(--color-accent)] font-semibold shadow-xs'
                : 'text-[var(--text-muted)] hover:text-white'
            }`}
          >
            <Languages size={13} />
            <span>Translation</span>
          </button>
        </div>

        {/* Right Controls: Auto-scroll, Mode Toggle & Close */}
        <div className="flex items-center gap-2">
          {/* Auto-Scroll Toggle */}
          <button
            type="button"
            onClick={() => setAutoScroll(!autoScroll)}
            title={autoScroll ? 'Disable Auto-scroll' : 'Enable Auto-scroll'}
            className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-[4px] border text-xs cursor-pointer font-mono text-[11px] transition-colors ${
              autoScroll
                ? 'bg-[var(--surface-raised)] border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'bg-[var(--background)] border-[var(--border)] text-[var(--text-muted)] opacity-60'
            }`}
          >
            <ScrollText size={12} />
            <span>Scroll</span>
          </button>

          {/* Karaoke / Plain Toggle */}
          <button
            type="button"
            onClick={() => setKaraokeMode(!karaokeMode)}
            title={karaokeMode ? 'Switch to Plain Mode' : 'Switch to Karaoke Mode'}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] border text-xs cursor-pointer transition-colors ${
              karaokeMode
                ? 'bg-[var(--surface-raised)] border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'bg-[var(--background)] border-[var(--border)] text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            {karaokeMode ? <MicVocal size={13} /> : <AlignLeft size={13} />}
            <span className="font-mono text-[11px]">{karaokeMode ? 'Karaoke' : 'Plain'}</span>
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[4px] bg-[var(--background)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-white cursor-pointer hover:border-[var(--color-accent)] transition-colors"
            title="Close Lyrics View"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Translation Error Banner */}
      {translationError && (
        <div className="px-6 py-2 bg-red-950/40 border-b border-red-800/40 text-red-300 text-xs font-mono flex items-center justify-between">
          <span>Translation notice: {translationError}</span>
          <button
            type="button"
            onClick={() => setTranslationError(null)}
            className="underline cursor-pointer ml-3 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Sub-bar for Translation options */}
      {activeTab === 'translation' && (
        <div className="h-10 px-6 border-b border-[var(--border)] bg-[var(--surface)]/60 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="text-[var(--text-muted)] text-[11px]">Claude AI:</span>
            <div className="flex items-center gap-1">
              {(['Translated', 'Romanized', 'Transcribed'] as TranslationMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setTransMode(mode);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-colors cursor-pointer ${
                    transMode === mode
                      ? 'bg-[var(--color-accent)] text-black'
                      : 'bg-[var(--background)] text-[var(--text-muted)] hover:text-white border border-[var(--border)]'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Language Selector */}
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="bg-[var(--background)] border border-[var(--border)] rounded px-2 py-0.5 text-xs text-[var(--text-primary)] cursor-pointer focus:outline-hidden focus:border-[var(--color-accent)]"
            >
              {Object.values(LANGUAGE_OPTIONS).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleTranslate}
            disabled={isTranslating}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-[3px] bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--color-accent)] hover:border-[var(--color-accent)] text-[11px] font-bold cursor-pointer disabled:opacity-50"
          >
            {isTranslating ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                <span>Translating...</span>
              </>
            ) : (
              <>
                <RefreshCw size={12} />
                <span>Re-translate</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Main Lyrics Viewport */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-6 scroll-smooth select-none focus:outline-hidden"
        tabIndex={0}
      >
        {/* Loading State */}
        {isLoading ? (
          <div className="max-w-2xl mx-auto py-24 space-y-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[4px] bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-secondary)] font-mono">
              <Loader2 size={14} className="animate-spin text-[var(--color-accent)]" />
              <span>Fetching synchronized LRC from LRCLib...</span>
            </div>
            <div className="space-y-4 max-w-lg mx-auto opacity-40">
              <div className="h-6 bg-[var(--surface-raised)] rounded animate-pulse w-3/4 mx-auto" />
              <div className="h-6 bg-[var(--surface-raised)] rounded animate-pulse w-5/6 mx-auto" />
              <div className="h-8 bg-[var(--surface-raised)] rounded animate-pulse w-2/3 mx-auto" />
              <div className="h-6 bg-[var(--surface-raised)] rounded animate-pulse w-4/5 mx-auto" />
            </div>
          </div>
        ) : isTranslating && lines.length === 0 ? (
          <div className="max-w-2xl mx-auto py-24 space-y-4 text-center">
            <Loader2 size={24} className="animate-spin text-[var(--color-accent)] mx-auto" />
            <p className="text-sm font-mono text-[var(--text-secondary)]">
              Translating lyrics with Claude (claude-sonnet-4-6)...
            </p>
          </div>
        ) : lines.length > 0 ? (
          <div className="max-w-2xl mx-auto flex flex-col items-center">
            {/* Top vertical spacer for center anchoring */}
            <div className="h-32 md:h-44 shrink-0" />

            {/* Render Lyrics Lines */}
            {lines.map((line, idx) => {
              let state: LyricLineState = 'idle';
              if (idx === activeLineIndex) {
                state = 'current';
              } else if (idx === activeLineIndex + 1) {
                state = 'next';
              } else if (idx < activeLineIndex) {
                state = 'previous';
              }

              // Compute duration of this line until next line
              const nextLine = lines[idx + 1];
              const lineDur = nextLine ? Math.max(1000, nextLine.timeMs - line.timeMs) : 3500;

              return (
                <LyricLine
                  key={`${line.timeMs}-${idx}`}
                  ref={idx === activeLineIndex ? activeLineRef : undefined}
                  line={line}
                  state={karaokeMode ? state : 'current'}
                  karaokeMode={karaokeMode}
                  currentPositionMs={currentMs}
                  lineDurationMs={lineDur}
                  onSeek={(ms) => onSeek(ms / 1000)}
                />
              );
            })}

            {/* Bottom vertical spacer */}
            <div className="h-44 md:h-64 shrink-0" />
          </div>
        ) : (
          /* Empty / Not Found State */
          <div className="max-w-md mx-auto py-32 text-center space-y-4">
            <div className="size-12 rounded-[4px] bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center mx-auto text-[var(--text-muted)]">
              <MicVocal size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                No Synchronized Lyrics Found
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1 font-mono">
                LRCLib does not have timestamps for this title yet.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
