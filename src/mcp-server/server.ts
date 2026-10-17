/**
 * Sloth MCP Server Configuration
 * Registers tools, resources, and Nuclear-compatible discovery pattern.
 */

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { playerBridge } from './playerBridge';
import { describeType, executeCall, listMethods, methodDetails } from './metadata';

export function createSlothMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: 'sloth-mcp',
      version: '1.0.0',
    },
    {
      instructions:
        'Sloth Unified Music Player MCP Server. Supports direct playback commands (play, pause, seek, setVolume, getQueue, addToQueue, search, getCurrentTrack, setMood) as well as Nuclear hierarchical discovery tools (list_methods, method_details, describe_type, call).',
    }
  );

  // -----------------------------------------------------------------
  // 1. Direct Playback Tools
  // -----------------------------------------------------------------

  server.tool(
    'play',
    {},
    async () => {
      const result = playerBridge.play();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    'pause',
    {},
    async () => {
      const result = playerBridge.pause();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    'next',
    {},
    async () => {
      const result = playerBridge.next();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    'previous',
    {},
    async () => {
      const result = playerBridge.previous();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    'seek',
    {
      positionMs: z.number().describe('Position in milliseconds'),
    },
    async ({ positionMs }) => {
      const result = playerBridge.seek(positionMs);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    'setVolume',
    {
      level: z.number().min(0).max(100).describe('Volume level from 0 to 100'),
    },
    async ({ level }) => {
      const result = playerBridge.setVolume(level);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    'getQueue',
    {},
    async () => {
      const queue = playerBridge.getQueue();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(queue, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    'addToQueue',
    {
      trackId: z.string().describe('Track ID or title to add to queue'),
    },
    async ({ trackId }) => {
      const result = playerBridge.addToQueue(trackId);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    'search',
    {
      query: z.string().describe('Track, artist, or album search query'),
    },
    async ({ query }) => {
      const results = playerBridge.search(query);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    'getCurrentTrack',
    {},
    async () => {
      const track = playerBridge.getCurrentTrack();
      const state = playerBridge.getState();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ track, playbackState: state }, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    'setMood',
    {
      valence: z.number().min(0).max(1).describe('Musical valence/positivity coordinate (0.0 to 1.0)'),
      arousal: z.number().min(0).max(1).describe('Musical arousal/energy coordinate (0.0 to 1.0)'),
    },
    async ({ valence, arousal }) => {
      const result = playerBridge.setMood(valence, arousal);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  // -----------------------------------------------------------------
  // 2. Nuclear Hierarchical Discovery Tools
  // -----------------------------------------------------------------

  server.tool(
    'list_methods',
    {
      domain: z.string().describe('Nuclear API domain: Playback, Queue, Metadata, Engine'),
    },
    async ({ domain }) => {
      try {
        const methods = listMethods(domain);
        return {
          content: [{ type: 'text', text: JSON.stringify(methods, null, 2) }],
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'method_details',
    {
      method: z.string().describe('Method name in Domain.method format (e.g. Queue.addToQueue)'),
    },
    async ({ method }) => {
      const [domain, methodName] = method.split('.');
      if (!domain || !methodName) {
        return {
          content: [{ type: 'text', text: `Invalid method format: expected Domain.method, got '${method}'` }],
          isError: true,
        };
      }
      try {
        const details = methodDetails(domain, methodName);
        return {
          content: [{ type: 'text', text: JSON.stringify(details, null, 2) }],
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'describe_type',
    {
      type: z.string().describe('Type name, e.g. Track, PlaybackState, Queue'),
    },
    async ({ type }) => {
      const shape = describeType(type);
      return {
        content: [{ type: 'text', text: JSON.stringify(shape, null, 2) }],
      };
    }
  );

  server.tool(
    'call',
    {
      method: z.string().describe('Method name in Domain.method format, e.g. Playback.play'),
      params: z.record(z.string(), z.any()).optional().describe('Named parameter arguments'),
    },
    async ({ method, params }) => {
      try {
        const result = await executeCall(method, params || {});
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Error executing ${method}: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  // -----------------------------------------------------------------
  // 3. Resources
  // -----------------------------------------------------------------

  // sloth://queue
  server.resource(
    'queue',
    'sloth://queue',
    async (uri) => {
      const queue = playerBridge.getQueue();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(queue, null, 2),
          },
        ],
      };
    }
  );

  // sloth://track/{id}
  server.resource(
    'track',
    new ResourceTemplate('sloth://track/{id}', { list: undefined }),
    async (uri, { id }) => {
      const trackId = Array.isArray(id) ? id[0] : id;
      const track = playerBridge.getTrackById(String(trackId));
      if (!track) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify({ error: `Track '${trackId}' not found` }, null, 2),
            },
          ],
        };
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(track, null, 2),
          },
        ],
      };
    }
  );

  return server;
}
