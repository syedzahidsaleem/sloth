/**
 * Sloth Onboarding Genre Quiz Modal
 * Cold-start preference calibration for Thompson Sampling multi-armed bandit arms.
 * Strict Nuclear flat UI, OKLCH surface palette, solid borders, zero glassmorphism.
 */

import { FC, useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Sparkles, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { saveSlothSettings } from '@/services/settingsStore';

export interface GenreItem {
  id: string;
  name: string;
  subtext: string;
  bpmRange: string;
  tags: string[];
}

const ONBOARDING_GENRES: GenreItem[] = [
  {
    id: 'synthwave',
    name: 'Synthwave',
    subtext: '80s analog arpeggios & retro neon grids',
    bpmRange: '100-128 BPM',
    tags: ['Retro', 'Outrun', 'Analog'],
  },
  {
    id: 'indie rock',
    name: 'Indie Rock',
    subtext: 'Punchy jangle guitars & energetic hooks',
    bpmRange: '110-145 BPM',
    tags: ['Alternative', 'Guitar', 'Post-Punk'],
  },
  {
    id: 'electronic',
    name: 'Electronic',
    subtext: 'Modulated synth leads & driving dance grooves',
    bpmRange: '120-132 BPM',
    tags: ['Club', 'House', 'Techno'],
  },
  {
    id: 'ambient',
    name: 'Ambient',
    subtext: 'Ethereal reverb pads & generative soundscapes',
    bpmRange: '60-90 BPM',
    tags: ['Drone', 'Relax', 'Atmosphere'],
  },
  {
    id: 'lo-fi',
    name: 'Lo-Fi Hip Hop',
    subtext: 'Warm vinyl crackle & dusty piano chords',
    bpmRange: '75-90 BPM',
    tags: ['Chill', 'Study', 'Boom-Bap'],
  },
  {
    id: 'hip hop',
    name: 'Hip Hop',
    subtext: 'Crisp 808 sub-bass, punchy kicks & flow',
    bpmRange: '80-100 BPM',
    tags: ['Trap', 'Boom-Bap', 'Bars'],
  },
  {
    id: 'post-rock',
    name: 'Post-Rock',
    subtext: 'Dynamic quiet-to-loud guitar crescendos',
    bpmRange: '70-130 BPM',
    tags: ['Epic', 'Delay', 'Crescendo'],
  },
  {
    id: 'jazz',
    name: 'Modern Jazz',
    subtext: 'Modal harmonies, brass timbres & syncopation',
    bpmRange: '90-140 BPM',
    tags: ['Improv', 'Acoustic', 'Soul'],
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    subtext: 'Hybrid symphonic themes & dramatic pacing',
    bpmRange: '60-120 BPM',
    tags: ['Score', 'Strings', 'Trailer'],
  },
  {
    id: 'city pop',
    name: 'City Pop / J-Pop',
    subtext: 'Groovy slap bass, Tokyo night funk & horns',
    bpmRange: '115-130 BPM',
    tags: ['Funk', 'Tokyo', 'Shibuya'],
  },
  {
    id: 'neo-classical',
    name: 'Neo-Classical',
    subtext: 'Intimate felt piano & evocative solo cello',
    bpmRange: '50-80 BPM',
    tags: ['Piano', 'Minimalist', 'Felt'],
  },
  {
    id: 'metal',
    name: 'Metal / Heavy',
    subtext: 'Aggressive down-tuned riffs & double-bass',
    bpmRange: '120-180 BPM',
    tags: ['Heavy', 'Riffs', 'Distortion'],
  },
];

export interface GenreQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (selectedGenres: string[]) => void;
}

