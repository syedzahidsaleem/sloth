/**
 * Sloth MCP Metadata & Nuclear API Discovery Compatibility Layer
 * Directly implements Nuclear's list_methods, method_details, describe_type,
 * and call tools with identical domains and parameter schemas.
 */

import { playerBridge } from './playerBridge';
import { MethodMeta } from './types';

export const DOMAINS: Record<string, { description: string; methods: Record<string, MethodMeta> }> = {
  Playback: {
    description: 'Control audio playback state, transport, and seeking.',
    methods: {
      getState: {
        name: 'getState',
        description: 'Get the current playback state (status, seek position, duration).',
        params: [],
        returns: 'PlaybackState',
      },
      play: {
        name: 'play',
        description: 'Start or resume playback.',
        params: [],
        returns: 'void',
      },
      pause: {
        name: 'pause',
        description: 'Pause playback.',
        params: [],
        returns: 'void',
      },
      stop: {
        name: 'stop',
        description: 'Stop playback and reset position.',
        params: [],
        returns: 'void',
      },
      toggle: {
        name: 'toggle',
        description: 'Toggle between play and pause.',
        params: [],
        returns: 'void',
      },
      seekTo: {
        name: 'seekTo',
        description: 'Seek to a position in seconds.',
        params: [{ name: 'seconds', type: 'number', required: true, description: 'Position in seconds' }],
        returns: 'void',
      },
      getVolume: {
        name: 'getVolume',
        description: 'Get the current volume level (0 to 100).',
        params: [],
        returns: 'number',
      },
      setVolume: {
        name: 'setVolume',
        description: 'Set the volume level (0 to 100).',
        params: [{ name: 'volume', type: 'number', required: true, description: 'Volume level from 0 to 100' }],
        returns: 'void',
      },
      isMuted: {
        name: 'isMuted',
        description: 'Check whether audio output is muted.',
        params: [],
        returns: 'boolean',
      },
      setMuted: {
        name: 'setMuted',
        description: 'Mute or unmute audio.',
        params: [{ name: 'muted', type: 'boolean', required: true }],
        returns: 'void',
      },
      isShuffleEnabled: {
        name: 'isShuffleEnabled',
        description: 'Check whether shuffle is enabled.',
        params: [],
        returns: 'boolean',
      },
      setShuffleEnabled: {
        name: 'setShuffleEnabled',
        description: 'Enable or disable shuffle.',
        params: [{ name: 'enabled', type: 'boolean', required: true }],
        returns: 'void',
      },
      getRepeatMode: {
        name: 'getRepeatMode',
        description: 'Get repeat mode ("off" | "all" | "one").',
        params: [],
        returns: '"off" | "all" | "one"',
      },
      setRepeatMode: {
        name: 'setRepeatMode',
        description: 'Set repeat mode ("off" | "all" | "one").',
        params: [{ name: 'mode', type: '"off" | "all" | "one"', required: true }],
        returns: 'void',
      },
    },
  },
  Queue: {
    description: 'Manage the playback queue — add, remove, reorder tracks and control navigation.',
    methods: {
      getQueue: {
        name: 'getQueue',
        description: 'Get the current queue state.',
        params: [],
        returns: 'Track[]',
      },
      getCurrentItem: {
        name: 'getCurrentItem',
        description: 'Get the currently playing queue item.',
        params: [],
        returns: 'Track | null',
      },
      addToQueue: {
        name: 'addToQueue',
        description: 'Add track or tracks to the end of the queue.',
        params: [{ name: 'trackId', type: 'string', required: true, description: 'ID or title of track to add' }],
        returns: 'void',
      },
      clearQueue: {
        name: 'clearQueue',
        description: 'Remove all items from the queue.',
        params: [],
        returns: 'void',
      },
      goToNext: {
        name: 'goToNext',
        description: 'Skip to the next item.',
        params: [],
        returns: 'void',
      },
      goToPrevious: {
        name: 'goToPrevious',
        description: 'Go back to the previous item.',
        params: [],
        returns: 'void',
      },
    },
  },
  Metadata: {
    description: 'Search for music and fetch artist, album, and track metadata.',
    methods: {
      search: {
        name: 'search',
        description: 'Search music catalog by title, artist, or album.',
        params: [{ name: 'query', type: 'string', required: true, description: 'Search keywords' }],
        returns: 'Track[]',
      },
      fetchTrackDetails: {
        name: 'fetchTrackDetails',
        description: 'Fetch details for a track by ID.',
        params: [{ name: 'id', type: 'string', required: true }],
        returns: 'Track | null',
      },
    },
  },
  Engine: {
    description: 'Sloth AI Recommendation Engine & Neural Audio Scoring.',
    methods: {
      setMood: {
        name: 'setMood',
        description: 'Set target mood coordinates in Russell circumplex space and generate recommendations.',
        params: [
          { name: 'valence', type: 'number', required: true, description: 'Musical valence/positivity (0.0 to 1.0)' },
          { name: 'arousal', type: 'number', required: true, description: 'Musical arousal/energy (0.0 to 1.0)' },
        ],
        returns: 'MoodRecommendationResult',
      },
    },
  },
};

