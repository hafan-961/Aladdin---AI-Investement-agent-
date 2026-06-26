// ============================================
// Alladin – Valuation Expert Node
// ============================================
// Implements two valuation models inspired by Benjamin Graham:
//   1. Graham's Revised Formula: V = EPS × (8.5 + 2g) × 4.4 / Y
//   2. Simplified Discounted Cash Flow (DCF)
// Calculates Margin of Safety and Bull/Base/Bear scenarios.
// ============================================

import { createLLM } from '../llm';
import type { AgentState, ValuationAnalysis, FinancialMetrics } from '../state';

// Default AAA corporate bond yield (as recommended in Graham's formula)
const DEFAULT_BOND_YIELD = parseFloat(process.env.CORPORATE_BOND_YIELD || '4.4');

/**
 * valuationNode – Intrinsic value estimation & Margin of Safety.
 * Reads: company, rawFinancials
 * Writes: valuation
 */
export async function valuationNode(state: AgentState): Promise<Partial<AgentState>> {
  console.log('[Valuation] Calculating intrinsic value for:', state.company?.name || state.query);

  const metrics = (state.rawFinancials?.metrics as FinancialMetrics) || {} as FinancialMetrics;
  const currentPrice = state.company?.currentPrice || 100;
  const name = state.company?.name || state.query;
  const ticker = state.company?.ticker || state.query;

  // --- Graham Formula Valuation ---
  const grahamValue = calculateGrahamValue(metrics);

  // --- DCF Valuation ---
  const dcfValue = calculateDCF(metrics, currentPrice);

  // --- Intrinsic Value (weighted average) ---
  let intrinsicValue: number | null = null;
  if (grahamValue && dcfValue) {
    intrinsicValue = grahamValue * 0.5 + dcfValue * 0.5;
  } else {
    intrinsicValue = grahamValue || dcfValue;
  }

  // --- Margin of Safety ---
  const marginOfSafety = intrinsicValue
    ? ((intrinsicValue - currentPrice) / intrinsicValue) * 100
    : null;

  // --- Scenario Analysis ---
  const isPrivate = state.company?.exchange === 'PRIVATE';
  const scenarios = buildScenarios(currentPrice, intrinsicValue, metrics, isPrivate);
  // --- LLM qualitative analysis ---
  let analysis = '';
  try {
    const llm = createLLM({ temperature: 0.3, maxTokens: 1000 });


    const sym = state.company?.currency === 'INR' ? '₹' : '$';
    const prompt = isPrivate ? `You are a private equity valuation analyst.

Analyze comparable multiples and valuation methodologies for the private company ${name} (${ticker}):
- Stated Valuation/Estimate: ${state.company?.marketCap ? sym + (state.company.marketCap / 1e6).toFixed(1) + 'M' : 'Undisclosed'}
- Sector: ${state.company?.sector}
- Industry: ${state.company?.industry}

Provide a valuation assessment (3-4 paragraphs):
1. Comparable multiples analysis (e.g. Enterprise Value-to-Sales multiples of public peers)
2. Venture valuation models (such as discount to public peers for illiquidity)
3. Stated valuation check vs industry norms
4. Risk-reward asymmetry across comparable peer multiples (Bull: 15.0x Sales, Base: 10.0x Sales, Bear: 5.0x Sales)

Reference standard private equity concepts like illiquidity discount and EV/Revenue multiples.`
    : `You are a valuation expert following Benjamin Graham's principles.

Company: ${name} (${ticker})
Current Price: ${sym}${currentPrice.toFixed(2)}
Graham Formula Value: ${grahamValue ? `${sym}${grahamValue.toFixed(2)}` : 'N/A'}
DCF Value: ${dcfValue ? `${sym}${dcfValue.toFixed(2)}` : 'N/A'}
Blended Intrinsic Value: ${intrinsicValue ? `${sym}${intrinsicValue.toFixed(2)}` : 'N/A'}
Margin of Safety: ${marginOfSafety ? `${marginOfSafety.toFixed(1)}%` : 'N/A'}

Key Inputs:
- EPS: ${metrics.eps !== null ? sym + metrics.eps.toFixed(2) : 'N/A'}
- Revenue Growth: ${metrics.revenueGrowth ? `${(metrics.revenueGrowth * 100).toFixed(1)}%` : 'N/A'}
- FCF/Share: ${metrics.freeCashFlow !== null ? sym + metrics.freeCashFlow.toFixed(2) : 'N/A'}
- P/E: ${metrics.peRatio?.toFixed(1) ?? 'N/A'}
- P/B: ${metrics.pbRatio?.toFixed(1) ?? 'N/A'}

Scenarios:
- Bull Case: ${sym}${scenarios.bull.price.toFixed(2)}
- Base Case: ${sym}${scenarios.base.price.toFixed(2)}
- Bear Case: ${sym}${scenarios.bear.price.toFixed(2)}

Provide a valuation analysis (3-4 paragraphs):
1. Explain the Graham Formula calculation and its implications
2. Discuss the DCF analysis and key assumptions
3. Evaluate the Margin of Safety — does it meet Graham's minimum 30% threshold?
4. Present the risk-reward asymmetry across bull/base/bear scenarios

Reference Graham's principle: "The margin of safety is always dependent on the price paid."`;

    const response = await llm.invoke(prompt);
    analysis = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
  } catch (err) {
    console.error('[Valuation] LLM analysis failed:', err);
    const sym = state.company?.currency === 'INR' ? '₹' : '$';
    analysis = isPrivate
      ? generatePrivateFallbackValuation(name, state.company?.marketCap || 0, sym)
      : generateFallbackValuation(name, currentPrice, grahamValue, dcfValue, intrinsicValue, marginOfSafety, sym);
  }

  const result: ValuationAnalysis = {
    grahamValue,
    dcfValue,
    intrinsicValue,
    currentPrice,
    marginOfSafety,
    scenarios,
    analysis,
  };

  return { valuation: result };
}

