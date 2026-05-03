import { ArticleAnalysisSeverity } from '../dto';

interface TranslateOutput {
  translatedText: string;
  detectedLanguage: string;
}

interface AnalyzeOutput {
  analysis: string;
  suggestions: string[];
  severity: ArticleAnalysisSeverity;
}

const stripJsonFence = (value: string): string => {
  const trimmed = value.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

  return fenceMatch?.[1]?.trim() ?? trimmed;
};

const parseObject = (value: string): Record<string, unknown> | undefined => {
  try {
    const parsed = JSON.parse(stripJsonFence(value));

    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
};

const toSeverity = (value: unknown): ArticleAnalysisSeverity => {
  if (Object.values(ArticleAnalysisSeverity).includes(value as ArticleAnalysisSeverity)) {
    return value as ArticleAnalysisSeverity;
  }

  return ArticleAnalysisSeverity.INFO;
};

export const parseTranslateOutput = (value: string, sourceLanguage?: string): TranslateOutput => {
  const parsed = parseObject(value);
  const translatedText = typeof parsed?.translatedText === 'string' ? parsed.translatedText.trim() : value.trim();
  const detectedLanguage =
    typeof parsed?.detectedLanguage === 'string' && parsed.detectedLanguage.trim()
      ? parsed.detectedLanguage.trim()
      : sourceLanguage || 'unknown';

  return {
    translatedText,
    detectedLanguage,
  };
};

export const parseAnalyzeOutput = (value: string): AnalyzeOutput => {
  const parsed = parseObject(value);
  const analysis =
    typeof parsed?.analysis === 'string' && parsed.analysis.trim() ? parsed.analysis.trim() : value.trim();

  return {
    analysis,
    suggestions: toStringArray(parsed?.suggestions),
    severity: toSeverity(parsed?.severity),
  };
};
