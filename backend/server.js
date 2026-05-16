import express from 'express';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomBytes, timingSafeEqual } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = path.join(__dirname, 'config.json');

const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD || '';
const AUTH_REQUIRED = ACCESS_PASSWORD.length > 0;

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const SESSION_MAX = 5_000;
const sessions = new Map();

function pruneSessions() {
  const now = Date.now();
  for (const [id, exp] of sessions) {
    if (now > exp) sessions.delete(id);
  }
}

function createSession() {
  pruneSessions();
  if (sessions.size >= SESSION_MAX) {
    sessions.delete(sessions.keys().next().value);
  }
  const id = randomBytes(32).toString('hex');
  sessions.set(id, Date.now() + SESSION_TTL_MS);
  return id;
}

function isValidSession(id) {
  if (!id || !sessions.has(id)) return false;
  if (Date.now() > sessions.get(id)) {
    sessions.delete(id);
    return false;
  }
  return true;
}

function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    out[key] = decodeURIComponent(val);
  }
  return out;
}

const runtimeConfig = {
  AI_BASE_URL: process.env.AI_BASE_URL || '',
  AI_API_KEY: process.env.AI_API_KEY || '',
  AI_MODEL: process.env.AI_MODEL || '',
  savedProviders: [],
};

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      if (saved.AI_BASE_URL) runtimeConfig.AI_BASE_URL = saved.AI_BASE_URL;
      if (saved.AI_API_KEY) runtimeConfig.AI_API_KEY = saved.AI_API_KEY;
      if (saved.AI_MODEL) runtimeConfig.AI_MODEL = saved.AI_MODEL;
      if (Array.isArray(saved.savedProviders)) runtimeConfig.savedProviders = saved.savedProviders;
    }
  } catch (e) {
    console.warn('[Config] Could not load config.json:', e.message);
  }
}

function persistConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({
      AI_BASE_URL: runtimeConfig.AI_BASE_URL,
      AI_API_KEY: runtimeConfig.AI_API_KEY,
      AI_MODEL: runtimeConfig.AI_MODEL,
      savedProviders: runtimeConfig.savedProviders,
    }, null, 2));
  } catch (e) {
    console.error('[Config] Could not save config.json:', e.message);
  }
}

function isConfigured() {
  return !!(
    runtimeConfig.AI_BASE_URL &&
    runtimeConfig.AI_API_KEY &&
    runtimeConfig.AI_API_KEY !== 'your-gemini-api-key-here' &&
    runtimeConfig.AI_MODEL
  );
}

function generateId() {
  return randomBytes(8).toString('hex');
}

loadConfig();

// Short convenience aliases resolved before sending to the provider.
// Do NOT add real provider model IDs here — e.g. openrouter/free and
// openrouter/auto are genuine OpenRouter router names and must pass through.
const MODEL_ALIASES = {
  'gemini/flash':  'gemini-2.0-flash',
  'gemini/pro':    'gemini-1.5-pro',
  'openai/mini':   'gpt-4o-mini',
  'groq/fast':     'llama-3.1-8b-instant',
};

function resolveModel(name) {
  const trimmed = (name || '').trim();
  return MODEL_ALIASES[trimmed] ?? trimmed;
}

const app = express();
app.use(express.json({ limit: process?.env?.API_PAYLOAD_MAX_SIZE || '7mb' }));

// cPanel assigns PORT; fall back to API_BACKEND_PORT for local dev, then 3001
const PORT = process.env.PORT || process.env.API_BACKEND_PORT || 3001;
// cPanel requires 0.0.0.0; local dev can override via API_BACKEND_HOST
const API_BACKEND_HOST = process.env.API_BACKEND_HOST || '0.0.0.0';

// Serve built frontend in production (when frontend/dist exists)
const DIST_DIR = path.join(__dirname, '..', 'frontend', 'dist');
const IS_PROD = fs.existsSync(path.join(DIST_DIR, 'index.html'));

if (AUTH_REQUIRED) {
  console.log('[Auth] Password protection is ENABLED (ACCESS_PASSWORD is set).');
} else {
  console.log('[Auth] No ACCESS_PASSWORD set — API is open (suitable for local/trusted deployments only).');
}

if (isConfigured()) {
  console.log(`  Provider: ${runtimeConfig.AI_BASE_URL}`);
  console.log(`  Model:    ${runtimeConfig.AI_MODEL}`);
} else {
  console.warn('[Config] AI provider not fully configured. Open the app and use Settings to configure.');
}

app.set('trust proxy', 1);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests', message: 'You have exceeded the request limit, please try again later.' },
});
app.use('/api', apiLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait before trying again.' },
});

function requireAuth(req, res, next) {
  if (!AUTH_REQUIRED) return next();
  const cookies = parseCookies(req.headers.cookie);
  if (isValidSession(cookies.session)) return next();
  return res.status(401).json({ error: 'Unauthorized. Please log in.' });
}

app.get('/api/auth/status', (req, res) => {
  if (!AUTH_REQUIRED) return res.json({ required: false, authenticated: true });
  const cookies = parseCookies(req.headers.cookie);
  res.json({ required: true, authenticated: isValidSession(cookies.session) });
});

app.post('/api/auth/login', authLimiter, (req, res) => {
  if (!AUTH_REQUIRED) return res.json({ ok: true });
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password is required.' });
  const provided = Buffer.from(password);
  const expected = Buffer.from(ACCESS_PASSWORD);
  const match = provided.length === expected.length && timingSafeEqual(provided, expected);
  if (!match) return res.status(401).json({ error: 'Incorrect password.' });
  const sessionId = createSession();
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `session=${sessionId}; HttpOnly; SameSite=Lax; Max-Age=${maxAge}; Path=/${secure}`);
  res.json({ ok: true });
});

