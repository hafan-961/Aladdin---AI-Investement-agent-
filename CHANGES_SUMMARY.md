# 🧞 Aladdin — Session Changes & Implementation Summary

This document provides a complete chronological and technical breakdown of all modifications, bug fixes, observability integrations, and provider migrations performed during this session.

---

## 📋 Table of Contents
1. [Datadog LLM Observability Setup](#1-datadog-llm-observability-setup)
2. [API Key Audit & Diagnostics](#2-api-key-audit--diagnostics)
3. [Fixing Data Inaccuracy & Broken Live Scraping](#3-fixing-data-inaccuracy--broken-live-scraping)
4. [Fixing Homepage Popular Stock Quotes](#4-fixing-homepage-popular-stock-quotes)
5. [LLM Provider Migration to Google Gemini](#5-llm-provider-migration-to-google-gemini)
6. [DAG Concurrency & Rate Limit Optimization](#6-dag-concurrency--rate-limit-optimization)
7. [Summary of Modified Files](#7-summary-of-modified-files)
8. [Verification & Test Results](#8-verification--test-results)

---

## 1. Datadog LLM Observability Setup

To monitor the multi-agent LangGraph workflow with Datadog AI & LLM Observability:

- **Package Installed:**
  - Ran `npm install dd-trace --legacy-peer-deps` (added `dd-trace` v5.x to dependencies in [`package.json`](file:///Users/muhammedhafan/Desktop/Alladin/package.json)).
- **Updated [`next.config.ts`](file:///Users/muhammedhafan/Desktop/Alladin/next.config.ts):**
  - Added `"dd-trace"` and `"openai"` to `serverExternalPackages` so Next.js does not bundle tracing instrumentation into the client build.
- **Configured [`.env`](file:///Users/muhammedhafan/Desktop/Alladin/.env):**
  - Appended Datadog configuration parameters:
    ```env
    DD_LLMOBS_ENABLED=1
    DD_LLMOBS_ML_APP=alladin
    DD_LLMOBS_AGENTLESS_ENABLED=1
    DD_SITE=datadoghq.com
    DD_API_KEY=<user_datadog_api_key>
    DD_ENV=development
    DD_SERVICE=alladin
    ```
- **Server Startup Command:**
  - Configured Next.js server launch with node initialization flag:
    ```bash
    export $(grep -v '^#' .env | grep -v '^$' | xargs) && NODE_OPTIONS="--import dd-trace/initialize.mjs" ./node_modules/next/dist/bin/next dev
    ```

---

## 2. API Key Audit & Diagnostics

We performed live connectivity checks on all configured external APIs:

| Service | Environment Variable | Status | Finding / Action Taken |
| :--- | :--- | :--- | :--- |
| **Groq (Initial)** | `OPENAI_API_KEY` | ❌ Expired | Returned `expired_api_key` (HTTP 401). |
| **Groq (New)** | `OPENAI_API_KEY` | ⚠️ Limited Model Access | Returned `model_not_found` for LLaMA 3.3. Available models: `qwen/qwen3.8-27b`, `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `allam-2-7b`. |
| **Finnhub** | `FINNHUB_API_KEY` | ✅ Active (HTTP 200) | Valid token. Activated for company profile, logo, and fallback quote feeds. |
| **Alpha Vantage** | `ALPHA_VANTAGE_API_KEY` | ✅ Active (HTTP 200) | Valid global quote token. |
| **Tavily** | `TAVILY_API_KEY` | ✅ Active (HTTP 200) | Valid search API token. |
| **Google Gemini** | `OPENAI_API_KEY` | ✅ Active (HTTP 200) | User provided Google key (`AQ.Ab8RN6...`). Validated across 50 models. |

---

## 3. Fixing Data Inaccuracy & Broken Live Scraping

### Root Cause
When querying Apple or other stocks, the application displayed distorted figures (e.g. Apple price `$25,196.65` instead of `~$344`, and Margin of Safety `-12,180%`):
1. **Google Finance Index Collision:** In [`src/lib/api/finnhub.ts`](file:///Users/muhammedhafan/Desktop/Alladin/src/lib/api/finnhub.ts), the scraper matched the first `jsname="Pdsbrc"` span on Google Finance, capturing the top banner's local market index (NIFTY 50 at `25,196.65`) instead of the stock price.
2. **Yahoo Finance 401 Unauthorized:** The fallback `fetchQuote()` was calling Yahoo's deprecated `v7/finance/quote` endpoint, which fails with HTTP 401 without authentication cookies.
3. **Underutilized Working APIs:** `FINNHUB_API_KEY` was in `.env` but was not wired into the quote fallback or profile generator.

### Code Changes in [`src/lib/api/finnhub.ts`](file:///Users/muhammedhafan/Desktop/Alladin/src/lib/api/finnhub.ts)
- **`scrapeGoogleFinance()`:**
  - Targeted Google Finance's designated stock quote container classes (`.N6SYTe` and `.YMlKec.fxKbKc`).
  - Added safety checks ensuring header carousels are never captured as stock prices.
- **`fetchQuote()`:**
  - Replaced the failing Yahoo v7 endpoint with **Yahoo v8 Chart API** (`https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?range=1d&interval=1d`), which reliably returns unauthenticated real-time quotes without 401 blocks.
  - Added automatic fallback to **Finnhub Quote API** (`https://finnhub.io/api/v1/quote`).
- **`fetchCompanyProfile()`:**
  - Prioritized verified quote data for current price, 52-week high, and 52-week low.
  - Connected **Finnhub Profile2 API** to pull authentic company logos, verified official web URLs, sector, industry, and real-time market capitalization.
  - Retained Screener.in integration for Indian equities.
- **`fetchFinancialMetrics()`:**
  - Synchronized fundamentals with StockAnalysis (107 metrics for US equities) and Screener.in (for Indian equities).
  - Added Finnhub Metric API as a secondary verification layer for P/E (`peTTM`), EPS (`epsTTM`), and Market Cap.

---

## 4. Fixing Homepage Popular Stock Quotes

### Root Cause
[`src/app/api/quotes/route.ts`](file:///Users/muhammedhafan/Desktop/Alladin/src/app/api/quotes/route.ts) had the identical scraping bug where all popular stock cards on the landing page (Apple, Tesla, Reliance, Microsoft, Nvidia, Google, Amazon) showed `price: 25,196.65` and `change: -1.54%`.

### Code Changes in [`src/app/api/quotes/route.ts`](file:///Users/muhammedhafan/Desktop/Alladin/src/app/api/quotes/route.ts)
- Replaced the broken scraper with the high-reliability **Yahoo v8 Chart API**.
- Added **Finnhub Quote API** as a fallback.
- Added proper currency symbol formatting (`$` for US equities, `₹` for Indian equities like Reliance).
- Preserved private company estimates for SpaceX (`SPCX`).

**Result:** Popular cards now display live market prices:
- Apple: `$344.10 (+1.35%)`
- Tesla: `$386.32 (+3.37%)`
- Reliance: `₹1,209.00 (+0.58%)`
- Microsoft: `$533.14 (+0.24%)`
- NVIDIA: `$222.11 (+2.60%)`
- Google: `$335.14 (-1.51%)`
- Amazon: `$262.71 (+0.03%)`

---

## 5. LLM Provider Migration to Google Gemini

### Background & Reason for Migration
1. **Groq Rate-Limit Lockout:** Groq free-tier on-demand keys enforce an Output Tokens Per Minute (OTPM) cap of 1,000 tokens. When multiple analyst agents ran, Groq blocked requests with `429 rate_limit_exceeded: Limit 1000, Requested 1000. Try again in 36 seconds`, causing LangChain to retry up to 7 times and delaying analysis by ~2.5 to 3.5 minutes.
2. **Quality Preservation:** Reducing token limits would have degraded the research depth (cutting off the 4-5 paragraph Graham fundamental analysis and the hedge-fund style final report).
3. **Google API Key:** The user provided a Google Gemini API key (`AQ.Ab8RN6...`). We verified that `gemini-3.5-flash-lite` operates at sub-second generation speeds via Google's official OpenAI-compatible endpoint.

### Code Changes
- **Updated [`.env`](file:///Users/muhammedhafan/Desktop/Alladin/.env):**
  ```env
  OPENAI_API_KEY=<your_google_gemini_api_key>
  OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
  LLM_MODEL=gemini-3.5-flash-lite
  MOCK_MODE=False
  ```
- **Updated [`src/lib/agents/llm.ts`](file:///Users/muhammedhafan/Desktop/Alladin/src/lib/agents/llm.ts):**
  - Added auto-detection for Google Gemini keys (`AQ.*` and `AIza*`) mapping directly to `https://generativelanguage.googleapis.com/v1beta/openai` and `gemini-3.5-flash-lite`.
  - Added `maxRetries: 2` to ChatOpenAI configuration to eliminate multi-minute idle retry delays.

---

## 6. DAG Concurrency & Rate Limit Optimization

### Code Changes in [`src/lib/agents/graph.ts`](file:///Users/muhammedhafan/Desktop/Alladin/src/lib/agents/graph.ts)
- Previously, the 4 analyst agents (`Fundamentals`, `Sentiment`, `Geopolitics`, `Valuation`) executed simultaneously via `Promise.all`.
- Firing 4 simultaneous large LLM calls at the exact same millisecond triggered burst concurrency limits on free API tiers.
- Changed the analyst phase to execute sequentially:
  ```ts
  const fundResult = await safeRun('Fundamentals', () => fundamentalsNode(state));
  const sentResult = await safeRun('Sentiment', () => sentimentNode(state));
  const geoResult = await safeRun('Geopolitics', () => geopoliticsNode(state));
  const valResult = await safeRun('Valuation', () => valuationNode(state));
  ```
- Because each agent takes only ~1 second on `gemini-3.5-flash-lite`, the entire 4-analyst phase completes in **~4.7 seconds total** with **zero 429 lockouts** and **zero retries**.

---

## 7. Summary of Modified Files

| File Path | Description of Changes |
| :--- | :--- |
| [`.env`](file:///Users/muhammedhafan/Desktop/Alladin/.env) | Added Datadog vars, updated `OPENAI_API_KEY` to Google Gemini, configured `OPENAI_BASE_URL`, set `LLM_MODEL=gemini-3.5-flash-lite`, set `MOCK_MODE=False`. |
| [`next.config.ts`](file:///Users/muhammedhafan/Desktop/Alladin/next.config.ts) | Added `"dd-trace"` and `"openai"` to `serverExternalPackages`. |
| [`package.json`](file:///Users/muhammedhafan/Desktop/Alladin/package.json) | Added `dd-trace` dependency. |
| [`src/app/api/quotes/route.ts`](file:///Users/muhammedhafan/Desktop/Alladin/src/app/api/quotes/route.ts) | Rewrote quote fetching to use Yahoo v8 Chart API and Finnhub; eliminated the $25,196.65 index scraping bug. |
| [`src/lib/api/finnhub.ts`](file:///Users/muhammedhafan/Desktop/Alladin/src/lib/api/finnhub.ts) | Fixed price container scraping in Google Finance; upgraded `fetchQuote()` to Yahoo v8 + Finnhub; integrated Finnhub profile/metric APIs; verified StockAnalysis & Screener fundamentals. |
| [`src/lib/agents/llm.ts`](file:///Users/muhammedhafan/Desktop/Alladin/src/lib/agents/llm.ts) | Added Google Gemini provider auto-detection (`AQ.*` / `AIza*`); added `maxRetries: 2`. |
| [`src/lib/agents/graph.ts`](file:///Users/muhammedhafan/Desktop/Alladin/src/lib/agents/graph.ts) | Sequenced analyst nodes to prevent gateway concurrency spikes; eliminated 429 retry loops. |

---

## 8. Verification & Test Results

### End-to-End Pipeline Execution ([`/api/analyze`](file:///Users/muhammedhafan/Desktop/Alladin/src/app/api/analyze/route.ts))

#### Apple Inc. (`AAPL` — US Equity)
- **Current Price:** `$343.99` (real market price, previously `$25,196.65`)
- **P/E Ratio:** `39.48` | **EPS:** `$8.72` | **ROE:** `148.75%`
- **Intrinsic Value:** `$308.38` | **Margin of Safety:** `-11.5%` (previously `-12,180%`)
- **Verdict:** `PASS` (Overvalued relative to Graham formula)
- **Report Length:** 4,314 characters of comprehensive, professional value-investing analysis.
- **Pipeline Time:** ~26 seconds (previously 3.5 minutes).

#### Reliance Industries (`RELIANCE.NS` — Indian Equity)
- **Current Price:** `₹1,209.00`
- **P/E Ratio:** `41.7` | **Book Value:** `₹418` | **Market Cap:** `₹16.33 Lakh Cr`
- **Verdict:** `PASS`
- **Report Length:** 4,120 characters of full investment thesis.

#### Live Quote Tickers ([`/api/quotes`](file:///Users/muhammedhafan/Desktop/Alladin/src/app/api/quotes/route.ts))
- All popular stock cards return live, accurate prices with correct currency symbols (`$` and `₹`) in under 600ms.
