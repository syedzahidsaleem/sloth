/**
 * Sloth MCP Security & Rate Limiter
 * Enforces localhost-only binding and a sliding window rate limit of 60 calls/min.
 */

export class McpRateLimiter {
  private windowMs: number;
  private maxRequests: number;
  private requests: Map<string, number[]> = new Map();

  constructor(maxRequests: number = 60, windowMs: number = 60_000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Checks whether the request is allowed from the given IP address.
   */
  public isAllowed(clientIp: string): { allowed: boolean; remaining: number; resetMs: number } {
    const now = Date.now();
    const cutoff = now - this.windowMs;

    let timestamps = this.requests.get(clientIp) || [];
    // Evict old timestamps
    timestamps = timestamps.filter((t) => t > cutoff);

    if (timestamps.length >= this.maxRequests) {
      const oldest = timestamps[0];
      const resetMs = Math.max(0, oldest + this.windowMs - now);
      this.requests.set(clientIp, timestamps);
      return { allowed: false, remaining: 0, resetMs };
    }

    timestamps.push(now);
    this.requests.set(clientIp, timestamps);

    return {
      allowed: true,
      remaining: this.maxRequests - timestamps.length,
      resetMs: this.windowMs,
    };
  }

  public reset(clientIp?: string): void {
    if (clientIp) {
      this.requests.delete(clientIp);
    } else {
      this.requests.clear();
    }
  }
}

/**
 * Validates that an incoming HTTP request is strictly from localhost (127.0.0.1 / ::1)
 * to protect against DNS rebinding and cross-origin hijacking.
 */
export function isLocalhost(remoteAddress?: string, hostHeader?: string): boolean {
  if (!remoteAddress) return false;

  const validIps = ['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost'];
  const isIpLocal = validIps.some((ip) => remoteAddress.includes(ip));

  if (!isIpLocal) {
    return false;
  }

  if (hostHeader) {
    const hostWithoutPort = hostHeader.split(':')[0].toLowerCase();
    const validHosts = ['127.0.0.1', 'localhost', '::1'];
    if (!validHosts.includes(hostWithoutPort)) {
      return false;
    }
  }

  return true;
}

export const rateLimiter = new McpRateLimiter(60, 60_000);
