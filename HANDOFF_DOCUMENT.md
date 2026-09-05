# 🧞 Aladdin – Complete Project Handoff Document

> **Purpose**: This document gives a new LLM (or developer) full context to continue developing the Aladdin AI Investment Research Agent. It covers architecture, every file, data flow, prompt engineering, APIs, known issues, and future roadmap.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [Project Structure (Complete File Map)](#3-project-structure-complete-file-map)
4. [Architecture & Data Flow](#4-architecture--data-flow)
5. [Environment Variables](#5-environment-variables)
6. [Configuration Files](#6-configuration-files)
7. [Agent Pipeline (Backend Core)](#7-agent-pipeline-backend-core)
   - 7.1 [State Definition](#71-state-definition)
   - 7.2 [LLM Factory](#72-llm-factory)
   - 7.3 [Graph Orchestrator](#73-graph-orchestrator)
   - 7.4 [Node: Data Fetcher](#74-node-data-fetcher)
   - 7.5 [Node: Fundamental Analyst](#75-node-fundamental-analyst)
   - 7.6 [Node: Sentiment Analyst (Mr. Market)](#76-node-sentiment-analyst-mr-market)
   - 7.7 [Node: Geopolitics & Macro Analyst](#77-node-geopolitics--macro-analyst)
   - 7.8 [Node: Valuation Expert](#78-node-valuation-expert)
   - 7.9 [Node: Decision Maker](#79-node-decision-maker)
8. [Data Layer (API Clients)](#8-data-layer-api-clients)
   - 8.1 [finnhub.ts (Financial Data Scraper)](#81-finnhubts-financial-data-scraper)
   - 8.2 [search.ts (RAG / Web Search)](#82-searchts-rag--web-search)
9. [API Routes (Next.js Server)](#9-api-routes-nextjs-server)
10. [Frontend Components](#10-frontend-components)
11. [Design System & Styling](#11-design-system--styling)
12. [Prompt Engineering Reference](#12-prompt-engineering-reference)
13. [Known Issues & Technical Debt](#13-known-issues--technical-debt)
14. [How to Run](#14-how-to-run)
15. [Future Roadmap](#15-future-roadmap)

---

## 1. Project Overview

**Aladdin** is a production-grade, multi-agent AI investment research system inspired by Benjamin Graham's "The Intelligent Investor". Given any company name or ticker, it:

1. Resolves the ticker and fetches live financial data
2. Runs 4 parallel analyst agents (Fundamentals, Sentiment, Geopolitics, Valuation)
3. Synthesizes everything into a hedge-fund-quality investment report
4. Delivers a clear **INVEST / PASS** decision with Margin of Safety

**Built for**: InsideIIM × Altuni AI Labs Take-Home Assignment.

### Key Differentiators
- Supports both **public companies** (US + Indian markets) and **private/unlisted companies**
- **Zero-API-key mode**: Works with comprehensive mock data when keys are missing
- **Real-time data scraping**: Scrapes Google Finance, Yahoo Finance, Screener.in, StockAnalysis.com for live data (no paid API dependency for financial data)
- **Session-aware chat**: Follow-up Q&A about any generated report
- **PDF export**: Browser print API for clean styled reports

---

## 2. Tech Stack & Dependencies

### Core

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js | 16.2.9 |
| Language | TypeScript | 5.x |
| React | React | 19.2.4 |
| Styling | Tailwind CSS | 4.x |
| UI Primitives | Radix UI | Latest |
| Charts | Recharts | 3.8.1 |

### AI & Data

| Library | Version | Purpose |
|---------|---------|---------|
| `@langchain/core` | ^0.3.80 | LangChain core types and interfaces |
| `@langchain/langgraph` | ^0.2.74 | Graph orchestration (imported but not used for compilation — see notes) |
| `@langchain/openai` | ^0.5.18 | ChatOpenAI wrapper for GPT-4o / GPT-4o-mini |
| `langchain` | ^0.3.37 | LangChain base library |
| `axios` | ^1.18.1 | HTTP client for all API calls and web scraping |

### UI Libraries

| Library | Purpose |
|---------|---------|
| `@radix-ui/react-tabs` | Tab components |
| `@radix-ui/react-dialog` | Modal dialogs |
| `@radix-ui/react-progress` | Progress bars |
| `@radix-ui/react-tooltip` | Tooltips |
| `@radix-ui/react-slot` | Slot pattern for component composition |
| `lucide-react` | Icon library |
| `class-variance-authority` | Variant-based styling (cva) |
| `clsx` + `tailwind-merge` | Conditional class merging |
| `date-fns` | Date formatting |

### Dev Dependencies

| Library | Purpose |
|---------|---------|
| `@tailwindcss/postcss` | Tailwind v4 PostCSS plugin |
| `eslint` + `eslint-config-next` | Linting |
| `typescript` | Type checking |

### Important Note on `@langchain/langgraph`
The project imports `@langchain/langgraph` but does **NOT** use its graph compilation feature due to version compatibility challenges. Instead, the pipeline uses a manual `Promise.all` fan-out pattern in `graph.ts`. The dependency is kept for potential future migration.

---

## 3. Project Structure (Complete File Map)

```
Alladin/
├── .env                         # Active environment variables (gitignored)
├── .env.example                 # Template with all supported env vars
├── .gitignore
├── AGENTS.md                    # Agent rules for AI coding assistants
├── CLAUDE.md                    # Claude-specific instructions (minimal)
├── README.md                    # Project documentation
├── eslint.config.mjs            # ESLint v9 flat config with Next.js presets
├── next.config.ts               # Next.js config (serverExternalPackages, bodySize)
├── package.json                 # Dependencies and scripts
├── postcss.config.mjs           # Tailwind v4 PostCSS setup
├── tsconfig.json                # TypeScript config (ES2017 target, bundler resolution)
├── llm_chat_transcript.md       # LLM conversation logs (for assignment submission)
│
├── public/                      # Static assets
│   └── favicon.ico
│
└── src/
    ├── app/
    │   ├── layout.tsx           # Root layout (dark mode, Google Fonts: Aladin)
    │   ├── page.tsx             # Main page (state machine: search→loading→result→error)
    │   ├── globals.css          # Design system (CSS vars, animations, prose styles)
    │   ├── favicon.ico
    │   └── api/
    │       ├── analyze/route.ts # POST /api/analyze — runs full pipeline
    │       ├── chat/route.ts    # POST /api/chat — follow-up Q&A with session memory
    │       ├── chart/route.ts   # GET /api/chart — Yahoo Finance historical chart data
    │       ├── diag/route.ts    # GET /api/diag — environment diagnostics (debug)
    │       └── quotes/route.ts  # GET /api/quotes — live prices for popular stocks
    │
    ├── components/
    │   ├── SearchSection.tsx         # Google-style search bar + popular stock picks
    │   ├── ChatSidebar.tsx           # Floating chat panel (follow-up questions)
    │   ├── ReportPDF.tsx             # PDF export via browser print API
    │   ├── dashboard/
    │   │   ├── DashboardLayout.tsx   # Main results layout (header + tabs + sidebar)
    │   │   ├── MetricCards.tsx        # Key financial metric cards
    │   │   ├── FinancialCharts.tsx   # Revenue/EPS bar charts + Graham radar chart
    │   │   ├── InteractiveStockChart.tsx # Live stock price chart (1D→MAX ranges)
    │   │   ├── SentimentGauge.tsx    # Semicircle sentiment gauge (Fear→Greed)
    │   │   ├── RiskHeatmap.tsx       # Geopolitical risk severity grid
    │   │   └── ScenarioAnalysis.tsx  # Bull/Base/Bear scenario cards
    │   └── ui/
    │       ├── badge.tsx            # Badge with invest/pass/wait variants
    │       ├── button.tsx           # Button component (cva-based)
    │       ├── card.tsx             # Card component
    │       ├── input.tsx            # Input component
    │       ├── tabs.tsx             # Tabs (Radix-based)
    │       └── markdown-renderer.tsx # Markdown→HTML renderer (regex-based, no remark)
    │
    └── lib/
        ├── utils.ts                 # Helpers: cn(), formatCurrency(), formatLargeNumber(), etc.
        ├── agents/
        │   ├── state.ts             # TypeScript interfaces for entire pipeline state
        │   ├── llm.ts               # LLM factory (auto-detects OpenAI vs Groq from key)
        │   ├── graph.ts             # Pipeline orchestrator (sequential + Promise.all)
        │   └── nodes/
        │       ├── fetcher.ts       # Node 1: Ticker resolution + data fetching
        │       ├── fundamentals.ts  # Node 2: Graham checklist + LLM analysis
        │       ├── sentiment.ts     # Node 3: Mr. Market sentiment scoring + LLM
        │       ├── geopolitics.ts   # Node 4: Macro risks via RAG + LLM
        │       ├── valuation.ts     # Node 5: Graham Formula + DCF + scenarios
        │       └── decision.ts      # Node 6: Final INVEST/PASS synthesis
        └── api/
            ├── finnhub.ts           # Financial data scraper (Google Finance, Yahoo, Screener.in, StockAnalysis.com)
            ├── search.ts            # Web search (Tavily API + Google News RSS scraper)
            └── print_screener_keys.js # Debug utility script
```

---

## 4. Architecture & Data Flow

### High-Level Pipeline

```
User Query ("Apple", "Reliance", "TSLA")
        │
        ▼
┌──────────────────┐
│  /api/analyze     │  ← Next.js API Route (POST)
│  (route.ts)       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  graph.ts         │  ← Pipeline Orchestrator
│  runInvestment-   │
│  Analysis()       │
└────────┬─────────┘
         │
    ┌────┴────┐
    │ STEP 1  │
    ▼         │
┌──────────┐  │
│ Fetcher  │  │  Resolves ticker, scrapes profile, metrics, news
│ Node     │  │  Sources: Yahoo Search → Google Finance → Screener.in/StockAnalysis
└────┬─────┘  │
     │        │
     │   ┌────┴──────────────────────────────────┐
     │   │           STEP 2 (PARALLEL)            │
     │   │  Promise.all([fund, sent, geo, val])  │
     │   └────┬──────┬──────┬──────┬─────────────┘
     │        │      │      │      │
     ▼        ▼      ▼      ▼      ▼
┌────────┐ ┌──────┐ ┌────┐ ┌──────┐
│Fundmntl│ │Sntmnt│ │Geo │ │Valtn │
│ Node   │ │ Node │ │Node│ │ Node │
└────┬───┘ └──┬───┘ └─┬──┘ └──┬───┘
     │        │       │       │
     └────────┴───────┴───────┘
                │
           ┌────┴────┐
           │ STEP 3  │
           ▼         │
      ┌──────────┐   │
      │ Decision │   │  Reads ALL analyst outputs
      │ Node     │   │  Outputs: INVEST / PASS + full report
      └────┬─────┘   │
           │         │
           ▼
    ┌──────────────┐
    │ AgentState    │  ← Complete result returned to frontend
    │ (full JSON)   │
    └──────────────┘
```

### Data Flow Detail

1. **User types query** → `page.tsx` calls `POST /api/analyze` with `{ query }`
2. **API route** calls `runInvestmentAnalysis(query)` from `graph.ts`
3. **Fetcher node**:
   - Calls `searchTicker()` → Yahoo Finance search API
   - Calls `fetchCompanyProfile()` → scrapes Google Finance HTML
   - Calls `fetchFinancialMetrics()` → scrapes Google Finance + Screener.in (India) or StockAnalysis.com (US) + Yahoo quoteSummary
   - Calls `fetchHistoricalFinancials()` → scrapes Screener.in P&L or StockAnalysis financials
   - Calls `fetchCompanyNews()` → scrapes Google News RSS feed
   - For private companies: uses Tavily web search + LLM to extract company profile
4. **Analyst nodes** (run in parallel via `Promise.all`):
   - Each reads from shared state (company profile, metrics, news)
   - Each calls `createLLM()` to get a ChatOpenAI instance
   - Each sends a crafted prompt to the LLM
   - Each has a `generateFallback*()` function if LLM fails
5. **Decision node**: Reads all 4 analyst outputs, computes composite score, generates final report via LLM
6. **Frontend receives `AgentState`** → renders DashboardLayout with tabs

---

## 5. Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | **Recommended** | — | OpenAI API key (starts with `sk-`) or Groq key (starts with `gsk_`) |
| `LLM_MODEL` | No | `gpt-4o-mini` (OpenAI) / `llama-3.3-70b-versatile` (Groq) | Model name |
| `OPENAI_BASE_URL` | No | Auto-detected | Override for compatible API providers |
| `MOCK_MODE` | No | `false` | If `true`, skips API calls entirely |
| `FINNHUB_API_KEY` | No | — | Finnhub API key (currently unused — data comes from scraping) |
| `TAVILY_API_KEY` | No | — | Tavily API for web search RAG |
| `ALPHA_VANTAGE_API_KEY` | No | — | Alpha Vantage (currently unused) |
| `CORPORATE_BOND_YIELD` | No | `4.4` | AAA bond yield for Graham formula |

### Important Notes
- **Without `OPENAI_API_KEY`**: All LLM calls fail gracefully → fallback text analysis is used. The app still works but quality is reduced.
- **Without `TAVILY_API_KEY`**: Falls back to Google News RSS scraping for search results.
- **Finnhub key is in `.env.example` but the code no longer uses the Finnhub API directly** — it was replaced by direct scraping of Google Finance, Yahoo Finance, Screener.in, and StockAnalysis.com.
- The `.env.example` file **contains real API keys** — these should be rotated if the repo is made public.

---

## 6. Configuration Files

### `next.config.ts`
- **`serverExternalPackages`**: LangChain packages are excluded from client bundles (they are server-only)
- **`experimental.serverActions.bodySizeLimit`**: Set to `2mb` to handle large analysis payloads

### `tsconfig.json`
- Target: ES2017
- Module resolution: `bundler`
- Path alias: `@/*` → `./src/*`
- JSX: `react-jsx` (React 19 automatic runtime)

### `postcss.config.mjs`
- Uses `@tailwindcss/postcss` (Tailwind v4 native CSS integration — no `tailwind.config.ts` needed)

### `eslint.config.mjs`
- ESLint v9 flat config
- Uses `eslint-config-next` with core-web-vitals and TypeScript rules

---

## 7. Agent Pipeline (Backend Core)

### 7.1 State Definition
**File**: `src/lib/agents/state.ts`

This is the **central contract** of the pipeline. Every node reads from and writes to this interface.

```typescript
interface AgentState {
  query: string;                              // User's input
  company: CompanyProfile | null;             // Fetcher output
  rawFinancials: Record<string, unknown> | null;  // Fetcher output (metrics + historicalData)
  newsItems: NewsItem[];                      // Fetcher output
  fundamentals: FundamentalAnalysis | null;   // Fundamentals node output
  sentiment: SentimentAnalysis | null;        // Sentiment node output
  geopolitics: GeopoliticsAnalysis | null;    // Geopolitics node output
  valuation: ValuationAnalysis | null;        // Valuation node output
  decision: InvestmentDecision | null;        // Decision node output
  scrapedUrls?: { title: string; url: string; confidence: number }[];
  errors: string[];
  status: 'idle' | 'fetching' | 'analyzing' | 'deciding' | 'complete' | 'error';
}
```

**Key sub-interfaces**:
- `FinancialMetrics`: P/E, P/B, EPS, ROE, D/E, current ratio, FCF, margins, growth, dividend yield, market cap, book value
- `CompanyProfile`: name, ticker, exchange, industry, sector, country, currency, price, 52-week range, logo, weburl
- `FundamentalAnalysis`: metrics, grahamChecklist[], highlights[], historicalData[], score (0-100), analysis (markdown)
- `SentimentAnalysis`: overallSentiment (enum), sentimentScore (0-100), newsItems[], socialMentions[], analysis
- `GeopoliticsAnalysis`: risks[] (factor, severity, likelihood, description), opportunities[], macroIndicators[], analysis
- `ValuationAnalysis`: grahamValue, dcfValue, intrinsicValue, currentPrice, marginOfSafety, scenarios (bull/base/bear), analysis
- `InvestmentDecision`: action (INVEST|PASS|WAIT_MONITOR), confidenceScore, targetPrice, stopLoss, timeHorizon, reasoning (full markdown report), sources[], disclaimer

### 7.2 LLM Factory
**File**: `src/lib/agents/llm.ts`

- `createLLM(opts?)`: Returns `ChatOpenAI | null`
- Auto-detects provider from API key prefix:
  - `gsk_*` → Groq (base URL: `https://api.groq.com/openai/v1`, model: `llama-3.3-70b-versatile`)
  - `sk-*` → OpenAI (default model: `gpt-4o-mini`)
- `isLLMAvailable()`: Returns `boolean` — checks if `OPENAI_API_KEY` env var is set
- Defaults: `temperature: 0.3`, `maxTokens: 1200`

### 7.3 Graph Orchestrator
**File**: `src/lib/agents/graph.ts`

- `runInvestmentAnalysis(query, onProgress?)`: Main entry point
- **Execution flow**:
  1. Creates initial state via `createInitialState(query)`
  2. Runs `dataFetcherNode(state)` — sequential, must complete first
  3. If fetcher fails or returns error status → abort
  4. Runs 4 analyst nodes in parallel via `Promise.all` wrapped in `safeRun()`
  5. Merges all analyst outputs + scraped URLs into state
  6. Runs `decisionNode(state)` — sequential, reads everything
  7. Returns final `AgentState`
- **`safeRun(name, fn)`**: try/catch wrapper that prevents one analyst failure from crashing the pipeline. Returns partial state with error message on failure.
- **`onProgress` callback**: Optional, used for UI loading steps (not currently connected end-to-end since the API is not streaming)

### 7.4 Node: Data Fetcher
**File**: `src/lib/agents/nodes/fetcher.ts`

**Reads**: `state.query`
**Writes**: `company`, `rawFinancials`, `newsItems`, `scrapedUrls`, `errors`, `status`

**Logic**:
1. Calls `searchTicker(query)` — resolves to ticker symbol
2. If ticker not found → treats as **private company**:
   - Searches web for company profile
   - Uses LLM to determine if real company exists (outputs JSON with `exists: true/false`)
   - If exists: extracts country, industry, sector, weburl, currency, marketCap
   - If not exists: returns error state
3. If ticker found → **public company**:
   - Calls `fetchCompanyProfile(ticker)`
   - Adds Google Finance, Screener.in/StockAnalysis.com URLs to `scrapedUrls`
4. Calls `fetchFinancialMetrics(ticker)` → returns `FinancialMetrics`
5. Calls `fetchHistoricalFinancials(ticker)` → returns yearly revenue/netIncome/EPS array
6. Calls `fetchCompanyNews(ticker)` → scrapes Google News RSS
7. Stores `rawFinancials` as `{ metrics, historicalData }`

### 7.5 Node: Fundamental Analyst
**File**: `src/lib/agents/nodes/fundamentals.ts`

**Reads**: `company`, `rawFinancials`
**Writes**: `fundamentals`

**Logic**:
1. Extracts `FinancialMetrics` from `rawFinancials.metrics`
2. Builds Graham's 10-point Defensive Investor Checklist:
   - Adequate Size (Market Cap > $2B)
   - Strong Financial Condition (Current Ratio > 2.0)
   - Earnings Stability (Positive EPS)
   - Dividend Record (Yield > 0%)
   - Earnings Growth (Revenue Growth > 0%)
   - Moderate P/E (< 20)
   - Moderate P/B (< 2.5)
   - Conservative Debt (D/E < 1.0)
   - Positive Free Cash Flow
   - Healthy Profit Margin (> 5%)
3. For private companies: uses a 5-point VC/PE checklist instead (digital presence, geography, industry, news, funding)
4. Generates highlights based on metric thresholds
5. Sends prompt to LLM for qualitative analysis
6. Falls back to `generateFallbackAnalysis()` if LLM fails
7. Uses historical data from `rawFinancials.historicalData` or generates fallback

### 7.6 Node: Sentiment Analyst (Mr. Market)
**File**: `src/lib/agents/nodes/sentiment.ts`

**Reads**: `company`, `newsItems`
**Writes**: `sentiment`, `scrapedUrls`

**Logic**:
1. Searches web for `${name} stock market sentiment Reddit Twitter...`
2. Computes raw sentiment from news item sentiment scores (average)
3. Generates mock social media mentions (Reddit, Twitter, StockTwits) — **these are randomized, not real**
4. Weighted sentiment formula: `news (40%) + social (30%) + search (30%, assumed 0.5)`
5. Maps to 0-100 score and classifies: extreme_fear / fear / neutral / greed / extreme_greed
6. Sends Mr. Market prompt to LLM
7. Falls back to `generateFallbackSentiment()` if LLM fails

**⚠️ Known Issue**: Social media mentions are mock/random data. This is clearly noted in the code.

### 7.7 Node: Geopolitics & Macro Analyst
**File**: `src/lib/agents/nodes/geopolitics.ts`

**Reads**: `company`, `newsItems`
**Writes**: `geopolitics`, `scrapedUrls`

**Logic**:
1. Sends 3 parallel search queries via `searchWeb()`:
   - Company-specific geopolitical risks
   - Sector-level government policies
   - Global macro outlook
2. Builds macro indicators based on country:
   - **India**: RBI Repo Rate, CPI, INR/USD, GDP Growth, FDI
   - **US/Other**: Fed Funds Rate, CPI, 10Y Treasury, GDP, VIX
   - **Note**: These are **hardcoded values**, not live-fetched
3. Sends structured prompt to LLM requesting JSON output with `risks`, `opportunities`, `analysis`
4. Parses JSON from LLM response (handles markdown code blocks)
5. Falls back to default risks/opportunities if parsing fails

### 7.8 Node: Valuation Expert
**File**: `src/lib/agents/nodes/valuation.ts`

**Reads**: `company`, `rawFinancials`
**Writes**: `valuation`

**Models implemented**:

#### Graham's Revised Formula
```
V = EPS × (8.5 + 2g) × 4.4 / Y

Where:
- EPS = trailing twelve months earnings per share
- 8.5 = P/E for zero-growth company (Graham's constant)
- g = expected growth rate (capped at 15%)
- 4.4 = 1962 AAA bond yield baseline
- Y = current AAA bond yield (from CORPORATE_BOND_YIELD env, default 4.4)
```

#### Simplified DCF
- Projects FCF for 10 years with fading growth rate
- Years 1-5: high growth rate (capped at 20%)
- Years 6-10: fade rate (50% of high growth)
- Terminal value via Gordon Growth Model (2.5% perpetual growth)
- Discount rate: 10% (hardcoded WACC assumption)
- **Note**: The actual per-share DCF calculation uses a simplified scaling formula (`fcf * growthMultiple * 15`), not a full shares-outstanding-based model

#### Margin of Safety
```
MoS = (Intrinsic Value - Current Price) / Intrinsic Value × 100%
```
- Intrinsic Value = 50/50 blend of Graham and DCF values
- Graham recommends ≥ 30% for defensive investors

#### Scenario Analysis
- **Bull**: intrinsicValue × (1.3 + growth), assumes accelerating growth
- **Base**: intrinsicValue, continuation of current trajectory
- **Bear**: intrinsicValue × 0.65, assumes deceleration + compression
- For private companies: uses 15x/10x/5x revenue multiples

### 7.9 Node: Decision Maker
**File**: `src/lib/agents/nodes/decision.ts`

**Reads**: ALL analyst outputs
**Writes**: `decision`, `status`

**Decision Logic**:
1. **Composite Score** (weighted):
   - Fundamentals: 35%
   - Valuation (Margin of Safety): 30%
   - Sentiment: 20%
   - Geopolitics (inverse risk): 15%
2. **Fallback action**: INVEST if composite ≥ 45 AND MoS ≥ -5%, else PASS
3. **LLM Report Generation**: Sends comprehensive prompt with all analyst summaries
   - Explicitly instructs: only output INVEST or PASS (no WAIT)
   - Includes caution language if geopolitical risks are high but decision is INVEST
4. **Action extraction**: Regex-matches `## Decision: **INVEST**` or `## Decision: **PASS**` from LLM output
5. **Sources deduplication**: Collects all `scrapedUrls` from pipeline, deduplicates by URL, sorts by confidence, takes top 8
6. **Stop loss**: Set at 85% of current price
7. **Time horizon**: "12-18 months (Graham long-term value)" for INVEST

---

## 8. Data Layer (API Clients)

### 8.1 finnhub.ts (Financial Data Scraper)
**File**: `src/lib/api/finnhub.ts` (867 lines)

**Despite the filename, this file does NOT use the Finnhub API.** It was originally built around Finnhub but was migrated to web scraping to avoid API rate limits and 401 errors.

#### Functions:

| Function | Purpose | Data Sources |
|----------|---------|-------------|
| `searchTicker(query)` | Resolves company name → ticker symbol | Yahoo Finance Search API (`/v1/finance/search`) + local fallback map |
| `fetchCompanyProfile(ticker)` | Gets company name, price, exchange, industry, sector, country, market cap | Google Finance HTML scraping + Yahoo Quote API + Yahoo quoteSummary (assetProfile) |
| `fetchFinancialMetrics(ticker)` | Gets P/E, P/B, EPS, ROE, D/E, current ratio, FCF, margins, growth | Google Finance + Screener.in (India) / StockAnalysis.com (US) + Yahoo Quote + quoteSummary |
| `fetchHistoricalFinancials(ticker)` | Gets 5-year revenue, net income, EPS history | Screener.in P&L table (India) / StockAnalysis.com financials (US) |
| `fetchCompanyNews(ticker)` | Gets recent news articles | Google News RSS feed |
| `mapTickerToGoogleFinance(ticker)` | Converts Yahoo format → Google format | e.g., `RELIANCE.NS` → `RELIANCE:NSE` |

#### Scraping Functions (Internal):

| Function | Target | Technique |
|----------|--------|-----------|
| `scrapeGoogleFinance(ticker)` | Google Finance page | Regex-based HTML parsing (price from `jsname="Pdsbrc"`, stats from `class="SwQK7"` / `class="dO6ijd"`) |
| `scrapeScreener(ticker)` | Screener.in | Parses ratio sidebar + balance sheet table + P&L table |
| `scrapeStockAnalysis(ticker)` | StockAnalysis.com `/statistics/` | Parses HTML table rows |
| `scrapeStockAnalysisFinancials(ticker)` | StockAnalysis.com `/financials/` | Parses financial statement tables |
| `fetchQuote(ticker)` | Yahoo Finance v7 quote API | Direct API call |
| `fetchQuoteSummary(ticker, modules)` | Yahoo Finance v10 quoteSummary | Direct API call for assetProfile, financialData, defaultKeyStatistics |

#### Ticker Resolution Fallback Map:
Hardcoded mappings for common companies:
```
'adani power' → 'ADANIPOWER.NS'
'reliance' → 'RELIANCE.NS'
'apple' → 'AAPL'
'tesla' → 'TSLA'
'microsoft' → 'MSFT'
'google' → 'GOOGL'
'nvidia' → 'NVDA'
... and more
```

#### Market Cap Parsing:
Handles multiple formats: `1.27LCr` (Lakh Crore), `500Cr`, `3.25T`, `150B`, `800M`

### 8.2 search.ts (RAG / Web Search)
**File**: `src/lib/api/search.ts` (187 lines)

#### Functions:

| Function | Purpose |
|----------|---------|
| `searchWeb(query, maxResults)` | Primary search function — tries Tavily, then Google News RSS + article scraping, then mock |
| `scrapeArticleText(url)` | Scrapes `<p>` paragraph text from any URL (for RAG context) |

#### Search Resolution Order:
1. **Tavily API** (if `TAVILY_API_KEY` is set and valid): Advanced search, returns title + url + content
2. **Google News RSS scraper**: Fetches RSS feed → extracts items → **scrapes each article URL** for paragraph text (true RAG)
3. **Mock results**: Returns hardcoded search results with sector-specific variations (India stocks, EV, AI/tech)

---

## 9. API Routes (Next.js Server)

### `POST /api/analyze` (`src/app/api/analyze/route.ts`)
- **Input**: `{ query: string }`
- **Output**: `{ success: true, data: AgentState }` or `{ error: string }`
- **Timeout**: `maxDuration = 120` (2 minutes for Vercel)
- Calls `runInvestmentAnalysis(query)` and returns the full state

### `POST /api/chat` (`src/app/api/chat/route.ts`)
- **Input**: `{ message: string, sessionId?: string, context?: string }`
- **Output**: `{ reply: string, sessionId: string }`
- Uses **in-memory session store** (`Map<string, {messages, context}>`)
- System prompt sets Aladdin persona as Graham-style investment advisor
- Context is the last analysis report (capped at 2000 chars)
- Keeps last 20 messages per session (plus system message)
- Falls back to `generateFallbackReply()` — a regex-based section extractor that matches question keywords to report sections
- **⚠️ Sessions are lost on server restart** (in-memory only)

### `GET /api/chart` (`src/app/api/chart/route.ts`)
- **Input**: `?ticker=AAPL&range=1m`
- **Output**: `{ ticker, currency, exchange, previousClose, regularMarketPrice, points: [{time, close}] }`
- **Data source**: Yahoo Finance v8 chart API
- Supported ranges: `1d` (5m intervals), `5d` (30m), `1m` (1d), `6m`, `ytd`, `1y`, `5y` (1wk), `max` (1mo)
- Interpolates null price values
- `dynamic = 'force-dynamic'`

### `GET /api/diag` (`src/app/api/diag/route.ts`)
- Debug endpoint — shows which env vars are configured (masked)
- Shows key existence, length, prefix, suffix (for debugging Vercel deployments)

### `GET /api/quotes` (`src/app/api/quotes/route.ts`)
- Returns live prices + daily changes for 8 popular stocks
- Scrapes Google Finance for each ticker
- `revalidate = 60` (cache for 60 seconds)
- Falls back to hardcoded default prices if scraping fails
- Popular companies: Apple, Tesla, Reliance, Microsoft, NVIDIA, SpaceX, Google, Amazon

---

## 10. Frontend Components

### Page State Machine (`src/app/page.tsx`)
```
search → loading → result
                 → error → search (reset)
```
- **search**: Shows `SearchSection`
- **loading**: Shows 6-step animated progress (3s per step, purely cosmetic — doesn't reflect actual pipeline progress)
- **result**: Shows `DashboardLayout` + `ChatSidebar`
- **error**: Shows error message with "Try again" button

### SearchSection (`src/components/SearchSection.tsx`)
- Google Finance-style search bar
- Popular stock picks grid (2×4 on desktop)
- Fetches live prices from `/api/quotes` on mount
- Clicking a stock pick immediately triggers analysis

### DashboardLayout (`src/components/dashboard/DashboardLayout.tsx`)
- **Stock header**: Company name, ticker, exchange, industry, large price display, MoS indicator, decision badge
- **Disclaimer banner**: Yellow warning about educational purpose
- **Two-column layout**: Main content (left) + sidebar stats (right)
- **5 tabs**: Overview, Fundamentals, Valuation, Sentiment, Geopolitics
- Each tab renders specific sub-components + markdown analysis from LLM

### InteractiveStockChart (`src/components/dashboard/InteractiveStockChart.tsx`)
- Recharts-based area chart
- Range selector: 1D, 5D, 1M, 6M, YTD, 1Y, 5Y, MAX
- Tooltip with date/time + price
- Color changes based on gain/loss (green/red)
- Fetches from `/api/chart`

### FinancialCharts (`src/components/dashboard/FinancialCharts.tsx`)
- Bar chart: Revenue & Net Income over 5 years (Recharts)
- Radar chart: Graham metrics (P/E, P/B, D/E, Current Ratio, ROE, Margin) normalized to 0-100

### SentimentGauge (`src/components/dashboard/SentimentGauge.tsx`)
- SVG semicircle gauge (Fear → Greed spectrum)
- Color gradient: red → orange → yellow → green
- Social media mentions table below

### RiskHeatmap (`src/components/dashboard/RiskHeatmap.tsx`)
- Grid of risk cards with severity coloring
- Macro indicators table
- Severity levels: low (blue) → medium (yellow) → high (orange) → critical (red)

### ScenarioAnalysis (`src/components/dashboard/ScenarioAnalysis.tsx`)
- 3 cards: Bull 🐂, Base 📊, Bear 🐻
- Shows price target + upside/downside percentage
- Includes reasoning text for each scenario

### ChatSidebar (`src/components/ChatSidebar.tsx`)
- Floating chat bubble (bottom-right)
- Slide-up panel with chat messages
- Pre-populated quick questions: "Is this safe for defensive investors?", "What are the key risks?", "Should I wait for a dip?"
- Sends to `/api/chat` with report context

### ReportPDF (`src/components/ReportPDF.tsx`)
- Opens new browser window with styled HTML
- Auto-triggers `window.print()` for Save as PDF
- Includes metrics grid, full report, fundamental + valuation analysis, scenarios, sources, disclaimer

### MarkdownRenderer (`src/components/ui/markdown-renderer.tsx`)
- **Does NOT use remark/rehype** — uses regex-based Markdown→HTML conversion
- Handles: headers (h1-h6), bold, italic, inline code, code blocks, links, lists (ordered + unordered), tables, blockquotes, horizontal rules, paragraphs
- Renders via `dangerouslySetInnerHTML`

---

## 11. Design System & Styling

### Theme System (CSS Custom Properties)
Defined in `src/app/globals.css`, the app uses CSS variables for theming:

**Light Mode** (default):
```css
--background: #ffffff
--surface: #f8f9fa
--text-primary: #202124
--text-secondary: #5f6368
--accent: #1a73e8
--positive: #0d7d4d
--negative: #c5221f
--warning: #e37400
```

**Dark Mode** (`.dark` class on `<html>`):
```css
--background: #121212
--surface: #1e1e1e
--text-primary: #f1f3f4
--accent: #8ab4f8
--positive: #81c995
--negative: #f28b82
--warning: #fdd663
```

### Design Inspiration
- **Google Finance**: Clean, minimal stock pages with stat grids
- **Yahoo Finance**: Tabbed layout, two-column design
- Always dark mode by default (`<html lang="en" className="dark">` in `layout.tsx`)

### Custom Animations
- `fade-in`: 0.3s opacity
- `slide-up`: 0.4s opacity + translateY
- `shimmer`: Skeleton loading effect
- `pulse-dot`: Chat typing indicator

### Font Stack
- Body: `Inter`, `Google Sans`, system-ui
- Brand name "Aladdin": `Aladin` Google Font (decorative)

---

## 12. Prompt Engineering Reference

### Fundamentals Node Prompt
**Role**: Value investor following Benjamin Graham
**Input**: Financial metrics, Graham checklist results
**Output**: 4-5 paragraph analysis covering financial health, Graham criteria, earnings quality, risks, investor classification

### Sentiment Node Prompt
**Role**: Mr. Market analyst (Graham's allegory)
**Input**: Company info, sentiment score, news context, search insights, social mentions
**Output**: 3-4 paragraph analysis of market mood, crowd psychology, Graham's advice, behavioral biases

### Geopolitics Node Prompt
**Role**: Geopolitical and macroeconomic risk analyst
**Input**: Company info, search intelligence, negative news, macro indicators
**Output**: **Structured JSON** with `risks[]`, `opportunities[]`, `analysis` (markdown)

### Valuation Node Prompt
**Role**: Valuation expert following Graham
**Input**: Company + price, Graham/DCF values, margin of safety, key inputs, scenarios
**Output**: 3-4 paragraph analysis of Graham formula, DCF, margin of safety, risk-reward

### Decision Node Prompt
**Role**: Senior hedge fund manager and Graham disciple
**Input**: All analyst reports summaries, scores, scenarios
**Output**: Full investment report structured as:
1. Executive Summary (with caution if threats present)
2. Decision: INVEST or PASS (strictly binary)
3. Key Reasoning (5 Graham criteria)
4. Risk-Reward Assessment
5. Conditions & Triggers
6. Sources & Confidence

### Private Company Prompts
All nodes have alternate prompts for private/unlisted companies that use VC/PE terminology instead of public market metrics.

### Fetcher LLM Prompt (Private Company Validation)
**Role**: Business research analyst
**Input**: Search results about the queried company
**Output**: JSON with `exists: true/false` + profile fields or explanation

---

## 13. Known Issues & Technical Debt

### Critical

1. **API keys exposed in `.env.example`**: Real API keys are committed in the `.env.example` file. These must be rotated.

2. **Social media sentiment is fake**: The `sentiment.ts` node generates random mock social media data (`Math.random()`). This appears in the UI as real data without any disclaimer.

3. **Macro indicators are hardcoded**: The geopolitics node uses static hardcoded values for Fed Funds Rate, CPI, etc. They are not fetched live.

4. **DCF model is simplified**: The per-share DCF calculation uses `fcf * growthMultiple * 15` rather than a proper shares-outstanding-based discounted cash flow.

5. **Chat sessions are in-memory**: All chat sessions are lost on server restart. A `Map` in-memory store is used.

### Medium

6. **Web scraping is fragile**: The Google Finance scraper relies on specific CSS class names (`SwQK7`, `dO6ijd`, `jsname="Pdsbrc"`) that can break with any Google UI update.

7. **No streaming**: The analysis takes 15-30 seconds. The loading steps are cosmetic (timed at 3s intervals), not connected to actual pipeline progress.

8. **MarkdownRenderer is regex-based**: The custom markdown renderer doesn't handle all edge cases (nested formatting, complex tables, etc.).

9. **No error boundaries**: React error boundaries are not implemented. A crashing component will crash the entire page.

10. **No tests**: Zero unit tests, integration tests, or E2E tests exist.

11. **LangGraph dependency unused**: `@langchain/langgraph` is installed but the graph compilation feature is not used (just `Promise.all`).

### Low

12. **Clearbit logos may not resolve**: Company logos use `logo.clearbit.com` which doesn't work for all companies.

13. **Currency formatting edge cases**: The `formatCurrency` function doesn't handle all currency symbols correctly.

14. **Google News RSS rate limiting**: Heavy usage may get rate-limited by Google.

15. **No caching**: Every analysis runs the full pipeline from scratch. No result caching.

---

## 14. How to Run

```bash
# Clone
git clone <repo-url>
cd alladin

# Install (requires --legacy-peer-deps due to React 19 peer dep conflicts)
npm install --legacy-peer-deps

# Set up environment
cp .env.example .env.local
# Edit .env.local — at minimum set OPENAI_API_KEY

# Dev server
npm run dev
# → http://localhost:3000

# Production build
npm run build
npm start

# Deploy to Vercel
vercel deploy
# Set env vars in Vercel dashboard
```

### Minimum Requirements
- Node.js ≥ 18.x
- npm ≥ 9.x
- **Optional**: `OPENAI_API_KEY` for real LLM analysis (works without it using fallbacks)

---

## 15. Future Roadmap

### From README (Author's Wishlist)

1. **Train specialized Transformer Model** — Train from scratch on historical price data for buy/sell/hold signals
2. **Streaming responses** — SSE or WebSocket for real-time analysis progress
3. **Persistent vector store** — Pinecone/pgvector for RAG over company filings (10-K, quarterly)
4. **Multi-LLM support** — Anthropic Claude, Groq, Ollama with automatic fallback
5. **Historical comparison** — Graham metrics trending over 5-10 years
6. **Portfolio mode** — Analyze multiple stocks and build diversified Graham portfolio
7. **Automated alerts** — Notify when MoS reaches 30%+
8. **Authentication & saved reports** — User accounts with report history

### Suggested Technical Improvements

9. **Replace web scraping with proper APIs** — Use Yahoo Finance v8 chart API (already used for charts) for all data, or integrate a paid data provider
10. **Add real social media sentiment** — Integrate Reddit API, Twitter/X API, or StockTwits API
11. **Live macro indicators** — Fetch from FRED API or World Bank API
12. **Implement actual LangGraph** — Migrate from `Promise.all` to proper LangGraph graph compilation
13. **Add Redis for chat sessions** — Persist chat across server restarts
14. **Add E2E tests** — Playwright tests for full user flow
15. **Fix DCF model** — Use shares outstanding for proper per-share valuation
16. **Add server-sent events** — Connect `onProgress` callback to real pipeline stages

---

## Appendix: Quick Reference for Continuing Development

### To modify analysis logic:
- All agent nodes are in `src/lib/agents/nodes/`
- State interfaces are in `src/lib/agents/state.ts`
- Pipeline orchestration is in `src/lib/agents/graph.ts`

### To add a new data source:
- Add scraping/API function to `src/lib/api/finnhub.ts`
- Call it from `fetcher.ts` and add data to `rawFinancials`
- Update `state.ts` interfaces if new fields are needed

### To modify the UI:
- Main layout: `src/components/dashboard/DashboardLayout.tsx`
- Design tokens: `src/app/globals.css`
- Search page: `src/components/SearchSection.tsx`

### To add a new API route:
- Create `src/app/api/<name>/route.ts`
- Export `GET` or `POST` async functions
- Use `NextRequest`/`NextResponse` from `next/server`

### To change the LLM provider:
- Set `OPENAI_API_KEY` to your provider's key
- Set `OPENAI_BASE_URL` to your provider's endpoint
- Set `LLM_MODEL` to your preferred model
- The `llm.ts` factory handles the rest

---

*Generated on: July 7, 2026*
*Project: Aladdin – AI Investment Research Agent*
*Author: Muhammed Hafan*
