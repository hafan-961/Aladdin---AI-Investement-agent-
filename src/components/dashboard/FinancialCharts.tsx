// ============================================
// Alladin – Financial Charts (Google Finance style)
// ============================================

'use client';

import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import type { FundamentalAnalysis } from '@/lib/agents/state';

interface FinancialChartsProps {
  fundamentals: FundamentalAnalysis;
  companyName: string;
  currency?: string;
}

export function FinancialCharts({ fundamentals, companyName, currency = 'USD' }: FinancialChartsProps) {
  const { historicalData } = fundamentals;

  // React state to react dynamically to dark mode class changes
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const isINR = currency === 'INR';
  const currencySymbol = isINR ? '₹' : '$';

  // Format numbers for Y-axis
  const formatYAxis = (v: number) => {
    if (isINR) {
      return `${(v / 1e7).toFixed(0)}Cr`;
    }
    return `${(v / 1e9).toFixed(0)}B`;
  };

  // Format numbers for tooltip
  const formatTooltipVal = (v: number) => {
    if (isINR) {
      return `₹${(v / 1e7).toFixed(1)}Cr`;
    }
    return `$${(v / 1e9).toFixed(1)}B`;
  };

  // Theme-specific color parameters for Recharts
  const gridColor = isDark ? '#2d2d2d' : '#f0f0f0';
  const axisColor = isDark ? '#3c4043' : '#e0e0e0';
  const labelColor = isDark ? '#bdc1c6' : '#5f6368';
  const tooltipBg = isDark ? '#1e1e1e' : '#ffffff';
  const tooltipBorder = isDark ? '#3c4043' : '#e0e0e0';
  const tooltipColor = isDark ? '#f1f3f4' : '#202124';

  const revenueColor = isDark ? '#8ab4f8' : '#1a73e8';
  const incomeColor = isDark ? '#81c995' : '#34a853';

  return (
    <div className="space-y-6">
      {/* Revenue Chart */}
      <div className="border border-[#e0e0e0] dark:border-[#3c4043] rounded-xl overflow-hidden bg-white dark:bg-[#1e1e1e]">
        <div className="px-4 py-3 bg-[#f8f9fa] dark:bg-[#1e1e1e] border-b border-[#e0e0e0] dark:border-[#3c4043]">
          <h3 className="text-sm font-semibold text-[#202124] dark:text-[#f1f3f4]">Revenue & Earnings</h3>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={historicalData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fill: labelColor, fontSize: 12 }}
                axisLine={{ stroke: axisColor }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: labelColor, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatYAxis}
              />
              <Tooltip
                contentStyle={{
                  background: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: 8,
                  fontSize: 12,
                  color: tooltipColor,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                }}
                itemStyle={{ color: tooltipColor }}
                labelStyle={{ color: labelColor, fontWeight: 'bold' }}
                formatter={(value: any, name: any) => [
                  formatTooltipVal(Number(value)),
                  name === 'revenue' ? 'Revenue' : 'Net Income',
                ]}
              />
              <Bar dataKey="revenue" fill={revenueColor} radius={[4, 4, 0, 0]} name="revenue" />
              <Bar dataKey="netIncome" fill={incomeColor} radius={[4, 4, 0, 0]} name="netIncome" />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-6 mt-2 px-1">
            <div className="flex items-center gap-2 text-xs text-[#5f6368] dark:text-[#bdc1c6]">
              <div className="w-3 h-3 rounded-sm bg-[#1a73e8] dark:bg-[#8ab4f8]" /> Revenue
            </div>
            <div className="flex items-center gap-2 text-xs text-[#5f6368] dark:text-[#bdc1c6]">
              <div className="w-3 h-3 rounded-sm bg-[#34a853] dark:bg-[#81c995]" /> Net Income
            </div>
          </div>
        </div>
      </div>

      {/* EPS Trend */}
      <div className="border border-[#e0e0e0] dark:border-[#3c4043] rounded-xl overflow-hidden bg-white dark:bg-[#1e1e1e]">
        <div className="px-4 py-3 bg-[#f8f9fa] dark:bg-[#1e1e1e] border-b border-[#e0e0e0] dark:border-[#3c4043]">
          <h3 className="text-sm font-semibold text-[#202124] dark:text-[#f1f3f4]">EPS Trend</h3>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={historicalData}>
              <defs>
                <linearGradient id="epsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={revenueColor} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={revenueColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fill: labelColor, fontSize: 12 }}
                axisLine={{ stroke: axisColor }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: labelColor, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${currencySymbol}${v.toFixed(1)}`}
              />
              <Tooltip
                contentStyle={{
                  background: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: 8,
                  fontSize: 12,
                  color: tooltipColor,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                }}
                itemStyle={{ color: tooltipColor }}
                labelStyle={{ color: labelColor, fontWeight: 'bold' }}
                formatter={(value: any) => [`${currencySymbol}${Number(value).toFixed(2)}`, 'EPS']}
              />
              <Area
                type="monotone"
                dataKey="eps"
                stroke={revenueColor}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#epsGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
