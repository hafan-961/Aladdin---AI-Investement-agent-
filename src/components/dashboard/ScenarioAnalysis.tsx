// ============================================
// Alladin – Scenario Analysis (Clean cards)
// ============================================

'use client';

import React from 'react';
import { TrendingUp, Minus, TrendingDown } from 'lucide-react';
import type { ValuationAnalysis } from '@/lib/agents/state';

interface ScenarioAnalysisProps {
  valuation: ValuationAnalysis;
  currency?: string;
}

export function ScenarioAnalysis({ valuation, currency = 'USD' }: ScenarioAnalysisProps) {
  const { scenarios, currentPrice, intrinsicValue, marginOfSafety, grahamValue, dcfValue } = valuation;
  const sym = currency === 'INR' ? '₹' : '$';

  const scenarioItems = [
    {
      label: 'Bull Case',
      icon: <TrendingUp className="w-4 h-4" />,
      price: scenarios.bull.price,
      reasoning: scenarios.bull.reasoning,
      iconColor: 'text-[#0d7d4d] dark:text-[#81c995]',
      bgColor: 'bg-[#e6f4ea] dark:bg-[#1a2e22]',
    },
    {
      label: 'Base Case',
      icon: <Minus className="w-4 h-4" />,
      price: scenarios.base.price,
      reasoning: scenarios.base.reasoning,
      iconColor: 'text-[#1a73e8] dark:text-[#8ab4f8]',
      bgColor: 'bg-[#e8f0fe] dark:bg-[#1f2d3d]',
    },
    {
      label: 'Bear Case',
      icon: <TrendingDown className="w-4 h-4" />,
      price: scenarios.bear.price,
      reasoning: scenarios.bear.reasoning,
      iconColor: 'text-[#c5221f] dark:text-[#f28b82]',
      bgColor: 'bg-[#fce8e6] dark:bg-[#2d1e1f]',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Valuation Stats */}
      <div className="border border-[#e0e0e0] dark:border-[#3c4043] rounded-xl overflow-hidden bg-white dark:bg-[#1e1e1e]">
        <div className="px-4 py-3 bg-[#f8f9fa] dark:bg-[#1e1e1e] border-b border-[#e0e0e0] dark:border-[#3c4043]">
          <h3 className="text-sm font-semibold text-[#202124] dark:text-[#f1f3f4]">Valuation Summary</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-[#eeeeee] dark:divide-[#3c4043]">
          <ValuationStat label="Current Price" value={`${sym}${currentPrice.toFixed(2)}`} />
          <ValuationStat label="Graham Value" value={grahamValue ? `${sym}${grahamValue.toFixed(2)}` : 'N/A'} />
          <ValuationStat label="DCF Value" value={dcfValue ? `${sym}${dcfValue.toFixed(2)}` : 'N/A'} />
          <ValuationStat
            label="Margin of Safety"
            value={marginOfSafety ? `${marginOfSafety.toFixed(1)}%` : 'N/A'}
            valueColor={
              marginOfSafety && marginOfSafety > 30 ? 'text-[#0d7d4d] dark:text-[#81c995]' :
              marginOfSafety && marginOfSafety > 0 ? 'text-[#e37400] dark:text-[#fdd663]' :
              'text-[#c5221f] dark:text-[#f28b82]'
            }
          />
        </div>
      </div>

      {/* Scenario Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scenarioItems.map((s) => {
          const upside = ((s.price / currentPrice - 1) * 100).toFixed(1);
          return (
            <div key={s.label} className="border border-[#e0e0e0] dark:border-[#3c4043] rounded-xl p-4 bg-white dark:bg-[#1e1e1e] hover:shadow-sm dark:hover:shadow-[#3c4043]/10 transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-7 h-7 rounded-lg ${s.bgColor} flex items-center justify-center ${s.iconColor}`}>
                  {s.icon}
                </div>
                <span className="text-sm font-semibold text-[#202124] dark:text-[#f1f3f4]">{s.label}</span>
              </div>
              <p className="text-2xl font-semibold text-[#202124] dark:text-[#f1f3f4] mb-1">{sym}{s.price.toFixed(2)}</p>
              <p className={`text-sm font-medium ${parseFloat(upside) >= 0 ? 'text-[#0d7d4d] dark:text-[#81c995]' : 'text-[#c5221f] dark:text-[#f28b82]'}`}>
                {parseFloat(upside) >= 0 ? '+' : ''}{upside}% from current
              </p>
              <p className="text-xs text-[#5f6368] dark:text-[#bdc1c6] mt-3 line-clamp-3 leading-relaxed">{s.reasoning}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ValuationStat({
  label,
  value,
  valueColor = 'text-[#202124] dark:text-[#f1f3f4]',
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="px-4 py-3 text-center">
      <p className="text-xs text-[#5f6368] dark:text-[#bdc1c6] mb-0.5">{label}</p>
      <p className={`text-lg font-semibold ${valueColor}`}>{value}</p>
    </div>
  );
}
