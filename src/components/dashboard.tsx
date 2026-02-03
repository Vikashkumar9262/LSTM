'use client';

import type { Stock } from '@/lib/types';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StockChart from '@/components/stock-chart';
import { mockStocks, mockIndianStocks, chartData as initialChartData } from '@/lib/mock-data';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Label } from './ui/label';

interface DashboardProps {
  watchlist: Stock[];
  addToWatchlist: (stock: Stock) => void;
  removeFromWatchlist: (ticker: string) => void;
}

const QuoteCard = ({ stock: initialStock }: { stock: Stock }) => {
  const [stock, setStock] = useState(initialStock);

  useEffect(() => {
    const interval = setInterval(() => {
      setStock(prevStock => {
        const change = (Math.random() - 0.5) * 0.5;
        const newPrice = Math.max(10, prevStock.price + change);
        const newChange = newPrice - initialStock.price;
        const newChangePercent = (newChange / initialStock.price) * 100;
        return { ...prevStock, price: newPrice, change: newChange, changePercent: newChangePercent };
      });
    }, 2000 + Math.random() * 1000);

    return () => clearInterval(interval);
  }, [initialStock.price]);

  const isPositive = stock.change >= 0;

  return (
    <Card className="bg-card border-border transition-all hover:shadow-lg hover:shadow-accent/10">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium font-headline">{stock.ticker}</CardTitle>
        {isPositive ? (
          <ArrowUp className="w-4 h-4 text-green-500" />
        ) : (
          <ArrowDown className="w-4 h-4 text-red-500" />
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">${stock.price.toFixed(2)}</div>
        <p className={`text-xs ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
          {isPositive ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)
        </p>
      </CardContent>
    </Card>
  );
};

export default function Dashboard({ watchlist, removeFromWatchlist }: DashboardProps) {
  const [market, setMarket] = useState<'US' | 'Indian'>('US');
  const [selectedStock, setSelectedStock] = useState<Stock>(mockStocks[0]);
  
  const stocks = market === 'US' ? mockStocks : mockIndianStocks;

  useEffect(() => {
    setSelectedStock(stocks[0]);
  }, [market, stocks]);


  return (
    <div className="flex flex-col gap-6">
       <div className="flex items-center space-x-2">
        <Label htmlFor="market-switch">US</Label>
        <Switch
          id="market-switch"
          checked={market === 'Indian'}
          onCheckedChange={(checked) => setMarket(checked ? 'Indian' : 'US')}
        />
        <Label htmlFor="market-switch">Indian</Label>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stocks.slice(0, 4).map(stock => (
          <QuoteCard key={stock.ticker} stock={stock} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <StockChart stock={selectedStock} />
        </div>
        <div className="flex flex-col gap-6">
           <Card>
            <CardHeader>
              <CardTitle className="font-headline">My Watchlist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {watchlist.length > 0 ? (
                watchlist.map((stock) => (
                  <div key={stock.ticker} className="flex items-center justify-between group">
                    <div>
                      <p className="font-bold">{stock.ticker}</p>
                      <p className="text-sm text-muted-foreground">{stock.name}</p>
                    </div>
                    <div className="text-right">
                       <p className="font-semibold">${stock.price.toFixed(2)}</p>
                       <p className={`text-sm ${stock.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                         {stock.change.toFixed(2)}%
                       </p>
                    </div>
                     <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100" onClick={() => removeFromWatchlist(stock.ticker)}>
                        <X className="w-4 h-4" />
                      </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Your watchlist is empty.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Price Alerts</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
               <div className="flex justify-between items-center">
                 <div>
                    <p className="font-semibold">AAPL</p>
                    <p className="text-sm text-muted-foreground">Alert at $220.00</p>
                 </div>
                 <Badge variant="outline">Active</Badge>
               </div>
                <div className="flex justify-between items-center">
                 <div>
                    <p className="font-semibold">TSLA</p>
                    <p className="text-sm text-muted-foreground">Alert at $190.50</p>
                 </div>
                 <Badge variant="outline">Triggered</Badge>
               </div>
              <Button variant="outline" className="w-full mt-2">
                <Plus className="w-4 h-4 mr-2" />
                Create New Alert
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
