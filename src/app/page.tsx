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

export default function Home() {
  const [watchlist, setWatchlist] = useState<Stock[]>([
    mockStocks[0],
    mockStocks[2],
    mockStocks[4],
  ]);

  const addToWatchlist = (stock: Stock) => {
    if (!watchlist.some(item => item.ticker === stock.ticker)) {
      setWatchlist(prev => [...prev, stock]);
    }
  };

  const removeFromWatchlist = (ticker: string) => {
    setWatchlist(prev => prev.filter(stock => stock.ticker !== ticker));
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
      </main>
    </div>
  );
}
