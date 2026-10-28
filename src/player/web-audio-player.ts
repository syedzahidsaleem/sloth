/**
 * Sloth Web Audio Player Architecture
 * Ported from Spotube (GPL-3.0) by team-spotube
 * (C) 2026 Spotube contributors / Adapted for Sloth
 *
 * Implements a dual-channel Web Audio graph supporting equal-power crossfading,
 * dynamic audio normalization (mirroring Spotube's dynaudnorm=g=5:f=250:r=0.9:p=0.5),
 * playlist queue management, and OS MediaSession / SMTC synchronization.
 */

export interface PlayerTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  artworkUri?: string;
  streamUrl: string;
  durationSeconds?: number;
}

/**
 * Validates that a numeric duration is positive, finite, and within playable bounds.
 */
export function isValidPlaybackDuration(duration: number | undefined | null): duration is number {
  return typeof duration === 'number' && isFinite(duration) && duration > 0;
}

export type PlaybackStatus = 'stopped' | 'buffering' | 'playing' | 'paused';
export type RepeatMode = 'off' | 'all' | 'one';

export interface PlayerState {
  currentTrack: PlayerTrack | null;
  playbackStatus: PlaybackStatus;
  currentTime: number;
  duration: number;
  bufferedTime: number;
  volume: number; // 0.0 to 1.0
  isMuted: boolean;
  playbackRate: number;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  isNormalized: boolean;
  crossfadeDuration: number;
  playlist: PlayerTrack[];
  currentIndex: number;
}

export type PlayerListener = (state: PlayerState) => void;

interface AudioChannel {
  audio: HTMLAudioElement;
  sourceNode: MediaElementAudioSourceNode | null;
  gainNode: GainNode;
  activeTrack: PlayerTrack | null;
}

export class WebAudioPlayer {
  private audioContext: AudioContext | null = null;
  private channelA!: AudioChannel;
  private channelB!: AudioChannel;
  private activeChannelName: 'A' | 'B' = 'A';

  // Audio Graph Nodes
  private preProcessingGain: GainNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private makeupGainNode: GainNode | null = null;
  private masterGainNode: GainNode | null = null;

  // Player State
  private playlist: PlayerTrack[] = [];
  private shuffledIndices: number[] = [];
  private currentIndex = -1;
  private playbackStatus: PlaybackStatus = 'stopped';
  private volume = 1.0;
  private isMuted = false;
  private playbackRate = 1.0;
  private isShuffle = false;
  private repeatMode: RepeatMode = 'off';
  private isNormalized = true;
  private crossfadeDuration = 3.0; // seconds

  private listeners = new Set<PlayerListener>();
  private crossfadeTimeout: any = null;
  private isDisposed = false;

  constructor() {
    this.initAudioContext();
    this.setupChannels();
    this.setupGraph();
    this.setupMediaSession();
  }

  // ---------------------------------------------------------------------------
  // Graph Initialization
  // ---------------------------------------------------------------------------

