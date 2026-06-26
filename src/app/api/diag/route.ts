import { NextResponse } from 'next/server';

export async function GET() {
  const envKeys = Object.keys(process.env);
  const info = {
    OPENAI_API_KEY: {
      exists: !!process.env.OPENAI_API_KEY,
      length: process.env.OPENAI_API_KEY?.length || 0,
      prefix: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 5) : 'none',
      suffix: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(Math.max(0, process.env.OPENAI_API_KEY.length - 4)) : 'none',
    },
    OPENAI_BASE_URL: {
      exists: !!process.env.OPENAI_BASE_URL,
      value: process.env.OPENAI_BASE_URL || 'none',
    },
    LLM_MODEL: {
      exists: !!process.env.LLM_MODEL,
      value: process.env.LLM_MODEL || 'none',
    },
    TAVILY_API_KEY: {
      exists: !!process.env.TAVILY_API_KEY,
      length: process.env.TAVILY_API_KEY?.length || 0,
    },
    FINNHUB_API_KEY: {
      exists: !!process.env.FINNHUB_API_KEY,
      length: process.env.FINNHUB_API_KEY?.length || 0,
    },
    ALPHA_VANTAGE_API_KEY: {
      exists: !!process.env.ALPHA_VANTAGE_API_KEY,
      length: process.env.ALPHA_VANTAGE_API_KEY?.length || 0,
    },
  };

  return NextResponse.json({
    message: "Aladdin Environment Diagnostics (Secrets Masked)",
    info,
    all_env_keys: envKeys.filter(k => !k.toLowerCase().includes('secret') && !k.toLowerCase().includes('key') && !k.toLowerCase().includes('password') && !k.toLowerCase().includes('token') && !k.toLowerCase().includes('auth')),
  });
}
