import { describe, it, expect } from 'vitest';
import {
  buildSystemPrompt,
  buildUserPrompt,
  parseAiResponse,
} from '../lyrics/translator';

describe('Metrolist AI Lyrics Translator', () => {
  it('builds system prompt with line count constraint', () => {
    const prompt = buildSystemPrompt(12);
    expect(prompt).toContain('EXACTLY 12 items');
    expect(prompt).toContain('valid JSON object');
  });

  it('builds user prompt for Translated, Romanized, and Transcribed modes', () => {
    const text = 'Line 1\nLine 2';

    const translatedPrompt = buildUserPrompt(text, 'Spanish', 'Translated');
    expect(translatedPrompt).toContain('Translate the following 2 lines to Spanish');

    const romanizedPrompt = buildUserPrompt(text, 'English', 'Romanized');
    expect(romanizedPrompt).toContain('Romanize/transliterate the following 2 lines into simple Latin script');
    expect(romanizedPrompt).toContain('ONLY simple ASCII characters');

    const transcribedPrompt = buildUserPrompt(text, 'Hindi', 'Transcribed');
    expect(transcribedPrompt).toContain('Transcribe/transliterate the following 2 lines phonetically into Hindi script');
  });

  it('parses valid JSON response with lines array', () => {
    const jsonStr = JSON.stringify({
      lines: ['Translated line 1', 'Translated line 2', ''],
    });

    const parsed = parseAiResponse(jsonStr, 3);
    expect(parsed).toEqual(['Translated line 1', 'Translated line 2', '']);
  });

  it('strips markdown code blocks around json', () => {
    const wrapped = '```json\n{"lines": ["A", "B"]}\n```';
    const parsed = parseAiResponse(wrapped, 2);
    expect(parsed).toEqual(['A', 'B']);
  });

  it('falls back gracefully if AI returns numbered list', () => {
    const numbered = '1. First translated line\n2. Second translated line';
    const parsed = parseAiResponse(numbered, 2);
    expect(parsed).toEqual(['First translated line', 'Second translated line']);
  });
});
