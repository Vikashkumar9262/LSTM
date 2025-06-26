import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi } from 'lightweight-charts';

interface ChartData {
  time: string; // 'YYYY-MM-DD'
  value: number;
}

interface StockChartProps {
  data: ChartData[];
  width?: number;
  height?: number;
}

const StockChart: React.FC<StockChartProps> = ({ data, width = 600, height = 300 }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clean up previous chart
    if (chartRef.current) {
      chartRef.current.remove();
    }

    chartRef.current = createChart(chartContainerRef.current, { width, height });
    // Use addSeries with type 'Line' and cast as any to avoid type issues
    const lineSeries = chartRef.current.addSeries({ type: 'Line' } as any);
    lineSeries.setData(data);

    return () => {
      chartRef.current?.remove();
    };
  }, [data, width, height]);

  return <div ref={chartContainerRef} />;
};

export default StockChart;