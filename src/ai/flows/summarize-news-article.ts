'use server';
/**
 * @fileOverview AI-driven news article summarization.
 *
 * - summarizeNewsArticle - A function that summarizes a given news article.
 * - SummarizeNewsArticleInput - The input type for the summarizeNewsArticle function.
 * - SummarizeNewsArticleOutput - The return type for the summarizeNewsArticle function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeNewsArticleInputSchema = z.object({
  articleTitle: z.string().describe('Title of the news article'),
  articleContent: z.string().describe('The full content of the news article.'),
  ticker: z.string().describe('The stock ticker symbol associated with the article.'),
});
export type SummarizeNewsArticleInput = z.infer<
  typeof SummarizeNewsArticleInputSchema
>;

const SummarizeNewsArticleOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the news article.'),
  sentiment: z
    .string()
    .describe(
      'The sentiment of the article towards the stock (positive, negative, or neutral).'
    ),
  relevanceScore: z
    .number()
    .describe(
      'A score (0-1) indicating the relevance of the article to the given stock ticker.'
    ),
});
export type SummarizeNewsArticleOutput = z.infer<
  typeof SummarizeNewsArticleOutputSchema
>;

export async function summarizeNewsArticle(
  input: SummarizeNewsArticleInput
): Promise<SummarizeNewsArticleOutput> {
  return summarizeNewsArticleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeNewsArticlePrompt',
  input: {schema: SummarizeNewsArticleInputSchema},
  output: {schema: SummarizeNewsArticleOutputSchema},
  prompt: `You are an AI assistant specializing in summarizing financial news articles and determining their sentiment towards specific stocks.

  Given the following news article, provide a concise summary, determine the overall sentiment towards the stock, and assess the relevance of the article to the stock.

  Article Title: {{{articleTitle}}}
  Article Content: {{{articleContent}}}
  Stock Ticker: {{{ticker}}}

  Summary:
  Sentiment (positive, negative, or neutral):
  Relevance Score (0-1):`,
});

const summarizeNewsArticleFlow = ai.defineFlow(
  {
    name: 'summarizeNewsArticleFlow',
    inputSchema: SummarizeNewsArticleInputSchema,
    outputSchema: SummarizeNewsArticleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
