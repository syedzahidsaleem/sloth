/**
 * Sloth AI Lyrics Translator
 * Ported from Metrolist (GPL-3.0) by MetrolistGroup
 * (C) 2026 MetrolistGroup / Adapted for Sloth
 *
 * Implements Metrolist's prompt construction, JSON line-by-line enforcement,
 * Romanization, and Phonetic Transcription pipelines using Anthropic Claude API.
 * Caches translations in SQLite `lyrics_translations` table.
 */

import { ParsedLyrics, SyncedLyricsLine } from './parser';
import {
  getLyricsTranslation,
  upsertLyricsTranslation,
} from '../db/queries/lyrics';

export type TranslationMode = 'Translated' | 'Romanized' | 'Transcribed';

export interface TranslationOptions {
  trackId?: string;
  targetLanguage?: string;
  mode?: TranslationMode;
  apiKey?: string;
  model?: string;
  systemPrompt?: string;
  bypassCache?: boolean;
}

export interface TranslatedLyricsResult {
  mode: TranslationMode;
  targetLanguage: string;
  lines: SyncedLyricsLine[];
  plainText: string;
}

/**
 * Common language code to English name mappings (from Metrolist)
 */
export const LANGUAGE_CODE_TO_NAME: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ru: 'Russian',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  ar: 'Arabic',
  hi: 'Hindi',
  bn: 'Bengali',
  pa: 'Punjabi',
  tr: 'Turkish',
  vi: 'Vietnamese',
  th: 'Thai',
  id: 'Indonesian',
  pl: 'Polish',
  nl: 'Dutch',
  sv: 'Swedish',
  uk: 'Ukrainian',
};

/**
 * Builds the structured system prompt enforcing exact line-by-line JSON output (from Metrolist)
 */
export function buildSystemPrompt(lineCount: number, customPrompt?: string): string {
  if (customPrompt && customPrompt.trim().length > 0) {
    return customPrompt.replace('{lineCount}', lineCount.toString());
  }

  return `You are a precise lyrics translation assistant. Your output must ALWAYS be a valid JSON object of the form {"lines": ["line1", "line2", "line3"]}.

CRITICAL RULES:
1. Output ONLY the JSON object: {"lines": ["line1", "line2", "line3"]}
2. NO explanations, NO markdown backticks outside the JSON, NO conversational text
3. Each input line maps to exactly one entry in the "lines" array
4. Preserve empty lines as empty strings ""
5. The "lines" array must contain EXACTLY ${lineCount} items
6. If uncertain, provide best approximation but maintain line count`;
}

/**
 * Builds the user prompt depending on the translation mode (mirrored from Metrolist)
 */
export function buildUserPrompt(text: string, targetLanguage: string, mode: TranslationMode): string {
  const lineCount = text.split('\n').length;

  switch (mode) {
    case 'Romanized':
      return `Romanize/transliterate the following ${lineCount} lines into simple Latin script using ONLY basic English letters (a-z, A-Z).

CRITICAL REQUIREMENTS:
- Use ONLY simple ASCII characters (a-z, A-Z, 0-9, basic punctuation)
- NO special characters like ā, ī, ū, ñ, ç, etc.
- NO diacritics or accent marks
- If text is already in Latin script, return it UNCHANGED
- For non-Latin scripts (Hindi, Chinese, Japanese, Korean, Cyrillic, etc.), provide simple romanization
- DO NOT translate meaning, only convert script to simple English letters
- Keep all punctuation and formatting
- Preserve line-by-line structure exactly

Examples of correct simple romanization:
- Sanskrit/Hindi "आ" → "aa" (not "ā")
- Japanese "東京" → "toukyou" or "tokyo" (not "tōkyō")
- Korean "서울" → "seoul" (not "sŏul")

Input (${lineCount} lines):
${text}

Output MUST be a JSON object {"lines": [...]} with EXACTLY ${lineCount} strings using ONLY simple ASCII characters.`;

    case 'Transcribed':
      return `Transcribe/transliterate the following ${lineCount} lines phonetically into ${targetLanguage} script.

CRITICAL REQUIREMENTS:
- Convert the SOUND/PRONUNCIATION of the original text into ${targetLanguage} script
- DO NOT translate the meaning - only represent how the original words SOUND
- Use the native script of ${targetLanguage} (e.g., Devanagari for Hindi, Hangul for Korean, etc.)
- Preserve the original pronunciation as closely as possible in the target script
- Keep punctuation and formatting
- Preserve line-by-line structure exactly
- If text is already in ${targetLanguage} script, return it UNCHANGED

Examples:
- Japanese "こんにちは" to Hindi → "कोन्निचिवा" (phonetic, not translation)
- English "Hello" to Hindi → "हेलो" (phonetic)
- Korean "안녕하세요" to Hindi → "अन्न्योंग हासेयो" (phonetic)

Input (${lineCount} lines):
${text}

Output MUST be a JSON object {"lines": [...]} with EXACTLY ${lineCount} strings in ${targetLanguage} script.`;

    case 'Translated':
    default:
      return `Translate the following ${lineCount} lines to ${targetLanguage}.

IMPORTANT:
- Provide natural, accurate translation
- Maintain poetic flow and meaning
- Keep punctuation appropriate for target language
- Preserve line-by-line structure exactly
- For song lyrics, prioritize singability

Input (${lineCount} lines):
${text}

Output MUST be a JSON object {"lines": [...]} with EXACTLY ${lineCount} strings.`;
  }
}

