'use client';
import type { Stock } from '@/lib/types';
import { useState } from 'react';
import { AreaChart, Bell, Briefcase, Bot, Search, Table, User } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Dashboard from '@/components/dashboard';
import StockScreener from '@/components/stock-screener';
import AiNewsAnalysis from '@/components/ai-news-analysis';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { mockStocks } from '@/lib/mock-data';
import React from 'react';

interface Prediction {
    Open: number;
    High: number;
    Low: number;
    Close: number;
}

export default function Home(): JSX.Element {
  const [watchlist, setWatchlist] = useState<Stock[]>([
    mockStocks[0],
    mockStocks[2],
    mockStocks[4],
  ]);

  const [ticker, setTicker] = useState('RELIANCE.NS');
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const addToWatchlist = (stock: Stock) => {
    if (!watchlist.some((item: Stock) => item.ticker === stock.ticker)) {
      setWatchlist((prev: Stock[]) => [...prev, stock]);
    }
  };

  const removeFromWatchlist = (ticker: string) => {
    setWatchlist((prev: Stock[]) => prev.filter((stock: Stock) => stock.ticker !== ticker));
  };

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setPrediction(null);

    try {
      const formData = new FormData();
      formData.append('ticker', ticker);

      const response = await fetch('http://127.0.0.1:8000/predict', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to fetch prediction');
      }

      const data = await response.json();
      setPrediction(data.prediction);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Briefcase className="h-6 w-6 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-foreground font-headline">
            TradeLens
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
          <Avatar>
            <AvatarImage src="https://placehold.co/40x40" alt="User" />
            <AvatarFallback>
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      <main className="p-4 md:p-8">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto mb-6">
            <TabsTrigger value="dashboard">
              <AreaChart className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="screener">
              <Search className="w-4 h-4 mr-2" />
              Screener
            </TabsTrigger>
            <TabsTrigger value="news">
              <Bot className="w-4 h-4 mr-2" />
              News AI
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard">
            <Dashboard 
              watchlist={watchlist}
              addToWatchlist={addToWatchlist}
              removeFromWatchlist={removeFromWatchlist}
            />
          </TabsContent>
          <TabsContent value="screener">
            <StockScreener 
              addToWatchlist={addToWatchlist}
              watchlist={watchlist}
            />
          </TabsContent>
          <TabsContent value="news">
            <AiNewsAnalysis />
          </TabsContent>
        </Tabs>

        {/* Prediction Form Section */}
        <div className="max-w-md mx-auto mt-8">
          <div className="p-4 border rounded-lg shadow-sm">
            <h2 className="text-xl font-bold text-center mb-4">Get Stock Prediction</h2>
            <form onSubmit={handlePredict}>
              <div className="mb-4">
                <label htmlFor="ticker" className="block mb-2 text-sm font-medium">
                  Stock Ticker (e.g., RELIANCE.NS, ^NSEBANK)
                </label>
                <input
                  type="text"
                  id="ticker"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  className="bg-background border border-border text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5"
                  placeholder="Enter stock ticker"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Getting Prediction...' : 'Predict'}
              </Button>
            </form>

            {error && <p className="mt-4 text-sm text-destructive">{`Error: ${error}`}</p>}
            
            {prediction && (
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h3 className="text-lg font-semibold">Prediction for {ticker}:</h3>
                <ul className="mt-2 text-sm">
                  <li>Open: {prediction.Open.toFixed(2)}</li>
                  <li>High: {prediction.High.toFixed(2)}</li>
                  <li>Low: {prediction.Low.toFixed(2)}</li>
                  <li>Close: {prediction.Close.toFixed(2)}</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
