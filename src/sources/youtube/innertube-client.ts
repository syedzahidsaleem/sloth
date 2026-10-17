/**
 * Sloth YouTube InnerTube Client
 * Ported from Metrolist (GPL-3.0) by MetrolistGroup
 * (C) 2026 MetrolistGroup / Adapted for Sloth
 *
 * Implements YouTube Music InnerTube API communication, context handling,
 * visitor data acquisition, search/browse/next pipelines, and playable stream resolution.
 */

export interface InnerTubeConfig {
  baseUrl?: string;
  hl?: string;
  gl?: string;
  visitorData?: string;
  cookie?: string;
  userAgent?: string;
}

export interface YTThumbnail {
  url: string;
  width: number;
  height: number;
}

export interface YTArtist {
  id?: string;
  name: string;
}

export interface YTSongItem {
  id: string;
  title: string;
  artists: YTArtist[];
  album?: { id?: string; name: string };
  duration?: number;
  durationText?: string;
  thumbnails: YTThumbnail[];
  explicit?: boolean;
}

export interface YTAlbumItem {
  id: string;
  title: string;
  artists: YTArtist[];
  year?: string;
  thumbnails: YTThumbnail[];
}

export interface YTArtistItem {
  id: string;
  name: string;
  subscribers?: string;
  thumbnails: YTThumbnail[];
}

export interface YTSearchSummary {
  title: string;
  items: Array<YTSongItem | YTAlbumItem | YTArtistItem>;
}

export interface YTSearchResult {
  topResult?: YTSongItem | YTAlbumItem | YTArtistItem;
  summaries: YTSearchSummary[];
  continuation?: string;
}

export interface YTFormat {
  itag: number;
  url?: string;
  mimeType: string;
  bitrate: number;
  contentLength?: number;
  quality?: string;
  audioQuality?: string;
  approxDurationMs?: number;
  audioSampleRate?: number;
  audioChannels?: number;
  loudnessDb?: number;
  signatureCipher?: string;
  cipher?: string;
}

export interface YTPlayerResponse {
  playabilityStatus: {
    status: string;
    reason?: string;
  };
  videoDetails: {
    videoId: string;
    title: string;
    author: string;
    channelId: string;
    lengthSeconds: string;
    thumbnails: YTThumbnail[];
  };
  streamingData?: {
    expiresInSeconds: number;
    formats?: YTFormat[];
    adaptiveFormats: YTFormat[];
  };
}

export interface YTNextResult {
  currentTrack?: YTSongItem;
  queue: YTSongItem[];
  currentIndex?: number;
  continuation?: string;
}

export interface ResolvedStream {
  url: string;
  itag: number;
  mimeType: string;
  bitrate: number;
  durationMs?: number;
  loudnessDb?: number;
  clientUsed: string;
}

/**
 * YouTube client profiles mirrored from Metrolist/Meld InnerTube clients
 */
export const YOUTUBE_CLIENTS = {
  WEB_REMIX: {
    clientName: 'WEB_REMIX',
    clientVersion: '1.20260213.01.00',
    clientId: '67',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0',
    loginSupported: true,
  },
  ANDROID_MUSIC: {
    clientName: 'ANDROID_MUSIC',
    clientVersion: '7.02.52',
    clientId: '21',
    ua: 'com.google.android.apps.youtube.music/7.02.52 (Linux; U; Android 14; en_US; Pixel 8 Pro) gzip',
    osName: 'Android',
    osVersion: '14',
    deviceMake: 'Google',
    deviceModel: 'Pixel 8 Pro',
    androidSdkVersion: 34,
    loginSupported: true,
  },
  TVHTML5_SIMPLY_EMBEDDED_PLAYER: {
    clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER',
    clientVersion: '2.0',
    clientId: '85',
    ua: 'Mozilla/5.0 (PlayStation; PlayStation 4/12.02) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Safari/605.1.15',
    loginSupported: false,
    isEmbedded: true,
  },
  IOS: {
    clientName: 'IOS',
    clientVersion: '21.03.1',
    clientId: '5',
    ua: 'com.google.ios.youtube/21.03.1 (iPhone16,2; U; CPU iOS 18_2 like Mac OS X;)',
    loginSupported: false,
  },
} as const;

