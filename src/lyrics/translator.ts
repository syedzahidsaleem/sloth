/**
 * Sloth AI Lyrics Translator
 * Ported from Metrolist (GPL-3.0) by MetrolistGroup
 * (C) 2026 MetrolistGroup / Adapted for Sloth
 *
 * Implements Metrolist's prompt construction, JSON line-by-line enforcement,
 * Romanization, and Phonetic Transcription pipelines using Anthropic Claude API.
 */

import { ParsedLyrics, SyncedLyricsLine } from './metrolist-fetcher';

export type TranslationMode = 'Translated' | 'Romanized' | 'Transcribed';

export interface TranslationOptions {
  targetLanguage?: string;
  mode?: TranslationMode;
  apiKey?: string;
  model?: string;
  systemPrompt?: string;
}

export interface TranslatedLyricsResult {
  mode: TranslationMode;
  targetLanguage: string;
  lines: SyncedLyricsLine[];
  plainText: string;
}

/**
 * Common language code to English name mappings
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
 * Builds the structured system prompt enforcing exact line-by-line JSON output
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
 * Parses the raw AI response text into an array of string lines
 */
export function parseAiResponse(rawContent: string, expectedLineCount: number): string[] {
  let content = rawContent.trim();

  // Strip markdown code block wrapping if present
  if (content.startsWith('```')) {
    content = content.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  }

  try {
    const parsed = JSON.parse(content);
    if (parsed && Array.isArray(parsed.lines)) {
      return parsed.lines.map((l: any) => String(l ?? ''));
    }
  } catch {
    // If strict JSON parsing fails, fall back to line splitting
    const extracted = content
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .map((l) => l.replace(/^\d+\.\s*/, '').replace(/^Line\s+\d+:\s*/i, '').replace(/^-\s*/, ''));

    if (extracted.length > 0) {
      return extracted;
    }
  }

  // Fallback: fill array to expected length
  return new Array(expectedLineCount).fill('');
}

/**
 * Sloth Claude Lyrics Translator
 */
export class ClaudeLyricsTranslator {
  private defaultApiKey?: string;
  private defaultModel: string;
  private cache: Map<string, string[]> = new Map();

  constructor(apiKey?: string, model = 'claude-3-5-sonnet-20241022') {
    this.defaultApiKey = apiKey;
    this.defaultModel = model;
  }

  private getCacheKey(text: string, mode: TranslationMode, lang: string): string {
    return `${mode}_${lang}_${text.length}_${text.substring(0, 32)}`;
  }

  /**
   * Calls the Anthropic Claude API Messages endpoint
   */
  private async callClaudeApi(
    systemPrompt: string,
    userPrompt: string,
    apiKey: string,
    model: string
  ): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        temperature: 0.3,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude API request failed with status ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;
    if (!content) {
      throw new Error('Claude API returned empty message content');
    }

    return content;
  }

  /**
   * Translates or romanizes parsed lyrics, preserving all timestamps for synchronized display
   */
  public async translate(lyrics: ParsedLyrics, options: TranslationOptions = {}): Promise<TranslatedLyricsResult> {
    const mode = options.mode ?? 'Translated';
    const rawTargetLang = options.targetLanguage ?? 'en';
    const targetLanguage = LANGUAGE_CODE_TO_NAME[rawTargetLang.toLowerCase()] ?? rawTargetLang;
    const model = options.model ?? this.defaultModel;
    const apiKey = options.apiKey ?? this.defaultApiKey ?? (typeof process !== 'undefined' ? process.env?.ANTHROPIC_API_KEY : undefined);

    if (!apiKey) {
      throw new Error('Anthropic API key is required for lyrics translation');
    }

    // Determine the source lines: use synced lines if present, otherwise plainText split
    const sourceItems: Array<{ timeMs?: number; text: string }> = lyrics.isSynced && lyrics.lines.length > 0
      ? lyrics.lines
      : lyrics.plainText.split('\n').map((text) => ({ text }));

    if (sourceItems.length === 0) {
      return {
        mode,
        targetLanguage,
        lines: [],
        plainText: '',
      };
    }

    const combinedText = sourceItems.map((item) => item.text).join('\n');
    const cacheKey = this.getCacheKey(combinedText, mode, targetLanguage);

    let translatedLines: string[] | undefined = this.cache.get(cacheKey);

    if (!translatedLines) {
      const lineCount = sourceItems.length;
      const systemPrompt = buildSystemPrompt(lineCount, options.systemPrompt);
      const userPrompt = buildUserPrompt(combinedText, targetLanguage, mode);

      const rawAiResponse = await this.callClaudeApi(systemPrompt, userPrompt, apiKey, model);
      translatedLines = parseAiResponse(rawAiResponse, lineCount);

      // Cache successful response
      this.cache.set(cacheKey, translatedLines);
    }

    // Reconstruct synchronized lines with translated text while keeping original timestamps
    const resultLines: SyncedLyricsLine[] = sourceItems.map((item, index) => ({
      timeMs: item.timeMs ?? 0,
      text: translatedLines?.[index] ?? item.text,
    }));

    return {
      mode,
      targetLanguage,
      lines: resultLines,
      plainText: resultLines.map((l) => l.text).join('\n'),
    };
  }
}
