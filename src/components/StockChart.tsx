import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi } from 'lightweight-charts';

interface AreaData {
  time: string;
  value: number;
}

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

type ChartType = 'area' | 'candlestick';

type StockChartProps =
  | { chartType: 'area'; data: AreaData[]; width?: number; height?: number }
  | { chartType: 'candlestick'; data: CandleData[]; width?: number; height?: number };

const StockChart: React.FC<StockChartProps> = ({ data, chartType, width = 600, height = 300 }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    if (chartRef.current) {
      chartRef.current.remove();
    }
    chartRef.current = createChart(chartContainerRef.current, { width, height });
    if (chartType === 'candlestick') {
      const candleSeries = chartRef.current.addSeries({ type: 'Candlestick' } as any);
      candleSeries.setData(data as CandleData[]);
    } else {
      const lineSeries = chartRef.current.addSeries({ type: 'Line' } as any);
      lineSeries.setData(data as AreaData[]);
    }
    return () => {
      chartRef.current?.remove();
    };
  }, [data, chartType, width, height]);

  return <div ref={chartContainerRef} />;
};

export default StockChart;