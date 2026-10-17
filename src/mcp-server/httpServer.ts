/**
 * Sloth MCP HTTP Server
 * Exposes Streamable HTTP and SSE endpoints at http://127.0.0.1:8801/mcp
 *
 * Security:
 * - 127.0.0.1 only (rejects non-localhost requests)
 * - Rate limited to 60 calls per minute per IP
 * - DNS rebinding protected
 */

import http from 'http';
import { URL } from 'url';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createSlothMcpServer } from './server';
import { isLocalhost, rateLimiter } from './rateLimiter';
import { playerBridge } from './playerBridge';
import { describeType, executeCall, listMethods, methodDetails } from './metadata';

export const DEFAULT_MCP_PORT = 8801;

interface ActiveSseSession {
  transport: SSEServerTransport;
  mcpServer: ReturnType<typeof createSlothMcpServer>;
}

export class SlothMcpHttpServer {
  private server: http.Server | null = null;
  private sessions: Map<string, ActiveSseSession> = new Map();
  private port: number;

  constructor(port: number = DEFAULT_MCP_PORT) {
    this.port = port;
  }

  public async start(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        // Set standard CORS headers for local tools
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id');

        if (req.method === 'OPTIONS') {
          res.writeHead(204).end();
          return;
        }

        const remoteIp = req.socket.remoteAddress || '127.0.0.1';
        const hostHeader = req.headers.host;

        // 1. Security Check: 127.0.0.1 / localhost only
        if (!isLocalhost(remoteIp, hostHeader)) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Forbidden: Localhost access only' }));
          return;
        }

        // 2. Rate Limit Check: 60 calls per minute
        const rateCheck = rateLimiter.isAllowed(remoteIp);
        res.setHeader('X-RateLimit-Limit', '60');
        res.setHeader('X-RateLimit-Remaining', String(rateCheck.remaining));

