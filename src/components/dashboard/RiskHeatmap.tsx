// ============================================
// Alladin – Risk Heatmap (Clean table style)
// ============================================

'use client';

import React from 'react';
import type { GeopoliticsAnalysis } from '@/lib/agents/state';

interface RiskHeatmapProps {
  geopolitics: GeopoliticsAnalysis;
}

const severityColors: Record<string, { bg: string; text: string; dot: string }> = {
  critical: { bg: 'bg-[#fce8e6] dark:bg-[#2d1e1f]', text: 'text-[#c5221f] dark:text-[#f28b82]', dot: 'bg-[#c5221f] dark:bg-[#f28b82]' },
  high: { bg: 'bg-[#fce8e6] dark:bg-[#2d1e1f]', text: 'text-[#c5221f] dark:text-[#f28b82]', dot: 'bg-[#ea4335] dark:bg-[#f28b82]' },
  medium: { bg: 'bg-[#fef7e0] dark:bg-[#2d2a1e]', text: 'text-[#e37400] dark:text-[#fdd663]', dot: 'bg-[#fbbc04] dark:bg-[#fdd663]' },
  low: { bg: 'bg-[#e6f4ea] dark:bg-[#1a2e22]', text: 'text-[#0d7d4d] dark:text-[#81c995]', dot: 'bg-[#34a853] dark:bg-[#81c995]' },
};

export function RiskHeatmap({ geopolitics }: RiskHeatmapProps) {
  return (
    <div className="space-y-5">
      {/* Risk Table */}
      <div className="border border-[#e0e0e0] dark:border-[#3c4043] rounded-xl overflow-hidden bg-white dark:bg-[#1e1e1e]">
        <div className="px-4 py-3 bg-[#f8f9fa] dark:bg-[#1e1e1e] border-b border-[#e0e0e0] dark:border-[#3c4043]">
          <h3 className="text-sm font-semibold text-[#202124] dark:text-[#f1f3f4]">Risk Assessment</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#eeeeee] dark:border-[#3c4043] bg-[#f8f9fa] dark:bg-[#1e1e1e]">
                <th className="text-xs font-medium text-[#5f6368] dark:text-[#bdc1c6] px-4 py-2.5">Risk Factor</th>
                <th className="text-xs font-medium text-[#5f6368] dark:text-[#bdc1c6] px-4 py-2.5 w-28">Severity</th>
                <th className="text-xs font-medium text-[#5f6368] dark:text-[#bdc1c6] px-4 py-2.5 w-28">Likelihood</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eeeeee] dark:divide-[#3c4043]">
              {geopolitics.risks.map((risk, i) => {
                const colors = severityColors[risk.severity] || severityColors.medium;
                return (
                  <tr key={i} className="hover:bg-[#f8f9fa] dark:hover:bg-[#202124]/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-[13px] font-medium text-[#202124] dark:text-[#f1f3f4]">{risk.factor}</p>
                      <p className="text-xs text-[#9aa0a6] dark:text-[#80868b] mt-0.5 line-clamp-1">{risk.description}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md ${colors.bg} ${colors.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                        {risk.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[#5f6368] dark:text-[#bdc1c6] capitalize">{risk.likelihood}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Macro Indicators */}
      <div className="border border-[#e0e0e0] dark:border-[#3c4043] rounded-xl overflow-hidden bg-white dark:bg-[#1e1e1e]">
        <div className="px-4 py-3 bg-[#f8f9fa] dark:bg-[#1e1e1e] border-b border-[#e0e0e0] dark:border-[#3c4043]">
          <h3 className="text-sm font-semibold text-[#202124] dark:text-[#f1f3f4]">Macro Indicators</h3>
        </div>
        <div className="grid grid-cols-2 divide-x divide-[#eeeeee] dark:divide-[#3c4043]">
          <div className="divide-y divide-[#eeeeee] dark:divide-[#3c4043]">
            {geopolitics.macroIndicators.slice(0, Math.ceil(geopolitics.macroIndicators.length / 2)).map((m, i) => (
              <div key={i} className="px-4 py-3">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[13px] text-[#5f6368] dark:text-[#bdc1c6]">{m.name}</span>
                  <span className="text-[13px] font-semibold text-[#202124] dark:text-[#f1f3f4]">{m.value}</span>
                </div>
                <p className="text-[11px] text-[#9aa0a6] dark:text-[#80868b]">{m.impact}</p>
              </div>
            ))}
          </div>
          <div className="divide-y divide-[#eeeeee] dark:divide-[#3c4043]">
            {geopolitics.macroIndicators.slice(Math.ceil(geopolitics.macroIndicators.length / 2)).map((m, i) => (
              <div key={i} className="px-4 py-3">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[13px] text-[#5f6368] dark:text-[#bdc1c6]">{m.name}</span>
                  <span className="text-[13px] font-semibold text-[#202124] dark:text-[#f1f3f4]">{m.value}</span>
                </div>
                <p className="text-[11px] text-[#9aa0a6] dark:text-[#80868b]">{m.impact}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
