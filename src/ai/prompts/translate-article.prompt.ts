import { Article } from '../../article/models/article.model';

export const buildTranslateArticlePrompt = (
  article: Article,
  targetLanguage: string,
  sourceLanguage?: string,
): string =>
  `
Translate the Knowledge Hub article content.

Return only valid JSON with this shape:
{
  "translatedText": "translated article content",
  "detectedLanguage": "detected or provided source language"
}

Target language: ${targetLanguage}
${sourceLanguage ? `Source language: ${sourceLanguage}` : 'Detect the source language.'}

Article title: ${article.title}
Article content:
${article.content}
`.trim();