export type YouTubeClientType = keyof typeof YOUTUBE_CLIENTS;

/**
 * Parses duration text formatted as "mm:ss" or "hh:mm:ss" into total seconds
 */
export function parseDurationText(text?: string): number | undefined {
  if (!text) return undefined;
  const parts = text.split(':').map((p) => parseInt(p.trim(), 10));
  if (parts.some(isNaN)) return undefined;

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return undefined;
}

/**
 * Extracts plain text from an InnerTube runs array
 */
export function extractRunsText(runsObj?: { runs?: Array<{ text: string }> } | string): string {
  if (!runsObj) return '';
  if (typeof runsObj === 'string') return runsObj;
  if (Array.isArray(runsObj.runs)) {
    return runsObj.runs.map((r) => r.text).join('');
  }
  return '';
}

/**
 * Extracts artist runs from an InnerTube runs array
 */
export function extractArtists(runs?: Array<{ text: string; navigationEndpoint?: any }>): YTArtist[] {
  if (!runs || !Array.isArray(runs)) return [];
  const artists: YTArtist[] = [];

  for (const run of runs) {
    const text = run.text.trim();
    if (!text || text === '&' || text === ',' || text === '•') continue;
    const browseId = run.navigationEndpoint?.browseEndpoint?.browseId;
    artists.push({
      name: text,
      id: browseId,
    });
  }

  return artists.length > 0 ? artists : [{ name: 'Unknown Artist' }];
}

/**
 * Cipher Solver for YouTube signatureCipher
 * Extracts and runs signature transformation actions (reverse, splice, swap)
 */
export class YouTubeCipherSolver {
  private static cachedOperations: Array<(arr: string[]) => void> | null = null;
  private static cachedPlayerUrl: string | null = null;

  public static getCachedPlayerUrl(): string | null {
    return this.cachedPlayerUrl;
  }

  /**
   * Deciphers a scrambled signature `s` using extracted transformations
   */
  public static async decipher(scrambledSig: string): Promise<string> {
    const operations = await this.getPlayerOperations();
    const chars = scrambledSig.split('');
    for (const op of operations) {
      op(chars);
    }
    return chars.join('');
  }

