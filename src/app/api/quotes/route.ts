// ============================================
// Alladin – /api/quotes  (GET)
// ============================================
// Fetches live quotes (prices and percentage changes)
// for the popular stock picks dynamically via Yahoo v8 Chart API
// with Finnhub and fallback support.
// ============================================

import { NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Cache quotes for 60 seconds

const POPULAR_COMPANIES = [
  { label: 'Apple', ticker: 'AAPL', defaultChange: '+1.2%', defaultPrice: '$344.00' },
  { label: 'Tesla', ticker: 'TSLA', defaultChange: '+2.4%', defaultPrice: '$385.00' },
  { label: 'Reliance', ticker: 'RELIANCE.NS', defaultChange: '+0.5%', defaultPrice: '₹1,209.00' },
  { label: 'Microsoft', ticker: 'MSFT', defaultChange: '+0.9%', defaultPrice: '$532.00' },
  { label: 'NVIDIA', ticker: 'NVDA', defaultChange: '+2.1%', defaultPrice: '$221.00' },
  { label: 'SpaceX', ticker: 'SPCX', defaultChange: '+0.9%', defaultPrice: '$156.11' },
  { label: 'Google', ticker: 'GOOGL', defaultChange: '+0.6%', defaultPrice: '$335.00' },
  { label: 'Amazon', ticker: 'AMZN', defaultChange: '+1.4%', defaultPrice: '$262.00' },
];

export async function GET() {
  try {
    const results = await Promise.all(
      POPULAR_COMPANIES.map(async (company) => {
        // SpaceX is private; return estimated price
        if (company.ticker === 'SPCX') {
          return {
            label: company.label,
            ticker: company.ticker,
            price: company.defaultPrice,
            change: company.defaultChange,
          };
        }

        try {
          // 1. Primary: Yahoo v8 chart endpoint
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(company.ticker)}?range=1d&interval=1d`;
          const { data } = await axios.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
            },
            timeout: 5000,
          });

          const meta = data?.chart?.result?.[0]?.meta;
          const rawPrice = meta?.regularMarketPrice;
          const rawChange = meta?.regularMarketChangePercent;

          if (rawPrice !== undefined && rawPrice !== null && !isNaN(rawPrice)) {
            const isINR = meta?.currency === 'INR' || company.ticker.endsWith('.NS') || company.ticker.endsWith('.BO');
            const currencySymbol = isINR ? '₹' : '$';
            const formattedPrice = `${currencySymbol}${Number(rawPrice).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`;
            const formattedChange = `${rawChange >= 0 ? '+' : ''}${Number(rawChange || 0).toFixed(2)}%`;

            return {
              label: company.label,
              ticker: company.ticker,
              price: formattedPrice,
              change: formattedChange,
            };
          }
        } catch (yahooErr: any) {
          // Yahoo chart failed, try Finnhub quote if available
          if (process.env.FINNHUB_API_KEY) {
            try {
              const cleanSym = company.ticker.split('.')[0].toUpperCase();
              const fhUrl = `https://finnhub.io/api/v1/quote?symbol=${cleanSym}&token=${process.env.FINNHUB_API_KEY}`;
              const { data: fhData } = await axios.get(fhUrl, { timeout: 4000 });
              if (fhData && fhData.c && fhData.c > 0) {
                const formattedPrice = `$${Number(fhData.c).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`;
                const formattedChange = `${fhData.dp >= 0 ? '+' : ''}${Number(fhData.dp || 0).toFixed(2)}%`;
                return {
                  label: company.label,
                  ticker: company.ticker,
                  price: formattedPrice,
                  change: formattedChange,
                };
              }
            } catch (fhErr) {
              // ignore
            }
          }
          console.warn(`[API Quotes] Warning fetching ${company.ticker}:`, yahooErr.message);
        }

        // Fallback to default
        return {
          label: company.label,
          ticker: company.ticker,
          price: company.defaultPrice,
          change: company.defaultChange,
        };
      })
    );

    return NextResponse.json(results);
  } catch (err) {
    console.error('[API Quotes] Unhandled error:', err);
    return NextResponse.json(
      POPULAR_COMPANIES.map((c) => ({
        label: c.label,
        ticker: c.ticker,
        price: c.defaultPrice,
        change: c.defaultChange,
      }))
    );
  }
}
