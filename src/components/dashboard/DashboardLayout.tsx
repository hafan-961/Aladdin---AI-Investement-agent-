// ============================================
// Alladin – Dashboard Layout (Google Finance / Yahoo style)
// ============================================
// Two-column layout: Main content (left) + Sidebar stats (right)
// Stock page header with large price display and change indicator
// ============================================

'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { MetricCards } from './MetricCards';
import { FinancialCharts } from './FinancialCharts';
import { SentimentGauge } from './SentimentGauge';
import { RiskHeatmap } from './RiskHeatmap';
import { ScenarioAnalysis } from './ScenarioAnalysis';
import { ReportPDF } from '../ReportPDF';
import { MarkdownRenderer } from '../ui/markdown-renderer';
import { InteractiveStockChart } from './InteractiveStockChart';
import {
  ExternalLink, TrendingUp, TrendingDown,
  BarChart3, Brain, Globe2, Calculator, FileText,
  CheckCircle, XCircle, Clock, Shield,
} from 'lucide-react';
import type { AgentState } from '@/lib/agents/state';
import { formatCurrency, formatLargeNumber } from '@/lib/utils';

interface DashboardLayoutProps {
  data: AgentState;
}

export function DashboardLayout({ data }: DashboardLayoutProps) {
  const { company, fundamentals, sentiment, geopolitics, valuation, decision } = data;
  if (!company || !decision) return null;

  const isPositive = valuation?.marginOfSafety && valuation.marginOfSafety > 0;

  const actionConfig = {
    INVEST: { icon: <CheckCircle className="w-5 h-5" />, variant: 'invest' as const, label: 'INVEST', color: '#0d7d4d' },
    PASS: { icon: <XCircle className="w-5 h-5" />, variant: 'pass' as const, label: 'PASS', color: '#c5221f' },
    WAIT_MONITOR: { icon: <Clock className="w-5 h-5" />, variant: 'wait' as const, label: 'WAIT & MONITOR', color: '#e37400' },
  };

  const action = actionConfig[decision.action];

  return (
    <div className="animate-slide-up">
      {/* ──────── Stock Header (Google Finance style) ──────── */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            {/* Company name & ticker */}
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-[22px] font-normal text-[#202124] dark:text-[#f1f3f4]">{company.name}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-[#5f6368] dark:text-[#bdc1c6]">
              {company.exchange === 'PRIVATE' ? (
                <>
                  <span>Private Company</span>
                  <span>•</span>
                  <span>{company.industry}</span>
                </>
              ) : (
                <>
                  <span>{company.ticker}</span>
                  <span>•</span>
                  <span>{company.exchange}</span>
                  <span>•</span>
                  <span>{company.industry}</span>
                </>
              )}
            </div>

            {/* Price Display */}
            {company.exchange === 'PRIVATE' ? (
              <div className="flex items-end gap-3 mt-3">
                <span className="text-lg font-medium text-[#5f6368] dark:text-[#bdc1c6] leading-none">
                  Stated Valuation: <strong>{company.marketCap > 0 ? formatCurrency(company.marketCap, company.currency) : 'Undisclosed'}</strong>
                </span>
              </div>
            ) : (
              <div className="flex items-end gap-3 mt-3">
                <span className="text-[42px] font-normal text-[#202124] dark:text-[#f1f3f4] leading-none tracking-tight">
                  {formatCurrency(company.currentPrice, company.currency)}
                </span>
                {valuation?.marginOfSafety !== undefined && (
                  <div className={`flex items-center gap-1 pb-1 ${isPositive ? 'text-[#0d7d4d] dark:text-[#81c995]' : 'text-[#c5221f] dark:text-[#f28b82]'}`}>
                    {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span className="text-sm font-medium">
                      {isPositive ? '+' : ''}{valuation?.marginOfSafety?.toFixed(1)}% margin of safety
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Market cap */}
            <p className="text-xs text-[#9aa0a6] dark:text-[#80868b] mt-1">
              {company.exchange === 'PRIVATE' ? (
                `Headquarters: ${company.country}`
              ) : (
                `Market Cap: ${formatLargeNumber(company.marketCap)} • ${company.country}`
              )}
            </p>
          </div>

          {/* Decision Badge & Actions */}
          <div className="flex flex-col items-start sm:items-end gap-2">
            <div className="flex items-center gap-2">
              <ReportPDF data={data} />
              <Badge variant={action.variant} className="flex items-center gap-1.5 text-sm px-3 py-1.5">
                {action.icon}
                {action.label}
              </Badge>
            </div>
            <p className="text-xs text-[#9aa0a6] dark:text-[#80868b]">
              Confidence: {decision.confidenceScore}% • {decision.timeHorizon}
            </p>
          </div>
        </div>
      </div>

      {/* ──────── Disclaimer ──────── */}
      <div className="p-3 rounded-lg bg-[#fef7e0] dark:bg-[#2d2a1e] border border-[#fdd663] dark:border-[#e37400]/40 text-[#5f6368] dark:text-[#fdd663] text-xs mb-6 flex items-start gap-2">
        <Shield className="w-4 h-4 text-[#e37400] dark:text-[#fdd663] flex-shrink-0 mt-0.5" />
        <span>{decision.disclaimer}</span>
      </div>

      {/* ──────── Two-Column Layout ──────── */}
      <div className="flex gap-6 flex-col lg:flex-row">
        {/* ── Main Content ── */}
        <div className="flex-1 min-w-0 space-y-5">
          {company.exchange !== 'PRIVATE' && (
            <InteractiveStockChart
              ticker={company.ticker}
              companyName={company.name}
              currency={company.currency}
              initialPrice={company.currentPrice}
            />
          )}

          <Tabs defaultValue="overview" className="w-full">
            <TabsList>
              <TabsTrigger value="overview" className="gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Overview
              </TabsTrigger>
              <TabsTrigger value="fundamentals" className="gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" /> Fundamentals
              </TabsTrigger>
              <TabsTrigger value="valuation" className="gap-1.5">
                <Calculator className="w-3.5 h-3.5" /> Valuation
              </TabsTrigger>
              <TabsTrigger value="sentiment" className="gap-1.5">
                <Brain className="w-3.5 h-3.5" /> Sentiment
              </TabsTrigger>
              <TabsTrigger value="geopolitics" className="gap-1.5">
                <Globe2 className="w-3.5 h-3.5" /> Geopolitics
              </TabsTrigger>
            </TabsList>

            {/* ── Overview ── */}
            <TabsContent value="overview" className="space-y-5">
              {/* Report */}
              <div className="border border-[#e0e0e0] dark:border-[#3c4043] rounded-xl overflow-hidden bg-white dark:bg-[#1e1e1e]">
                <div className="px-4 py-3 bg-[#f8f9fa] dark:bg-[#1e1e1e] border-b border-[#e0e0e0] dark:border-[#3c4043]">
                  <h3 className="text-sm font-semibold text-[#202124] dark:text-[#f1f3f4]">Investment Report</h3>
                </div>
                <div className="p-5">
                  <MarkdownRenderer content={decision.reasoning} />
                </div>
              </div>

              {/* Sources */}
              <div className="border border-[#e0e0e0] dark:border-[#3c4043] rounded-xl overflow-hidden bg-white dark:bg-[#1e1e1e]">
                <div className="px-4 py-3 bg-[#f8f9fa] dark:bg-[#1e1e1e] border-b border-[#e0e0e0] dark:border-[#3c4043]">
                  <h3 className="text-sm font-semibold text-[#202124] dark:text-[#f1f3f4]">Sources</h3>
                </div>
                <div className="divide-y divide-[#eeeeee] dark:divide-[#3c4043]">
                  {decision.sources.map((s, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5 hover:bg-[#f8f9fa] dark:hover:bg-[#202124]/40 transition-colors">
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 min-w-0 hover:underline cursor-pointer group"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-[#1a73e8] dark:text-[#8ab4f8] flex-shrink-0 group-hover:text-[#1557b0] dark:group-hover:text-[#adcbfa]" />
                        <span className="text-[13px] text-[#1a73e8] dark:text-[#8ab4f8] truncate group-hover:text-[#1557b0] dark:group-hover:text-[#adcbfa] font-medium">
                          {s.title}
                        </span>
                      </a>
                      <span className="text-xs text-[#9aa0a6] dark:text-[#80868b] flex-shrink-0 ml-3">
                        {(s.confidence * 100).toFixed(0)}% confidence
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* ── Fundamentals ── */}
            <TabsContent value="fundamentals" className="space-y-5">
              {fundamentals && (
                <>
                  <FinancialCharts fundamentals={fundamentals} companyName={company.name} currency={company.currency} />
                  <div className="border border-[#e0e0e0] dark:border-[#3c4043] rounded-xl overflow-hidden bg-white dark:bg-[#1e1e1e]">
                    <div className="px-4 py-3 bg-[#f8f9fa] dark:bg-[#1e1e1e] border-b border-[#e0e0e0] dark:border-[#3c4043]">
                      <h3 className="text-sm font-semibold text-[#202124] dark:text-[#f1f3f4]">
                        Fundamental Analysis
                        <span className="text-[#5f6368] dark:text-[#bdc1c6] font-normal ml-2">Score: {fundamentals.score}/100</span>
                      </h3>
                    </div>
                    <div className="p-5">
                      <MarkdownRenderer content={fundamentals.analysis} />
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* ── Valuation ── */}
            <TabsContent value="valuation" className="space-y-5">
              {valuation && (
                <>
                  <ScenarioAnalysis valuation={valuation} currency={company.currency} />
                  <div className="border border-[#e0e0e0] dark:border-[#3c4043] rounded-xl overflow-hidden bg-white dark:bg-[#1e1e1e]">
                    <div className="px-4 py-3 bg-[#f8f9fa] dark:bg-[#1e1e1e] border-b border-[#e0e0e0] dark:border-[#3c4043]">
                      <h3 className="text-sm font-semibold text-[#202124] dark:text-[#f1f3f4]">Valuation Analysis</h3>
                    </div>
                    <div className="p-5">
                      <MarkdownRenderer content={valuation.analysis} />
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* ── Sentiment ── */}
            <TabsContent value="sentiment" className="space-y-5">
              {sentiment && (
                <>
                  <SentimentGauge sentiment={sentiment} />
                  {/* News Feed */}
                  <div className="border border-[#e0e0e0] dark:border-[#3c4043] rounded-xl overflow-hidden bg-white dark:bg-[#1e1e1e]">
                    <div className="px-4 py-3 bg-[#f8f9fa] dark:bg-[#1e1e1e] border-b border-[#e0e0e0] dark:border-[#3c4043]">
                      <h3 className="text-sm font-semibold text-[#202124] dark:text-[#f1f3f4]">Recent News</h3>
                    </div>
                    <div className="divide-y divide-[#eeeeee] dark:divide-[#3c4043]">
                      {sentiment.newsItems.slice(0, 8).map((news, i) => (
                        <div key={i} className="px-4 py-3 hover:bg-[#f8f9fa] dark:hover:bg-[#202124]/40 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-[#202124] dark:text-[#f1f3f4] line-clamp-1">{news.headline}</p>
                              <p className="text-xs text-[#9aa0a6] dark:text-[#80868b] mt-0.5 line-clamp-1">{news.summary}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`text-xs font-medium ${
                                news.sentiment > 0.2 ? 'text-[#0d7d4d] dark:text-[#81c995]' :
                                news.sentiment < -0.2 ? 'text-[#c5221f] dark:text-[#f28b82]' :
                                'text-[#5f6368] dark:text-[#bdc1c6]'
                              }`}>
                                {news.sentiment > 0.2 ? '▲' : news.sentiment < -0.2 ? '▼' : '—'}
                              </span>
                              <span className="text-[11px] text-[#9aa0a6] dark:text-[#80868b]">{news.source}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="border border-[#e0e0e0] dark:border-[#3c4043] rounded-xl overflow-hidden bg-white dark:bg-[#1e1e1e]">
                    <div className="px-4 py-3 bg-[#f8f9fa] dark:bg-[#1e1e1e] border-b border-[#e0e0e0] dark:border-[#3c4043]">
                      <h3 className="text-sm font-semibold text-[#202124] dark:text-[#f1f3f4]">Mr. Market Analysis</h3>
                    </div>
                    <div className="p-5">
                      <MarkdownRenderer content={sentiment.analysis} />
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* ── Geopolitics ── */}
            <TabsContent value="geopolitics" className="space-y-5">
              {geopolitics && (
                <>
                  <RiskHeatmap geopolitics={geopolitics} />
                  {/* Opportunities */}
                  <div className="border border-[#e0e0e0] dark:border-[#3c4043] rounded-xl overflow-hidden bg-white dark:bg-[#1e1e1e]">
                    <div className="px-4 py-3 bg-[#f8f9fa] dark:bg-[#1e1e1e] border-b border-[#e0e0e0] dark:border-[#3c4043]">
                      <h3 className="text-sm font-semibold text-[#0d7d4d] dark:text-[#81c995]">Opportunities</h3>
                    </div>
                    <div className="divide-y divide-[#eeeeee] dark:divide-[#3c4043]">
                      {geopolitics.opportunities.map((opp, i) => (
                        <div key={i} className="flex items-start gap-2.5 px-4 py-3">
                          <CheckCircle className="w-4 h-4 text-[#34a853] dark:text-[#81c995] mt-0.5 flex-shrink-0" />
                          <p className="text-[13px] text-[#5f6368] dark:text-[#bdc1c6]">{opp}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="border border-[#e0e0e0] dark:border-[#3c4043] rounded-xl overflow-hidden bg-white dark:bg-[#1e1e1e]">
                    <div className="px-4 py-3 bg-[#f8f9fa] dark:bg-[#1e1e1e] border-b border-[#e0e0e0] dark:border-[#3c4043]">
                      <h3 className="text-sm font-semibold text-[#202124] dark:text-[#f1f3f4]">Geopolitical Analysis</h3>
                    </div>
                    <div className="p-5">
                      <MarkdownRenderer content={geopolitics.analysis} />
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* ── Sidebar ── */}
        <div className="lg:w-[320px] flex-shrink-0 space-y-5">
          {/* Key Statistics */}
          {fundamentals && (
            <MetricCards metrics={fundamentals.metrics} currency={company.currency} />
          )}

          {/* Graham Checklist Score */}
          {fundamentals && (
            <div className="border border-[#e0e0e0] dark:border-[#3c4043] rounded-xl overflow-hidden bg-white dark:bg-[#1e1e1e]">
              <div className="px-4 py-3 bg-[#f8f9fa] dark:bg-[#1e1e1e] border-b border-[#e0e0e0] dark:border-[#3c4043]">
                <h3 className="text-sm font-semibold text-[#202124] dark:text-[#f1f3f4]">
                  {company.exchange === 'PRIVATE' ? 'Venture Capital Checklist' : 'Graham Checklist'}
                </h3>
              </div>
              <div className="p-4">
                {/* Score circle */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative w-16 h-16">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#f1f3f4"
                        className="stroke-[#f1f3f4] dark:stroke-[#303134]"
                        strokeWidth="3"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke={fundamentals.score >= 70 ? '#0d7d4d' : fundamentals.score >= 50 ? '#e37400' : '#c5221f'}
                        strokeWidth="3"
                        strokeDasharray={`${fundamentals.score}, 100`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-[#202124] dark:text-[#f1f3f4]">
                      {fundamentals.score}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#202124] dark:text-[#f1f3f4]">
                      {fundamentals.score >= 70 ? 'Strong' : fundamentals.score >= 50 ? 'Moderate' : 'Weak'}
                    </p>
                    <p className="text-xs text-[#5f6368] dark:text-[#bdc1c6]">
                      {company.exchange === 'PRIVATE' ? (
                        fundamentals.score >= 70 ? 'Strong private fundamentals' :
                        fundamentals.score >= 50 ? 'Moderate private fundamentals' :
                        'Weak private fundamentals'
                      ) : (
                        fundamentals.score >= 70 ? 'Meets most Graham criteria' :
                        fundamentals.score >= 50 ? 'Partial Graham compliance' :
                        'Below Graham standards'
                      )}
                    </p>
                  </div>
                </div>

                {/* Checklist items */}
                <div className="space-y-2">
                  {fundamentals.grahamChecklist.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-[12px]">
                      {item.passed ? (
                        <CheckCircle className="w-3.5 h-3.5 text-[#34a853] dark:text-[#81c995] flex-shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-[#ea4335] dark:text-[#f28b82] flex-shrink-0" />
                      )}
                      <span className={item.passed ? 'text-[#202124] dark:text-[#f1f3f4]' : 'text-[#9aa0a6] dark:text-[#80868b]'}>
                        {item.criterion}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Sentiment Quick View */}
          {sentiment && (
            <div className="border border-[#e0e0e0] dark:border-[#3c4043] rounded-xl overflow-hidden bg-white dark:bg-[#1e1e1e]">
              <div className="px-4 py-3 bg-[#f8f9fa] dark:bg-[#1e1e1e] border-b border-[#e0e0e0] dark:border-[#3c4043]">
                <h3 className="text-sm font-semibold text-[#202124] dark:text-[#f1f3f4]">Sentiment Score</h3>
              </div>
              <div className="p-4 text-center">
                <div className="text-3xl font-light text-[#202124] dark:text-[#f1f3f4]">{sentiment.sentimentScore}</div>
                <div className="text-xs text-[#9aa0a6] dark:text-[#80868b]">out of 100</div>
                <div className="mt-2">
                  <Badge variant={
                    sentiment.sentimentScore > 60 ? 'success' :
                    sentiment.sentimentScore > 40 ? 'warning' : 'destructive'
                  }>
                    {sentiment.overallSentiment.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
