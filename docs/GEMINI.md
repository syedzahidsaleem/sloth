# Sloth — MCP Server Configuration

Sloth MCP: run pnpm sloth-mcp to start.
OpenCode config: { mcp: { sloth: { type: 'remote', url: 'http://127.0.0.1:8801/mcp' } } }
Claude Code: claude mcp add sloth --transport http http://127.0.0.1:8801/mcp

## Port & Protocol
- **Port**: 8801 (`http://127.0.0.1:8801/mcp`)
- **Transport**: Streamable HTTP and Server-Sent Events (SSE)
- **Security**: Bound to 127.0.0.1 (localhost only), rate-limited to 60 calls/min per client IP.

## Tools Exposed
- `play()`: Start or resume audio playback.
- `pause()`: Pause audio playback.
- `next()`: Advance to next track in queue.
- `previous()`: Return to previous track in queue.
- `seek(positionMs: number)`: Seek to position in milliseconds.
- `setVolume(level: number)`: Set playback volume level (0-100).
- `getQueue()`: Return array of current queue tracks.
- `addToQueue(trackId: string)`: Enqueue a track by ID or title.
- `search(query: string)`: Search catalog and SQLite database for tracks.
- `getCurrentTrack()`: Retrieve currently playing track and playback state.
- `setMood(valence: number, arousal: number)`: Emotional music recommendation via Russell's circumplex model (valence and arousal 0.0 to 1.0).

## Nuclear Compatibility Tools
- `list_methods(domain: string)`: Hierarchical discovery across Playback, Queue, Metadata, Engine.
- `method_details(method: string)`: Parameter schemas, types, and return descriptions.
- `describe_type(type: string)`: JSON shape for complex data structures.
- `call(method: string, params: object)`: Execute methods in Domain.method format.

## Resources Exposed
- `sloth://queue`: Current queue JSON document.
- `sloth://track/{id}`: Detailed track metadata by ID.
