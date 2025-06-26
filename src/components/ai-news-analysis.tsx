'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getNewsSummary } from '@/app/actions';
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { SummarizeNewsArticleOutput } from '@/ai/flows/summarize-news-article';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';

const formSchema = z.object({
  ticker: z.string().min(1, 'Ticker is required').max(10),
  articleTitle: z.string().min(10, 'Title must be at least 10 characters'),
  articleContent: z.string().min(50, 'Article content must be at least 50 characters'),
});

const exampleArticle = {
  ticker: 'NVDA',
  articleTitle: 'NVIDIA Announces Record-Breaking Quarterly Revenue Driven by AI Demand',
  articleContent: 'NVIDIA today reported record revenue for the first quarter ended April 28, 2024, of $26.04 billion, up 18% from the previous quarter and up 262% from a year ago. The company\'s data center revenue was a record $22.6 billion, up 23% from the previous quarter and up 427% from a year ago. The strong performance was primarily driven by the insatiable demand for its Hopper architecture GPUs used in AI training and inference. CEO Jensen Huang stated, "The next industrial revolution has begun — companies and countries are partnering with NVIDIA to shift the trillion-dollar traditional data centers to accelerated computing and build a new type of data center — AI factories — to produce a new commodity: artificial intelligence." The company also announced a ten-for-one forward stock split and a 150% increase in its quarterly cash dividend.',
};


export default function AiNewsAnalysis() {
  const [result, setResult] = useState<SummarizeNewsArticleOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ticker: '',
      articleTitle: '',
      articleContent: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setResult(null);
    try {
      const summaryResult = await getNewsSummary(values);
      setResult(summaryResult);
    } catch (error) {
      console.error('Error getting news summary:', error);
      // You could use react-hot-toast to show an error message
    } finally {
      setIsLoading(false);
    }
  }
  
  const loadExample = () => {
    form.reset(exampleArticle);
  }

  const SentimentIndicator = ({ sentiment }: { sentiment: string }) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><TrendingUp className="mr-2 h-4 w-4" /> Positive</Badge>;
      case 'negative':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><TrendingDown className="mr-2 h-4 w-4" /> Negative</Badge>;
      default:
        return <Badge variant="secondary"><Minus className="mr-2 h-4 w-4" /> Neutral</Badge>;
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">AI News Analyzer</CardTitle>
          <CardDescription>Enter article details to get an AI-powered summary and analysis.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="ticker"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Ticker</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., AAPL" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="articleTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Article Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter the news article title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="articleContent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Article Content</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Paste the full article content here" rows={8} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-center gap-4">
                <Button type="submit" disabled={isLoading} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Analyze Article
                </Button>
                <Button type="button" variant="outline" onClick={loadExample}>
                  Load Example
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      <div className="flex items-center justify-center">
        {isLoading && (
          <div className="text-center space-y-4">
             <Loader2 className="mx-auto h-12 w-12 animate-spin text-accent" />
             <p className="text-muted-foreground">Analyzing article, please wait...</p>
          </div>
        )}
        {result && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="font-headline">Analysis Result</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Summary</h3>
                <p className="text-muted-foreground text-sm">{result.summary}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Sentiment</h3>
                  <SentimentIndicator sentiment={result.sentiment} />
                </div>
                 <div>
                  <h3 className="font-semibold mb-2">Relevance Score</h3>
                  <div className="flex items-center gap-2">
                    <Progress value={result.relevanceScore * 100} className="w-full h-2 bg-primary" />
                    <span className="font-mono text-sm">{(result.relevanceScore * 100).toFixed(0)}%</span>
                  </div>
                 </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