  /**
   * Fetches the active YouTube player base.js and compiles the signature transformations
   */
  public static async getPlayerOperations(): Promise<Array<(arr: string[]) => void>> {
    if (this.cachedOperations) {
      return this.cachedOperations;
    }

    try {
      // 1. Fetch iframe api to get current player hash
      const iframeResp = await fetch('https://www.youtube.com/iframe_api');
      const iframeHtml = await iframeResp.text();
      const match = iframeHtml.match(/player\\?\/([a-zA-Z0-9_-]{8,})\\?\//);
      const hash = match ? match[1] : '8b2b7336';

      const playerUrl = `https://www.youtube.com/s/player/${hash}/player_ias.vflset/en_US/base.js`;
      this.cachedPlayerUrl = playerUrl;

      const playerResp = await fetch(playerUrl);
      const jsCode = await playerResp.text();

      const ops = this.extractTransformations(jsCode);
      if (ops.length > 0) {
        this.cachedOperations = ops;
        return ops;
      }
    } catch {
      // Fallback: standard default operations if player fetch fails
    }

    // Default fallback: return identity/reverse
    return [(arr) => arr.reverse()];
  }

  /**
   * Extracts decipher functions from player JS code
   */
  private static extractTransformations(jsCode: string): Array<(arr: string[]) => void> {
    const operations: Array<(arr: string[]) => void> = [];

    // Find decipher entry function
    const funcMatch =
      jsCode.match(/\b[cs]\s*=\s*function\((\w+)\)\{\s*\1=\1\.split\(""\);\s*([^;]+);/i) ||
      jsCode.match(/(\w+)=function\(\w+\)\{\w+=\w+\.split\(""\);([\s\S]+?)\.join\(""\)\}/);

    if (!funcMatch) {
      return operations;
    }

    const funcBody = funcMatch[2] || funcMatch[0];
    const statements = funcBody.split(';');

    for (const stmt of statements) {
      const callMatch = stmt.match(/(\w+)\.(\w+)\(\w+,(\d+)\)/);
      if (callMatch) {
        const [, , actionName, rawArg] = callMatch;
        const arg = parseInt(rawArg, 10);

        // Find the action definition
        const actionPattern = new RegExp(`${actionName}:function\\(.*?\\)\\{(.*?)\\}`, 's');
        const actionDef = jsCode.match(actionPattern)?.[1] || '';

        if (actionDef.includes('reverse')) {
          operations.push((arr) => arr.reverse());
        } else if (actionDef.includes('splice')) {
          operations.push((arr) => arr.splice(0, arg));
        } else if (actionDef.includes('var c=') || actionDef.includes('[0]=')) {
          operations.push((arr) => {
            const temp = arr[0];
            arr[0] = arr[arg % arr.length];
            arr[arg % arr.length] = temp;
          });
        }
      }
    }

    return operations;
  }
}

/**
 * Sloth InnerTube Client
 */
export class InnerTubeClient {
  private baseUrl: string;
  private hl: string;
  private gl: string;
  private visitorData?: string;
  private cookie?: string;
  private userAgent: string;

  constructor(config: InnerTubeConfig = {}) {
    this.baseUrl = config.baseUrl ?? 'https://music.youtube.com/youtubei/v1/';
    this.hl = config.hl ?? 'en';
    this.gl = config.gl ?? 'US';
    this.visitorData = config.visitorData;
    this.cookie = config.cookie;
    this.userAgent = config.userAgent ?? YOUTUBE_CLIENTS.WEB_REMIX.ua;
  }

  /**
   * Bootstraps visitorData from YouTube Music service worker script data
   */
  public async ensureVisitorData(): Promise<string | undefined> {
    if (this.visitorData) return this.visitorData;

    try {
      const resp = await fetch('https://music.youtube.com/sw.js_data', {
        headers: {
          'User-Agent': this.userAgent,
          Referer: 'https://music.youtube.com/',
        },
      });

      if (!resp.ok) return undefined;
      const text = await resp.text();
      // Service worker data starts with )]}'
      const jsonStr = text.startsWith(")]}'") ? text.substring(5) : text;
      const parsed = JSON.parse(jsonStr);

      if (Array.isArray(parsed) && parsed[0]?.[2]) {
        for (const item of parsed[0][2]) {
          if (typeof item === 'string' && /^Cg[ts]/.test(item)) {
            this.visitorData = item;
            return item;
          }
        }
      }
    } catch {
      // Visitor acquisition failed, continue without it
    }

    return undefined;
  }

  /**
   * Generates SAPISIDHASH Authorization header for authenticated cookies
   */
  private generateSapisidHash(cookieStr?: string): string | undefined {
    if (!cookieStr) return undefined;
    const match = cookieStr.match(/SAPISID=([^;]+)/);
    if (!match) return undefined;

    const sapisid = match[1].trim();
    const timestamp = Math.floor(Date.now() / 1000);
    return `SAPISIDHASH ${timestamp}_${sapisid.substring(0, 16)}`;
  }

  /**
   * Builds the standard InnerTube request body with client context
   */
  private buildRequestBody(
    clientProfile: (typeof YOUTUBE_CLIENTS)[YouTubeClientType],
    additionalFields: Record<string, any> = {}
  ): Record<string, any> {
    const client: Record<string, any> = {
      clientName: clientProfile.clientName,
      clientVersion: clientProfile.clientVersion,
      hl: this.hl,
      gl: this.gl,
    };

    if ('osName' in clientProfile) client.osName = clientProfile.osName;
    if ('osVersion' in clientProfile) client.osVersion = clientProfile.osVersion;
    if ('deviceMake' in clientProfile) client.deviceMake = clientProfile.deviceMake;
    if ('deviceModel' in clientProfile) client.deviceModel = clientProfile.deviceModel;
    if ('androidSdkVersion' in clientProfile) client.androidSdkVersion = clientProfile.androidSdkVersion;

    if (this.visitorData) {
      client.visitorData = this.visitorData;
    }

    const context: Record<string, any> = {
      client,
      request: {
        internalExperimentFlags: [],
        useSsl: true,
      },
      user: {
        lockedSafetyMode: false,
      },
    };

    if ('isEmbedded' in clientProfile && clientProfile.isEmbedded && additionalFields.videoId) {
      context.thirdParty = {
        embedUrl: `https://www.youtube.com/watch?v=${additionalFields.videoId}`,
      };
    }

    return {
      context,
      ...additionalFields,
    };
  }

  /**
   * Executes a POST request to an InnerTube endpoint
   */
  private async postEndpoint<T>(
    endpoint: string,
    clientType: YouTubeClientType,
    fields: Record<string, any> = {}
  ): Promise<T> {
    await this.ensureVisitorData();

    const clientProfile = YOUTUBE_CLIENTS[clientType];
    const url = new URL(endpoint, this.baseUrl).toString();
    const body = this.buildRequestBody(clientProfile, fields);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Goog-Api-Format-Version': '1',
      'X-YouTube-Client-Name': clientProfile.clientId,
      'X-YouTube-Client-Version': clientProfile.clientVersion,
      Origin: 'https://music.youtube.com',
      Referer: 'https://music.youtube.com/',
      'User-Agent': clientProfile.ua,
    };

    if (this.visitorData) {
      headers['X-Goog-Visitor-Id'] = this.visitorData;
    }

    if (this.cookie && clientProfile.loginSupported) {
      headers['Cookie'] = this.cookie;
      const auth = this.generateSapisidHash(this.cookie);
      if (auth) headers['Authorization'] = auth;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`InnerTube HTTP ${response.status} on endpoint ${endpoint}`);
    }

    return (await response.json()) as T;
  }

