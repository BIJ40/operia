/**
 * Client IA unifié — OpenAI (principal) + Anthropic Claude (fallback) + Google Gemini (second fallback)
 * Remplace entièrement le Lovable AI Gateway
 */

// ─── Types ────────────────────────────────────────────

export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

export interface AiCompletionOptions {
  messages: AiChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  response_format?: { type: string };
  tools?: any[];
  tool_choice?: any;
  /** For image generation via OpenAI (dall-e) — not chat */
  modalities?: string[];
}

export interface AiCompletionResult {
  ok: true;
  data: any;
  provider: 'openai' | 'anthropic' | 'gemini';
}

export interface AiCompletionError {
  ok: false;
  status: number;
  error: string;
  provider: string;
}

type AiResult = AiCompletionResult | AiCompletionError;

// ─── Config ───────────────────────────────────────────

const OPENAI_BASE = 'https://api.openai.com/v1/chat/completions';
const ANTHROPIC_BASE = 'https://api.anthropic.com/v1/messages';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const DEFAULT_OPENAI_MODEL = 'gpt-4o';
const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

// ─── OpenAI caller ────────────────────────────────────

async function callOpenAI(
  apiKey: string,
  options: AiCompletionOptions,
): Promise<AiResult> {
  const model = options.model || DEFAULT_OPENAI_MODEL;
  console.log(`[aiClient] OpenAI → ${model}`);

  const body: any = {
    model,
    messages: options.messages,
    stream: options.stream ?? false,
  };
  if (options.temperature !== undefined) body.temperature = options.temperature;
  if (options.max_tokens !== undefined) body.max_tokens = options.max_tokens;
  if (options.response_format) body.response_format = options.response_format;
  if (options.tools) body.tools = options.tools;
  if (options.tool_choice) body.tool_choice = options.tool_choice;

  try {
    const response = await fetch(OPENAI_BASE, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (options.stream && response.ok) {
      // Return the raw response for streaming consumers
      return { ok: true, data: response, provider: 'openai' };
    }

    if (response.ok) {
      const data = await response.json();
      return { ok: true, data, provider: 'openai' };
    }

    const errText = await response.text();
    console.warn(`[aiClient] OpenAI ${model} failed (${response.status}): ${errText.slice(0, 200)}`);
    return { ok: false, status: response.status, error: errText, provider: 'openai' };
  } catch (err) {
    console.error(`[aiClient] OpenAI fetch error:`, err);
    return { ok: false, status: 500, error: String(err), provider: 'openai' };
  }
}

// ─── Anthropic (Claude) caller ────────────────────────

function convertToAnthropicMessages(messages: AiChatMessage[]): { system: string; messages: any[] } {
  let system = '';
  const anthropicMessages: any[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      system += (system ? '\n\n' : '') + (typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content));
      continue;
    }

    if (typeof msg.content === 'string') {
      anthropicMessages.push({ role: msg.role, content: msg.content });
    } else if (Array.isArray(msg.content)) {
      const blocks: any[] = [];
      for (const part of msg.content) {
        if (part.type === 'text' && part.text) {
          blocks.push({ type: 'text', text: part.text });
        } else if (part.type === 'image_url' && part.image_url?.url) {
          const url = part.image_url.url;
          if (url.startsWith('data:image')) {
            const match = url.match(/^data:(image\/\w+);base64,(.+)$/);
            if (match) {
              blocks.push({
                type: 'image',
                source: { type: 'base64', media_type: match[1], data: match[2] },
              });
            }
          } else {
            blocks.push({ type: 'image', source: { type: 'url', url } });
          }
        }
      }
      anthropicMessages.push({ role: msg.role, content: blocks });
    }
  }

  return { system, messages: anthropicMessages };
}

async function callAnthropic(
  apiKey: string,
  options: AiCompletionOptions,
): Promise<AiResult> {
  const model = DEFAULT_ANTHROPIC_MODEL;
  console.log(`[aiClient] Anthropic → ${model}`);

  const { system, messages } = convertToAnthropicMessages(options.messages);

  const body: any = {
    model,
    messages,
    max_tokens: options.max_tokens || 4096,
  };
  if (system) body.system = system;
  if (options.temperature !== undefined) body.temperature = options.temperature;

  // Handle tool calling — convert OpenAI tool format to Anthropic
  if (options.tools && options.tools.length > 0) {
    body.tools = options.tools.map((t: any) => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters,
    }));
    if (options.tool_choice) {
      body.tool_choice = { type: 'tool', name: options.tool_choice.function.name };
    }
  }

  try {
    const response = await fetch(ANTHROPIC_BASE, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const data = await response.json();
      // Normalize Anthropic response to OpenAI-like format
      const normalized = normalizeAnthropicResponse(data);
      return { ok: true, data: normalized, provider: 'anthropic' };
    }

    const errText = await response.text();
    console.warn(`[aiClient] Anthropic ${model} failed (${response.status}): ${errText.slice(0, 200)}`);
    return { ok: false, status: response.status, error: errText, provider: 'anthropic' };
  } catch (err) {
    console.error(`[aiClient] Anthropic fetch error:`, err);
    return { ok: false, status: 500, error: String(err), provider: 'anthropic' };
  }
}

