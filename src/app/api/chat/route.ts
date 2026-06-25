// ============================================
// Alladin – /api/chat  (POST)
// ============================================
// Follow-up chat endpoint with session memory.  Allows users to
// ask Alladin questions about a previously generated report.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';

// Simple in-memory session store (would use Redis/DB in production)
const sessions: Map<string, { messages: { role: string; content: string }[] }> = new Map();

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
        messages: [
          {
            role: 'system',
            content: `You are Aladdin, an AI investment research assistant based on Benjamin Graham's "The Intelligent Investor" principles. You provide thoughtful, data-driven investment analysis. You always include the disclaimer that this is not financial advice.

${context ? `Here is the context of the most recent analysis:\n${context}` : ''}

Always be professional, cite specific data when possible, and reference Graham's principles in your answers.`,
          },
        ],
      });
    }

    const session = sessions.get(sid)!;
    session.messages.push({ role: 'user', content: message });

    // Generate response
    let reply = '';
    try {
      const llm = new ChatOpenAI({
        modelName: process.env.LLM_MODEL || 'gpt-4o-mini',
        temperature: 0.5,
        maxTokens: 800,
        configuration: process.env.OPENAI_BASE_URL ? { baseURL: process.env.OPENAI_BASE_URL } : undefined,
      });

      const response = await llm.invoke(
        session.messages.map((m) => ({
          role: m.role as 'system' | 'user' | 'assistant',
          content: m.content,
        }))
      );
      reply = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    } catch (err) {
      console.error('[Chat] LLM call failed:', err);
      reply = `I apologize, but I'm unable to process your question at the moment. The AI service may be temporarily unavailable. Please try again shortly.\n\n*As Graham would say: "The investor's chief problem — and even his worst enemy — is likely to be himself." Patience is key!*`;
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