  /**
   * Search for songs, albums, artists, or playlists
   */
  public async search(query: string, filter?: string, continuation?: string): Promise<YTSearchResult> {
    const fields: Record<string, any> = {};
    if (continuation) {
      fields.continuation = continuation;
    } else {
      fields.query = query;
      if (filter) fields.params = filter;
    }

    const raw = await this.postEndpoint<any>('search', 'WEB_REMIX', fields);
    const summaries: YTSearchSummary[] = [];

    const tabs = raw.contents?.tabbedSearchResultsRenderer?.tabs;
    const sections = tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents ?? [];

    let topResult: any = undefined;

    for (const section of sections) {
      if (section.musicCardShelfRenderer) {
        const card = section.musicCardShelfRenderer;
        const title = extractRunsText(card.title);
        const thumbnails = card.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ?? [];

        topResult = {
          id: card.onTap?.watchEndpoint?.videoId ?? card.onTap?.browseEndpoint?.browseId ?? '',
          title,
          artists: extractArtists(card.subtitle?.runs),
          thumbnails,
        };
      }

      if (section.musicShelfRenderer) {
        const shelf = section.musicShelfRenderer;
        const title = extractRunsText(shelf.title) || 'Search Results';
        const items: Array<YTSongItem | YTAlbumItem | YTArtistItem> = [];

        for (const item of shelf.contents ?? []) {
          const renderer = item.musicResponsiveListItemRenderer;
          if (!renderer) continue;

          const parsed = this.parseResponsiveListItem(renderer);
          if (parsed) items.push(parsed);
        }

        if (items.length > 0) {
          summaries.push({ title, items });
        }
      }
    }

    return {
      topResult,
      summaries,
      continuation: sections[sections.length - 1]?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token,
    };
  }

