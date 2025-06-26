import type { Stock, ChartDataPoint } from './types';

export const mockStocks: Stock[] = [
  { ticker: 'AAPL', name: 'Apple Inc.', price: 214.29, change: 4.48, changePercent: 2.14, marketCap: '3.28T', sector: 'Technology', volume: '60.1M' },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', price: 180.79, change: 1.56, changePercent: 0.87, marketCap: '2.22T', sector: 'Technology', volume: '25.6M' },
  { ticker: 'MSFT', name: 'Microsoft Corp.', price: 449.78, change: -1.21, changePercent: -0.27, marketCap: '3.34T', sector: 'Technology', volume: '16.7M' },
  { ticker: 'AMZN', name: 'Amazon.com, Inc.', price: 189.08, change: 3.21, changePercent: 1.73, marketCap: '1.97T', sector: 'Consumer Cyclical', volume: '43.2M' },
  { ticker: 'NVDA', name: 'NVIDIA Corp.', price: 135.58, change: 4.59, changePercent: 3.51, marketCap: '3.33T', sector: 'Technology', volume: '408.8M' },
  { ticker: 'TSLA', name: 'Tesla, Inc.', price: 183.01, change: -1.45, changePercent: -0.79, marketCap: '584B', sector: 'Consumer Cyclical', volume: '63.4M' },
  { ticker: 'META', name: 'Meta Platforms, Inc.', price: 509.92, change: 12.33, changePercent: 2.48, marketCap: '1.29T', sector: 'Technology', volume: '18.9M' },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.', price: 198.56, change: 2.33, changePercent: 1.19, marketCap: '571B', sector: 'Financial Services', volume: '9.8M' },
  { ticker: 'V', name: 'Visa Inc.', price: 275.44, change: 1.02, changePercent: 0.37, marketCap: '560B', sector: 'Financial Services', volume: '6.1M' },
  { ticker: 'JNJ', name: 'Johnson & Johnson', price: 148.95, change: -0.25, changePercent: -0.17, marketCap: '358B', sector: 'Healthcare', volume: '7.5M' },
];

const generateChartData = (days: number, startPrice: number, volatility: number): ChartDataPoint[] => {
  const data: ChartDataPoint[] = [];
  let currentDate = new Date();
  let currentPrice = startPrice;

  for (let i = 0; i < days; i++) {
    const change = (Math.random() - 0.5) * volatility;
    currentPrice += change;
    currentPrice = Math.max(currentPrice, 10); // Ensure price doesn't go below 10
    
    let date = new Date(currentDate);
    date.setDate(currentDate.getDate() - (days - 1 - i));
    
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: parseFloat(currentPrice.toFixed(2)),
    });
  }
  return data;
};


const generateMonthlyChartData = (months: number, startPrice: number, volatility: number): ChartDataPoint[] => {
    const data: ChartDataPoint[] = [];
    let currentPrice = startPrice;
    for (let i = months; i > 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const price = currentPrice + (Math.random() - 0.5) * volatility * i;
        data.push({
            date: date.toLocaleString('default', { month: 'short' }),
            price: Math.max(10, parseFloat(price.toFixed(2))),
        });
    }
    return data;
};

const generateYearlyChartData = (years: number, startPrice: number, volatility: number): ChartDataPoint[] => {
    const data: ChartDataPoint[] = [];
    let currentPrice = startPrice;
    for (let i = years; i > 0; i--) {
        const date = new Date();
        date.setFullYear(date.getFullYear() - i);
        const price = currentPrice + (Math.random() - 0.5) * volatility * i * 12;
        data.push({
            date: date.getFullYear().toString(),
            price: Math.max(10, parseFloat(price.toFixed(2))),
        });
    }
    return data;
}

export const chartData: ChartDataPoint[] = generateChartData(24, 150, 5); // 1D (24 hours)
export const chartData1M: ChartDataPoint[] = generateChartData(30, 140, 2); // 1 Month
export const chartData6M: ChartDataPoint[] = generateMonthlyChartData(6, 160, 10); // 6 Months
export const chartData1Y: ChartDataPoint[] = generateMonthlyChartData(12, 120, 15); // 1 Year
export const chartData5Y: ChartDataPoint[] = generateYearlyChartData(5, 80, 20); // 5 Years