/**
 * Parses JSON response from Anthropic Claude API
 */
export function parseTranslationResponse(rawResponse: string, expectedCount: number): string[] {
  let cleaned = rawResponse.trim();

  // Strip Markdown code blocks if model wrapped output
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  cleaned = cleaned.trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && Array.isArray(parsed.lines)) {
      if (parsed.lines.length !== expectedCount) {
        throw new Error(
          `Failed to parse translation response: expected ${expectedCount} lines, got ${parsed.lines.length}`
        );
      }
      return parsed.lines.map((l: unknown) => String(l ?? ''));
    }
  } catch (err: any) {
    if (err.message?.includes('expected')) {
      throw err;
    }
    // Fallback: split by newlines if model responded in plain text lines or numbered list
    const rawLines = cleaned
      .split('\n')
      .map((l) => l.replace(/^(\d+\.|\*|-|•)\s*/, '').trim())
      .filter((l) => l.length > 0);
    if (rawLines.length === expectedCount) {
      return rawLines;
    }
  }

  throw new Error(`Failed to parse translation response: expected ${expectedCount} lines`);
}

/**
 * Alias for backward-compatibility with tests
 */
export const parseAiResponse = parseTranslationResponse;

/**
 * Sloth Lyrics Translator Client
 * Invokes Claude API (claude-sonnet-4-6) and caches translations in SQLite
 */
export class LyricsTranslator {
  private defaultModel: string;

  constructor(defaultModel = 'claude-sonnet-4-6') {
    this.defaultModel = defaultModel;
  }

  /**
   * Retrieves Anthropic API key safely from environment (.env.local)
   */
  private getApiKey(explicitKey?: string): string {
    if (explicitKey && explicitKey.trim().length > 0) {
      return explicitKey.trim();
    }

    const envKey =
      (typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.ANTHROPIC_API_KEY) ||
      '';

    return envKey.trim();
  }

  /**
   * Translates or transliterates synchronized lyrics line-by-line
   */
  public async translate(
    lyrics: ParsedLyrics,
    options: TranslationOptions = {}
  ): Promise<TranslatedLyricsResult> {
    const {
      trackId,
      targetLanguage = 'English',
      mode = 'Translated',
      apiKey: explicitKey,
      model = this.defaultModel,
      systemPrompt: customSystemPrompt,
      bypassCache = false,
    } = options;

    if (!lyrics.lines || lyrics.lines.length === 0) {
      return {
        mode,
        targetLanguage,
        lines: [],
        plainText: '',
      };
    }

    // Resolve language name
    const resolvedLanguage = LANGUAGE_CODE_TO_NAME[targetLanguage.toLowerCase()] || targetLanguage;

    // 1. Check SQLite translation cache first
    if (trackId && !bypassCache) {
      try {
        const cached = getLyricsTranslation(trackId, resolvedLanguage, mode);
        if (cached && cached.content) {
          const linesData = JSON.parse(cached.content);
          if (Array.isArray(linesData) && linesData.length === lyrics.lines.length) {
            const mappedLines: SyncedLyricsLine[] = lyrics.lines.map((orig, i) => ({
              timeMs: orig.timeMs,
              text: linesData[i] || orig.text,
            }));
            return {
              mode,
              targetLanguage: resolvedLanguage,
              lines: mappedLines,
              plainText: mappedLines.map((l) => l.text).join('\n'),
            };
          }
        }
      } catch {
        // Fallback to API if DB read fails
      }
    }

    const apiKey = this.getApiKey(explicitKey);
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY is not configured in .env.local or translation options.'
      );
    }

    const inputLines = lyrics.lines.map((l) => l.text);
    const inputText = inputLines.join('\n');
    const expectedCount = inputLines.length;

    const systemPrompt = buildSystemPrompt(expectedCount, customSystemPrompt);
    const userPrompt = buildUserPrompt(inputText, resolvedLanguage, mode);

    // Call Anthropic Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Anthropic Claude API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const content = data?.content?.[0]?.text || '';
    const translatedLines = parseTranslationResponse(content, expectedCount);

    // Assemble synced translated lines
    const resultLines: SyncedLyricsLine[] = lyrics.lines.map((orig, idx) => ({
      timeMs: orig.timeMs,
      text: translatedLines[idx] ?? orig.text,
    }));

    const result: TranslatedLyricsResult = {
      mode,
      targetLanguage: resolvedLanguage,
      lines: resultLines,
      plainText: resultLines.map((l) => l.text).join('\n'),
    };

    // 2. Cache in SQLite translations table
    if (trackId) {
      try {
        upsertLyricsTranslation({
          id: `${trackId}_${resolvedLanguage}_${mode}`,
          trackId,
          lang: resolvedLanguage,
          mode,
          content: JSON.stringify(translatedLines),
        });
      } catch {
        // Ignore cache write error
      }
    }

    return result;
  }
}

// Export default singleton instance
export const lyricsTranslator = new LyricsTranslator();
