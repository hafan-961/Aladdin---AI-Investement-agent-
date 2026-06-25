// ============================================
// Alladin – Geopolitics & Macro Analyst Node
// ============================================
// Researches tariff exposures, regulatory changes, geopolitical risks,
// government policies, and macroeconomic indicators that could affect
// the investment thesis.
// ============================================

import { ChatOpenAI } from '@langchain/openai';
import type { AgentState, GeopoliticsAnalysis } from '../state';
import { searchWeb } from '../../api/search';

/**
 * geopoliticsNode – Macro & geopolitical risk assessment.
 * Reads: company, newsItems
 * Writes: geopolitics
 */
export async function geopoliticsNode(state: AgentState): Promise<Partial<AgentState>> {
  console.log('[Geopolitics] Analyzing macro environment for:', state.company?.name || state.query);

  const company = state.company;
  const name = company?.name || state.query;
  const country = company?.country || 'US';
  const sector = company?.sector || company?.industry || 'Technology';

  // --- Search for geopolitical / macro context ---
  let searchResults: { title: string; content: string; url: string }[] = [];
  try {
    const queries = [
      `${name} geopolitical risk tariffs regulation 2024 2025`,
      `${sector} industry government policy subsidies ${country}`,
      `global macroeconomic outlook interest rates inflation ${country} economy`,
    ];
    const allResults = await Promise.all(queries.map((q) => searchWeb(q, 3)));
    searchResults = allResults.flat();
  } catch (err) {
    console.error('[Geopolitics] Search failed:', err);
  }

  const scrapedUrls: { title: string; url: string; confidence: number }[] = [];
  for (const r of searchResults) {
    if (r.url && r.url !== '#') {
      scrapedUrls.push({
        title: r.title || `${name} Geopolitical Source`,
        url: r.url,
        confidence: 0.75
      });
    }
  }

  // --- Build macro indicators ---
  const macroIndicators = buildMacroIndicators(country);

  // --- LLM risk assessment ---
  let analysis = '';
  let risks: GeopoliticsAnalysis['risks'] = [];
  let opportunities: string[] = [];

  try {
    const llm = new ChatOpenAI({
      modelName: process.env.LLM_MODEL || 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 1200,
      configuration: process.env.OPENAI_BASE_URL ? { baseURL: process.env.OPENAI_BASE_URL } : undefined,
    });

    const searchContext = searchResults.slice(0, 5).map(
      (s) => `- ${s.title}: ${s.content.slice(0, 200)}`
    ).join('\n');

    const newsContext = state.newsItems
      .filter(n => n.sentiment < -0.1)
      .slice(0, 3)
      .map(n => `- ${n.headline} (${n.source})`)
      .join('\n');

    const prompt = `You are a geopolitical and macroeconomic risk analyst for an investment fund.

Company: ${name} (${company?.ticker || 'N/A'})
Country: ${country}
Sector: ${sector}

Search Intelligence:
${searchContext || 'Limited data available'}

Negative News Signals:
${newsContext || 'No significant negative signals'}

Macro Indicators:
${macroIndicators.map(m => `- ${m.name}: ${m.value} (${m.impact})`).join('\n')}

Respond ONLY with valid JSON (no markdown code blocks, no extra text) in this exact format:
{
  "risks": [
    {"factor": "string", "severity": "low|medium|high|critical", "likelihood": "low|medium|high", "description": "string"}
  ],
  "opportunities": ["string"],
  "analysis": "Multi-paragraph markdown analysis covering: 1) Key geopolitical risks 2) Government policy impacts 3) Macro environment assessment 4) Supply chain vulnerabilities 5) Regulatory landscape"
}

Include 4-6 specific risks and 3-4 opportunities. Reference real-world events and policies relevant to the company's sector and geography.`;

    const response = await llm.invoke(prompt);
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        risks = parsed.risks || [];
        opportunities = parsed.opportunities || [];
        analysis = parsed.analysis || '';
      }
    } catch {
      // If JSON parsing fails, use the raw content as analysis
      analysis = content;
      risks = getDefaultRisks(name, sector, country);
      opportunities = getDefaultOpportunities(sector);
    }
  } catch (err) {
    console.error('[Geopolitics] LLM analysis failed:', err);
    analysis = generateFallbackGeopolitics(name, sector, country);
    risks = getDefaultRisks(name, sector, country);
    opportunities = getDefaultOpportunities(sector);
  }

  const result: GeopoliticsAnalysis = {
    risks,
    opportunities,
    macroIndicators,
    analysis,
  };

  return { geopolitics: result, scrapedUrls };
}

// ============================================
// Helpers
// ============================================

