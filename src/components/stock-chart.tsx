'use client';
import type { Stock } from '@/lib/types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { chartData, chartData1M, chartData1Y, chartData5Y, chartData6M } from '@/lib/mock-data';
import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';

interface StockChartProps {
  stock: Stock;
}

const timeRanges = {
  '1D': chartData,
  '1M': chartData1M,
  '6M': chartData6M,
  '1Y': chartData1Y,
  '5Y': chartData5Y,
};

export default function StockChart({ stock }: StockChartProps) {
  const [timeRange, setTimeRange] = useState('1Y');

  const data = useMemo(() => {
    // In a real app, you would fetch data based on stock.ticker and timeRange
    const baseData = timeRanges[timeRange as keyof typeof timeRanges];
    const randomFactor = stock.price / 150; // Use stock price for some variation
    return baseData.map(d => ({ ...d, price: d.price * randomFactor }));
  }, [stock, timeRange]);

  const isPositive = data[data.length - 1].price >= data[0].price;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="font-headline text-2xl">{stock.name} ({stock.ticker})</CardTitle>
                <CardDescription className="text-lg">${stock.price.toFixed(2)}</CardDescription>
            </div>
            <Tabs defaultValue="1Y" onValueChange={setTimeRange}>
                <TabsList className="grid grid-cols-5 text-xs h-8">
                    {Object.keys(timeRanges).map(range => (
                        <TabsTrigger key={range} value={range} className="h-6 px-2 text-xs">{range}</TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
          >
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
            <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickLine={false} axisLine={false} domain={['dataMin - 10', 'dataMax + 10']} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 'var(--radius)',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              itemStyle={{ color: 'hsl(var(--accent))' }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
            />
            <Area type="monotone" dataKey="price" strokeWidth={2} stroke="hsl(var(--accent))" fill="url(#colorPrice)" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
