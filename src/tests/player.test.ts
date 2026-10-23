import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebAudioPlayer, PlayerTrack } from '../player/web-audio-player';

describe('Sloth WebAudioPlayer Architecture', () => {
  let player: WebAudioPlayer;

  const mockTracks: PlayerTrack[] = [
    {
      id: 'track-1',
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      album: 'A Night at the Opera',
      streamUrl: 'https://example.com/stream1.m4a',
      durationSeconds: 355,
    },
    {
      id: 'track-2',
      title: 'Hotel California',
      artist: 'Eagles',
      album: 'Hotel California',
      streamUrl: 'https://example.com/stream2.m4a',
      durationSeconds: 390,
    },
    {
      id: 'track-3',
      title: 'Stairway to Heaven',
      artist: 'Led Zeppelin',
      album: 'Led Zeppelin IV',
      streamUrl: 'https://example.com/stream3.m4a',
      durationSeconds: 482,
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    player = new WebAudioPlayer();
  });

  afterEach(() => {
    player.dispose();
  });

  it('initializes with default stopped state and volume', () => {
    const state = player.getState();
    expect(state.playbackStatus).toBe('stopped');
    expect(state.currentTrack).toBeNull();
    expect(state.volume).toBe(1.0);
    expect(state.isMuted).toBe(false);
    expect(state.isNormalized).toBe(true);
    expect(state.isShuffle).toBe(false);
    expect(state.repeatMode).toBe('off');
    expect(state.crossfadeDuration).toBe(3.0);
  });

  it('opens a playlist and updates state', async () => {
    await player.openPlaylist(mockTracks, 0, false);
    const state = player.getState();

    expect(state.playlist.length).toBe(3);
    expect(state.currentIndex).toBe(0);
    expect(state.currentTrack?.id).toBe('track-1');
  });

  it('manages queue operations: add, insert, remove, move', async () => {
    await player.openPlaylist([mockTracks[0], mockTracks[1]], 0, false);

    // Add track to end
    player.addTrack(mockTracks[2]);
    expect(player.getState().playlist.length).toBe(3);
    expect(player.getState().playlist[2].id).toBe('track-3');

    // Add track at specific index
    const extraTrack: PlayerTrack = {
      id: 'track-4',
      title: 'Imagine',
      artist: 'John Lennon',
      streamUrl: 'https://example.com/stream4.m4a',
    };
    player.addTrackAt(extraTrack, 1);
    expect(player.getState().playlist.length).toBe(4);
    expect(player.getState().playlist[1].id).toBe('track-4');

    // Move track from 1 to 3
    player.moveTrack(1, 3);
    expect(player.getState().playlist[3].id).toBe('track-4');

    // Remove track
    player.removeTrack(3);
    expect(player.getState().playlist.length).toBe(3);
  });

  it('navigates next and previous tracks correctly', async () => {
    await player.openPlaylist(mockTracks, 0, false);

    await player.skipToNext();
    expect(player.getState().currentIndex).toBe(1);
    expect(player.getState().currentTrack?.id).toBe('track-2');

    await player.skipToPrevious();
    expect(player.getState().currentIndex).toBe(0);
    expect(player.getState().currentTrack?.id).toBe('track-1');
  });

  it('handles repeat modes: off, all, one', async () => {
    await player.openPlaylist(mockTracks, 2, false);

    // When repeat is off, skipping past last track stops
    player.setRepeatMode('off');
    await player.skipToNext();
    expect(player.getState().playbackStatus).toBe('stopped');

    // When repeat is all, skipping past last wraps to 0
    await player.openPlaylist(mockTracks, 2, false);
    player.setRepeatMode('all');
    await player.skipToNext();
    expect(player.getState().currentIndex).toBe(0);
  });

  it('toggles audio normalization compressor and updates state', () => {
    expect(player.getState().isNormalized).toBe(true);

    player.setAudioNormalization(false);
    expect(player.getState().isNormalized).toBe(false);

    player.setAudioNormalization(true);
    expect(player.getState().isNormalized).toBe(true);
  });

  it('controls volume and muting', () => {
    player.setVolume(0.75);
    expect(player.getState().volume).toBe(0.75);

    player.setMuted(true);
    expect(player.getState().isMuted).toBe(true);

    player.setMuted(false);
    expect(player.getState().isMuted).toBe(false);
  });

  it('subscribes to state changes and receives notifications', async () => {
    const listener = vi.fn();
    const unsubscribe = player.subscribe(listener);

    expect(listener).toHaveBeenCalled(); // Initial state callback

    player.setVolume(0.5);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    player.setVolume(0.8);
    expect(listener).toHaveBeenCalledTimes(2); // No further calls after unsubscribe
  });

  it('calculates seek positions and starts playback from 0:00', async () => {
    await player.openPlaylist(mockTracks, 0, false);
    const totalDuration = mockTracks[0].durationSeconds ?? 0;
    const clickRatio = 0.5;
    const targetSeconds = clickRatio * totalDuration;
    expect(targetSeconds).toBe(177.5);

    // Initial playback start is 0:00
    player.seek(0);
    expect(player.getState().currentTime).toBe(0);

    // Mock duration on active channel for test environment
    const active = (player as any).getActiveChannel();
    if (active.audio) {
      active.audio.duration = totalDuration;
    }

    // Seeking to half the track accurately reaches targetSeconds
    player.seek(targetSeconds);
    expect(player.getState().currentTime).toBe(177.5);
  });
});