function buildMacroIndicators(country: string): GeopoliticsAnalysis['macroIndicators'] {
  if (country === 'IN') {
    return [
      { name: 'RBI Repo Rate', value: '6.50%', impact: 'Elevated rates may compress equity valuations' },
      { name: 'India CPI Inflation', value: '4.8%', impact: 'Within RBI target band; supportive of growth' },
      { name: 'INR/USD Exchange Rate', value: '₹83.5', impact: 'Stable rupee supports import costs' },
      { name: 'India GDP Growth', value: '7.2%', impact: 'Strong growth tailwind for domestic companies' },
      { name: 'India FDI Inflows', value: '$84B (FY24)', impact: 'Robust capital inflows signal confidence' },
    ];
  }
  return [
    { name: 'Fed Funds Rate', value: '5.25-5.50%', impact: 'High rates pressure growth stock valuations' },
    { name: 'US CPI Inflation', value: '3.2%', impact: 'Declining but above 2% target; rate cuts may be delayed' },
    { name: 'US 10Y Treasury Yield', value: '4.3%', impact: 'Elevated yields compete with equity risk premium' },
    { name: 'US GDP Growth', value: '2.5%', impact: 'Resilient economy supports corporate earnings' },
    { name: 'VIX (Volatility Index)', value: '14.2', impact: 'Low VIX suggests market complacency' },
  ];
}

function getDefaultRisks(name: string, sector: string, country: string): GeopoliticsAnalysis['risks'] {
  const base: GeopoliticsAnalysis['risks'] = [
    {
      factor: 'Trade Tariffs & Protectionism',
      severity: 'medium' as const,
      likelihood: 'high' as const,
      description: `Escalating trade tensions between major economies could impact ${name}'s supply chain and market access. Recent tariff proposals (e.g., Trump-era tariffs on Chinese goods, EU carbon border taxes) create pricing uncertainty.`,
    },
    {
      factor: 'Regulatory Tightening',
      severity: 'medium' as const,
      likelihood: 'medium' as const,
      description: `Increased regulatory scrutiny in ${sector} across multiple jurisdictions may require compliance investments and could limit certain business practices.`,
    },
    {
      factor: 'Interest Rate Environment',
      severity: 'high' as const,
      likelihood: 'high' as const,
      description: 'Prolonged high interest rates increase the discount rate for future cash flows, compressing valuations particularly for growth-oriented companies.',
    },
    {
      factor: 'Geopolitical Conflicts',
      severity: 'medium' as const,
      likelihood: 'medium' as const,
      description: 'Ongoing conflicts in Eastern Europe and the Middle East create energy price volatility and supply chain disruptions that ripple through global markets.',
    },
  ];

  if (country === 'IN') {
    base.push({
      factor: 'India-Specific Policy Risk',
      severity: 'low' as const,
      likelihood: 'medium' as const,
      description: 'Changes in Indian government policy, GST rates, or sector-specific regulations could impact operational costs and market dynamics.',
    });
  }

  return base;
}

function getDefaultOpportunities(sector: string): string[] {
  return [
    `${sector} sector benefits from structural digital transformation trends and increased technology adoption globally`,
    'Government infrastructure spending and policy incentives (PLI schemes, IRA subsidies) create new revenue opportunities',
    'Emerging market expansion provides untapped growth potential as middle-class consumption rises',
    'AI and automation integration can drive operational efficiency gains and new product development',
  ];
}

function generateFallbackGeopolitics(name: string, sector: string, country: string): string {
  return `## Geopolitical & Macro Analysis: ${name}

### Trade & Tariff Environment
The global trade landscape remains complex with ongoing tariff negotiations and protectionist policies. ${
    country === 'IN'
    ? 'India\'s PLI (Production Linked Incentive) schemes and Make in India initiative provide domestic support, but global trade tensions (particularly with China-dependent supply chains) pose risks.'
    : 'US trade policy, including potential tariff escalations on Chinese imports and EU digital taxes, creates uncertainty for multinational operations.'
  }

### Regulatory Landscape
${sector} faces evolving regulatory requirements across jurisdictions. Data privacy regulations (GDPR, CCPA), antitrust scrutiny, and sector-specific compliance requirements require ongoing investment and adaptation.

### Macroeconomic Outlook
${country === 'IN'
    ? 'India\'s robust GDP growth (~7.2%) and favorable demographics provide a strong domestic backdrop. The RBI\'s monetary policy stance and inflation management will be key factors for market valuations.'
    : 'The US economy shows resilience with moderate GDP growth, but the Federal Reserve\'s interest rate decisions remain the dominant force driving equity valuations. The "higher for longer" rate environment pressures growth stock multiples.'
  }

### Government Policy Support
${country === 'IN'
    ? 'Government initiatives including Digital India, green energy subsidies, and EV transition targets (30% by 2030) create sector-specific tailwinds. The National Infrastructure Pipeline and smart cities mission support long-term growth.'
    : 'US policy support through the CHIPS Act, IRA (Inflation Reduction Act), and infrastructure bill creates opportunities in technology, clean energy, and manufacturing sectors.'
  }`;
}
