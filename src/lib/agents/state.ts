// ============================================
// Alladin – LangGraph Agent State Definition
// ============================================
// This file defines the shared, strongly-typed state that flows through every
// node of the LangGraph investment-analysis workflow. Each node reads from
// and writes to a specific subset of these fields.
// ============================================

/**
 * Core financial metrics derived from income statement, balance sheet
 * and cash-flow statement.  Graham-style ratios take priority.
 */
export interface FinancialMetrics {
  peRatio: number | null;
  pbRatio: number | null;
  eps: number | null;
  roe: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  freeCashFlow: number | null;
  profitMargin: number | null;
  revenueGrowth: number | null;
  dividendYield: number | null;
  marketCap: number | null;
  bookValuePerShare: number | null;
}

/**
 * Company profile – lightweight metadata that the Data Fetcher resolves
 * from the user-supplied query string.
 */
export interface CompanyProfile {
  name: string;
  ticker: string;
  exchange: string;
  industry: string;
  sector: string;
  country: string;
  currency: string;
  currentPrice: number;
  high52Week: number;
  low52Week: number;
  logo: string;
  weburl: string;
  marketCap: number;
}

/**
 * A single news item used by both the Sentiment and Geopolitics analysts.
 */
export interface NewsItem {
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: string;
  sentiment: number; // –1 to +1
}

/**
 * Output of the Fundamental Analyst node.
 */
export interface FundamentalAnalysis {
  metrics: FinancialMetrics;
  grahamChecklist: {
    criterion: string;
    passed: boolean;
    value: string;
    threshold: string;
  }[];
  highlights: string[];
  historicalData: {
    year: string;
    revenue: number;
    netIncome: number;
    eps: number;
  }[];
  score: number; // 0 – 100
  analysis: string; // LLM-generated markdown
}

/**
 * Output of the Sentiment Analyst node (Mr. Market).
 */
export interface SentimentAnalysis {
  overallSentiment: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';
  sentimentScore: number; // 0 – 100  (0 = extreme fear)
  newsItems: NewsItem[];
  socialMentions: { platform: string; sentiment: number; volume: number }[];
  analysis: string;
}

/**
 * Output of the Geopolitics & Macro Analyst node.
 */
export interface GeopoliticsAnalysis {
  risks: {
    factor: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    likelihood: 'low' | 'medium' | 'high';
    description: string;
  }[];
  opportunities: string[];
  macroIndicators: { name: string; value: string; impact: string }[];
  analysis: string;
}

/**
 * Output of the Valuation Expert node.
 */
export interface ValuationAnalysis {
  grahamValue: number | null;
  dcfValue: number | null;
  intrinsicValue: number | null;
  currentPrice: number;
  marginOfSafety: number | null; // percentage
  scenarios: {
    bull: { price: number; reasoning: string };
    base: { price: number; reasoning: string };
    bear: { price: number; reasoning: string };
  };
  analysis: string;
}

/**
 * Final output of the Decision Maker node.
 */
export interface InvestmentDecision {
  action: 'INVEST' | 'PASS' | 'WAIT_MONITOR';
  confidenceScore: number; // 0 – 100
  targetPrice: number | null;
  stopLoss: number | null;
  timeHorizon: string;
  reasoning: string; // Full markdown report
  sources: { title: string; url: string; confidence: number }[];
  disclaimer: string;
}

// ============================================
// Aggregate Agent State
// ============================================

/**
 * The master state object carried across every LangGraph node.
 * Each node writes to its own key; the Decision Maker reads all.
 */
export interface AgentState {
  // -- Input --
  query: string;

  // -- Data Fetcher output --
  company: CompanyProfile | null;
  rawFinancials: Record<string, unknown> | null;
  newsItems: NewsItem[];

  // -- Analyst outputs (written in parallel) --
  fundamentals: FundamentalAnalysis | null;
  sentiment: SentimentAnalysis | null;
  geopolitics: GeopoliticsAnalysis | null;
  valuation: ValuationAnalysis | null;

  // -- Final output --
  decision: InvestmentDecision | null;

  // -- Meta --
  scrapedUrls?: { title: string; url: string; confidence: number }[];
  errors: string[];
  status: 'idle' | 'fetching' | 'analyzing' | 'deciding' | 'complete' | 'error';
}

/**
 * Factory that produces a fresh initial state for every new analysis run.
 */
export function createInitialState(query: string): AgentState {
  return {
    query,
    company: null,
    rawFinancials: null,
    newsItems: [],
    fundamentals: null,
    sentiment: null,
    geopolitics: null,
    valuation: null,
    decision: null,
    scrapedUrls: [],
    errors: [],
    status: 'idle',
  };
}