export function listMethods(domain: string): { domain: string; description: string; methods: string[] } {
  const dom = DOMAINS[domain];
  if (!dom) {
    throw new Error(
      `Unknown domain: '${domain}'. Available domains: ${Object.keys(DOMAINS).join(', ')}`
    );
  }
  return {
    domain,
    description: dom.description,
    methods: Object.keys(dom.methods),
  };
}

export function methodDetails(domain: string, method: string): MethodMeta {
  const dom = DOMAINS[domain];
  if (!dom) {
    throw new Error(`Unknown domain: '${domain}'.`);
  }
  const m = dom.methods[method];
  if (!m) {
    throw new Error(`Unknown method: '${domain}.${method}'.`);
  }
  return m;
}

export function describeType(typeName: string): Record<string, unknown> {
  switch (typeName.toLowerCase()) {
    case 'track':
      return {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          artist: { type: 'string' },
          album: { type: 'string' },
          durationSeconds: { type: 'number' },
          durationMs: { type: 'number' },
          coverUrl: { type: 'string' },
          valence: { type: 'number', description: 'Musical valence 0.0 to 1.0' },
          arousal: { type: 'number', description: 'Musical energy 0.0 to 1.0' },
        },
      };

    case 'playbackstate':
      return {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['playing', 'paused', 'stopped'] },
          isPlaying: { type: 'boolean' },
          positionMs: { type: 'number' },
          durationMs: { type: 'number' },
          volume: { type: 'number' },
          isMuted: { type: 'boolean' },
          isShuffle: { type: 'boolean' },
          repeatMode: { type: 'string', enum: ['off', 'all', 'one'] },
          currentTrack: { $ref: '#/definitions/Track' },
        },
      };

    case 'queue':
      return {
        type: 'array',
        items: { $ref: '#/definitions/Track' },
      };

    default:
      return {
        type: 'object',
        description: `Generic representation of type ${typeName}`,
      };
  }
}

export async function executeCall(
  methodString: string,
  params: Record<string, any> = {}
): Promise<any> {
  const parts = methodString.split('.');
  if (parts.length !== 2) {
    throw new Error(`Invalid method format '${methodString}': expected 'Domain.method', e.g. 'Playback.play'`);
  }
  const [domain, method] = parts;

  switch (`${domain}.${method}`) {
    case 'Playback.play':
      return playerBridge.play();
    case 'Playback.pause':
      return playerBridge.pause();
    case 'Playback.stop':
      return playerBridge.stop();
    case 'Playback.toggle':
      return playerBridge.toggle();
    case 'Playback.seekTo':
      return playerBridge.seek((params.seconds ?? 0) * 1000);
    case 'Playback.getVolume':
      return playerBridge.getState().volume;
    case 'Playback.setVolume': {
      const vol = params.volume !== undefined ? (params.volume <= 1 ? params.volume * 100 : params.volume) : 80;
      return playerBridge.setVolume(vol);
    }
    case 'Playback.getState':
      return playerBridge.getState();
    case 'Playback.isMuted':
      return playerBridge.getState().isMuted;
    case 'Playback.setMuted':
      return playerBridge.setMuted(Boolean(params.muted));
    case 'Playback.isShuffleEnabled':
      return playerBridge.getState().isShuffle;
    case 'Playback.setShuffleEnabled':
      return playerBridge.setShuffle(Boolean(params.enabled));
    case 'Playback.getRepeatMode':
      return playerBridge.getState().repeatMode;
    case 'Playback.setRepeatMode':
      return playerBridge.setRepeatMode(params.mode || 'off');

    case 'Queue.getQueue':
      return playerBridge.getQueue();
    case 'Queue.getCurrentItem':
      return playerBridge.getCurrentTrack();
    case 'Queue.addToQueue': {
      const trackId = params.trackId || (Array.isArray(params.tracks) ? params.tracks[0]?.id : params.tracks?.id) || String(params);
      return playerBridge.addToQueue(String(trackId));
    }
    case 'Queue.goToNext':
      return playerBridge.next();
    case 'Queue.goToPrevious':
      return playerBridge.previous();
    case 'Queue.clearQueue':
      return playerBridge.clearQueue();

    case 'Metadata.search':
      return playerBridge.search(params.query || params.terms || '');
    case 'Metadata.fetchTrackDetails':
      return playerBridge.getTrackById(params.id);

    case 'Engine.setMood':
    case 'Sloth.setMood':
      return playerBridge.setMood(params.valence ?? 0.5, params.arousal ?? 0.5);

    default:
      throw new Error(`Method '${methodString}' is not supported or not implemented in Sloth bridge`);
  }
}