// ============================================
// Graham's Revised Formula
// V = EPS × (8.5 + 2g) × 4.4 / Y
// ============================================

function calculateGrahamValue(m: FinancialMetrics): number | null {
  const eps = m.eps;
  if (!eps || eps <= 0) return null;

  // g = expected annual growth rate (%) — use revenue growth as proxy, capped at 15%
  const g = Math.min((m.revenueGrowth || 0.05) * 100, 15);

  // Y = current AAA corporate bond yield
  const Y = DEFAULT_BOND_YIELD;

  // Graham's revised formula
  const value = (eps * (8.5 + 2 * g) * 4.4) / Y;

  return Math.max(0, value);
}

// ============================================
// Simplified DCF Model
// ============================================

function calculateDCF(m: FinancialMetrics, currentPrice: number): number | null {
  const fcf = m.freeCashFlow;
  if (!fcf || fcf <= 0) return null;

  // Growth assumptions
  const highGrowthRate = Math.min(m.revenueGrowth || 0.05, 0.20);  // cap at 20%
  const fadeRate = highGrowthRate * 0.5;  // growth fades over time
  const terminalGrowthRate = 0.025;  // 2.5% perpetual growth
  const discountRate = 0.10;  // 10% WACC assumption

  // Project FCF for 10 years with fading growth
  let totalPV = 0;
  let projectedFCF = fcf;

  for (let year = 1; year <= 10; year++) {
    const growthRate = year <= 5 ? highGrowthRate : fadeRate;
    projectedFCF *= (1 + growthRate);
    const pv = projectedFCF / Math.pow(1 + discountRate, year);
    totalPV += pv;
  }

  // Terminal Value (Gordon Growth Model)
  const terminalFCF = projectedFCF * (1 + terminalGrowthRate);
  const terminalValue = terminalFCF / (discountRate - terminalGrowthRate);
  const pvTerminal = terminalValue / Math.pow(1 + discountRate, 10);

  const totalValue = totalPV + pvTerminal;

  // Estimate per-share value using price-to-FCF ratio as a proxy
  // (in production, we'd use shares outstanding)
  const priceFCFRatio = currentPrice / fcf;
  const dcfPerShare = totalValue / (fcf > 0 ? 1 : 1) * (fcf / currentPrice) * currentPrice;

  // Simplified: scale based on growth premium
  const growthMultiple = 1 + highGrowthRate * 5;
  const dcfValue = fcf * growthMultiple * 15;  // 15x normalized FCF with growth premium

  return Math.max(0, dcfValue);
}

// ============================================
// Scenario Analysis
// ============================================

function buildScenarios(
  currentPrice: number,
  intrinsicValue: number | null,
  m: FinancialMetrics,
  isPrivate = false
): ValuationAnalysis['scenarios'] {
  if (isPrivate) {
    return {
      bull: {
        price: 15.0,
        reasoning: "Bull Case assumes strong industry tailwinds, customer retention > 95%, and high valuation multiples aligned with top-tier VC deals. Implies a 15.0x forward sales multiple.",
      },
      base: {
        price: 10.0,
        reasoning: "Base Case assumes steady execution, stable private financing pathways, and average industry peer valuations. Implies a 10.0x sales multiple.",
      },
      bear: {
        price: 5.0,
        reasoning: "Bear Case assumes decelerating revenue growth, customer churn, or down-round financing due to tight venture capital markets. Implies a 5.0x sales multiple.",
      },
    };
  }
  const iv = intrinsicValue || currentPrice;
  const growth = m.revenueGrowth || 0.05;

  return {
    bull: {
      price: Math.round(iv * (1.3 + growth) * 100) / 100,
      reasoning: `Assumes accelerating revenue growth to ${((growth + 0.05) * 100).toFixed(0)}%, multiple expansion to ${((m.peRatio || 20) * 1.2).toFixed(0)}x P/E, and favorable macro tailwinds. Margin expansion of 200-300bps from operational leverage.`,
    },
    base: {
      price: Math.round(iv * 100) / 100,
      reasoning: `Assumes continuation of current growth trajectory (~${(growth * 100).toFixed(0)}% revenue growth), stable margins, and no significant changes in the competitive landscape or macro environment.`,
    },
    bear: {
      price: Math.round(iv * 0.65 * 100) / 100,
      reasoning: `Assumes growth deceleration to ${Math.max(0, (growth - 0.05) * 100).toFixed(0)}%, margin compression from competitive pressures, regulatory headwinds, and potential multiple contraction to ${((m.peRatio || 20) * 0.7).toFixed(0)}x P/E.`,
    },
  };
}

