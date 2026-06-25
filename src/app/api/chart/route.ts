// ============================================
// Alladin – /api/chart  (GET)
// ============================================
// Proxies and formats stock historical chart data
// from Yahoo Finance public API for interactive dashboard charts.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

const RANGE_CONFIGS: Record<string, { range: string; interval: string }> = {
  '1d': { range: '1d', interval: '5m' },
  '5d': { range: '5d', interval: '30m' },
  '1m': { range: '1mo', interval: '1d' },
  '6m': { range: '6mo', interval: '1d' },
  'ytd': { range: 'ytd', interval: '1d' },
  '1y': { range: '1y', interval: '1d' },
  '5y': { range: '5y', interval: '1wk' },
  'max': { range: 'max', interval: '1mo' },
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker')?.trim() || 'AAPL';
    const rangeParam = searchParams.get('range')?.toLowerCase().trim() || '1m';

    const config = RANGE_CONFIGS[rangeParam] || RANGE_CONFIGS['1m'];

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${config.range}&interval=${config.interval}`;
    
    console.log(`[API Chart] Fetching ${ticker} range=${rangeParam} (${config.range}/${config.interval})`);

    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      },
      timeout: 8000
    });

    const result = data?.chart?.result?.[0];
    if (!result) {
      return NextResponse.json({ error: 'No chart data found for this symbol.' }, { status: 404 });
    }

    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const closePrices = quotes.close || [];
    const meta = result.meta || {};

    const currency = meta.currency || 'USD';
    const previousClose = meta.previousClose || null;
    const regularMarketPrice = meta.regularMarketPrice || null;

    // Filter and interpolate null values
    let lastValidPrice = previousClose || null;
    const points: { time: number; close: number }[] = [];

    for (let idx = 0; idx < timestamps.length; idx++) {
      const time = timestamps[idx];
      let price = closePrices[idx];

      if (price === null || price === undefined) {
        if (lastValidPrice === null) continue; // Skip until we find a valid price
        price = lastValidPrice;
      } else {
        lastValidPrice = price;
      }

      points.push({
        time,
        close: Number(price.toFixed(2)),
      });
    }

    return NextResponse.json({
      ticker: meta.symbol || ticker,
      currency,
      exchange: meta.exchangeName || null,
      previousClose,
      regularMarketPrice,
      points,
    });
  } catch (err: any) {
    console.error('[API Chart] Unhandled error:', err.message);
    return NextResponse.json(
      { error: 'Failed to fetch live chart data. Please try again later.' },
      { status: 500 }
    );
  }
}