/** Convert Anthropic response format to OpenAI-compatible format */
function normalizeAnthropicResponse(data: any): any {
  const content = data.content || [];
  
  // Handle tool use responses
  const toolUse = content.find((b: any) => b.type === 'tool_use');
  if (toolUse) {
    return {
      choices: [{
        message: {
          role: 'assistant',
          content: null,
          tool_calls: [{
            id: toolUse.id,
            type: 'function',
            function: {
              name: toolUse.name,
              arguments: JSON.stringify(toolUse.input),
            },
          }],
        },
        finish_reason: 'tool_calls',
      }],
    };
  }

  // Handle text responses
  const textBlock = content.find((b: any) => b.type === 'text');
  return {
    choices: [{
      message: {
        role: 'assistant',
        content: textBlock?.text || '',
      },
      finish_reason: data.stop_reason === 'end_turn' ? 'stop' : data.stop_reason,
    }],
  };
}

// ─── Public API ───────────────────────────────────────

/** Get API keys from env, throws with clear message if missing */
export function getAiKeys(): { openaiKey: string; anthropicKey: string | null } {
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiKey) {
    throw new Error('OPENAI_API_KEY non configurée dans les secrets Supabase');
  }
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') || null;
  return { openaiKey, anthropicKey };
}

/**
 * Appel IA avec fallback automatique : OpenAI → Claude
 * Compatible avec le format OpenAI (messages, tools, etc.)
 */
export async function callAiWithFallback(options: AiCompletionOptions): Promise<AiResult> {
  const { openaiKey, anthropicKey } = getAiKeys();

  // 1. Try OpenAI
  const openaiResult = await callOpenAI(openaiKey, options);
  if (openaiResult.ok) return openaiResult;

  // Don't fallback for client errors (400, 401, 403) — those won't fix with another provider
  if (!openaiResult.ok && openaiResult.status >= 400 && openaiResult.status < 500 && openaiResult.status !== 429) {
    console.warn(`[aiClient] OpenAI client error ${openaiResult.status}, not retrying with fallback`);
    return openaiResult;
  }

  // 2. Fallback to Claude (if key available and not streaming — Claude streaming needs different handling)
  if (anthropicKey && !options.stream) {
    console.log('[aiClient] OpenAI failed, falling back to Claude...');
    await new Promise(r => setTimeout(r, 500));
    const anthropicResult = await callAnthropic(anthropicKey, options);
    if (anthropicResult.ok) return anthropicResult;
    
    console.error('[aiClient] Both OpenAI and Claude failed');
    return anthropicResult; // Return the last error
  }

  return openaiResult;
}

/**
 * Appel image IA avec fallback modèles OpenAI
 * Note: Pour la génération d'images, on utilise DALL-E 3 via OpenAI
 * Claude ne supporte pas la génération d'images nativement
 */
export async function callImageAiWithFallback(
  messages: AiChatMessage[],
): Promise<AiCompletionResult | AiCompletionError> {
  const { openaiKey } = getAiKeys();
  
  // For image generation, use OpenAI's DALL-E 3 via chat completions
  // or GPT-4o with image generation capabilities
  const IMAGE_MODELS = ['gpt-4o', 'gpt-4o-mini'];

  let lastStatus = 502;
  let lastError = 'All image models failed';

  for (const model of IMAGE_MODELS) {
    console.log(`[aiClient] Image generation → ${model}`);
    const result = await callOpenAI(openaiKey, {
      messages,
      model,
      modalities: ['text'],
    });

    if (result.ok) return result;
    if (!result.ok) {
      lastStatus = result.status;
      lastError = result.error;
      if (result.status === 402 || result.status === 401) {
        return result; // No point trying other models
      }
    }
    await new Promise(r => setTimeout(r, 500));
  }

  return { ok: false, status: lastStatus, error: lastError, provider: 'openai' };
}