app.post('/api/auth/logout', (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  if (cookies.session) sessions.delete(cookies.session);
  res.setHeader('Set-Cookie', 'session=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/');
  res.json({ ok: true });
});

app.get('/api/config', requireAuth, (req, res) => {
  res.json({
    baseUrl: runtimeConfig.AI_BASE_URL,
    model: runtimeConfig.AI_MODEL,
    keyConfigured: isConfigured(),
    configured: isConfigured(),
    savedProviders: runtimeConfig.savedProviders,
    modelAliases: MODEL_ALIASES,
  });
});

app.post('/api/config', requireAuth, (req, res) => {
  const { baseUrl, apiKey, model } = req.body;
  if (!baseUrl || !model) {
    return res.status(400).json({ error: 'baseUrl and model are required.' });
  }
  const effectiveKey = (apiKey || '').trim() || runtimeConfig.AI_API_KEY;
  if (!effectiveKey) {
    return res.status(400).json({ error: 'apiKey is required — no existing key is configured.' });
  }
  runtimeConfig.AI_BASE_URL = baseUrl.trim();
  runtimeConfig.AI_API_KEY = effectiveKey;
  runtimeConfig.AI_MODEL = model.trim();
  persistConfig();
  console.log(`[Config] Updated: provider=${runtimeConfig.AI_BASE_URL} model=${runtimeConfig.AI_MODEL}`);
  res.json({ ok: true });
});

app.post('/api/config/providers', requireAuth, (req, res) => {
  const { name, baseUrl, apiKey, model } = req.body;
  if (!name || !baseUrl || !apiKey || !model) {
    return res.status(400).json({ error: 'name, baseUrl, apiKey, and model are all required.' });
  }
  const provider = {
    id: generateId(),
    name: name.trim(),
    baseUrl: baseUrl.trim(),
    apiKey: apiKey.trim(),
    model: model.trim(),
    createdAt: Date.now(),
  };
  runtimeConfig.savedProviders = [...runtimeConfig.savedProviders, provider];
  persistConfig();
  console.log(`[Config] Saved provider: ${provider.name}`);
  res.json({ ok: true, provider });
});

app.delete('/api/config/providers/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const before = runtimeConfig.savedProviders.length;
  runtimeConfig.savedProviders = runtimeConfig.savedProviders.filter(p => p.id !== id);
  if (runtimeConfig.savedProviders.length === before) {
    return res.status(404).json({ error: 'Provider not found.' });
  }
  persistConfig();
  console.log(`[Config] Deleted saved provider: ${id}`);
  res.json({ ok: true });
});

app.post('/api/config/test', requireAuth, async (req, res) => {
  const { baseUrl, apiKey, model } = req.body;
  const testUrl = (baseUrl || runtimeConfig.AI_BASE_URL || '').trim();
  const testKey = (apiKey || runtimeConfig.AI_API_KEY || '').trim();
  const testModel = (model || runtimeConfig.AI_MODEL || '').trim();

  if (!testUrl || !testKey || !testModel) {
    return res.status(400).json({ error: 'Provider URL, API key, and model are required to test.' });
  }

  const url = `${testUrl.replace(/\/$/, '')}/chat/completions`;
  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testKey}`,
      },
      body: JSON.stringify({
        model: resolveModel(testModel),
        messages: [{ role: 'user', content: 'Reply with the single word: ok' }],
        max_tokens: 10,
      }),
    });
    const data = await upstream.json();
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: data?.error?.message || 'Provider returned an error.' });
    }
    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
      return res.status(500).json({ error: 'Empty response from provider.' });
    }
    res.json({ ok: true, response: text.trim() });
  } catch (e) {
    res.status(500).json({ error: `Cannot reach provider: ${e.message}` });
  }
});

app.post('/api/generate', requireAuth, async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({
      error: 'AI provider not configured. Open Settings (gear icon) and enter your provider credentials.',
    });
  }

  const { prompt, systemPrompt, jsonMode } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Bad Request: prompt is required.' });
  }

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const resolvedModel = resolveModel(runtimeConfig.AI_MODEL);
  const payload = { model: resolvedModel, messages };
  if (jsonMode) {
    payload.response_format = { type: 'json_object' };
  }

  const url = `${runtimeConfig.AI_BASE_URL.replace(/\/$/, '')}/chat/completions`;

  try {
    console.log(`[AI Proxy] POST ${url} model=${runtimeConfig.AI_MODEL}`);
    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${runtimeConfig.AI_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      console.error('[AI Proxy] Upstream error:', JSON.stringify(data));
      return res.status(upstream.status).json({ error: data?.error?.message || 'Upstream AI request failed.' });
    }

    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
      return res.status(500).json({ error: 'Empty response from AI provider.' });
    }

    res.json({ text });
  } catch (error) {
    console.error('[AI Proxy] Error calling AI provider:', error);
    res.status(500).json({ error: 'Failed to reach AI provider. Check your provider URL and network.' });
  }
});

// Static frontend (production / cPanel)
if (IS_PROD) {
  app.use(express.static(DIST_DIR));
  // SPA fallback — all non-API routes return index.html (Express 5 wildcard syntax)
  app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
  console.log(`[Static] Serving frontend from ${DIST_DIR}`);
}

app.listen(PORT, API_BACKEND_HOST, () => {
  console.log(`AI Proxy backend listening at http://${API_BACKEND_HOST}:${PORT}`);
});
