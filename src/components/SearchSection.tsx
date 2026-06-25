// ============================================
// Alladin – Search Section (Google Finance style)
// ============================================

'use client';

import React, { useState, useEffect } from 'react';
import { Search, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SearchSectionProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

interface StockPick {
  label: string;
  ticker: string;
  price?: string;
  change: string;
}

const DEFAULT_PICKS: StockPick[] = [
  { label: 'Apple', ticker: 'AAPL', change: '+1.2%', price: '$294.30' },
  { label: 'Tesla', ticker: 'TSLA', change: '-0.8%', price: '$381.61' },
  { label: 'Reliance', ticker: 'RELIANCE.NS', change: '+0.5%', price: '₹1,313.50' },
  { label: 'Microsoft', ticker: 'MSFT', change: '+0.9%', price: '$373.94' },
  { label: 'NVIDIA', ticker: 'NVDA', change: '+2.1%', price: '$200.00' },
  { label: 'SpaceX', ticker: 'SPCX', change: '+0.9%', price: '$156.11' },
  { label: 'Google', ticker: 'GOOGL', change: '+0.6%', price: '$178.35' },
  { label: 'Amazon', ticker: 'AMZN', change: '+1.4%', price: '$189.05' },
];

export function SearchSection({ onSearch, isLoading }: SearchSectionProps) {
  const [query, setQuery] = useState('');
  const [picks, setPicks] = useState<StockPick[]>(DEFAULT_PICKS);

  useEffect(() => {
    let active = true;
    fetch('/api/quotes')
      .then((res) => res.json())
      .then((data) => {
        if (active && Array.isArray(data)) {
          setPicks(data);
        }
      })
      .catch((err) => console.error('[SearchSection] Failed to load live quotes:', err));
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) onSearch(query.trim());
  };

  return (
    <div className="flex flex-col items-center text-center px-4 max-w-2xl mx-auto w-full">
      {/* Brand */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-10 h-10 rounded-lg bg-[#1a73e8] dark:bg-[#8ab4f8] flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-white dark:text-[#202124]" />
        </div>
        <h1 className="text-[34px] font-normal font-aladin text-[#202124] dark:text-[#f1f3f4] tracking-wider leading-none">
          Aladdin
        </h1>
      </div>
      <p className="text-[#5f6368] dark:text-[#bdc1c6] text-sm mb-8">
        AI-powered investment research • Benjamin Graham methodology
      </p>

      {/* Search Bar */}
      <form onSubmit={handleSubmit} className="w-full mb-6">
        <div className="relative flex items-center w-full h-12 rounded-full border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#1e1e1e] hover:shadow-md dark:hover:shadow-[#3c4043]/10 focus-within:shadow-md dark:focus-within:shadow-[#3c4043]/10 transition-shadow">
          <Search className="w-5 h-5 text-[#9aa0a6] dark:text-[#80868b] ml-4 flex-shrink-0" />
          <input
            id="search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a company or ticker symbol"
            className="flex-1 h-full bg-transparent px-3 text-[15px] text-[#202124] dark:text-[#f1f3f4] placeholder:text-[#9aa0a6] dark:placeholder:text-[#80868b] outline-none"
            style={{ outline: 'none', boxShadow: 'none' }}
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={!query.trim() || isLoading}
            size="sm"
            className="mr-1.5 h-8"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Analyze'
            )}
          </Button>
        </div>
      </form>

      {/* Quick Picks */}
      <div className="w-full">
        <p className="text-xs text-[#9aa0a6] dark:text-[#80868b] mb-3 text-left">Popular companies</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
          {picks.map((pick) => (
            <button
              key={pick.ticker}
              onClick={() => { setQuery(pick.label); onSearch(pick.label); }}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#e0e0e0] dark:border-[#3c4043] bg-white dark:bg-[#1e1e1e] hover:bg-[#f8f9fa] dark:hover:bg-[#202124]/40 transition-colors text-left disabled:opacity-40 w-full overflow-hidden"
            >
              <div className="w-8 h-8 rounded-full bg-[#f1f3f4] dark:bg-[#303134] flex items-center justify-center text-xs font-bold text-[#5f6368] dark:text-[#bdc1c6] flex-shrink-0">
                {pick.label.slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#202124] dark:text-[#f1f3f4] truncate">{pick.label}</p>
                <p className="text-[11px] text-[#5f6368] dark:text-[#bdc1c6] truncate">
                  {pick.ticker} {pick.price ? `• ${pick.price}` : ''}
                </p>
              </div>
              <span className={`text-[11px] font-medium ml-auto flex-shrink-0 ${pick.change.startsWith('+') ? 'text-[#0d7d4d] dark:text-[#81c995]' : 'text-[#c5221f] dark:text-[#f28b82]'}`}>
                {pick.change}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
