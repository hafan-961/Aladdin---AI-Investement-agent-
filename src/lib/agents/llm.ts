// ============================================
// Alladin – Shared LLM Factory
// ============================================
// Centralises ChatOpenAI creation so every node uses a consistent
// configuration (model, base URL, API key) and can gracefully
// degrade when credentials are missing on deployment.
// ============================================

import { ChatOpenAI } from '@langchain/openai';

/**
 * Returns true when a valid LLM configuration is available.
 * Checks that OPENAI_API_KEY exists and, if a custom base URL is
 * expected (Groq key prefix), that OPENAI_BASE_URL is also set.
 */
export function isLLMAvailable(): boolean {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return false;

  // Groq keys start with "gsk_" — they MUST have OPENAI_BASE_URL set
  // to Groq's endpoint, otherwise LangChain will send them to OpenAI → 401.
  if (key.startsWith('gsk_') && !process.env.OPENAI_BASE_URL) {
    console.warn(
      '[LLM] Groq API key detected but OPENAI_BASE_URL is not set. ' +
      'LLM calls will be skipped to prevent 401 errors. ' +
      'Set OPENAI_BASE_URL=https://api.groq.com/openai/v1 in your environment.'
    );
    return false;
  }

  return true;
}

/**
 * Create a ChatOpenAI instance with the project's standard
 * configuration.  Returns `null` when credentials are missing
 * so callers can fall back to non-LLM paths gracefully.
 *
 * @param opts.temperature – sampling temperature (default 0.3)
 * @param opts.maxTokens   – max output tokens   (default 1200)
 */
export function createLLM(
  opts: { temperature?: number; maxTokens?: number } = {}
): ChatOpenAI | null {
  if (!isLLMAvailable()) return null;

  return new ChatOpenAI({
    modelName: process.env.LLM_MODEL || 'gpt-4o-mini',
    temperature: opts.temperature ?? 0.3,
    maxTokens: opts.maxTokens ?? 1200,
    configuration: process.env.OPENAI_BASE_URL
      ? { baseURL: process.env.OPENAI_BASE_URL }
      : undefined,
  });
}
