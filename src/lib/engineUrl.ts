/**
 * Sloth Engine URL Helper
 * Resolves the backend engine base URL and WebSocket URL:
 * 1. Environment variable VITE_ENGINE_URL (configured on Vercel/production)
 * 2. User-configured engineHost in localStorage / SlothSettings
 * 3. Fallback to local 127.0.0.1:8001
 */

import { getSlothSettings } from '@/services/settingsStore';

export function getEngineBaseUrl(): string {
  // 1. Production / Vercel Environment Variable
  const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ENGINE_URL) as string | undefined;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 2. User Settings Host
  try {
    const settings = getSlothSettings();
    if (settings.engineHost && settings.engineHost !== 'localhost:8001' && settings.engineHost.trim().length > 0) {
      const host = settings.engineHost.trim();
      return host.startsWith('http') ? host.replace(/\/+$/, '') : `http://${host}`;
    }
  } catch {
    // Fall back to default
  }

  // 3. Local Default
  return 'http://127.0.0.1:8001';
}

export function getListenTogetherWsUrl(): string {
  const envWsUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_LISTEN_TOGETHER_WS_URL) as string | undefined;
  if (envWsUrl && envWsUrl.trim().length > 0) {
    return envWsUrl.trim();
  }

  const base = getEngineBaseUrl();
  if (base.startsWith('https://')) {
    return `${base.replace('https://', 'wss://')}/ws`;
  }
  if (base.startsWith('http://')) {
    return `${base.replace('http://', 'ws://')}/ws`;
  }

  return 'ws://127.0.0.1:8000/ws';
}