  /**
   * Search suggestions autocomplete
   */
  public async searchSuggestions(query: string): Promise<string[]> {
    const raw = await this.postEndpoint<any>('music/get_search_suggestions', 'WEB_REMIX', {
      input: query,
    });

    const suggestions: string[] = [];
    const contents = raw.contents?.[0]?.searchSuggestionsSectionRenderer?.contents ?? [];

    for (const item of contents) {
      const runs = item.searchSuggestionRenderer?.suggestion?.runs;
      if (runs) {
        suggestions.push(extractRunsText({ runs }));
      }
    }

    return suggestions;
  }

  /**
   * Browse artist, album, or playlist metadata
   */
  public async browse(browseId: string, params?: string): Promise<any> {
    const fields: Record<string, any> = { browseId };
    if (params) fields.params = params;
    return this.postEndpoint<any>('browse', 'WEB_REMIX', fields);
  }

  /**
   * Fetch next queue / recommendations
   */
  public async next(videoId?: string, playlistId?: string, continuation?: string): Promise<YTNextResult> {
    const fields: Record<string, any> = {
      enablePersistentPlaylistPanel: true,
      isAudioOnly: true,
    };
    if (videoId) fields.videoId = videoId;
    if (playlistId) fields.playlistId = playlistId;
    if (continuation) fields.continuation = continuation;

    const raw = await this.postEndpoint<any>('next', 'WEB_REMIX', fields);

    const playlistPanel =
      raw.continuationContents?.playlistPanelContinuation ??
      raw.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs?.[0]
        ?.tabRenderer?.content?.musicQueueRenderer?.content?.playlistPanelRenderer;

    const queue: YTSongItem[] = [];
    let currentIndex = 0;

    if (playlistPanel?.contents) {
      playlistPanel.contents.forEach((c: any, index: number) => {
        const item = c.playlistPanelVideoRenderer;
        if (!item) return;

        if (item.selected) currentIndex = index;

        queue.push({
          id: item.videoId,
          title: extractRunsText(item.title),
          artists: extractArtists(item.longBylineText?.runs ?? item.shortBylineText?.runs),
          durationText: extractRunsText(item.lengthText),
          duration: parseDurationText(extractRunsText(item.lengthText)),
          thumbnails: item.thumbnail?.thumbnails ?? [],
        });
      });
    }

    return {
      queue,
      currentIndex,
      continuation: playlistPanel?.continuations?.[0]?.nextContinuationData?.continuation,
    };
  }

  /**
   * Low-level Player response fetcher
   */
  public async player(
    videoId: string,
    clientType: YouTubeClientType = 'WEB_REMIX',
    signatureTimestamp?: number
  ): Promise<YTPlayerResponse> {
    const fields: Record<string, any> = {
      videoId,
      contentCheckOk: true,
      racyCheckOk: true,
    };

    if (signatureTimestamp && signatureTimestamp > 0) {
      fields.playbackContext = {
        contentPlaybackContext: {
          signatureTimestamp,
        },
      };
    }

    return this.postEndpoint<YTPlayerResponse>('player', clientType, fields);
  }

