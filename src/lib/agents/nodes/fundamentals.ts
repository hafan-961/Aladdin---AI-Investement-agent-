// ============================================
// Alladin – Fundamental Analyst Node (Benjamin Graham Style)
// ============================================
// Evaluates the company against Graham's defensive-investor criteria
// from "The Intelligent Investor".  Produces a scored checklist and
// LLM-generated qualitative analysis.
// ============================================

import { createLLM } from '../llm';
import type { AgentState, FundamentalAnalysis, FinancialMetrics } from '../state';

/**
 * fundamentalsNode – Graham-style fundamental analysis.
 * Reads: company, rawFinancials
 * Writes: fundamentals
 */
export async function fundamentalsNode(state: AgentState): Promise<Partial<AgentState>> {
  console.log('[Fundamentals] Analyzing:', state.company?.name || state.query);

  const metrics = (state.rawFinancials?.metrics as FinancialMetrics) || {} as FinancialMetrics;
  const company = state.company;

  const isPrivate = company?.exchange === 'PRIVATE';

  // --- Graham's Defensive Investor Checklist ---
  const checklist = isPrivate 
    ? buildPrivateVCChecklist(company, state.newsItems.length)
    : buildGrahamChecklist(metrics, company?.currency === 'INR');
  const score = Math.round((checklist.filter((c) => c.passed).length / checklist.length) * 100);

  // --- Highlights ---
  const highlights = generateHighlights(metrics, company?.name || state.query);

  // --- LLM-generated qualitative analysis ---
  let analysis = '';
  try {
    const llm = createLLM({ temperature: 0.3, maxTokens: 1200 });
    if (!llm) throw new Error('LLM not available');

    const sym = company?.currency === 'INR' ? '₹' : '$';
    const prompt = isPrivate ? `You are a private equity and venture capital investment analyst.

Analyze the private company ${company?.name || state.query}:
- Sector: ${company?.sector || 'Private Enterprise'}
- Industry: ${company?.industry || 'Private Enterprise'}
- Country: ${company?.country || 'Unknown'}
- Website: ${company?.weburl || 'None'}
- Stated Valuation/Estimate: ${company?.marketCap ? sym + (company.marketCap / 1e6).toFixed(1) + 'M' : 'Undisclosed'}

Provide a concise VC/PE analysis (4-5 paragraphs) covering:
1. Business model and value proposition
2. Industry positioning and market addressable opportunity
3. Risks associated with a private enterprise of this profile
4. Overall recommendation for private-equity backing or venture support

Use concrete observations. Frame your analysis as a venture partner.`
      : `You are a value investor following Benjamin Graham's principles from "The Intelligent Investor".

Analyze the following financial metrics for ${company?.name || state.query} (${company?.ticker || 'N/A'}):

Key Metrics:
- P/E Ratio: ${metrics.peRatio ?? 'N/A'}
- P/B Ratio: ${metrics.pbRatio ?? 'N/A'}
- EPS: ${metrics.eps !== null ? sym + metrics.eps.toFixed(2) : 'N/A'}
- ROE: ${metrics.roe ?? 'N/A'}%
- Debt/Equity: ${metrics.debtToEquity ?? 'N/A'}
- Current Ratio: ${metrics.currentRatio ?? 'N/A'}
- Free Cash Flow/Share: ${metrics.freeCashFlow !== null ? sym + metrics.freeCashFlow.toFixed(2) : 'N/A'}
- Profit Margin: ${metrics.profitMargin ?? 'N/A'}%
- Revenue Growth: ${metrics.revenueGrowth !== null ? (metrics.revenueGrowth * 100).toFixed(1) + '%' : 'N/A'}
- Dividend Yield: ${metrics.dividendYield ?? 'N/A'}%

Graham Checklist Score: ${score}/100 (${checklist.filter(c => c.passed).length}/${checklist.length} criteria passed)

Failed Criteria: ${checklist.filter(c => !c.passed).map(c => c.criterion).join(', ') || 'None'}

Provide a concise fundamental analysis (4-5 paragraphs) covering:
1. Overall financial health assessment
2. Specific Graham criteria that pass/fail and why it matters
3. Quality of earnings and cash flow generation
4. Key risks from a fundamentals perspective
5. Whether this meets Graham's standard for a defensive or enterprising investor

Use concrete numbers. Reference Graham's concepts like "earnings stability", "adequate size", and "financial condition".`;

    const response = await llm.invoke(prompt);
    analysis = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
  } catch (err) {
    console.error('[Fundamentals] LLM analysis failed:', err);
    analysis = isPrivate
      ? generatePrivateFallbackAnalysis(company?.name || state.query, checklist, score)
      : generateFallbackAnalysis(metrics, company?.name || state.query, checklist, score);
  }

  // Retrieve historical data from rawFinancials if available, otherwise generate currency-aware fallback
  let historicalData = state.rawFinancials?.historicalData as any[];
  if (!historicalData || historicalData.length === 0) {
    console.log('[Fundamentals] No historical data in rawFinancials. Generating fallback...');
    const currentYear = new Date().getFullYear();
    const growthRate = metrics.revenueGrowth ?? 0.05;
    
    // Scale base revenue based on market cap or standard currency
    const isINR = company?.currency === 'INR';
    const baseRevenue = isPrivate ? 100e6 : (metrics.marketCap ? metrics.marketCap * 0.2 : (isINR ? 500e9 : 10e9));
    const baseEPS = metrics.eps ?? (isPrivate ? 0 : 5);
    
    historicalData = Array.from({ length: 5 }, (_, i) => {
      const year = currentYear - 4 + i;
      const factor = Math.pow(1 + growthRate, i - 4);
      return {
        year: year.toString(),
        revenue: Math.round(baseRevenue * factor),
        netIncome: Math.round(baseRevenue * factor * (metrics.profitMargin ?? 15) / 100),
        eps: Number((baseEPS * factor).toFixed(2)),
      };
    });
  }

  const result: FundamentalAnalysis = {
    metrics,
    grahamChecklist: checklist,
    highlights,
    historicalData,
    score,
    analysis,
  };

  return { fundamentals: result };
}

