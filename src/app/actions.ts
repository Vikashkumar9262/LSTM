'use server';

import { summarizeNewsArticle } from '@/ai/flows/summarize-news-article';
import type { SummarizeNewsArticleInput, SummarizeNewsArticleOutput } from '@/ai/flows/summarize-news-article';

export async function getNewsSummary(
  input: SummarizeNewsArticleInput
): Promise<SummarizeNewsArticleOutput> {
  try {
    const output = await summarizeNewsArticle(input);
    return output;
  } catch (error) {
    console.error('Error in getNewsSummary server action:', error);
    throw new Error('Failed to get news summary from AI.');
  }
}