  private initAudioContext(): void {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      try {
        this.audioContext = new AudioContextClass();
      } catch {
        // Fallback for restricted test environments
      }
    }
  }

  private setupChannels(): void {
    const createAudioElement = () => {
      if (typeof window === 'undefined') return {} as HTMLAudioElement;
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.preload = 'auto';
      return audio;
    };

    const audioA = createAudioElement();
    const audioB = createAudioElement();

    const dummyGain = {
      gain: {
        value: 1,
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
        setValueCurveAtTime: () => {},
      },
      connect: () => {},
      disconnect: () => {},
    } as unknown as GainNode;

    const gainA = this.audioContext?.createGain() || dummyGain;
    const gainB = this.audioContext?.createGain() || dummyGain;

    this.channelA = { audio: audioA, sourceNode: null, gainNode: gainA, activeTrack: null };
    this.channelB = { audio: audioB, sourceNode: null, gainNode: gainB, activeTrack: null };

    this.bindAudioEvents(this.channelA, 'A');
    this.bindAudioEvents(this.channelB, 'B');
  }

  private setupGraph(): void {
    if (!this.audioContext) return;

    this.preProcessingGain = this.audioContext.createGain();
    this.masterGainNode = this.audioContext.createGain();

    // DynAudNorm compressor model: dynaudnorm=g=5:f=250:r=0.9:p=0.5
    // Spotube MPV parameters mapped to Web Audio DynamicsCompressorNode:
    // - Threshold: -24 dB
    // - Knee: 30 dB
    // - Ratio: 12
    // - Attack: 0.003s (3ms)
    // - Release: 0.25s (250ms, matching f=250 filter frame)
    this.compressorNode = this.audioContext.createDynamicsCompressor();
    this.compressorNode.threshold.value = -24;
    this.compressorNode.knee.value = 30;
    this.compressorNode.ratio.value = 12;
    this.compressorNode.attack.value = 0.003;
    this.compressorNode.release.value = 0.25;

    // Makeup gain: ~3dB boost for normalized audio
    this.makeupGainNode = this.audioContext.createGain();
    this.makeupGainNode.gain.value = 1.41;

    // Connect channel gains to pre-processing bus
    this.channelA.gainNode.connect(this.preProcessingGain);
    this.channelB.gainNode.connect(this.preProcessingGain);

    this.updateNormalizationGraph();
    this.masterGainNode.connect(this.audioContext.destination);
    this.masterGainNode.gain.value = this.volume;
  }

  private updateNormalizationGraph(): void {
    if (!this.preProcessingGain || !this.masterGainNode || !this.audioContext) return;

    this.preProcessingGain.disconnect();
    if (this.compressorNode) this.compressorNode.disconnect();
    if (this.makeupGainNode) this.makeupGainNode.disconnect();

    if (this.isNormalized && this.compressorNode && this.makeupGainNode) {
      // Channel -> PreGain -> Compressor -> MakeupGain -> MasterGain -> Destination
      this.preProcessingGain.connect(this.compressorNode);
      this.compressorNode.connect(this.makeupGainNode);
      this.makeupGainNode.connect(this.masterGainNode);
    } else {
      // Channel -> PreGain -> MasterGain -> Destination
      this.preProcessingGain.connect(this.masterGainNode);
    }
  }

  private ensureSourceConnected(channel: AudioChannel): void {
    if (!this.audioContext || channel.sourceNode || !channel.audio.src) return;
    try {
      channel.sourceNode = this.audioContext.createMediaElementSource(channel.audio);
      channel.sourceNode.connect(channel.gainNode);
    } catch {
      // Element might already be connected in some browser implementations
    }
  }

  // ---------------------------------------------------------------------------
  // Audio Event Handlers
  // ---------------------------------------------------------------------------

  private bindAudioEvents(channel: AudioChannel, name: 'A' | 'B'): void {
    const { audio } = channel;
    if (!audio.addEventListener) return;

    audio.addEventListener('play', () => {
      if (this.activeChannelName === name) {
        this.playbackStatus = 'playing';
        this.syncMediaSession();
        this.notifyListeners();
      }
    });

    audio.addEventListener('pause', () => {
      if (this.activeChannelName === name && this.playbackStatus !== 'stopped') {
        this.playbackStatus = 'paused';
        this.syncMediaSession();
        this.notifyListeners();
      }
    });

    audio.addEventListener('waiting', () => {
      if (this.activeChannelName === name) {
        this.playbackStatus = 'buffering';
        this.notifyListeners();
      }
    });

    audio.addEventListener('timeupdate', () => {
      if (this.activeChannelName === name) {
        this.checkCrossfadeTrigger();
        this.notifyListeners();
      }
    });

    audio.addEventListener('ended', () => {
      if (this.activeChannelName === name) {
        this.handleTrackEnded();
      }
    });

    audio.addEventListener('error', () => {
      if (this.activeChannelName === name) {
        this.playbackStatus = 'stopped';
        this.notifyListeners();
      }
    });
  }

  private getActiveChannel(): AudioChannel {
    return this.activeChannelName === 'A' ? this.channelA : this.channelB;
  }

  private getInactiveChannel(): AudioChannel {
    return this.activeChannelName === 'A' ? this.channelB : this.channelA;
  }

  // ---------------------------------------------------------------------------
  // Equal-Power Crossfade Pipeline
  // ---------------------------------------------------------------------------

  /**
   * Generates equal-power crossfade curves:
   * Fade-out: cos(x * pi / 2)
   * Fade-in:  sin(x * pi / 2)
   * Ensures constant acoustic power: cos^2(theta) + sin^2(theta) = 1
   */
  private generateCrossfadeCurves(samples = 64): { fadeOut: Float32Array; fadeIn: Float32Array } {
    const fadeOut = new Float32Array(samples);
    const fadeIn = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      const ratio = i / (samples - 1);
      const angle = ratio * 0.5 * Math.PI;
      fadeOut[i] = Math.cos(angle);
      fadeIn[i] = Math.sin(angle);
    }

    return { fadeOut, fadeIn };
  }

  private checkCrossfadeTrigger(): void {
    if (this.crossfadeDuration <= 0) return;
    const active = this.getActiveChannel();
    if (!active.audio || !active.audio.duration || active.audio.duration <= 0) return;

    const remaining = active.audio.duration - active.audio.currentTime;
    if (remaining > 0 && remaining <= this.crossfadeDuration && !this.crossfadeTimeout) {
      const nextIndex = this.peekNextIndex();
      if (nextIndex !== -1) {
        this.triggerCrossfadeTransition(nextIndex);
      }
    }
  }

  private triggerCrossfadeTransition(nextIndex: number): void {
    const outgoing = this.getActiveChannel();
    const incoming = this.getInactiveChannel();
    const nextTrack = this.playlist[nextIndex];
    if (!nextTrack) return;

    const fadeDuration = Math.max(0.5, this.crossfadeDuration);
    const { fadeOut, fadeIn } = this.generateCrossfadeCurves(64);

    // Prepare incoming channel
    incoming.activeTrack = nextTrack;
    incoming.audio.src = nextTrack.streamUrl;
    incoming.audio.playbackRate = this.playbackRate;
    this.ensureSourceConnected(incoming);

    const now = this.audioContext ? this.audioContext.currentTime : 0;

    if (this.audioContext && outgoing.gainNode.gain.setValueCurveAtTime) {
      outgoing.gainNode.gain.cancelScheduledValues(now);
      incoming.gainNode.gain.cancelScheduledValues(now);

      outgoing.gainNode.gain.setValueCurveAtTime(fadeOut, now, fadeDuration);
      incoming.gainNode.gain.setValueCurveAtTime(fadeIn, now, fadeDuration);
    }

    incoming.audio.play().catch(() => {});

    // Switch active channel pointer
    this.activeChannelName = this.activeChannelName === 'A' ? 'B' : 'A';
    this.currentIndex = nextIndex;

    this.crossfadeTimeout = setTimeout(() => {
      try {
        outgoing.audio.pause();
        outgoing.audio.currentTime = 0;
        outgoing.gainNode.gain.value = 1.0;
      } catch {
        // Safe reset
      }
      this.crossfadeTimeout = null;
      this.syncMediaSession();
      this.notifyListeners();
    }, fadeDuration * 1000);
  }

  // ---------------------------------------------------------------------------
  // Playlist & Navigation Logic
  // ---------------------------------------------------------------------------

  public async openPlaylist(
    tracks: PlayerTrack[],
    initialIndex = 0,
    autoPlay = true
  ): Promise<void> {
    if (tracks.length === 0) {
      this.clearPlaylist();
      return;
    }

    this.playlist = [...tracks];
    this.generateShuffleOrder();

    const clampedIndex = Math.max(0, Math.min(initialIndex, tracks.length - 1));
    await this.jumpTo(clampedIndex, autoPlay);
  }

  public addTrack(track: PlayerTrack): void {
    this.playlist.push(track);
    this.generateShuffleOrder();
    this.notifyListeners();
  }

  public addTrackAt(track: PlayerTrack, index: number): void {
    const target = Math.max(0, Math.min(index, this.playlist.length));
    this.playlist.splice(target, 0, track);
    if (this.currentIndex >= target) {
      this.currentIndex += 1;
    }
    this.generateShuffleOrder();
    this.notifyListeners();
  }

  public removeTrack(index: number): void {
    if (index < 0 || index >= this.playlist.length) return;
    const isRemovingCurrent = index === this.currentIndex;

    this.playlist.splice(index, 1);
    if (this.currentIndex > index) {
      this.currentIndex -= 1;
    }

    this.generateShuffleOrder();

    if (isRemovingCurrent) {
      if (this.playlist.length === 0) {
        this.clearPlaylist();
      } else {
        const nextIndex = Math.min(this.currentIndex, this.playlist.length - 1);
        this.jumpTo(nextIndex, this.playbackStatus === 'playing');
      }
    } else {
      this.notifyListeners();
    }
  }

  public moveTrack(from: number, to: number): void {
    if (from < 0 || from >= this.playlist.length || to < 0 || to >= this.playlist.length) return;
    const item = this.playlist.splice(from, 1)[0];
    this.playlist.splice(to, 0, item);

    if (this.currentIndex === from) {
      this.currentIndex = to;
    } else if (from < this.currentIndex && to >= this.currentIndex) {
      this.currentIndex -= 1;
    } else if (from > this.currentIndex && to <= this.currentIndex) {
      this.currentIndex += 1;
    }

    this.generateShuffleOrder();
    this.notifyListeners();
  }

  public clearPlaylist(): void {
    this.stop();
    this.playlist = [];
    this.shuffledIndices = [];
    this.currentIndex = -1;
    this.channelA.activeTrack = null;
    this.channelB.activeTrack = null;
    this.notifyListeners();
  }

  public async jumpTo(index: number, autoPlay = true): Promise<void> {
    if (index < 0 || index >= this.playlist.length) return;
    this.currentIndex = index;

    if (this.crossfadeTimeout) {
      clearTimeout(this.crossfadeTimeout);
      this.crossfadeTimeout = null;
    }

    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const active = this.getActiveChannel();
    const track = this.playlist[index];

    active.activeTrack = track;
    active.gainNode.gain.value = 1.0;
    active.audio.src = track.streamUrl;
    active.audio.playbackRate = this.playbackRate;
    this.ensureSourceConnected(active);

    this.syncMediaSession();

    if (autoPlay) {
      try {
        await active.audio.play();
        this.playbackStatus = 'playing';
      } catch {
        this.playbackStatus = 'paused';
      }
    } else {
      this.playbackStatus = 'paused';
    }

    this.notifyListeners();
  }

  public async play(): Promise<void> {
    if (this.playlist.length === 0) return;
    if (this.currentIndex === -1) {
      await this.jumpTo(0, true);
      return;
    }

    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const active = this.getActiveChannel();
    try {
      await active.audio.play();
      this.playbackStatus = 'playing';
    } catch {
      this.playbackStatus = 'paused';
    }
    this.syncMediaSession();
    this.notifyListeners();
  }

  public pause(): void {
    const active = this.getActiveChannel();
    if (active.audio.pause) {
      active.audio.pause();
    }
    this.playbackStatus = 'paused';
    this.syncMediaSession();
    this.notifyListeners();
  }

  public togglePlay(): Promise<void> | void {
    if (this.playbackStatus === 'playing') {
      this.pause();
    } else {
      return this.play();
    }
  }

  public stop(): void {
    if (this.crossfadeTimeout) {
      clearTimeout(this.crossfadeTimeout);
      this.crossfadeTimeout = null;
    }

    const active = this.getActiveChannel();
    const inactive = this.getInactiveChannel();

    if (active.audio.pause) {
      active.audio.pause();
      active.audio.currentTime = 0;
    }
    if (inactive.audio.pause) {
      inactive.audio.pause();
      inactive.audio.currentTime = 0;
    }

    this.playbackStatus = 'stopped';
    this.syncMediaSession();
    this.notifyListeners();
  }

  public seek(seconds: number): void {
    const active = this.getActiveChannel();
    if (!active.audio) return;
    const clamped = Math.max(0, Math.min(seconds, active.audio.duration || 0));
    active.audio.currentTime = clamped;
    this.syncMediaSession();
    this.notifyListeners();
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGainNode && !this.isMuted) {
      this.masterGainNode.gain.value = this.volume;
    }
    this.notifyListeners();
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGainNode) {
      this.masterGainNode.gain.value = muted ? 0 : this.volume;
    }
    this.notifyListeners();
  }

  public setPlaybackRate(rate: number): void {
    this.playbackRate = Math.max(0.25, Math.min(4, rate));
    this.channelA.audio.playbackRate = this.playbackRate;
    this.channelB.audio.playbackRate = this.playbackRate;
    this.syncMediaSession();
    this.notifyListeners();
  }

  public setShuffle(shuffle: boolean): void {
    this.isShuffle = shuffle;
    this.generateShuffleOrder();
    this.notifyListeners();
  }

  public setRepeatMode(mode: RepeatMode): void {
    this.repeatMode = mode;
    this.notifyListeners();
  }

  public setAudioNormalization(enabled: boolean): void {
    if (this.isNormalized === enabled) return;
    this.isNormalized = enabled;
    this.updateNormalizationGraph();
    this.notifyListeners();
  }

  public setCrossfadeDuration(seconds: number): void {
    this.crossfadeDuration = Math.max(0, seconds);
    this.notifyListeners();
  }

  public async skipToNext(): Promise<void> {
    const next = this.peekNextIndex();
    if (next !== -1) {
      await this.jumpTo(next, true);
    } else {
      this.stop();
    }
  }

  public async skipToPrevious(): Promise<void> {
    const active = this.getActiveChannel();
    if (active.audio && active.audio.currentTime > 3) {
      this.seek(0);
      return;
    }

    const prev = this.peekPreviousIndex();
    if (prev !== -1) {
      await this.jumpTo(prev, true);
    } else {
      this.seek(0);
    }
  }

  private handleTrackEnded(): void {
    if (this.repeatMode === 'one') {
      this.seek(0);
      this.play();
      return;
    }

    const next = this.peekNextIndex();
    if (next !== -1) {
      this.jumpTo(next, true);
    } else {
      this.stop();
    }
  }

  private peekNextIndex(): number {
    if (this.playlist.length === 0) return -1;
    if (this.repeatMode === 'one') return this.currentIndex;

    if (this.isShuffle) {
      const currentPos = this.shuffledIndices.indexOf(this.currentIndex);
      if (currentPos !== -1 && currentPos < this.shuffledIndices.length - 1) {
        return this.shuffledIndices[currentPos + 1];
      }
      return this.repeatMode === 'all' ? this.shuffledIndices[0] : -1;
    }

    if (this.currentIndex < this.playlist.length - 1) {
      return this.currentIndex + 1;
    }
    return this.repeatMode === 'all' ? 0 : -1;
  }

  private peekPreviousIndex(): number {
    if (this.playlist.length === 0) return -1;

    if (this.isShuffle) {
      const currentPos = this.shuffledIndices.indexOf(this.currentIndex);
      if (currentPos > 0) {
        return this.shuffledIndices[currentPos - 1];
      }
      return this.repeatMode === 'all' ? this.shuffledIndices[this.shuffledIndices.length - 1] : -1;
    }

    if (this.currentIndex > 0) {
      return this.currentIndex - 1;
    }
    return this.repeatMode === 'all' ? this.playlist.length - 1 : -1;
  }

  private generateShuffleOrder(): void {
    this.shuffledIndices = Array.from({ length: this.playlist.length }, (_, i) => i);
    if (!this.isShuffle) return;

    // Fisher-Yates shuffle
    for (let i = this.shuffledIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.shuffledIndices[i], this.shuffledIndices[j]] = [this.shuffledIndices[j], this.shuffledIndices[i]];
    }

    // Ensure currently playing track stays at front of shuffle queue
    if (this.currentIndex !== -1) {
      const currIdx = this.shuffledIndices.indexOf(this.currentIndex);
      if (currIdx > 0) {
        this.shuffledIndices.splice(currIdx, 1);
        this.shuffledIndices.unshift(this.currentIndex);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // OS Media Controls (MediaSession / SMTC)
  // ---------------------------------------------------------------------------

  private setupMediaSession(): void {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', () => this.play());
      navigator.mediaSession.setActionHandler('pause', () => this.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.skipToPrevious());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.skipToNext());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          this.seek(details.seekTime);
        }
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const offset = details.seekOffset || 10;
        this.seek(Math.max(0, this.getState().currentTime - offset));
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const offset = details.seekOffset || 10;
        this.seek(Math.min(this.getState().duration, this.getState().currentTime + offset));
      });
      navigator.mediaSession.setActionHandler('stop', () => this.stop());
    } catch {
      // Browsers may throw on unsupported action handlers
    }
  }

  private syncMediaSession(): void {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    const track = this.getState().currentTrack;
    if (track) {
      const artwork = track.artworkUri
        ? [{ src: track.artworkUri, sizes: '512x512', type: 'image/png' }]
        : [];

      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album || '',
        artwork,
      });
    }

    navigator.mediaSession.playbackState =
      this.playbackStatus === 'playing' ? 'playing' : this.playbackStatus === 'paused' ? 'paused' : 'none';

    const active = this.getActiveChannel();
    if (
      active.audio &&
      !isNaN(active.audio.duration) &&
      active.audio.duration > 0 &&
      navigator.mediaSession.setPositionState
    ) {
      try {
        navigator.mediaSession.setPositionState({
          duration: active.audio.duration,
          playbackRate: this.playbackRate,
          position: Math.min(active.audio.currentTime, active.audio.duration),
        });
      } catch {
        // Ignore potential timing desync
      }
    }
  }

  // ---------------------------------------------------------------------------
  // State Subscriptions & Lifecycle
  // ---------------------------------------------------------------------------

  public getState(): PlayerState {
    const active = this.getActiveChannel();
    const currentTrack = this.playlist[this.currentIndex] || null;

    let currentTime = 0;
    let duration = 0;
    let bufferedTime = 0;

    if (active.audio) {
      currentTime = active.audio.currentTime || 0;
      duration = !isNaN(active.audio.duration) ? active.audio.duration : currentTrack?.durationSeconds || 0;
      if (active.audio.buffered && active.audio.buffered.length > 0) {
        bufferedTime = active.audio.buffered.end(active.audio.buffered.length - 1);
      }
    }

    return {
      currentTrack,
      playbackStatus: this.playbackStatus,
      currentTime,
      duration,
      bufferedTime,
      volume: this.volume,
      isMuted: this.isMuted,
      playbackRate: this.playbackRate,
      isShuffle: this.isShuffle,
      repeatMode: this.repeatMode,
      isNormalized: this.isNormalized,
      crossfadeDuration: this.crossfadeDuration,
      playlist: [...this.playlist],
      currentIndex: this.currentIndex,
    };
  }

  public subscribe(listener: PlayerListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    if (this.isDisposed) return;
    const state = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch {
        // Listener safety
      }
    }
  }

  public dispose(): void {
    this.isDisposed = true;
    this.stop();
    this.listeners.clear();

    if (this.channelA.audio.src) this.channelA.audio.src = '';
    if (this.channelB.audio.src) this.channelB.audio.src = '';

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
    }
  }
}
