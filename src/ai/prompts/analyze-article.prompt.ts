import { Article } from '../../article/models/article.model';
import { ArticleAnalysisTask } from '../dto';

const taskInstructions: Record<ArticleAnalysisTask, string> = {
  [ArticleAnalysisTask.REVIEW]: 'Review clarity, correctness, structure, and completeness.',
  [ArticleAnalysisTask.BUGS]: 'Find technical mistakes, contradictions, risky claims, and likely bugs.',
  [ArticleAnalysisTask.OPTIMIZE]: 'Suggest improvements for performance, readability, and maintainability.',
  [ArticleAnalysisTask.EXPLAIN]: 'Explain the article content and identify confusing sections.',
};

export const buildAnalyzeArticlePrompt = (article: Article, task: ArticleAnalysisTask): string =>
  `
Analyze the Knowledge Hub article.

Task: ${taskInstructions[task]}

Return only valid JSON with this shape:
{
  "analysis": "short technical analysis",
  "suggestions": ["actionable suggestion"],
  "severity": "info"
}

Use severity "info" for general feedback, "warning" for meaningful issues, and "error" for serious correctness or safety problems.

Article metadata:
Title: ${article.title}
Status: ${article.status}
Tags: ${article.tags.join(', ') || 'none'}

Article content:
${article.content}
`.trim();