// ============================================
// Graham's Defensive Investor Checklist
// ============================================

function buildGrahamChecklist(m: FinancialMetrics, isINR = false) {
  const mktCapUSD = isINR ? (m.marketCap ?? 0) / 83 : (m.marketCap ?? 0);
  return [
    {
      criterion: 'Adequate Size (Market Cap > $2B)',
      passed: mktCapUSD > 2e9,
      value: m.marketCap ? `$${(mktCapUSD / 1e9).toFixed(1)}B` : 'N/A',
      threshold: '> $2B',
    },
    {
      criterion: 'Strong Financial Condition (Current Ratio > 2.0)',
      passed: (m.currentRatio ?? 0) > 2.0,
      value: m.currentRatio?.toFixed(2) ?? 'N/A',
      threshold: '> 2.0',
    },
    {
      criterion: 'Earnings Stability (Positive EPS)',
      passed: (m.eps ?? 0) > 0,
      value: m.eps?.toFixed(2) ?? 'N/A',
      threshold: '> 0',
    },
    {
      criterion: 'Dividend Record (Yield > 0%)',
      passed: (m.dividendYield ?? 0) > 0,
      value: m.dividendYield ? `${m.dividendYield.toFixed(2)}%` : 'N/A',
      threshold: '> 0%',
    },
    {
      criterion: 'Earnings Growth (Revenue Growth > 0%)',
      passed: (m.revenueGrowth ?? 0) > 0,
      value: m.revenueGrowth ? `${(m.revenueGrowth * 100).toFixed(1)}%` : 'N/A',
      threshold: '> 0%',
    },
    {
      criterion: 'Moderate P/E Ratio (< 20)',
      passed: (m.peRatio ?? Infinity) < 20,
      value: m.peRatio?.toFixed(1) ?? 'N/A',
      threshold: '< 20',
    },
    {
      criterion: 'Moderate P/B Ratio (< 2.5)',
      passed: (m.pbRatio ?? Infinity) < 2.5,
      value: m.pbRatio?.toFixed(1) ?? 'N/A',
      threshold: '< 2.5',
    },
    {
      criterion: 'Conservative Debt (D/E < 1.0)',
      passed: (m.debtToEquity ?? Infinity) < 1.0,
      value: m.debtToEquity?.toFixed(2) ?? 'N/A',
      threshold: '< 1.0',
    },
    {
      criterion: 'Positive Free Cash Flow',
      passed: (m.freeCashFlow ?? 0) > 0,
      value: m.freeCashFlow?.toFixed(2) ?? 'N/A',
      threshold: '> 0',
    },
    {
      criterion: 'Healthy Profit Margin (> 5%)',
      passed: (m.profitMargin ?? 0) > 5,
      value: m.profitMargin ? `${m.profitMargin.toFixed(1)}%` : 'N/A',
      threshold: '> 5%',
    },
  ];
}

function generateHighlights(m: FinancialMetrics, name: string): string[] {
  const highlights: string[] = [];

  if (m.peRatio && m.peRatio < 15) highlights.push(`${name} trades at a low P/E of ${m.peRatio.toFixed(1)}, suggesting value opportunity`);
  else if (m.peRatio && m.peRatio > 30) highlights.push(`High P/E of ${m.peRatio.toFixed(1)} implies premium valuation — speculative territory per Graham`);

  if (m.debtToEquity && m.debtToEquity < 0.5) highlights.push(`Conservative debt structure (D/E: ${m.debtToEquity.toFixed(2)}) — strong financial foundation`);
  else if (m.debtToEquity && m.debtToEquity > 1.5) highlights.push(`⚠️ High leverage (D/E: ${m.debtToEquity.toFixed(2)}) — Graham would flag this as risky`);

  if (m.profitMargin && m.profitMargin > 20) highlights.push(`Excellent profit margins (${m.profitMargin.toFixed(1)}%) indicate strong competitive moat`);

  if (m.revenueGrowth && m.revenueGrowth > 0.1) highlights.push(`Strong revenue growth of ${(m.revenueGrowth * 100).toFixed(1)}% shows business momentum`);
  else if (m.revenueGrowth && m.revenueGrowth < 0) highlights.push(`⚠️ Revenue declining (${(m.revenueGrowth * 100).toFixed(1)}%) — potential red flag`);

  if (highlights.length === 0) highlights.push(`Financial profile shows mixed signals; requires deeper analysis`);

  return highlights;
}

