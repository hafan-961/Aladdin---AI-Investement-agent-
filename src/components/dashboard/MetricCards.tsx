// ============================================
// Alladin – Metric Cards (Yahoo Finance style stat grid)
// ============================================

'use client';

import React from 'react';
import type { FinancialMetrics } from '@/lib/agents/state';

interface MetricCardsProps {
  metrics: FinancialMetrics;
  currency?: string;
}

export function MetricCards({ metrics, currency = 'USD' }: MetricCardsProps) {
  const sym = currency === 'INR' ? '₹' : '$';

  const stats = [
    { label: 'P/E Ratio', value: metrics.peRatio?.toFixed(1) ?? '—' },
    { label: 'P/B Ratio', value: metrics.pbRatio?.toFixed(2) ?? '—' },
    { label: 'EPS', value: metrics.eps ? `${sym}${metrics.eps.toFixed(2)}` : '—' },
    { label: 'ROE', value: metrics.roe ? `${metrics.roe.toFixed(1)}%` : '—' },
    { label: 'Debt/Equity', value: metrics.debtToEquity?.toFixed(2) ?? '—' },
    { label: 'Current Ratio', value: metrics.currentRatio?.toFixed(2) ?? '—' },
    { label: 'FCF/Share', value: metrics.freeCashFlow ? `${sym}${metrics.freeCashFlow.toFixed(2)}` : '—' },
    { label: 'Profit Margin', value: metrics.profitMargin ? `${metrics.profitMargin.toFixed(1)}%` : '—' },
    { label: 'Revenue Growth', value: metrics.revenueGrowth ? `${(metrics.revenueGrowth * 100).toFixed(1)}%` : '—' },
    { label: 'Dividend Yield', value: metrics.dividendYield ? `${metrics.dividendYield.toFixed(2)}%` : '—' },
  ];

  return (
    <div className="border border-[#e0e0e0] dark:border-[#3c4043] rounded-xl overflow-hidden bg-white dark:bg-[#1e1e1e]">
      <div className="px-4 py-3 bg-[#f8f9fa] dark:bg-[#1e1e1e] border-b border-[#e0e0e0] dark:border-[#3c4043]">
        <h3 className="text-sm font-semibold text-[#202124] dark:text-[#f1f3f4]">Key Statistics</h3>
      </div>
      <div className="grid grid-cols-2 divide-x divide-[#eeeeee] dark:divide-[#3c4043]">
        {/* Left column */}
        <div className="divide-y divide-[#eeeeee] dark:divide-[#3c4043]">
          {stats.slice(0, 5).map((s) => (
            <div key={s.label} className="flex justify-between items-center px-4 py-2.5">
              <span className="text-[13px] text-[#5f6368] dark:text-[#bdc1c6]">{s.label}</span>
              <span className="text-[13px] font-medium text-[#202124] dark:text-[#f1f3f4]">{s.value}</span>
            </div>
          ))}
        </div>
        {/* Right column */}
        <div className="divide-y divide-[#eeeeee] dark:divide-[#3c4043]">
          {stats.slice(5).map((s) => (
            <div key={s.label} className="flex justify-between items-center px-4 py-2.5">
              <span className="text-[13px] text-[#5f6368] dark:text-[#bdc1c6]">{s.label}</span>
              <span className="text-[13px] font-medium text-[#202124] dark:text-[#f1f3f4]">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
