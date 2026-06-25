// ============================================
// Alladin – /api/quotes  (GET)
// ============================================
// Fetches live quotes (prices and percentage changes)
// for the popular stock picks dynamically from Google Finance.
// ============================================

import { NextResponse } from 'next/server';
import axios from 'axios';
import { mapTickerToGoogleFinance } from '@/lib/api/finnhub';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Cache quotes for 60 seconds

const POPULAR_COMPANIES = [
  { label: 'Apple', ticker: 'AAPL', defaultChange: '+1.2%', defaultPrice: '$294.30' },
  { label: 'Tesla', ticker: 'TSLA', defaultChange: '-0.8%', defaultPrice: '$381.61' },
  { label: 'Reliance', ticker: 'RELIANCE.NS', defaultChange: '+0.5%', defaultPrice: '₹1,313.50' },
  { label: 'Microsoft', ticker: 'MSFT', defaultChange: '+0.9%', defaultPrice: '$373.94' },
  { label: 'NVIDIA', ticker: 'NVDA', defaultChange: '+2.1%', defaultPrice: '$200.00' },
  { label: 'SpaceX', ticker: 'SPCX', defaultChange: '+0.9%', defaultPrice: '$156.11' },
  { label: 'Google', ticker: 'GOOGL', defaultChange: '+0.6%', defaultPrice: '$178.35' },
  { label: 'Amazon', ticker: 'AMZN', defaultChange: '+1.4%', defaultPrice: '$189.05' },
];

export async function GET() {
  try {
    const results = await Promise.all(
      POPULAR_COMPANIES.map(async (company) => {
        try {
          const googleTicker = mapTickerToGoogleFinance(company.ticker);
          const url = `https://www.google.com/finance/quote/${googleTicker}`;
          const { data } = await axios.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
              'Accept-Language': 'en-US,en;q=0.9',
            },
            timeout: 5000
          });

          // Parse Name
          const titleRegex = /<title>([^<]+)<\/title>/;
          let titleMatch = data.match(titleRegex);
          let name = company.label;
          if (titleMatch) {
            const titleText = titleMatch[1];
            const parts = titleText.split('(');
            if (parts.length > 0 && parts[0].trim().toLowerCase() !== 'google finance') {
              name = parts[0].trim();
            }
          }

          // Parse Price
          const titleIndex = data.indexOf('<title>');
          let nameIndex = data.indexOf(name, titleIndex + 50);
          if (nameIndex === -1) {
            nameIndex = titleIndex;
          }
          const pdsbrcRegex = /jsname="Pdsbrc"[^>]*><span>([^<]+)<\/span>/g;
          pdsbrcRegex.lastIndex = nameIndex;
          const priceMatch = pdsbrcRegex.exec(data);
          let priceString = priceMatch ? priceMatch[1] : company.defaultPrice;

          // Parse Change
          let changePercent = company.defaultChange;
          if (priceMatch) {
            const searchStart = priceMatch.index;
            const vY9t3bRegex = /jsname="vY9t3b"[^>]*>([^<]*<span[^>]*>)?([+-]?\d+\.\d+%)<\/span>/g;
            vY9t3bRegex.lastIndex = searchStart;
            const changeMatch = vY9t3bRegex.exec(data);
            if (changeMatch) {
              changePercent = changeMatch[2];
            }
          }

          return {
            label: company.label,
            ticker: company.ticker,
            price: priceString,
            change: changePercent
          };
        } catch (err: any) {
          console.error(`[API Quotes] Error fetching ${company.ticker}:`, err.message);
          return {
            label: company.label,
            ticker: company.ticker,
            price: company.defaultPrice,
            change: company.defaultChange
          };
        }
      })
    );

    return NextResponse.json(results);
  } catch (err) {
    console.error('[API Quotes] Unhandled error:', err);
    return NextResponse.json(
      POPULAR_COMPANIES.map(c => ({
        label: c.label,
        ticker: c.ticker,
        price: c.defaultPrice,
        change: c.defaultChange
      }))
    );
  }
}
