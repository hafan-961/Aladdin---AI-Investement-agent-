// ============================================
// Alladin – /api/analyze  (POST)
// ============================================
// Accepts a company name or ticker, runs the full LangGraph pipeline,
// and returns the complete analysis state.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { runInvestmentAnalysis } from '@/lib/agents/graph';

export const maxDuration = 120; // Allow up to 2 minutes on Vercel

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const query = body.query?.trim();

    if (!query) {
      return NextResponse.json(
        { error: 'Please provide a company name or ticker symbol.' },
        { status: 400 }
      );
    }

    console.log(`[API] /api/analyze — query: "${query}"`);

    // Run the full investment analysis pipeline
    const result = await runInvestmentAnalysis(query);

    // Check for critical errors
    if (result.status === 'error' && !result.decision) {
      return NextResponse.json(
        {
          error: result.errors.join('; ') || 'Analysis failed. Please try again.',
          partialResult: result,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error('[API] Unhandled error in /api/analyze:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
