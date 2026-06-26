// ============================================
// Alladin – /api/chat  (POST)
// ============================================
// Follow-up chat endpoint with session memory.  Allows users to
// ask Alladin questions about a previously generated report.
// Falls back to context-aware extraction when LLM is unavailable.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createLLM } from '@/lib/agents/llm';

// Simple in-memory session store (would use Redis/DB in production)
const sessions: Map<string, { messages: { role: string; content: string }[]; context?: string }> = new Map();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, sessionId, context } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'Please provide a message.' },
        { status: 400 }
      );
    }

    // Get or create session
    const sid = sessionId || `session_${Date.now()}`;
    if (!sessions.has(sid)) {
      sessions.set(sid, {
        context: context || '',
        messages: [
          {
            role: 'system',
            content: `You are Aladdin, an AI investment research assistant based on Benjamin Graham's "The Intelligent Investor" principles. You provide thoughtful, data-driven investment analysis. You always include the disclaimer that this is not financial advice.\n\n${context ? `Here is the context of the most recent analysis:\n${context}` : ''}\n\nAlways be professional, cite specific data when possible, and reference Graham's principles in your answers.`,
          },
        ],
      });
    }

    const session = sessions.get(sid)!;
    session.messages.push({ role: 'user', content: message });

    // Generate response
    let reply = '';
    try {
      const llm = createLLM({ temperature: 0.5, maxTokens: 800 });
  

      const response = await llm.invoke(
        session.messages.map((m) => ({
          role: m.role as 'system' | 'user' | 'assistant',
          content: m.content,
        }))
      );
      reply = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    } catch (err) {
      console.error('[Chat] LLM call failed:', err);
      // Generate a context-aware fallback response from the report
      reply = generateFallbackReply(message, session.context || context || '');
    }

    session.messages.push({ role: 'assistant', content: reply });

    // Keep only last 20 messages to prevent context overflow
    if (session.messages.length > 21) {
      session.messages = [session.messages[0], ...session.messages.slice(-20)];
    }

    return NextResponse.json({
      reply,
      sessionId: sid,
    });
  } catch (err) {
    console.error('[API] Unhandled error in /api/chat:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}

// ============================================
// Context-aware fallback when LLM is unavailable
// ============================================

function generateFallbackReply(question: string, reportContext: string): string {
  const q = question.toLowerCase();

  // Try to extract the company name from context
  const companyMatch = reportContext.match(/Investment Report:\s*(.+?)\s*\(/);
  const companyName = companyMatch ? companyMatch[1].trim() : 'the company';

  // Try to extract the decision
  const decisionMatch = reportContext.match(/Decision:\s*\*?\*?(INVEST|PASS)\*?\*?/i);
  const decision = decisionMatch ? decisionMatch[1].toUpperCase() : null;

  // Extract key data points from the report
  const marginMatch = reportContext.match(/[Mm]argin of [Ss]afety[:\s]*([+-]?\d+\.?\d*%?)/);
  const confidenceMatch = reportContext.match(/[Cc]onfidence[:\s]*(\d+)/);

  // --- Match question to report sections ---

  if (q.includes('why') && (q.includes('not') || q.includes("n't")) && q.includes('invest')) {
    const keyReasoning = extractSection(reportContext, 'Key Reasoning', 'Risk-Reward');
    if (keyReasoning) {
      return `Based on the analysis of ${companyName}:\n\n${keyReasoning.slice(0, 800)}\n\n${marginMatch ? `The margin of safety is ${marginMatch[1]}, which ` + (parseFloat(marginMatch[1]) < 30 ? 'falls below Graham\'s recommended 30% threshold.' : 'provides a reasonable buffer.') : ''}\n\n⚠️ *This is not financial advice. Always consult a qualified financial advisor.*`;
    }
    return decision === 'PASS'
      ? `The analysis recommended **PASS** on ${companyName}. ${marginMatch ? `The margin of safety of ${marginMatch[1]} does not meet Graham's recommended minimum threshold of 30%.` : 'The current valuation does not offer sufficient margin of safety based on Graham\'s defensive investor criteria.'} Key concerns include valuation premium relative to intrinsic value and risk-reward profile.\n\n⚠️ *This is not financial advice.*`
      : `The analysis actually recommended **INVEST** on ${companyName}. Please review the full report for details on the investment thesis.\n\n⚠️ *This is not financial advice.*`;
  }

  if (q.includes('risk') || q.includes('danger') || q.includes('concern')) {
    const riskSection = extractSection(reportContext, 'Risk', 'Condition') ||
                        extractSection(reportContext, 'Geopolitical', 'Scenario') ||
                        extractSection(reportContext, 'Key Reasoning', 'Risk-Reward');
    if (riskSection) {
      return `Here are the key risks identified for ${companyName}:\n\n${riskSection.slice(0, 800)}\n\n⚠️ *This is not financial advice.*`;
    }
    return `The analysis identifies several risk factors for ${companyName} including market valuation risk, macroeconomic uncertainty, and sector-specific challenges. Please refer to the Geopolitics and Sentiment sections of the report for detailed risk assessment.\n\n⚠️ *This is not financial advice.*`;
  }

  if (q.includes('safe') || q.includes('defensive') || q.includes('conservative')) {
    const fundamentals = extractSection(reportContext, 'Investor Classification', 'Scenario') ||
                         extractSection(reportContext, 'Defensive', 'Condition');
    if (fundamentals) {
      return `Regarding suitability for defensive investors:\n\n${fundamentals.slice(0, 600)}\n\nAs Graham defined it, a defensive investor seeks safety of principal and an adequate return, preferring stocks with strong financial conditions, adequate size, and moderate P/E ratios.\n\n⚠️ *This is not financial advice.*`;
    }
    return `For a defensive investor following Graham's criteria, the key factors are: adequate company size, strong financial condition (current ratio > 2), earnings stability, dividend record, moderate P/E (< 20), and moderate P/B (< 2.5). Please review the Fundamentals tab for the full Graham checklist results.\n\n⚠️ *This is not financial advice.*`;
  }

  if (q.includes('buy') || q.includes('entry') || q.includes('when') || q.includes('wait') || q.includes('dip')) {
    const conditions = extractSection(reportContext, 'Conditions', 'Sources') ||
                       extractSection(reportContext, 'Ideal entry', 'Stop loss');
    if (conditions) {
      return `Here's what the analysis suggests about timing:\n\n${conditions.slice(0, 600)}\n\nAs Graham taught: *"The intelligent investor is a realist who sells to optimists and buys from pessimists."*\n\n⚠️ *This is not financial advice.*`;
    }
    return `Graham's principle on timing: don't try to time the market. Instead, focus on whether the stock offers sufficient margin of safety at the current price. ${marginMatch ? `Currently, the margin of safety is ${marginMatch[1]}.` : ''} ${decision === 'INVEST' ? 'The analysis suggests the current price may offer value.' : 'The analysis suggests waiting for a better entry point.'}\n\n⚠️ *This is not financial advice.*`;
  }

  if (q.includes('valuation') || q.includes('intrinsic') || q.includes('worth') || q.includes('value') || q.includes('price target')) {
    const valuation = extractSection(reportContext, 'Intrinsic Value', 'Mr. Market') ||
                      extractSection(reportContext, 'Valuation', 'Condition');
    if (valuation) {
      return `Here's the valuation assessment for ${companyName}:\n\n${valuation.slice(0, 800)}\n\n⚠️ *This is not financial advice.*`;
    }
    return `The valuation analysis uses two Graham-inspired models: the Graham Formula (V = EPS × (8.5 + 2g) × 4.4/Y) and a simplified DCF. ${marginMatch ? `The current margin of safety is ${marginMatch[1]}.` : ''} Please check the Valuation tab for full details.\n\n⚠️ *This is not financial advice.*`;
  }

  if (q.includes('sentiment') || q.includes('market mood') || q.includes('mr. market') || q.includes('fear') || q.includes('greed')) {
    const sentiment = extractSection(reportContext, 'Mr. Market', 'Investor Classification') ||
                      extractSection(reportContext, 'Sentiment', 'Geopolitical');
    if (sentiment) {
      return `Mr. Market analysis for ${companyName}:\n\n${sentiment.slice(0, 800)}\n\n⚠️ *This is not financial advice.*`;
    }
    return `Graham's "Mr. Market" allegory reminds us that the market is an emotional partner. ${confidenceMatch ? `The current confidence score is ${confidenceMatch[1]}%.` : ''} Check the Sentiment tab for detailed market mood analysis.\n\n⚠️ *This is not financial advice.*`;
  }

  if (q.includes('summary') || q.includes('overview') || q.includes('tell me about') || q.includes('explain')) {
    const summary = extractSection(reportContext, 'Executive Summary', 'Decision') ||
                    reportContext.slice(0, 600);
    if (summary) {
      return `Here's the executive summary for ${companyName}:\n\n${summary.slice(0, 800)}\n\n⚠️ *This is not financial advice.*`;
    }
  }

  // Default: provide a general answer based on the decision
  if (decision) {
    return `Based on the comprehensive analysis, Aladdin's recommendation for ${companyName} is **${decision}**. ${marginMatch ? `The margin of safety is ${marginMatch[1]}. ` : ''}${confidenceMatch ? `Confidence level: ${confidenceMatch[1]}%. ` : ''}\n\nFor more details, please explore the different tabs in the report: **Fundamentals** (Graham checklist), **Valuation** (intrinsic value), **Sentiment** (market mood), and **Geopolitics** (macro risks).\n\nFeel free to ask about specific aspects like risks, valuation, or entry timing!\n\n⚠️ *This is not financial advice.*`;
  }

  return `Thank you for your question about ${companyName}. The detailed analysis is available in the report tabs above:\n\n• **Overview** — Executive summary and investment decision\n• **Fundamentals** — Graham's defensive investor checklist\n• **Valuation** — Intrinsic value and margin of safety\n• **Sentiment** — Mr. Market mood analysis\n• **Geopolitics** — Macro risks and opportunities\n\nPlease explore these sections for comprehensive insights!\n\n⚠️ *This is not financial advice.*`;
}

/**
 * Extracts text between two section headers from the report markdown.
 */
function extractSection(text: string, startMarker: string, endMarker: string): string | null {
  const startIdx = text.toLowerCase().indexOf(startMarker.toLowerCase());
  if (startIdx === -1) return null;

  const endIdx = endMarker ? text.toLowerCase().indexOf(endMarker.toLowerCase(), startIdx + startMarker.length) : -1;
  const extracted = endIdx > startIdx
    ? text.substring(startIdx, endIdx).trim()
    : text.substring(startIdx, startIdx + 800).trim();

  return extracted.length > 20 ? extracted : null;
}