function generateFallbackAnalysis(
  m: FinancialMetrics,
  name: string,
  checklist: FundamentalAnalysis['grahamChecklist'],
  score: number
): string {
  const passed = checklist.filter(c => c.passed).length;
  const total = checklist.length;

  return `## Fundamental Analysis: ${name}

**Graham Checklist: ${passed}/${total} criteria met (Score: ${score}/100)**

### Financial Health
${name} shows ${score >= 70 ? 'strong' : score >= 40 ? 'mixed' : 'concerning'} fundamentals from a Graham perspective. The company reports a P/E ratio of ${m.peRatio?.toFixed(1) ?? 'N/A'} and P/B ratio of ${m.pbRatio?.toFixed(1) ?? 'N/A'}, ${m.peRatio && m.peRatio < 20 ? 'within Graham\'s acceptable range for a defensive investor' : 'exceeding Graham\'s preferred thresholds for conservative investors'}.

### Earnings Quality
With EPS of ${m.eps?.toFixed(2) ?? 'N/A'} and profit margins of ${m.profitMargin?.toFixed(1) ?? 'N/A'}%, ${m.profitMargin && m.profitMargin > 15 ? 'earnings quality appears solid' : 'earnings generation could be stronger'}. Free cash flow per share stands at ${m.freeCashFlow?.toFixed(2) ?? 'N/A'}, ${m.freeCashFlow && m.freeCashFlow > 3 ? 'indicating healthy cash generation' : 'which warrants monitoring'}.

### Balance Sheet
The debt-to-equity ratio of ${m.debtToEquity?.toFixed(2) ?? 'N/A'} ${m.debtToEquity && m.debtToEquity < 1 ? 'meets Graham\'s conservative threshold' : 'exceeds Graham\'s preferred limit, introducing financial risk'}. Current ratio of ${m.currentRatio?.toFixed(2) ?? 'N/A'} ${m.currentRatio && m.currentRatio > 2 ? 'demonstrates strong liquidity' : 'suggests potential liquidity constraints'}.

### Investor Classification
Per Graham's framework, this stock ${score >= 60 ? 'may qualify for a defensive investor portfolio with adequate margin of safety' : 'is better suited for the enterprising investor who can perform deeper due diligence and accept higher risk'}.`;
}

// ============================================
// Private VC/PE Checklist and Fallbacks
// ============================================

function buildPrivateVCChecklist(company: any, newsCount: number) {
  return [
    {
      criterion: 'Digital Presence (Website available)',
      passed: !!company?.weburl,
      value: company?.weburl || 'None',
      threshold: 'Has active domain',
    },
    {
      criterion: 'Geographic Operations Defined',
      passed: !!company?.country && company.country !== 'Unknown',
      value: company?.country || 'Unknown',
      threshold: 'Known headquarters',
    },
    {
      criterion: 'Industry Growth alignment',
      passed: !!company?.industry && company.industry !== 'Private Enterprise',
      value: company?.industry || 'Unknown',
      threshold: 'Sector defined',
    },
    {
      criterion: 'Market Mindshare (News presence)',
      passed: newsCount > 0,
      value: `${newsCount} articles found`,
      threshold: '> 0 articles',
    },
    {
      criterion: 'Valuation/Funding Stated',
      passed: (company?.marketCap ?? 0) > 0,
      value: company?.marketCap ? `$${(company.marketCap / 1e6).toFixed(1)}M` : 'Undisclosed',
      threshold: 'Stated VC cap',
    },
  ];
}

function generatePrivateFallbackAnalysis(name: string, checklist: any[], score: number): string {
  const passed = checklist.filter(c => c.passed).length;
  const total = checklist.length;
  return `## Private Enterprise Analysis: ${name}

**VC Checklist Score: ${score}/100 (${passed}/${total} criteria met)**

### Enterprise Overview
${name} operates as a private unlisted company in the ${checklist[2].value} sector. Because it is unlisted, traditional public financial ratios (like P/E, P/B, public EPS) are not accessible. 

### VC Checklist Assessment
The company satisfies ${passed} out of ${total} private enterprise assessment criteria. Key indicators show:
* **Headquarters:** Located in ${checklist[1].value}.
* **Website:** Official presence at ${checklist[0].value !== 'None' ? `[${name} Homepage](${checklist[0].value})` : 'None'}.
* **Valuation:** Stated VC valuation estimate is ${checklist[4].value}.

### Investment Thesis
Backing unlisted firms requires evaluating product-market fit, execution risk, and funding runways rather than stock multiples. Investors should perform customized due diligence into ${name}'s private financing history and customer references.`;
}
