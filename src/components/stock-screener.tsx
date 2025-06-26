'use client';
import type { Stock } from '@/lib/types';
import React, { useMemo, useState } from 'react';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, CheckCircle } from 'lucide-react';
import { mockStocks } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Slider } from './ui/slider';
import { Label } from './ui/label';
import StockChart from './StockChart';

interface StockScreenerProps {
  addToWatchlist: (stock: Stock) => void;
  watchlist: Stock[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

type ChartType = 'area' | 'candlestick';

type AreaData = { time: string; value: number };
type CandleData = { time: string; open: number; high: number; low: number; close: number };

type ChartData = AreaData[] | CandleData[];

export default function StockScreener({ addToWatchlist, watchlist }: StockScreenerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sector, setSector] = useState('all');
  const [marketCap, setMarketCap] = useState([0, 5000]);
  const [ticker, setTicker] = useState('');
  const [data, setData] = useState<ChartData>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [chartType, setChartType] = useState<ChartType>('area');

  const sectors = useMemo(() => ['all', ...Array.from(new Set(mockStocks.map(s => s.sector)))], []);
  
  const filteredStocks = useMemo(() => {
    return mockStocks.filter(stock => {
      const searchMatch = stock.name.toLowerCase().includes(searchTerm.toLowerCase()) || stock.ticker.toLowerCase().includes(searchTerm.toLowerCase());
      const sectorMatch = sector === 'all' || stock.sector === sector;
      const marketCapValue = parseFloat(stock.marketCap.replace('T', '000').replace('B', ''));
      const marketCapMatch = marketCapValue >= marketCap[0] && marketCapValue <= marketCap[1];
      return searchMatch && sectorMatch && marketCapMatch;
    });
  }, [searchTerm, sector, marketCap]);

  const isinWatchlist = (ticker: string) => watchlist.some(s => s.ticker === ticker);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setData([]);
    try {
      const end = new Date();
      const start = new Date();
      start.setMonth(end.getMonth() - 6); // last 6 months
      const startStr = start.toISOString().slice(0, 10);
      const endStr = end.toISOString().slice(0, 10);

      const res = await fetch(
        `${API_URL}/historical?ticker=${ticker}&start=${startStr}&end=${endStr}&chartType=${chartType}`
      );
      if (!res.ok) throw new Error('Failed to fetch data');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Chart Search and Display Section */}
      <div className="mb-8">
        <form onSubmit={handleSearch} className="flex gap-2 mb-2">
          <input
            type="text"
            value={ticker}
            onChange={e => setTicker(e.target.value)}
            placeholder="Enter ticker (e.g., RELIANCE.NS)"
            className="border p-2 rounded"
          />
          <button type="submit" className="p-2 bg-blue-500 text-white rounded">
            Search
          </button>
          <select
            value={chartType}
            onChange={e => setChartType(e.target.value as ChartType)}
            className="p-2 border rounded"
          >
            <option value="area">Area</option>
            <option value="candlestick">Candlestick</option>
          </select>
        </form>
        {loading && <p>Loading chart...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && !error && data.length > 0 && (
          <StockChart data={data as any} chartType={chartType} />
        )}
      </div>
      {/* Existing Screener Table/Card Content Below */}
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Advanced Stock Screener</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <Input 
              placeholder="Search by name or ticker..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="md:max-w-xs"
            />
            <Select value={sector} onValueChange={setSector}>
              <SelectTrigger className="md:w-[180px]">
                <SelectValue placeholder="Sector" />
              </SelectTrigger>
              <SelectContent>
                {sectors.map(s => <SelectItem key={s} value={s}>{s === 'all' ? 'All Sectors' : s}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex-grow space-y-2">
              <Label>Market Cap (in Billions)</Label>
              <div className='flex items-center gap-4'>
                <span>${marketCap[0]}B</span>
                <Slider
                  value={marketCap}
                  onValueChange={setMarketCap}
                  max={5000}
                  step={100}
                  className="flex-grow"
                />
                <span>${marketCap[1]}B</span>
              </div>
            </div>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticker</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Change %</TableHead>
                  <TableHead className="text-right">Market Cap</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStocks.map(stock => (
                  <TableRow key={stock.ticker}>
                    <TableCell className="font-medium">{stock.ticker}</TableCell>
                    <TableCell>{stock.name}</TableCell>
                    <TableCell className="text-right">${stock.price.toFixed(2)}</TableCell>
                    <TableCell className={`text-right ${stock.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {stock.changePercent.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right">{stock.marketCap}</TableCell>
                    <TableCell>{stock.sector}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {isinWatchlist(stock.ticker) ? (
                              <DropdownMenuItem disabled>
                                 <CheckCircle className="mr-2 h-4 w-4" />
                                 In Watchlist
                              </DropdownMenuItem>
                          ) : (
                               <DropdownMenuItem onClick={() => addToWatchlist(stock)}>
                                  <PlusCircle className="mr-2 h-4 w-4" />
                                  Add to Watchlist
                              </DropdownMenuItem>
                          )}
                         
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
