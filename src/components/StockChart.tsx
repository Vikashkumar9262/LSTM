import React, { useEffect, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts';

interface StockData {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface VolumeData {
  time: string | number;
  value: number;
  color?: string;
}

interface StockChartProps {
  data: StockData[];
  volumeData: VolumeData[];
}

const StockChart: React.FC<StockChartProps> = ({ data, volumeData }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        textColor: 'black',
        background: { type: ColorType.Solid, color: 'white' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
    });

    chart.timeScale().fitContent();

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickColor: '#737375',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    candlestickSeries.setData(data);

    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      lineWidth: 2,
      priceFormat: {
        type: 'volume',
      },
      overlay: true,
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    volumeSeries.setData(volumeData);

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, volumeData]);

  return (
    <div
      ref={chartContainerRef}
      style={{ width: '100%', height: '400px' }}
    />
  );
};

export default StockChart;