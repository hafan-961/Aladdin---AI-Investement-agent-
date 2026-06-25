// ============================================
// Alladin – Main Page (Google Finance style)
// ============================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { SearchSection } from '@/components/SearchSection';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ChatSidebar } from '@/components/ChatSidebar';
import { TrendingUp, AlertTriangle, RotateCcw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AgentState } from '@/lib/agents/state';

type AppState = 'search' | 'loading' | 'result' | 'error';

const LOADING_STEPS = [
  { label: 'Resolving ticker & fetching data', icon: '📊' },
  { label: 'Running fundamental analysis (Graham checklist)', icon: '📋' },
  { label: 'Analyzing Mr. Market sentiment', icon: '🧠' },
  { label: 'Assessing geopolitical & macro risks', icon: '🌍' },
  { label: 'Computing intrinsic value & margin of safety', icon: '🎯' },
  { label: 'Synthesizing investment decision', icon: '⚖️' },
];

export default function Home() {
  const [appState, setAppState] = useState<AppState>('search');
  const [result, setResult] = useState<AgentState | null>(null);
  const [error, setError] = useState('');
  const [loadingStep, setLoadingStep] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = useCallback(async (query: string) => {
    setAppState('loading');
    setSearchQuery(query);
    setError('');
    setLoadingStep(0);

    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => Math.min(prev + 1, LOADING_STEPS.length - 1));
    }, 3000);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      clearInterval(stepInterval);
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || 'Analysis failed.');
        setAppState('error');
        return;
      }

      setResult(data.data);
      setAppState('result');
    } catch {
      clearInterval(stepInterval);
      setError('Network error. Check your connection.');
      setAppState('error');
    }
  }, []);

  const handleReset = () => {
    setAppState('search');
    setResult(null);
    setError('');
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] transition-colors duration-200">
      {/* ──────── Navigation ──────── */}
      <nav className="sticky top-0 z-40 bg-[var(--background)] border-b border-[#eeeeee] dark:border-[#3c4043] transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={handleReset} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-[#1a73e8] dark:bg-[#8ab4f8] flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white dark:text-[#202124]" />
            </div>
            <span className="text-2xl font-normal font-aladin text-[#202124] dark:text-[#f1f3f4] tracking-wider leading-none mt-1">Aladdin</span>
          </button>

          <div className="flex items-center gap-3">
            {appState === 'result' && (
              <button
                onClick={handleReset}
                className="flex items-center gap-2 h-9 px-4 rounded-full bg-[#f1f3f4] dark:bg-[#303134] hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] transition-colors text-[13px] text-[#5f6368] dark:text-[#bdc1c6]"
              >
                <Search className="w-3.5 h-3.5" />
                New search
              </button>
            )}


          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* ──────── Search ──────── */}
        {appState === 'search' && (
          <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
            <SearchSection onSearch={handleSearch} isLoading={false} />
          </div>
        )}

        {/* ──────── Loading ──────── */}
        {appState === 'loading' && (
          <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
            <div className="w-full max-w-md text-center animate-fade-in">
              <div className="text-sm text-[#5f6368] dark:text-[#bdc1c6] mb-2">Analyzing</div>
              <div className="text-xl font-medium text-[#202124] dark:text-[#f1f3f4] mb-8">{searchQuery}</div>

              <div className="space-y-2 text-left">
                {LOADING_STEPS.map((step, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                      i < loadingStep
                        ? 'bg-[#e6f4ea] dark:bg-[#1a2e22]'
                        : i === loadingStep
                        ? 'bg-[#e8f0fe] dark:bg-[#1f2d3d] border border-[#aecbfa] dark:border-[#8ab4f8]/30'
                        : 'bg-[#f8f9fa] dark:bg-[#1e1e1e] opacity-50'
                    }`}
                  >
                    <span className="text-sm">{step.icon}</span>
                    <span className={`text-[13px] flex-1 ${
                      i <= loadingStep ? 'text-[#202124] dark:text-[#f1f3f4]' : 'text-[#9aa0a6] dark:text-[#80868b]'
                    }`}>
                      {step.label}
                    </span>
                    {i < loadingStep && <span className="text-[#0d7d4d] dark:text-[#81c995] text-xs font-medium">✓</span>}
                    {i === loadingStep && (
                      <div className="w-4 h-4 border-2 border-[#aecbfa] dark:border-[#aecbfa]/20 border-t-[#1a73e8] dark:border-t-[#8ab4f8] rounded-full animate-spin" />
                    )}
                  </div>
                ))}
              </div>

              <p className="text-xs text-[#9aa0a6] dark:text-[#80868b] mt-6">This may take 15-30 seconds</p>
            </div>
          </div>
        )}

        {/* ──────── Error ──────── */}
        {appState === 'error' && (
          <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
            <div className="text-center max-w-sm animate-fade-in">
              <div className="mx-auto w-12 h-12 rounded-full bg-[#fce8e6] dark:bg-[#2d1e1f] flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-[#c5221f] dark:text-[#f28b82]" />
              </div>
              <h2 className="text-lg font-medium text-[#202124] dark:text-[#f1f3f4] mb-2">Analysis failed</h2>
              <p className="text-sm text-[#5f6368] dark:text-[#bdc1c6] mb-6">{error}</p>
              <Button onClick={handleReset} variant="outline" className="gap-2">
                <RotateCcw className="w-4 h-4" /> Try again
              </Button>
            </div>
          </div>
        )}

        {/* ──────── Result ──────── */}
        {appState === 'result' && result && (
          <div className="py-6">
            <DashboardLayout data={result} />
          </div>
        )}
      </div>

      {/* Chat Sidebar */}
      {appState === 'result' && result && (
        <ChatSidebar reportContext={result.decision?.reasoning} />
      )}
    </main>
  );
}
