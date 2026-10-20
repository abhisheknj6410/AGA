import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');

export interface LlmConfigState {
  provider: 'gemini' | 'nvidia' | 'openai' | 'deepseek' | 'custom';
  baseUrl: string;
  model: string;
  apiKeyMasked: string;
  hasApiKey: boolean;
}

export function getActiveLlmConfig(): { apiKey: string; baseUrl: string; model: string } {
  const apiKey = process.env.GEMINI_API_KEY || process.env.LLM_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.OPENCODE_ZEN_API_KEY || '';
  const baseUrl = process.env.LLM_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai';
  const model = process.env.LLM_MODEL || 'gemini-2.5-flash-lite';
  return { apiKey, baseUrl, model };
}

export function getLlmConfigState(): LlmConfigState {
  const { apiKey, baseUrl, model } = getActiveLlmConfig();
  
  let provider: LlmConfigState['provider'] = 'custom';
  if (baseUrl.includes('googleapis.com')) {
    provider = 'gemini';
  } else if (baseUrl.includes('nvidia.com')) {
    provider = 'nvidia';
  } else if (baseUrl.includes('openai.com')) {
    provider = 'openai';
  } else if (baseUrl.includes('deepseek.com')) {
    provider = 'deepseek';
  }

  const masked = apiKey
    ? (apiKey.length > 10 ? `${apiKey.slice(0, 7)}...${apiKey.slice(-4)}` : '••••••••')
    : '';

  return {
    provider,
    baseUrl,
    model,
    apiKeyMasked: masked,
    hasApiKey: Boolean(apiKey && apiKey.length > 5)
  };
}

export function updateLlmConfig(updates: {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  provider?: string;
}): LlmConfigState {
  if (updates.apiKey && updates.apiKey.trim().length > 0) {
    const key = updates.apiKey.trim();
    process.env.GEMINI_API_KEY = key;
    process.env.LLM_API_KEY = key;
  }
  if (updates.baseUrl && updates.baseUrl.trim().length > 0) {
    process.env.LLM_BASE_URL = updates.baseUrl.trim();
  }
  if (updates.model && updates.model.trim().length > 0) {
    process.env.LLM_MODEL = updates.model.trim();
  }

  // Persist to .env
  try {
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    const setEnvVar = (content: string, key: string, value: string): string => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(content)) {
        return content.replace(regex, `${key}=${value}`);
      }
      return `${content.trim()}\n${key}=${value}\n`;
    };

    if (process.env.LLM_API_KEY) {
      envContent = setEnvVar(envContent, 'GEMINI_API_KEY', process.env.LLM_API_KEY);
      envContent = setEnvVar(envContent, 'LLM_API_KEY', process.env.LLM_API_KEY);
    }
    if (process.env.LLM_BASE_URL) {
      envContent = setEnvVar(envContent, 'LLM_BASE_URL', process.env.LLM_BASE_URL);
    }
    if (process.env.LLM_MODEL) {
      envContent = setEnvVar(envContent, 'LLM_MODEL', process.env.LLM_MODEL);
    }

    fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');
  } catch (err) {
    console.error('[Config] Failed to persist .env:', err);
  }

  return getLlmConfigState();
}

export async function testLlmConnection(config: {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}): Promise<{ success: boolean; message: string; reply?: string }> {
  const active = getActiveLlmConfig();
  const apiKey = (config.apiKey && config.apiKey.trim()) || active.apiKey;
  const baseUrl = (config.baseUrl && config.baseUrl.trim()) || active.baseUrl;
  const model = (config.model && config.model.trim()) || active.model;

  if (!apiKey) {
    return { success: false, message: 'No API key provided or configured.' };
  }

  const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Reply with the single word: READY' }],
        max_tokens: 10
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text();
      return {
        success: false,
        message: `API returned HTTP ${res.status}: ${errText.slice(0, 180)}`
      };
    }

    const data: any = await res.json();
    const reply = data.choices?.[0]?.message?.content || 'Connected successfully';
    return {
      success: true,
      message: `Successfully connected to ${model} on ${baseUrl}`,
      reply
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.name === 'AbortError' ? 'Connection timed out (12s)' : (err.message || 'Connection failed')
    };
  }
}