export const GenreQuizModal: FC<GenreQuizModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(
    new Set(['synthwave', 'electronic', 'lo-fi'])
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const toggleGenre = (genreId: string) => {
    setSelectedGenres((prev) => {
      const next = new Set(prev);
      if (next.has(genreId)) {
        next.delete(genreId);
      } else {
        next.add(genreId);
      }
      return next;
    });
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    const genresList = Array.from(selectedGenres);

    // Prepare Thompson Sampling bandit feedback payload
    const feedbackItems = ONBOARDING_GENRES.map((g) => ({
      genre: g.id,
      liked: selectedGenres.has(g.id),
      rating: selectedGenres.has(g.id) ? 0.95 : 0.10,
    }));

    try {
      // Send to FastAPI engine server if online
      await fetch('/api/engine/coldstart/onboarding/clip-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'user_primary',
          locale: typeof navigator !== 'undefined' ? navigator.language : 'en-US',
          feedback: feedbackItems,
        }),
      }).catch(() => {
        // Graceful offline fallback
      });
    } catch {
      // Ignored for standalone/client mode
    }

    // Persist to user_prefs
    saveSlothSettings({ onboardingCompleted: true });
    setIsSubmitting(false);
    onComplete?.(genresList);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          data-testid="onboarding-genre-quiz-modal"
        >
          {/* Flat Solid Backdrop (No glassmorphism, no blur) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75"
          />

          {/* Modal Card - Solid Borders, Neobrutalist Depth */}
          <motion.div
            initial={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.96, y: 16 }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.96, y: 10 }
            }
            transition={{
              type: 'spring',
              stiffness: 450,
              damping: 28,
              mass: 0.8,
            }}
            className="relative z-10 w-full max-w-2xl rounded-[6px] border border-[var(--border)] bg-[var(--surface)] shadow-2xl p-6 text-[var(--text-primary)] font-sans max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[var(--border)] pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-[4px] bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--color-accent)]">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h2
                    id="onboarding-title"
                    className="text-base font-bold tracking-tight text-[var(--text-primary)]"
                  >
                    Welcome to Sloth
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Calibrate your personalized neural taste engine. Pick 3 or more genres.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-[4px] text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-raised)] transition-colors cursor-pointer"
                aria-label="Close onboarding"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Genre Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-4 overflow-y-auto pr-1 flex-1 min-h-[300px]">
              {ONBOARDING_GENRES.map((genre) => {
                const isSelected = selectedGenres.has(genre.id);
                return (
                  <button
                    key={genre.id}
                    type="button"
                    onClick={() => toggleGenre(genre.id)}
                    className={`relative flex flex-col text-left p-3 rounded-[4px] border cursor-pointer transition-all select-none ${
                      isSelected
                        ? 'bg-[var(--surface-raised)] border-[var(--color-accent)] text-white shadow-xs'
                        : 'bg-[var(--background)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                    data-testid={`genre-card-${genre.id}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs tracking-wide">
                          {genre.name}
                        </span>
                        <span className="font-mono text-[9px] text-[var(--text-muted)]">
                          {genre.bpmRange}
                        </span>
                      </div>

                      <div
                        className={`size-4 rounded-[3px] border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-black'
                            : 'border-[var(--border)] bg-transparent'
                        }`}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                    </div>

                    <p className="text-[11px] text-[var(--text-muted)] mt-1.5 leading-snug">
                      {genre.subtext}
                    </p>

                    <div className="flex items-center gap-1.5 mt-2">
                      {genre.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.2 rounded-[2px] text-[9px] font-mono bg-[var(--surface-raised)]/80 text-[var(--text-muted)] border border-[var(--border)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-[var(--border)] shrink-0">
              <div className="flex items-center gap-2">
                <Badge
                  variant="pill"
                  color={selectedGenres.size >= 3 ? 'green' : 'secondary'}
                  className="font-mono text-xs font-semibold"
                >
                  {selectedGenres.size} selected
                </Badge>
                {selectedGenres.size < 3 && (
                  <span className="text-[11px] text-[var(--text-muted)]">
                    Pick {3 - selectedGenres.size} more
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onClose}
                  className="text-xs"
                >
                  Skip for Now
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  disabled={selectedGenres.size === 0 || isSubmitting}
                  onClick={handleFinish}
                  className="text-xs flex items-center gap-1.5 bg-[var(--color-accent)] text-black font-semibold hover:brightness-110"
                >
                  <Sparkles size={13} />
                  <span>{isSubmitting ? 'Calibrating...' : 'Calibrate Engine'}</span>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
