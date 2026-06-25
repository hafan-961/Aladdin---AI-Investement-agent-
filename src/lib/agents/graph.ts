// ============================================
// Alladin – LangGraph DAG Composition
// ============================================
// Orchestrates the full investment-analysis pipeline as a stateful
// Directed Acyclic Graph:
//
//   START → Fetcher → [Fundamentals | Sentiment | Geopolitics | Valuation] → Decision → END
//
// The four analyst nodes run conceptually in parallel (Promise.all)
// since LangGraph.js graph compilation may not be available in all
// versions.  This file provides both the graph-based approach and
// a simple sequential runner as fallback.
// ============================================

import type { AgentState } from './state';
import { createInitialState } from './state';
import { dataFetcherNode } from './nodes/fetcher';
import { fundamentalsNode } from './nodes/fundamentals';
import { sentimentNode } from './nodes/sentiment';
import { geopoliticsNode } from './nodes/geopolitics';
import { valuationNode } from './nodes/valuation';
import { decisionNode } from './nodes/decision';

/**
 * Run the full Alladin investment analysis pipeline.
 *
 * This is the primary entry-point called by the /api/analyze route.
 * It executes the DAG sequentially with parallel analyst fan-out.
 */
export async function runInvestmentAnalysis(
  query: string,
  onProgress?: (status: string, detail?: string) => void
): Promise<AgentState> {
  console.log('\n============================');
  console.log(`[Alladin] Starting analysis for: "${query}"`);
  console.log('============================\n');

  let state: AgentState = createInitialState(query);

  // ── Step 1: Data Fetching ──────────────────────────────────────
  onProgress?.('fetching', 'Resolving ticker & fetching financial data...');
  try {
    const fetchResult = await dataFetcherNode(state);
    state = { ...state, ...fetchResult };
  } catch (err) {
    console.error('[Graph] Fetcher node failed:', err);
    state.errors.push(`Data fetching failed: ${err}`);
    state.status = 'error';
    return state;
  }

  // Bail out early if we couldn't even resolve the ticker
  if (state.status === 'error') {
    console.error('[Graph] Aborting — fetcher returned error state');
    return state;
  }

  console.log(`[Graph] Data fetched for ${state.company?.name} (${state.company?.ticker})`);

  // ── Step 2: Parallel Analyst Fan-out ───────────────────────────
  onProgress?.('analyzing', 'Running fundamental, sentiment, geopolitics & valuation analysis...');

  try {
    const [fundResult, sentResult, geoResult, valResult] = await Promise.all([
      safeRun('Fundamentals', () => fundamentalsNode(state)),
      safeRun('Sentiment', () => sentimentNode(state)),
      safeRun('Geopolitics', () => geopoliticsNode(state)),
      safeRun('Valuation', () => valuationNode(state)),
    ]);

    // Merge all analyst outputs into state
    state = {
      ...state,
      ...fundResult,
      ...sentResult,
      ...geoResult,
      ...valResult,
      scrapedUrls: [
        ...(state.scrapedUrls || []),
        ...(fundResult?.scrapedUrls || []),
        ...(sentResult?.scrapedUrls || []),
        ...(geoResult?.scrapedUrls || []),
        ...(valResult?.scrapedUrls || []),
      ]
    };
  } catch (err) {
    console.error('[Graph] Analyst fan-out failed:', err);
    state.errors.push(`Analyst phase failed: ${err}`);
  }

  console.log('[Graph] All analysts complete. Generating final decision...');

  // ── Step 3: Decision Synthesis ─────────────────────────────────
  onProgress?.('deciding', 'Synthesizing final investment decision...');

  try {
    const decisionResult = await decisionNode(state);
    state = { ...state, ...decisionResult };
  } catch (err) {
    console.error('[Graph] Decision node failed:', err);
    state.errors.push(`Decision generation failed: ${err}`);
    state.status = 'error';
  }

  console.log(`\n[Alladin] ✅ Analysis complete: ${state.decision?.action || 'ERROR'}`);
  console.log(`  Confidence: ${state.decision?.confidenceScore || 0}%`);
  console.log(`  Margin of Safety: ${state.valuation?.marginOfSafety?.toFixed(1) || 'N/A'}%`);
  console.log('============================\n');

  return state;
}

/**
 * Safe wrapper – ensures one analyst failure doesn't crash the pipeline.
 */
async function safeRun(
  name: string,
  fn: () => Promise<Partial<AgentState>>
): Promise<Partial<AgentState>> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[Graph] ${name} node failed:`, err);
    return { errors: [`${name} analysis failed: ${err}`] } as Partial<AgentState>;
  }
}