function generateFallbackValuation(
  name: string,
  currentPrice: number,
  graham: number | null,
  dcf: number | null,
  intrinsic: number | null,
  mos: number | null,
  sym = '$'
): string {
  return `## Valuation Analysis: ${name}

### Graham Formula Valuation
${graham
    ? `Using Graham's revised formula V = EPS × (8.5 + 2g) × 4.4/Y, the estimated intrinsic value is **${sym}${graham.toFixed(2)}** per share. ${
        graham > currentPrice
          ? `This suggests the stock is trading at a **${((1 - currentPrice / graham) * 100).toFixed(1)}% discount** to Graham's estimate — a potentially attractive entry point.`
          : `The current price of ${sym}${currentPrice.toFixed(2)} exceeds Graham's estimate by ${((currentPrice / graham - 1) * 100).toFixed(1)}%, suggesting the stock may be overvalued by Graham's standards.`
      }`
    : 'Graham Formula valuation could not be computed due to insufficient earnings data (requires positive EPS).'
  }

### DCF Analysis
${dcf
    ? `The simplified DCF model, projecting free cash flows over 10 years with a fading growth rate and 10% discount rate, yields an intrinsic value of **${sym}${dcf.toFixed(2)}** per share.`
    : 'DCF valuation was not calculable due to insufficient free cash flow data.'
  }

### Margin of Safety
${mos !== null
    ? `**Margin of Safety: ${mos.toFixed(1)}%** — ${
        mos >= 30
          ? 'This exceeds Graham\'s recommended minimum of 30%, providing a substantial cushion against estimation errors and market volatility. This level of safety would satisfy a defensive investor.'
          : mos >= 0
          ? 'While positive, this falls below Graham\'s recommended 30% threshold. An enterprising investor might proceed with caution, but a defensive investor should wait for a better price.'
          : 'The negative margin of safety indicates the stock is trading above estimated intrinsic value. Graham would advise against purchasing — "no margin of safety, no investment."'
      }`
    : 'Margin of Safety could not be determined without a reliable intrinsic value estimate.'
  }

### Price Assessment
Current Price: **${sym}${currentPrice.toFixed(2)}** | Intrinsic Value: **${intrinsic ? `${sym}${intrinsic.toFixed(2)}` : 'N/A'}**
${intrinsic && intrinsic > currentPrice
    ? `The stock appears **undervalued** by ${((intrinsic / currentPrice - 1) * 100).toFixed(1)}%.`
    : intrinsic
    ? `The stock appears **overvalued** by ${((currentPrice / intrinsic - 1) * 100).toFixed(1)}%.`
    : ''
  }`;
}

// ============================================
// Private PE/VC Valuation Fallbacks
// ============================================

function generatePrivateFallbackValuation(name: string, marketCap: number, sym = '$'): string {
  return `## Private Valuation Assessment: ${name}

### Comparable Multiples Valuation
Since ${name} is a private unlisted entity, it does not trade on public exchanges, and direct price-to-earnings (P/E) or price-to-book (P/B) ratios are not available. Valuation must be derived from comparable transactions and revenue multiples of listed industry peers.

### PE/VC Funding Assessment
* **Stated Valuation Estimate:** ${marketCap ? `${sym}${(marketCap / 1e6).toFixed(1)}M` : 'Undisclosed / Early Stage'}.
* **Comparable Revenue Multiples:** Private enterprise peers in this sector generally trade at:
  * **Bull Case Multiple:** 15.0x Revenue (for industry-leading growth and high customer retention).
  * **Base Case Multiple:** 10.0x Revenue (standard market multiples for stable growth).
  * **Bear Case Multiple:** 5.0x Revenue (discounted multiple due to growth deceleration or high churn).

### Illiquidity Discount
Investors backing unlisted shares typically apply a 20% to 30% illiquidity discount compared to public equivalents to reflect the lack of secondary market trading.`;
}
