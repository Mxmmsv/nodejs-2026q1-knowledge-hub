import { describe, expect, it } from 'vitest';
import { ArticleAnalysisSeverity } from '../dto';
import { parseAnalyzeOutput, parseTranslateOutput } from './ai-output.parser';

describe('AI output parser', () => {
  it('parses fenced JSON translation output', () => {
    expect(parseTranslateOutput('```json\n{"translatedText":"Hola","detectedLanguage":"English"}\n```')).toEqual({
      translatedText: 'Hola',
      detectedLanguage: 'English',
    });
  });

  it('falls back to raw translation text and provided source language', () => {
    expect(parseTranslateOutput('Bonjour', 'English')).toEqual({
      translatedText: 'Bonjour',
      detectedLanguage: 'English',
    });
  });

  it('parses valid analysis output and normalizes invalid fallback values', () => {
    expect(parseAnalyzeOutput('{"analysis":"Looks good","suggestions":["Trim intro"],"severity":"warning"}')).toEqual({
      analysis: 'Looks good',
      suggestions: ['Trim intro'],
      severity: ArticleAnalysisSeverity.WARNING,
    });

    expect(parseAnalyzeOutput('Plain text analysis')).toEqual({
      analysis: 'Plain text analysis',
      suggestions: [],
      severity: ArticleAnalysisSeverity.INFO,
    });
  });
});
