// ============================================
// Alladin – Sentiment Analyst Node (Mr. Market)
// ============================================
// Channels Benjamin Graham's "Mr. Market" allegory: the market is an
// emotional partner who alternates between euphoria and panic.
// This node scores the emotional temperature and identifies whether
// the crowd is creating a buying opportunity or a bubble risk.
// ============================================

import { createLLM } from '../llm';
import type { AgentState, SentimentAnalysis } from '../state';
import { searchWeb } from '../../api/search';

/**
 * sentimentNode – Mr. Market emotional analysis.
 * Reads: company, newsItems
 * Writes: sentiment
 */
export async function sentimentNode(state: AgentState): Promise<Partial<AgentState>> {
  console.log('[Sentiment] Analyzing market mood for:', state.company?.name || state.query);

  const company = state.company;
  const name = company?.name || state.query;
  const ticker = company?.ticker || state.query;

  // --- Gather additional sentiment data via search ---
  let searchResults: { title: string; content: string; url: string }[] = [];
  try {
    searchResults = await searchWeb(`${name} ${ticker} stock market sentiment Reddit Twitter investor opinion 2024 2025`);
  } catch (err) {
    console.error('[Sentiment] Search failed:', err);
  }

  const scrapedUrls: { title: string; url: string; confidence: number }[] = [];
  for (const r of searchResults) {
    if (r.url && r.url !== '#') {
      scrapedUrls.push({
        title: r.title || `${name} Sentiment Source`,
        url: r.url,
        confidence: 0.75
      });
    }
  }

  // --- Compute raw sentiment score from news items ---
  const newsScores = state.newsItems.map((n) => n.sentiment);
  const avgNewsSentiment = newsScores.length > 0
    ? newsScores.reduce((a, b) => a + b, 0) / newsScores.length
    : 0;

  // --- Mock social media data (would use real APIs in production) ---
  const socialMentions = [
    { platform: 'Reddit (r/wallstreetbets)', sentiment: 0.3 + Math.random() * 0.4, volume: Math.floor(500 + Math.random() * 2000) },
    { platform: 'Twitter/X', sentiment: -0.1 + Math.random() * 0.6, volume: Math.floor(1000 + Math.random() * 5000) },
    { platform: 'StockTwits', sentiment: 0.1 + Math.random() * 0.5, volume: Math.floor(200 + Math.random() * 800) },
  ];

  // Weighted sentiment: news = 40%, social = 30%, search = 30%
  const socialAvg = socialMentions.reduce((a, s) => a + s.sentiment, 0) / socialMentions.length;
  const rawScore = (avgNewsSentiment * 0.4 + socialAvg * 0.3 + 0.3 * 0.5); // search assumed neutral-positive
  const sentimentScore = Math.round(Math.max(0, Math.min(100, (rawScore + 1) * 50)));

  const overallSentiment = classifySentiment(sentimentScore);

  // --- LLM qualitative analysis ---
  let analysis = '';
  try {
    const llm = createLLM({ temperature: 0.4, maxTokens: 1000 });
    if (!llm) throw new Error('LLM not available');


    const newsContext = state.newsItems.slice(0, 5).map(
      (n) => `- ${n.headline} (${n.source}, sentiment: ${n.sentiment > 0 ? 'positive' : n.sentiment < 0 ? 'negative' : 'neutral'})`
    ).join('\n');

    const searchContext = searchResults.slice(0, 3).map(
      (s) => `- ${s.title}: ${s.content.slice(0, 200)}`
    ).join('\n');

    const prompt = `You are analyzing market sentiment through the lens of Benjamin Graham's "Mr. Market" allegory.

Company: ${name} (${ticker})
Current Sentiment Score: ${sentimentScore}/100 (${overallSentiment})

Recent News:
${newsContext || 'No recent news available'}

Social Media/Search Insights:
${searchContext || 'Limited social data available'}

Social Mentions:
${socialMentions.map(s => `- ${s.platform}: sentiment ${(s.sentiment * 100).toFixed(0)}/100, volume: ${s.volume}`).join('\n')}

Provide a Mr. Market analysis (3-4 paragraphs):
1. What is Mr. Market's current mood? Is he euphoric, fearful, or somewhere in between?
2. Is the crowd creating a buying opportunity (excessive pessimism) or bubble risk (over-optimism)?
3. What would Graham advise: take advantage of Mr. Market's mood or wait?
4. Key behavioral biases visible in current market sentiment.

Frame everything through Graham's principle: "The investor's chief problem — and his worst enemy — is likely to be himself."`;

    const response = await llm.invoke(prompt);
    analysis = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
  } catch (err) {
    console.error('[Sentiment] LLM analysis failed:', err);
    analysis = generateFallbackSentiment(name, sentimentScore, overallSentiment);
  }

  const result: SentimentAnalysis = {
    overallSentiment,
    sentimentScore,
    newsItems: state.newsItems,
    socialMentions,
    analysis,
  };

  return { sentiment: result, scrapedUrls };
}

function classifySentiment(score: number): SentimentAnalysis['overallSentiment'] {
  if (score <= 20) return 'extreme_fear';
  if (score <= 40) return 'fear';
  if (score <= 60) return 'neutral';
  if (score <= 80) return 'greed';
  return 'extreme_greed';
}

function generateFallbackSentiment(name: string, score: number, mood: string): string {
  return `## Mr. Market Analysis: ${name}

**Sentiment Score: ${score}/100 — ${mood.replace('_', ' ').toUpperCase()}**

### Current Market Mood
Mr. Market is currently displaying ${
    score > 70 ? 'significant optimism, bordering on euphoria' :
    score > 50 ? 'cautious optimism with underlying confidence' :
    score > 30 ? 'mixed emotions with a lean toward caution' :
    'notable pessimism, potentially driven by fear'
  }. As Graham would remind us, Mr. Market's daily price offerings are just that — offerings, not commands.

### Crowd Psychology
${score > 70
    ? 'The prevailing bullish sentiment suggests investors may be paying a "popularity premium." Graham warned against following the crowd during periods of euphoria, as this is precisely when margin of safety erodes and speculative risk increases.'
    : score < 30
    ? 'The widespread pessimism may be creating a contrarian opportunity. Graham emphasized that the best investments are often found when "the blood is running in the streets" — when Mr. Market is at his most despondent.'
    : 'Market participants show balanced views, neither overly optimistic nor pessimistic. This neutral stance allows for rational analysis without the distortion of extreme crowd psychology.'
  }

### Graham's Advice
${score > 70
    ? 'Graham would counsel patience here. "The intelligent investor should recognize that market enthusiasm usually signals danger, not opportunity." Wait for Mr. Market to offer a more reasonable price.'
    : score < 30
    ? 'Graham would see potential opportunity: "You are neither right nor wrong because the crowd disagrees with you. You are right because your data and reasoning are right." If fundamentals support the investment, this fear-driven discount could be advantageous.'
    : 'With balanced sentiment, Graham would say to focus on intrinsic value calculations rather than crowd behavior. The current mood neither enhances nor diminishes the investment case.'
  }`;
}
