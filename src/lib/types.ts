export interface Stock {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: string;
  sector: string;
  volume: string;
}

export interface ChartDataPoint {
  date: string;
  price: number;
}
