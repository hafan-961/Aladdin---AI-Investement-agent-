// ============================================
// Alladin – Data Fetcher Node
// ============================================
// First node in the LangGraph DAG. Resolves the user's query to a
// stock ticker, fetches the company profile, financial metrics, and
// recent news.  All downstream analyst nodes depend on this output.
// ============================================

import type { AgentState, CompanyProfile } from '../state';
import { searchTicker, fetchCompanyProfile, fetchFinancialMetrics, fetchCompanyNews, fetchHistoricalFinancials, mapTickerToGoogleFinance } from '../../api/finnhub';
import { searchWeb } from '../../api/search';
import { ChatOpenAI } from '@langchain/openai';

/**
 * dataFetcherNode – Resolves ticker, fetches profile + metrics + news.
 * Writes to: company, rawFinancials, newsItems, status, errors, scrapedUrls
 */
export async function dataFetcherNode(state: AgentState): Promise<Partial<AgentState>> {
  console.log('[Fetcher] Starting data fetch for:', state.query);
  console.log('[Fetcher] Env Debug:', {
    hasKey: !!process.env.OPENAI_API_KEY,
    keyLength: process.env.OPENAI_API_KEY?.length || 0,
    keyPrefix: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 8) : 'none',
    baseUrl: process.env.OPENAI_BASE_URL || 'none',
    model: process.env.LLM_MODEL || 'none',
    mockMode: process.env.MOCK_MODE || 'none',
  });

  // Enforce early credential verification (unless MOCK_MODE is enabled)
  if (!process.env.OPENAI_API_KEY && process.env.MOCK_MODE !== 'true') {
    console.error('[Fetcher] Missing OPENAI_API_KEY credentials.');
    return {
      errors: [
        ...state.errors,
        'Analysis failed: Missing credentials. Please pass an `apiKey`, or set the `OPENAI_API_KEY` environment variable.'
      ],
      status: 'error',
    };
  }

  const errors: string[] = [];
  const scrapedUrls: { title: string; url: string; confidence: number }[] = [];

  // --- Step 1: Resolve ticker ---
  let ticker = await searchTicker(state.query);
  let company: CompanyProfile | null = null;
  let isPrivate = false;

  if (!ticker) {
    console.log('[Fetcher] Ticker not found. Treating as private company:', state.query);
    isPrivate = true;
    ticker = `PRIVATE:${state.query.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
  } else {
    console.log('[Fetcher] Resolved ticker:', ticker);
  }

  // --- Step 2: Fetch company profile ---
  if (isPrivate) {
    const searchResults = await searchWeb(`"${state.query}" company profile headquarters country industry website sector overview`);
    
    // Collect private company search results
    for (const r of searchResults) {
      if (r.url && r.url !== '#') {
        scrapedUrls.push({
          title: r.title || `${state.query} Research Source`,
          url: r.url,
          confidence: 0.85
        });
      }
    }

    const searchContext = searchResults.map(r => `Source: ${r.title}\nContent: ${r.content}`).join('\n\n');

    let privateProfile = {
      country: 'US',
      industry: 'Private Enterprise',
      sector: 'Private Enterprise',
      weburl: '',
      currency: 'USD',
      currentPrice: 1.0,
      marketCap: 0,
      description: 'Private Enterprise'
    };

    try {
      const llm = new ChatOpenAI({
        modelName: process.env.LLM_MODEL || 'gpt-4o-mini',
        temperature: 0.2,
        maxTokens: 500,
        configuration: process.env.OPENAI_BASE_URL ? { baseURL: process.env.OPENAI_BASE_URL } : undefined,
      });

      const response = await llm.invoke(`
You are a business research analyst. Given the search results about "${state.query}", determine:
1. Does an actual, real company with the name "${state.query}" (or a very close spelling variation / official name) exist as a real business entity? Respond with exists: true or false.
   * Note: Generic terms, stock search phrases (like "adani stock"), or completely fictional/unrelated names should be marked as exists: false.
2. If exists is true, extract or estimate the following profile fields:
   - country (ISO country code, e.g., 'US', 'IN', 'GB', 'DE')
   - industry (e.g., 'Software', 'Artificial Intelligence', 'Logistics')
   - sector (e.g., 'Technology', 'Healthcare', 'Industrials')
   - weburl (official homepage URL)
   - currency (primary currency, e.g., 'USD', 'INR', 'EUR')
   - marketCap (estimated valuation in absolute currency units if known/mentioned, or 0)
   - description (a brief 1-2 sentence description of what the company does)
3. If exists is false, provide a brief explanation why (e.g., "Generic stock search term, not a specific company name. Please query a specific company like Adani Power.").

Search Results context:
${searchContext}

Respond ONLY with a valid JSON object matching this structure:
{
  "exists": true,
  "country": "...",
  "industry": "...",
  "sector": "...",
  "weburl": "...",
  "currency": "...",
  "marketCap": 0,
  "description": "..."
}
OR if it does not exist:
{
  "exists": false,
  "explanation": "..."
}
`);
      const text = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      const cleanJson = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
      const parsed = JSON.parse(cleanJson);
      
      if (parsed.exists === false) {
        errors.push(parsed.explanation || `No company named "${state.query}" exists. Please correct the spelling or query name.`);
        return {
          errors: [...state.errors, ...errors],
          status: 'error',
        };
      }
      
      privateProfile = { ...privateProfile, ...parsed };
    } catch (err: any) {
      console.error('[Fetcher] Private profile generation failed:', err);
      errors.push(`Analysis failed: ${err.message || 'Could not verify company existence.'}`);
      return {
        errors: [...state.errors, ...errors],
        status: 'error',
      };
    }

    company = {
      name: state.query,
      ticker: ticker.toUpperCase(),
      exchange: 'PRIVATE',
      industry: privateProfile.industry,
      sector: privateProfile.sector,
      country: privateProfile.country,
      currency: privateProfile.currency,
      currentPrice: privateProfile.currentPrice,
      high52Week: privateProfile.currentPrice,
      low52Week: privateProfile.currentPrice,
      logo: privateProfile.weburl ? `https://logo.clearbit.com/${privateProfile.weburl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}` : '',
      weburl: privateProfile.weburl || '',
      marketCap: privateProfile.marketCap,
    };

    if (company.weburl) {
      scrapedUrls.push({
        title: `${company.name} Official Website`,
        url: company.weburl,
        confidence: 0.95
      });
    }
  } else {
    company = await fetchCompanyProfile(ticker);
    if (!company) {
      errors.push('Company profile unavailable; proceeding with limited data.');
      const cleanTicker = ticker.toUpperCase().replace('.NS', '');
      company = {
        name: cleanTicker,
        ticker: ticker.toUpperCase(),
        exchange: ticker.toUpperCase().endsWith('.NS') ? 'NSE' : 'NASDAQ',
        industry: 'Diversified Industries',
        sector: 'Diversified Industries',
        country: ticker.toUpperCase().endsWith('.NS') ? 'India' : 'US',
        currency: ticker.toUpperCase().endsWith('.NS') ? 'INR' : 'USD',
        currentPrice: ticker.toUpperCase().endsWith('.NS') ? 500 : 100,
        high52Week: ticker.toUpperCase().endsWith('.NS') ? 600 : 120,
        low52Week: ticker.toUpperCase().endsWith('.NS') ? 400 : 80,
        logo: '',
        weburl: '',
        marketCap: ticker.toUpperCase().endsWith('.NS') ? 1e11 : 1e10,
      };
    }

    // Collect public company scraped URLs
    const googleTicker = mapTickerToGoogleFinance(ticker);
    scrapedUrls.push({
      title: `${company?.name || ticker} Google Finance Page`,
      url: `https://www.google.com/finance/quote/${googleTicker}`,
      confidence: 0.90
    });

    const isINR = ticker.toUpperCase().endsWith('.NS') || ticker.toUpperCase().endsWith('.BO');
    const cleanTicker = ticker.split('.')[0].toUpperCase();
    if (isINR) {
      scrapedUrls.push({
        title: `${company?.name || cleanTicker} Screener.in Profile`,
        url: `https://www.screener.in/company/${cleanTicker}/`,
        confidence: 0.90
      });
    } else {
      const saSymbol = cleanTicker.toLowerCase();
      scrapedUrls.push({
        title: `${company?.name || cleanTicker} StockAnalysis.com Statistics`,
        url: `https://stockanalysis.com/stocks/${saSymbol}/statistics/`,
        confidence: 0.90
      });
      scrapedUrls.push({
        title: `${company?.name || cleanTicker} StockAnalysis.com Financials`,
        url: `https://stockanalysis.com/stocks/${saSymbol}/financials/`,
        confidence: 0.90
      });
    }

    if (company?.weburl) {
      scrapedUrls.push({
        title: `${company.name} Official Website`,
        url: company.weburl,
        confidence: 0.95
      });
    }
  }

  // --- Step 3: Fetch financial metrics ---
  const metrics = await fetchFinancialMetrics(ticker);

  // --- Step 3b: Fetch historical financials ---
  const historicalData = await fetchHistoricalFinancials(ticker);

  // --- Step 4: Fetch news ---
  const newsItems = await fetchCompanyNews(ticker);
  for (const item of newsItems) {
    if (item.url && item.url !== '#') {
      scrapedUrls.push({
        title: item.headline,
        url: item.url,
        confidence: 0.70
      });
    }
  }

  console.log(
    `[Fetcher] Fetched: profile=${!!company}, metrics=${!!metrics}, historicalData=${historicalData.length} years, news=${newsItems.length} items`
  );

  return {
    company: company || null,
    rawFinancials: { metrics, historicalData } as Record<string, unknown>,
    newsItems,
    scrapedUrls,
    errors: [...state.errors, ...errors],
    status: 'analyzing',
  };
}
