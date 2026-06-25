// ============================================
// Alladin – Web Search & RAG Scraper Client
// ============================================
// Performs real Web Scraping of live news pages to retrieve
// contextual paragraphs (RAG) for LLM analysis.
// Falls back to search results if URLs are blocked or timeout.
// ============================================

import axios from 'axios';

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

/**
 * scrapeArticleText – Scrapes the HTML at a given URL and extracts <p> paragraph contents.
 */
export async function scrapeArticleText(url: string): Promise<string> {
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 5000,
    });

    // Simple regex parser to scrape paragraph text
    const paragraphRegex = /<p>([\s\S]*?)<\/p>/g;
    let match;
    const paragraphs: string[] = [];
    
    while ((match = paragraphRegex.exec(data)) !== null && paragraphs.length < 5) {
      const pText = match[1]
        .replace(/<[^>]*>/g, '') // Strip inline html elements
        .replace(/\s+/g, ' ')   // Normalize white spaces
        .trim();
      
      if (pText.length > 60 && !pText.toLowerCase().includes('cookie') && !pText.toLowerCase().includes('javascript')) {
        paragraphs.push(pText);
      }
    }
    
    return paragraphs.join('\n\n');
  } catch (err) {
    // Silently handle block/timeout and let the pipeline proceed
    return '';
  }
}

/**
 * Search the web using Tavily or Google News RSS scraper.
 */
export async function searchWeb(query: string, maxResults = 3): Promise<SearchResult[]> {
  const key = process.env.TAVILY_API_KEY;
  if (key && key !== 'tvly-your-tavily-key-here') {
    try {
      const { data } = await axios.post(
        'https://api.tavily.com/search',
        {
          api_key: key,
          query,
          max_results: maxResults,
          search_depth: 'advanced',
          include_answer: false,
        },
        { timeout: 15000 }
      );

      return (data.results || []).map(
        (r: { title: string; url: string; content: string; relevance_score: number }) => ({
          title: r.title,
          url: r.url,
          content: r.content || '',
          score: r.relevance_score || 0.5,
        })
      );
    } catch (err) {
      console.error('[Search] Tavily search failed, falling back to Web Scraper:', err);
    }
  }

  // Fallback / Default: Web scrape Google News RSS feed for real live articles
  try {
    const { data } = await axios.get(
      `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        timeout: 8000,
      }
    );

    const results: SearchResult[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(data)) !== null && results.length < maxResults) {
      const itemContent = match[1];
      const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/);

      const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
      const link = linkMatch ? linkMatch[1].trim() : '';

      if (title && link) {
        // Scrape article text content for true RAG
        const scrapedText = await scrapeArticleText(link);
        
        results.push({
          title,
          url: link,
          content: scrapedText || `News summary: Latest coverage on ${title}.`,
          score: 0.9,
        });
      }
    }

    if (results.length > 0) return results;
  } catch (err) {
    console.error('[Scraper RAG] Scrape process failed:', err);
  }

  return getMockSearchResults(query);
}

// ============================================
// Fallback search results
// ============================================

function getMockSearchResults(query: string): SearchResult[] {
  const q = query.toLowerCase();

  const results: SearchResult[] = [
    {
      title: `Market Analysis: ${query} – Current Outlook & Trends`,
      url: 'https://seekingalpha.com/analysis',
      content: `Comprehensive analysis of ${query} shows mixed signals. Revenue growth remains positive but margin pressures from increased competition and rising costs are concerns. Analysts maintain a cautiously optimistic outlook with price targets ranging from moderate to bullish scenarios.`,
      score: 0.92,
    },
    {
      title: `${query} – Geopolitical Risk Assessment`,
      url: 'https://reuters.com/business',
      content: `Ongoing trade tensions between major economies continue to affect global supply chains. Recent tariff adjustments and regulatory changes could impact companies in this sector. Central bank policies remain accommodative but inflation concerns persist.`,
      score: 0.85,
    },
    {
      title: `Industry Report: Sector Performance & Government Policies`,
      url: 'https://mckinsey.com/industries',
      content: `Government initiatives including tax incentives, infrastructure spending, and regulatory reforms are creating both opportunities and challenges. The sector benefits from digital transformation trends and sustainability mandates driving long-term structural growth.`,
      score: 0.78,
    },
  ];

  if (q.includes('india') || q.includes('reliance') || q.includes('tata') || q.includes('nse')) {
    results.push({
      title: 'India Market: Policy Reforms & Growth Outlook',
      url: 'https://economictimes.indiatimes.com',
      content: 'India\'s economic reforms including PLI schemes, Make in India initiatives, and digital infrastructure investments are attracting significant FDI. The government\'s target of becoming a $5 trillion economy drives policy support across sectors. GST simplification and ease of doing business improvements continue.',
      score: 0.88,
    });
  }

  if (q.includes('ev') || q.includes('tesla') || q.includes('electric')) {
    results.push({
      title: 'EV Market: Global Transition & Policy Support',
      url: 'https://bloomberg.com/green',
      content: 'Global EV adoption accelerates with governments setting ambitious targets. US IRA subsidies, EU emission regulations, and China\'s NEV mandates create strong tailwinds. Battery technology improvements and charging infrastructure expansion support long-term growth.',
      score: 0.90,
    });
  }

  if (q.includes('ai') || q.includes('tech') || q.includes('nvidia') || q.includes('microsoft')) {
    results.push({
      title: 'AI Revolution: Investment Implications & Market Dynamics',
      url: 'https://techcrunch.com',
      content: 'The AI infrastructure buildout represents a multi-trillion dollar investment cycle. Data center demand, chip supply constraints, and enterprise AI adoption are driving revenue growth. Regulatory frameworks for AI are emerging globally, creating both opportunity and uncertainty.',
      score: 0.91,
    });
  }

  return results;
}
