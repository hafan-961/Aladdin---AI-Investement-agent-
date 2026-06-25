// ============================================
// Alladin – Sentiment Gauge (Google Finance style)
// ============================================

'use client';

import React, { useState, useEffect } from 'react';
import type { SentimentAnalysis } from '@/lib/agents/state';

interface SentimentGaugeProps {
  sentiment: SentimentAnalysis;
}

export function SentimentGauge({ sentiment }: SentimentGaugeProps) {
  const score = sentiment.sentimentScore;

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

  const moodConfig = {
    extreme_fear: { label: 'Extreme Fear', color: isDark ? '#f28b82' : '#c5221f', bg: isDark ? 'rgba(242, 139, 130, 0.15)' : '#fce8e6' },
    fear: { label: 'Fear', color: isDark ? '#fdd663' : '#e37400', bg: isDark ? 'rgba(253, 214, 99, 0.15)' : '#fef7e0' },
    neutral: { label: 'Neutral', color: isDark ? '#bdc1c6' : '#5f6368', bg: isDark ? '#303134' : '#f1f3f4' },
    greed: { label: 'Greed', color: isDark ? '#81c995' : '#0d7d4d', bg: isDark ? 'rgba(129, 201, 149, 0.15)' : '#e6f4ea' },
    extreme_greed: { label: 'Extreme Greed', color: isDark ? '#81c995' : '#0d7d4d', bg: isDark ? 'rgba(129, 201, 149, 0.15)' : '#e6f4ea' },
  };

  const mood = moodConfig[sentiment.overallSentiment];

  return (
    <div className="border border-[#e0e0e0] dark:border-[#3c4043] rounded-xl overflow-hidden bg-white dark:bg-[#1e1e1e]">
      <div className="px-4 py-3 bg-[#f8f9fa] dark:bg-[#1e1e1e] border-b border-[#e0e0e0] dark:border-[#3c4043]">
        <h3 className="text-sm font-semibold text-[#202124] dark:text-[#f1f3f4]">Mr. Market Sentiment</h3>
      </div>
      <div className="p-5">
        {/* Score Display */}
        <div className="flex items-center gap-5 mb-5">
          <div className="text-center">
            <div className="text-[42px] font-light text-[#202124] dark:text-[#f1f3f4] leading-none">{score}</div>
            <div className="text-xs text-[#9aa0a6] dark:text-[#80868b] mt-1">/ 100</div>
          </div>
          <div>
            <span
              className="inline-block px-3 py-1 rounded-md text-sm font-semibold transition-colors duration-200"
              style={{ backgroundColor: mood.bg, color: mood.color }}
            >
              {mood.label}
            </span>
            <p className="text-xs text-[#5f6368] dark:text-[#bdc1c6] mt-2">
              {score <= 25 ? 'Market is fearful — potential buying opportunity per Graham.'
                : score <= 50 ? 'Market sentiment is cautious.'
                : score <= 75 ? 'Market is optimistic — exercise caution.'
                : 'Market is euphoric — Graham advises defensive positioning.'}
            </p>
          </div>
        </div>

        {/* Sentiment Bar */}
        <div className="mb-5">
          <div className="h-2 rounded-full bg-[#f1f3f4] dark:bg-[#303134] overflow-hidden relative">
            <div className="absolute inset-0 flex">
              <div className="flex-1 bg-[#c5221f] opacity-35" />
              <div className="flex-1 bg-[#e37400] opacity-35" />
              <div className="flex-1 bg-[#fbbc04] opacity-35" />
              <div className="flex-1 bg-[#34a853] opacity-35" />
            </div>
            {/* Indicator */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white dark:border-[#1e1e1e] shadow-md transition-all duration-300"
              style={{
                left: `${Math.max(2, Math.min(98, score))}%`,
                backgroundColor: mood.color,
                transform: 'translate(-50%, -50%)',
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-[#9aa0a6] dark:text-[#80868b] mt-1">
            <span>Fear</span>
            <span>Greed</span>
          </div>
        </div>

        {/* Social Signals */}
        <div className="border-t border-[#eeeeee] dark:border-[#3c4043] pt-4">
          <p className="text-xs font-medium text-[#5f6368] dark:text-[#bdc1c6] mb-3">Social Signals</p>
          <div className="space-y-2">
            {sentiment.socialMentions.map((s, i) => (
              <div key={i} className="flex items-center justify-between py-1.5">
                <span className="text-[13px] text-[#5f6368] dark:text-[#bdc1c6]">{s.platform}</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-1.5 rounded-full bg-[#f1f3f4] dark:bg-[#303134] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(10, s.sentiment * 100)}%`,
                        backgroundColor: s.sentiment > 0.5
                          ? (isDark ? '#81c995' : '#34a853')
                          : s.sentiment > 0.2
                          ? (isDark ? '#fdd663' : '#fbbc04')
                          : (isDark ? '#f28b82' : '#c5221f'),
                      }}
                    />
                  </div>
                  <span className="text-xs text-[#9aa0a6] dark:text-[#80868b] w-16 text-right">{s.volume} posts</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
