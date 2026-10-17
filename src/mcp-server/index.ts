/**
 * Sloth MCP Server Entry Point
 * Starts HTTP server on port 8801 (http://127.0.0.1:8801/mcp)
 * or stdio transport if --stdio flag is passed.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createSlothMcpServer } from './server';
import { SlothMcpHttpServer, DEFAULT_MCP_PORT } from './httpServer';

export * from './types';
export * from './playerBridge';
export * from './metadata';
export * from './rateLimiter';
export * from './server';
export * from './httpServer';

async function main() {
  const args = process.argv.slice(2);
  const useStdio = args.includes('--stdio');
  const portIndex = args.indexOf('--port');
  const port = portIndex !== -1 && args[portIndex + 1] ? parseInt(args[portIndex + 1], 10) : DEFAULT_MCP_PORT;

  if (useStdio) {
    const server = createSlothMcpServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Sloth MCP server running on stdio');
    return;
  }

  const httpServer = new SlothMcpHttpServer(port);
  await httpServer.start();

  console.log(`[Sloth MCP] Server online on http://127.0.0.1:${port}/mcp`);
  console.log(`[Sloth MCP] Health check available at http://127.0.0.1:${port}/health`);
  console.log(`[Sloth MCP] Rate limit: 60 calls/min (Localhost only)`);

  const shutdown = async () => {
    console.log('\n[Sloth MCP] Shutting down server...');
    await httpServer.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Run main if executed directly via node or tsx
if (import.meta.url === `file://${process.argv[1]}`.replace(/\\/g, '/') || process.argv[1]?.includes('mcp-server')) {
  main().catch((err) => {
    console.error('[Sloth MCP] Fatal error starting server:', err);
    process.exit(1);
  });
}
