import { Medication, SideEffectAnalysis } from '../types';

export interface AuthStatus {
  required: boolean;
  authenticated: boolean;
}

export async function getAuthStatus(): Promise<AuthStatus> {
  try {
    const res = await fetch('/api/auth/status');
    if (!res.ok) return { required: false, authenticated: true };
    return await res.json();
  } catch {
    return { required: false, authenticated: true };
  }
}

export async function login(password: string): Promise<void> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Login failed.');
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' });
}

async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('auth:required'));
  }
  return res;
}

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15);
};

/**
 * Robustly parse a JSON string that may come from a low-quality model.
 * Handles: markdown code fences, preamble text, raw control characters
 * inside string values (the "Bad control character" parse error).
 */
function safeJsonParse<T>(raw: string): T {
  // 1. Strip markdown code fences (```json ... ``` or ``` ... ```)
  let text = raw.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  // 2. Extract the outermost JSON object or array in case of preamble text
  const objIdx = text.indexOf('{');
  const arrIdx = text.indexOf('[');
  const start =
    objIdx === -1 ? arrIdx :
    arrIdx === -1 ? objIdx :
    Math.min(objIdx, arrIdx);
  if (start === -1) throw new SyntaxError('No JSON found in AI response');
  const opener = text[start];
  const closer = opener === '{' ? '}' : ']';
  const end = text.lastIndexOf(closer);
  if (end < start) throw new SyntaxError('Malformed JSON in AI response');
  text = text.slice(start, end + 1);

  // 3. Walk the text and escape raw control characters (U+0000–U+001F) that
  //    appear inside string literals — these cause the "Bad control character"
  //    parse error in JSON.parse. Characters outside strings are left alone so
  //    legitimate JSON whitespace between tokens is preserved.
  let out = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const code = text.charCodeAt(i);
    if (escaped) { out += ch; escaped = false; continue; }
    if (ch === '\\' && inString) { out += ch; escaped = true; continue; }
    if (ch === '"') { inString = !inString; out += ch; continue; }
    if (inString && code < 0x20) {
      out += '\\u' + code.toString(16).padStart(4, '0');
      continue;
    }
    out += ch;
  }

  return JSON.parse(out);
}

async function callAI(prompt: string, systemPrompt: string): Promise<string> {
  const res = await apiFetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, systemPrompt, jsonMode: true }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || `Request failed with status ${res.status}`);
  }

  if (!data.text) throw new Error('Empty response from AI');
  return data.text;
}

export interface SavedProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  createdAt: number;
}

export interface AppConfig {
  baseUrl: string;
  model: string;
  keyConfigured: boolean;
  configured: boolean;
  savedProviders: SavedProvider[];
  modelAliases: Record<string, string>;
}

export async function getConfig(): Promise<AppConfig | null> {
  try {
    const res = await apiFetch('/api/config');
    if (!res.ok) return null;
    const data = await res.json();
    return { savedProviders: [], modelAliases: {}, ...data };
  } catch {
    return null;
  }
}

export async function saveConfig(cfg: {
  baseUrl: string;
  apiKey: string;
  model: string;
}): Promise<void> {
  const res = await apiFetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cfg),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to save config');
}

export async function addSavedProvider(entry: {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}): Promise<SavedProvider> {
  const res = await apiFetch('/api/config/providers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to save provider');
  return data.provider as SavedProvider;
}

export async function deleteSavedProvider(id: string): Promise<void> {
  const res = await apiFetch(`/api/config/providers/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'Failed to delete provider');
  }
}

export async function testConfig(cfg: {
  baseUrl: string;
  apiKey: string;
  model: string;
}): Promise<{ ok: boolean; response?: string; error?: string }> {
  try {
    const res = await apiFetch('/api/config/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data?.error || 'Test failed' };
    return { ok: true, response: data.response };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export const getMedicationDetails = async (query: string): Promise<Medication | null> => {
  try {
    const systemPrompt = `You are a medical information assistant. Always respond with valid JSON only — no markdown, no explanation outside the JSON.
Return an object with exactly these fields:
{
  "name": "string — standard brand or common name of the medication",
  "genericName": "string — generic name, or empty string if not applicable",
  "purpose": "string — one sentence describing what the medication treats",
  "sideEffects": ["array", "of", "common side effect strings"],
  "contraindications": ["array", "of", "contraindication strings"]
}
If the medication is not found or invalid, return empty arrays for sideEffects and contraindications.`;

    const text = await callAI(
      `Provide detailed medical information for the medication: "${query}".`,
      systemPrompt
    );

    const data = safeJsonParse<{ name: string; genericName: string; purpose: string; sideEffects: string[]; contraindications: string[] }>(text);

    if (!data.sideEffects?.length && !data.contraindications?.length) {
      return null;
    }

    return {
      id: generateId(),
      name: data.name,
      genericName: data.genericName,
      purpose: data.purpose,
      sideEffects: data.sideEffects,
      contraindications: data.contraindications,
    };
  } catch (error) {
    console.error('Error fetching medication details:', error);
    throw error;
  }
};

export const analyzeSideEffect = async (
  symptom: string,
  currentMedications: Medication[]
): Promise<SideEffectAnalysis> => {
  try {
    const systemPrompt = `You are a medical information assistant. Always respond with valid JSON only — no markdown, no explanation outside the JSON.
Return an object with exactly these fields:
{
  "matchingMeds": ["array of medication names from the user's list known to cause this symptom"],
  "generalMeds": ["array of other common medications (not on their list) known to cause this symptom"],
  "explanation": "string — brief explanation of the analysis"
}`;

    const medNames = currentMedications.map(m => m.name).join(', ');
    const hasMeds = currentMedications.length > 0;

    const prompt = hasMeds
      ? `The user is currently taking: [${medNames}]. They are experiencing: "${symptom}". Analyze if any of their medications cause this, and list other common medications that also cause it.`
      : `The user is asking about the symptom: "${symptom}". They have not listed any current medications. List common medications known to cause this symptom.`;

    const text = await callAI(prompt, systemPrompt);
    return safeJsonParse<SideEffectAnalysis>(text);
  } catch (error) {
    console.error('Error analyzing side effect:', error);
    throw new Error('Failed to analyze side effect. Please try again.');
  }
};
