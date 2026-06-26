// ============================================
// Alladin – Shared LLM Factory
// ============================================
// Centralises ChatOpenAI creation so every node uses a consistent
// configuration.  Auto-detects the LLM provider from the API key
// format so Vercel deployments only need OPENAI_API_KEY set.
//
// Supported auto-detection:
//   gsk_*  → Groq   (https://api.groq.com/openai/v1)
//   sk-*   → OpenAI (default)
//
// To deploy on Vercel, add these environment variables:
//   OPENAI_API_KEY  — your Groq or OpenAI key
//   OPENAI_BASE_URL — https://api.groq.com/openai/v1  (Groq only)
//   LLM_MODEL       — llama-3.3-70b-versatile         (Groq only)
// ============================================

import { ChatOpenAI } from '@langchain/openai';

/** Provider configuration resolved from the API key. */
interface ProviderConfig {
  baseURL: string | undefined;
  defaultModel: string;
}

/**
 * Auto-detect the LLM provider from the API key prefix.
 * This removes the need to manually set OPENAI_BASE_URL and LLM_MODEL
 * on hosting platforms like Vercel when using a Groq key.
 */
function detectProvider(apiKey: string): ProviderConfig {
  if (apiKey.startsWith('gsk_')) {
    return {
      baseURL: 'https://api.groq.com/openai/v1',
      defaultModel: 'llama-3.3-70b-versatile',
    };
  }
  // Default: OpenAI
  return {
    baseURL: undefined,
    defaultModel: 'gpt-4o-mini',
  };
}

/**
 * Returns true when a valid LLM API key is configured.
 */
export function isLLMAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Create a ChatOpenAI instance with the project's standard configuration.
 * Returns `null` when no API key is configured — callers use fallbacks.
 *
 * Resolution order for base URL:
 *   1. OPENAI_BASE_URL env var
 *   2. Auto-detected from key prefix (gsk_ → Groq)
 *
 * Resolution order for model:
 *   1. LLM_MODEL env var
 *   2. Auto-detected from key prefix
 *
 * @param opts.temperature – sampling temperature (default 0.3)
 * @param opts.maxTokens   – max output tokens   (default 1200)
 */
export function createLLM(
  opts: { temperature?: number; maxTokens?: number } = {}
): ChatOpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('[LLM] OPENAI_API_KEY not set — add it to your Vercel environment variables.');
    return null;
  }

  const provider = detectProvider(apiKey);

  // Explicit env vars override auto-detection
  const baseURL = process.env.OPENAI_BASE_URL || provider.baseURL;
  const model = process.env.LLM_MODEL || provider.defaultModel;

  console.log(`[LLM] Creating instance — model: ${model}, base: ${baseURL || 'OpenAI default'}`);

  return new ChatOpenAI({
    openAIApiKey: apiKey,
    modelName: model,
    temperature: opts.temperature ?? 0.3,
    maxTokens: opts.maxTokens ?? 1200,
    configuration: baseURL ? { baseURL } : undefined,
  });
}
