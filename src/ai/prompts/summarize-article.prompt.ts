import { Article } from '../../article/models/article.model';
import { SummaryLength } from '../dto';

const summaryInstructions: Record<SummaryLength, string> = {
  [SummaryLength.SHORT]: 'Write 2-3 concise sentences.',
  [SummaryLength.MEDIUM]: 'Write one compact paragraph with the main ideas.',
  [SummaryLength.DETAILED]: 'Write 2-3 paragraphs with key details and context.',
};

export const buildSummarizeArticlePrompt = (article: Article, maxLength: SummaryLength): string =>
  `
Summarize the Knowledge Hub article below.

Requirements:
- ${summaryInstructions[maxLength]}
- Preserve important technical terms.
- Return only the summary text, without markdown headings.

Article metadata:
Title: ${article.title}
Status: ${article.status}
Tags: ${article.tags.join(', ') || 'none'}

Article content:
${article.content}
`.trim();