        if (!rateCheck.allowed) {
          res.writeHead(429, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              error: 'Too Many Requests: Rate limit is 60 calls per minute',
              retryAfterMs: rateCheck.resetMs,
            })
          );
          return;
        }

        const fullUrl = new URL(req.url || '/', `http://127.0.0.1:${this.port}`);
        const pathname = fullUrl.pathname;

        // Health / Status endpoint
        if (pathname === '/health' || pathname === '/status') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              status: 'online',
              service: 'Sloth MCP Server',
              port: this.port,
              version: '1.0.0',
              activeSessions: this.sessions.size,
              tools: [
                'play',
                'pause',
                'next',
                'previous',
                'seek',
                'setVolume',
                'getQueue',
                'addToQueue',
                'search',
                'getCurrentTrack',
                'setMood',
                'list_methods',
                'method_details',
                'describe_type',
                'call',
              ],
              resources: ['sloth://queue', 'sloth://track/{id}'],
            })
          );
          return;
        }

        // -------------------------------------------------------------
        // SSE GET Endpoint (/mcp or /sse)
        // -------------------------------------------------------------
        if (req.method === 'GET' && (pathname === '/mcp' || pathname === '/sse')) {
          const mcpServer = createSlothMcpServer();
          const transport = new SSEServerTransport('/mcp', res);
          const sessionId = transport.sessionId;

          this.sessions.set(sessionId, { transport, mcpServer });

          transport.onclose = () => {
            this.sessions.delete(sessionId);
          };

          try {
            await mcpServer.connect(transport);
          } catch (e) {
            console.error('Error connecting MCP SSE transport:', e);
            if (!res.headersSent) {
              res.writeHead(500).end('Internal Server Error');
            }
          }
          return;
        }

        // -------------------------------------------------------------
        // POST Message Endpoint (/mcp or /message)
        // -------------------------------------------------------------
        if (req.method === 'POST' && (pathname === '/mcp' || pathname === '/message')) {
          const sessionId = fullUrl.searchParams.get('sessionId') || (req.headers['mcp-session-id'] as string);

          if (sessionId && this.sessions.has(sessionId)) {
            const session = this.sessions.get(sessionId)!;
            await session.transport.handlePostMessage(req, res);
            return;
          }

          // Direct JSON-RPC POST Handler (stateless / HTTP clients)
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });

          req.on('end', async () => {
            try {
              const rpc = JSON.parse(body || '{}');
              const response = await this.handleDirectJsonRpc(rpc);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(response));
            } catch (err: any) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  jsonrpc: '2.0',
                  id: null,
                  error: { code: -32700, message: `Parse error: ${err.message}` },
                })
              );
            }
          });
          return;
        }

        // Default 404
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found', availableEndpoints: ['/mcp', '/health'] }));
      });

      this.server.on('error', (err: any) => {
        reject(err);
      });

      this.server.listen(this.port, '127.0.0.1', () => {
        resolve(this.port);
      });
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      for (const [id, session] of this.sessions.entries()) {
        session.transport.close().catch(() => {});
        this.sessions.delete(id);
      }
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  /**
   * Direct JSON-RPC 2.0 handler for CLI / HTTP callers.
   */
  private async handleDirectJsonRpc(rpc: any): Promise<any> {
    const id = rpc.id ?? null;
    const method = rpc.method;
    const params = rpc.params || {};

    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
              resources: {},
            },
            serverInfo: {
              name: 'sloth-mcp',
              version: '1.0.0',
            },
          },
        };

      case 'notifications/initialized':
      case 'initialized':
        return { jsonrpc: '2.0' };

      case 'ping':
        return { jsonrpc: '2.0', id, result: {} };

      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: [
              { name: 'play', description: 'Start or resume playback.', inputSchema: { type: 'object' } },
              { name: 'pause', description: 'Pause playback.', inputSchema: { type: 'object' } },
              { name: 'next', description: 'Skip to next track.', inputSchema: { type: 'object' } },
              { name: 'previous', description: 'Return to previous track.', inputSchema: { type: 'object' } },
              {
                name: 'seek',
                description: 'Seek to position in milliseconds.',
                inputSchema: {
                  type: 'object',
                  properties: { positionMs: { type: 'number' } },
                  required: ['positionMs'],
                },
              },
              {
                name: 'setVolume',
                description: 'Set volume level 0-100.',
                inputSchema: {
                  type: 'object',
                  properties: { level: { type: 'number', minimum: 0, maximum: 100 } },
                  required: ['level'],
                },
              },
              { name: 'getQueue', description: 'Get current playback queue.', inputSchema: { type: 'object' } },
              {
                name: 'addToQueue',
                description: 'Add track by ID or title.',
                inputSchema: {
                  type: 'object',
                  properties: { trackId: { type: 'string' } },
                  required: ['trackId'],
                },
              },
              {
                name: 'search',
                description: 'Search tracks in catalog and database.',
                inputSchema: {
                  type: 'object',
                  properties: { query: { type: 'string' } },
                  required: ['query'],
                },
              },
              { name: 'getCurrentTrack', description: 'Get currently playing track.', inputSchema: { type: 'object' } },
              {
                name: 'setMood',
                description: 'Set target valence and arousal coordinates (0.0 to 1.0).',
                inputSchema: {
                  type: 'object',
                  properties: {
                    valence: { type: 'number', minimum: 0, maximum: 1 },
                    arousal: { type: 'number', minimum: 0, maximum: 1 },
                  },
                  required: ['valence', 'arousal'],
                },
              },
              {
                name: 'list_methods',
                description: 'List available methods in a domain (Nuclear discovery).',
                inputSchema: {
                  type: 'object',
                  properties: { domain: { type: 'string' } },
                  required: ['domain'],
                },
              },
              {
                name: 'method_details',
                description: 'Get details for Domain.method (Nuclear discovery).',
                inputSchema: {
                  type: 'object',
                  properties: { method: { type: 'string' } },
                  required: ['method'],
                },
              },
              {
                name: 'describe_type',
                description: 'Get JSON shape for data type (Nuclear discovery).',
                inputSchema: {
                  type: 'object',
                  properties: { type: { type: 'string' } },
                  required: ['type'],
                },
              },
              {
                name: 'call',
                description: 'Call a player API method in Domain.method format (Nuclear discovery).',
                inputSchema: {
                  type: 'object',
                  properties: { method: { type: 'string' }, params: { type: 'object' } },
                  required: ['method'],
                },
              },
            ],
          },
        };

      case 'tools/call': {
        const toolName = params.name;
        const args = params.arguments || {};
        let result: any;

        switch (toolName) {
          case 'play':
            result = playerBridge.play();
            break;
          case 'pause':
            result = playerBridge.pause();
            break;
          case 'next':
            result = playerBridge.next();
            break;
          case 'previous':
            result = playerBridge.previous();
            break;
          case 'seek':
            result = playerBridge.seek(Number(args.positionMs ?? 0));
            break;
          case 'setVolume':
            result = playerBridge.setVolume(Number(args.level ?? 80));
            break;
          case 'getQueue':
            result = playerBridge.getQueue();
            break;
          case 'addToQueue':
            result = playerBridge.addToQueue(String(args.trackId || ''));
            break;
          case 'search':
            result = playerBridge.search(String(args.query || ''));
            break;
          case 'getCurrentTrack':
            result = {
              track: playerBridge.getCurrentTrack(),
              playbackState: playerBridge.getState(),
            };
            break;
          case 'setMood':
            result = playerBridge.setMood(Number(args.valence ?? 0.5), Number(args.arousal ?? 0.5));
            break;
          case 'list_methods':
            result = listMethods(String(args.domain || 'Playback'));
            break;
          case 'method_details': {
            const [dom, meth] = String(args.method || '').split('.');
            result = methodDetails(dom, meth);
            break;
          }
          case 'describe_type':
            result = describeType(String(args.type || 'Track'));
            break;
          case 'call':
            result = await executeCall(String(args.method || ''), args.params || {});
            break;
          default:
            return {
              jsonrpc: '2.0',
              id,
              error: { code: -32601, message: `Tool '${toolName}' not found` },
            };
        }

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          },
        };
      }

      case 'resources/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            resources: [
              {
                uri: 'sloth://queue',
                name: 'Current Queue',
                mimeType: 'application/json',
                description: 'Current playback queue items.',
              },
              {
                uri: 'sloth://track/{id}',
                name: 'Track Metadata',
                mimeType: 'application/json',
                description: 'Metadata for specific track by ID.',
              },
            ],
          },
        };

      case 'resources/read': {
        const uri = String(params.uri || '');
        if (uri === 'sloth://queue') {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              contents: [
                {
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(playerBridge.getQueue(), null, 2),
                },
              ],
            },
          };
        }

        if (uri.startsWith('sloth://track/')) {
          const trackId = uri.replace('sloth://track/', '');
          const track = playerBridge.getTrackById(trackId);
          return {
            jsonrpc: '2.0',
            id,
            result: {
              contents: [
                {
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(track || { error: 'Not found' }, null, 2),
                },
              ],
            },
          };
        }

        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32602, message: `Resource '${uri}' not recognized` },
        };
      }

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method '${method}' not found` },
        };
    }
  }
}