  /**
   * Stream URL resolution pipeline
   * Attempts WEB_REMIX with cipher deciphering first, then falls back to ANDROID_MUSIC and TVHTML5
   */
  public async resolveStreamUrl(videoId: string): Promise<ResolvedStream> {
    const clientsToTry: YouTubeClientType[] = ['WEB_REMIX', 'ANDROID_MUSIC', 'TVHTML5_SIMPLY_EMBEDDED_PLAYER'];

    let lastError: Error | null = null;

    for (const client of clientsToTry) {
      try {
        const playerResp = await this.player(videoId, client);
        if (playerResp.playabilityStatus.status !== 'OK') {
          continue;
        }

        const adaptiveFormats = playerResp.streamingData?.adaptiveFormats ?? [];
        const audioFormats = adaptiveFormats.filter((f) => !('width' in f && f.width !== null) && f.mimeType.startsWith('audio/'));

        if (audioFormats.length === 0) continue;

        // Prioritize webm/opus (itag 251) and highest bitrate
        const sortedFormats = [...audioFormats].sort((a, b) => {
          const aScore = a.bitrate + (a.mimeType.startsWith('audio/webm') ? 10240 : 0);
          const bScore = b.bitrate + (b.mimeType.startsWith('audio/webm') ? 10240 : 0);
          return bScore - aScore;
        });

        const bestFormat = sortedFormats[0];

        // Case 1: Direct clean URL
        if (bestFormat.url) {
          return {
            url: bestFormat.url,
            itag: bestFormat.itag,
            mimeType: bestFormat.mimeType,
            bitrate: bestFormat.bitrate,
            durationMs: bestFormat.approxDurationMs ? Number(bestFormat.approxDurationMs) : undefined,
            loudnessDb: bestFormat.loudnessDb,
            clientUsed: client,
          };
        }

        // Case 2: Encrypted signature cipher
        const cipherStr = bestFormat.signatureCipher ?? bestFormat.cipher;
        if (cipherStr) {
          const params = new URLSearchParams(cipherStr);
          const rawUrl = params.get('url');
          const scrambledSig = params.get('s');
          const sigParam = params.get('sp') || 'sig';

          if (rawUrl && scrambledSig) {
            const decipheredSig = await YouTubeCipherSolver.decipher(scrambledSig);
            const streamUrl = new URL(rawUrl);
            streamUrl.searchParams.set(sigParam, decipheredSig);

            return {
              url: streamUrl.toString(),
              itag: bestFormat.itag,
              mimeType: bestFormat.mimeType,
              bitrate: bestFormat.bitrate,
              durationMs: bestFormat.approxDurationMs ? Number(bestFormat.approxDurationMs) : undefined,
              loudnessDb: bestFormat.loudnessDb,
              clientUsed: `${client} (deciphered)`,
            };
          }
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    throw new Error(
      `Unable to resolve stream for videoId ${videoId}: ${lastError?.message ?? 'No playable audio format found'}`
    );
  }

  /**
   * Helper to parse responsive list items from browse or search shelves
   */
  private parseResponsiveListItem(renderer: any): YTSongItem | YTAlbumItem | YTArtistItem | null {
    const flexColumns = renderer.flexColumns ?? [];
    if (flexColumns.length === 0) return null;

    const titleRuns = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs;
    const title = extractRunsText({ runs: titleRuns });
    const thumbnails = renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ?? [];

    const subtitleRuns = flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs ?? [];

    // Check navigation endpoint to identify whether it's an artist, album, or song
    const tapEndpoint = renderer.navigationEndpoint;
    const videoId = tapEndpoint?.watchEndpoint?.videoId ?? renderer.playlistItemData?.videoId;
    const browseId = tapEndpoint?.browseEndpoint?.browseId;

    if (videoId) {
      // Song item
      const durationText = subtitleRuns[subtitleRuns.length - 1]?.text;
      return {
        id: videoId,
        title,
        artists: extractArtists(subtitleRuns),
        thumbnails,
        durationText,
        duration: parseDurationText(durationText),
      };
    }

    if (browseId?.startsWith('UC') || renderer.navigationEndpoint?.browseEndpoint?.isArtistEndpoint) {
      // Artist item
      return {
        id: browseId,
        name: title,
        thumbnails,
      };
    }

    if (browseId?.startsWith('MPRE') || browseId?.startsWith('OLAK')) {
      // Album item
      return {
        id: browseId,
        title,
        artists: extractArtists(subtitleRuns),
        thumbnails,
      };
    }

    // Default to song format
    return {
      id: videoId || browseId || '',
      title,
      artists: extractArtists(subtitleRuns),
      thumbnails,
    };
  }
}
