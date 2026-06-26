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
 * on hosting platforms like Vercel.
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
 * Create a ChatOpenAI instance with the project's standard
 * configuration.  Returns `null` when no API key is set so
 * callers can fall back to non-LLM paths gracefully.
 *
 * Provider and model are auto-detected from the key prefix
 * but can be overridden via OPENAI_BASE_URL and LLM_MODEL
 * environment variables.
 *
 * @param opts.temperature – sampling temperature (default 0.3)
 * @param opts.maxTokens   – max output tokens   (default 1200)
 */
export function createLLM(
  opts: { temperature?: number; maxTokens?: number } = {}
): ChatOpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('[LLM] No OPENAI_API_KEY set — LLM calls will use fallbacks.');
    return null;
  }

  const provider = detectProvider(apiKey);

  // Explicit env vars override auto-detection
  const baseURL = process.env.OPENAI_BASE_URL || provider.baseURL;
  const model = process.env.LLM_MODEL || provider.defaultModel;

  console.log(`[LLM] Creating instance — model: ${model}, provider: ${baseURL || 'OpenAI (default)'}`);

  return new ChatOpenAI({
    modelName: model,
    temperature: opts.temperature ?? 0.3,
    maxTokens: opts.maxTokens ?? 1200,
    configuration: baseURL ? { baseURL } : undefined,
  });
}
