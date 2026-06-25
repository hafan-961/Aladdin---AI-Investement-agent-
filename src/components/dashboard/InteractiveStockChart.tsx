// ============================================
// Alladin – Interactive Stock Chart (Google Finance style)
// ============================================
// Interactive price line chart with dynamic range selectors (1D, 5D, 1M, etc.),
// horizontal baseline (previous close), and real-time hover price updates.
// ============================================

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ChartPoint {
  time: number; // unix timestamp
  close: number;
}

interface InteractiveStockChartProps {
  ticker: string;
  companyName: string;
  currency?: string;
  initialPrice?: number;
}

export function InteractiveStockChart({
  ticker,
  companyName,
  currency = 'USD',
  initialPrice
}: InteractiveStockChartProps) {
  const [range, setRange] = useState<string>('1m');
  const [chartData, setChartData] = useState<{
    points: ChartPoint[];
    previousClose: number | null;
    regularMarketPrice: number | null;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [hoveredData, setHoveredData] = useState<ChartPoint | null>(null);

  // Detect dark mode theme dynamically
  const [isDark, setIsDark] = useState<boolean>(false);
  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Fetch chart data
  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/chart?ticker=${encodeURIComponent(ticker)}&range=${range}`)
      .then((res) => res.json())
      .then((data) => {
        if (active) {
          if (data.points && Array.isArray(data.points)) {
            setChartData({
              points: data.points,
              previousClose: data.previousClose,
              regularMarketPrice: data.regularMarketPrice
            });
          } else {
            setChartData(null);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('[InteractiveStockChart] Fetch error:', err);
        if (active) {
          setChartData(null);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [ticker, range]);

  // Overwrite the last point's close price with the live initial price so that
  // the chart line terminates at the current price and display prices are identical.
  const points = useMemo(() => {
    const pts = chartData?.points || [];
    if (pts.length > 0 && initialPrice) {
      const updated = [...pts];
      updated[updated.length - 1] = {
        ...updated[updated.length - 1],
        close: initialPrice
      };
      return updated;
    }
    return pts;
  }, [chartData?.points, initialPrice]);

  const prevClose = chartData?.previousClose || initialPrice || 0;
  
  // First and last values for computing total return in active range
  const startPrice = useMemo(() => points[0]?.close || prevClose || 0, [points, prevClose]);
  const currentPrice = useMemo(() => {
    if (hoveredData) return hoveredData.close;
    return points[points.length - 1]?.close || initialPrice || 0;
  }, [points, hoveredData, initialPrice]);

  const baselinePrice = useMemo(() => {
    if (range === '1d') return prevClose || startPrice;
    return startPrice;
  }, [range, prevClose, startPrice]);

  // Compute absolute change and percentage return
  const priceChange = currentPrice - baselinePrice;
  const pctChange = baselinePrice > 0 ? (priceChange / baselinePrice) * 100 : 0;
  const isPositive = priceChange >= 0;

  // Compute total return for the selected range (line color state)
  const isRangePositive = useMemo(() => {
    const lastPointVal = points[points.length - 1]?.close || 0;
    const base = range === '1d' ? (prevClose || startPrice) : startPrice;
    return lastPointVal >= base;
  }, [points, range, prevClose, startPrice]);

  // Styling properties
  const strokeColor = isRangePositive 
    ? (isDark ? '#81c995' : '#137333') 
    : (isDark ? '#f28b82' : '#c5221f');

  const fillGradientId = `chartFillGradient-${ticker}-${range}`;
  const stopColor = isRangePositive ? '#81c995' : '#f28b82';

  const gridColor = isDark ? '#222222' : '#f5f5f5';
  const labelColor = isDark ? '#80868b' : '#9aa0a6';

  // Format dates for X-axis
  const formatXAxis = (tick: number) => {
    const date = new Date(tick * 1000);
    if (range === '1d') {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    if (range === '5d') {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    if (range === '1m') {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    if (range === '6m' || range === 'ytd' || range === '1y') {
      return date.toLocaleDateString([], { month: 'short' });
    }
    return date.toLocaleDateString([], { year: '2-digit' });
  };

  // Format date for display in the header
  const formatDisplayTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    if (range === '1d') {
      return `As of ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })} Today`;
    }
    if (range === '5d') {
      return `${date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    }
    return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
  };

  // Custom tooltips (we handle header updates, but render a small hover dot indicator)
  const handleTooltipMove = (state: any) => {
    if (state && state.activePayload && state.activePayload.length > 0) {
      setHoveredData(state.activePayload[0].payload);
    }
  };

  const handleTooltipLeave = () => {
    setHoveredData(null);
  };

  const RANGES = [
    { label: '1D', value: '1d' },
    { label: '5D', value: '5d' },
    { label: '1M', value: '1m' },
    { label: '6M', value: '6m' },
    { label: 'YTD', value: 'ytd' },
    { label: '1Y', value: '1y' },
    { label: '5Y', value: '5y' },
    { label: 'MAX', value: 'max' }
  ];

  return (
    <div className="w-full bg-[#ffffff] dark:bg-[#1e1e1e] border border-[#e0e0e0] dark:border-[#3c4043] rounded-xl overflow-hidden p-4 shadow-sm transition-all duration-200">
      
      {/* ── Interactive Chart Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-normal text-[#202124] dark:text-[#f1f3f4] tracking-tight">
              {formatCurrency(currentPrice, currency)}
            </span>
            <div className={`flex items-center gap-0.5 text-sm font-medium ${isPositive ? 'text-[#0d7d4d] dark:text-[#81c995]' : 'text-[#c5221f] dark:text-[#f28b82]'}`}>
              {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>
                {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({isPositive ? '+' : ''}{pctChange.toFixed(2)}%)
              </span>
              <span className="text-xs text-[#5f6368] dark:text-[#bdc1c6] ml-1">
                {range === '1d' ? 'Today' : `in last ${range.toUpperCase()}`}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-[#9aa0a6] dark:text-[#80868b] mt-0.5 min-h-[16px]">
            {hoveredData 
              ? formatDisplayTime(hoveredData.time) 
              : points.length > 0 
                ? formatDisplayTime(points[points.length - 1].time) 
                : ''}
          </p>
        </div>

        {/* Indicators info */}
        <div className="flex gap-2 text-xs text-[#5f6368] dark:text-[#bdc1c6] items-center border border-[#e0e0e0] dark:border-[#3c4043] px-2.5 py-1 rounded-full">
          <span className="font-semibold tracking-wider text-[10px] text-[#1a73e8] dark:text-[#8ab4f8] bg-[#e8f0fe] dark:bg-[#1e2b40] px-1.5 py-0.5 rounded uppercase">Live</span>
          <span>{ticker} • {companyName}</span>
        </div>
      </div>

      {/* ── Line Chart Render ── */}
      <div className="relative w-full h-[240px] flex items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-[#1a73e8] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-[#9aa0a6] dark:text-[#80868b]">Loading live chart...</span>
          </div>
        ) : points.length === 0 ? (
          <div className="text-xs text-[#9aa0a6] dark:text-[#80868b]">No live price chart data available.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={points}
              margin={{ top: 10, right: 5, left: -20, bottom: 5 }}
              onMouseMove={handleTooltipMove}
              onMouseLeave={handleTooltipLeave}
            >
              <defs>
                <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stopColor} stopOpacity={isDark ? 0.25 : 0.15} />
                  <stop offset="100%" stopColor={stopColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="time"
                tickFormatter={formatXAxis}
                tick={{ fill: labelColor, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                minTickGap={30}
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fill: labelColor, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={() => null} // We display details in the header, hide standard card tooltip
                cursor={{ stroke: isDark ? '#3c4043' : '#dadce0', strokeWidth: 1.5, strokeDasharray: '3 3' }}
              />
              {range === '1d' && prevClose > 0 && (
                <ReferenceLine
                  y={prevClose}
                  stroke="#9aa0a6"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                  label={{
                    value: `Prev. close ${formatCurrency(prevClose, currency)}`,
                    fill: labelColor,
                    fontSize: 9,
                    position: 'top',
                    offset: 4
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="close"
                stroke={strokeColor}
                strokeWidth={1.8}
                fillOpacity={1}
                fill={`url(#${fillGradientId})`}
                dot={false}
                activeDot={{ r: 4, stroke: strokeColor, strokeWidth: 2, fill: isDark ? '#1e1e1e' : '#ffffff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Time Range Selectors ── */}
      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-[#f1f3f4] dark:border-[#2d2d2d] overflow-x-auto">
        {RANGES.map((r) => {
          const isActive = range === r.value;
          return (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors cursor-pointer select-none ${
                isActive
                  ? 'bg-[#e8f0fe] dark:bg-[#303134] text-[#1a73e8] dark:text-[#8ab4f8]'
                  : 'text-[#5f6368] dark:text-[#bdc1c6] hover:bg-[#f1f3f4] dark:hover:bg-[#303134]/40'
              }`}
            >
              {r.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
