# MedCheck

A React medication catalog UI that lets users add medications (via AI-generated profiles), check symptoms against their medication list, and view aggregated side-effect summaries. Works with any OpenAI-compatible AI provider.

## Run & Operate

```bash
npm install      # install all workspace deps (root + frontend + backend)
npm run dev      # run frontend (port 5000) + backend (port 3001) concurrently
```

**Required env vars** (set in `backend/.env.local`):
- `AI_BASE_URL` — OpenAI-compatible base URL (e.g. `https://generativelanguage.googleapis.com/v1beta/openai`)
- `AI_API_KEY` — API key for the provider (use `"ollama"` for local Ollama)
- `AI_MODEL` — Model name (e.g. `gemini-2.0-flash`, `gpt-4o`, `llama3`)
- `API_BACKEND_PORT` — Backend port (default `3001`)
- `API_BACKEND_HOST` — Backend host (default `127.0.0.1`)

Optional: `ACCESS_PASSWORD` — when set, gates the entire API behind a password login page. No frontend env vars required.

See `backend/.env.local.example` for provider-specific examples (Gemini, OpenAI, Ollama, LM Studio, Groq, Together AI).

## Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS (CDN), lucide-react
- **Backend**: Node.js 20, Express 5, express-rate-limit
- **AI**: Any OpenAI-compatible provider via `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL`
- **Package manager**: npm workspaces

## Where things live

- `frontend/` — React + Vite app
- `backend/` — Express AI proxy server
- `frontend/services/geminiService.ts` — AI call logic (plain fetch to `/api/generate`)
- `frontend/vite.config.ts` — Vite config (dev server proxies `/api` to backend)
- `backend/server.js` — Express proxy: `POST /api/generate` → upstream OpenAI-compat API
- `backend/.env.local` — Backend environment variables
- `backend/.env.local.example` — Provider configuration examples

## Architecture decisions

- **OpenAI Chat Completions format**: The backend uses the `/chat/completions` endpoint format, the de-facto standard supported by Gemini, OpenAI, Ollama, LM Studio, Groq, Together AI, and others.
- **System prompts for structured output**: Instead of provider-specific schema enforcement, structured JSON output is driven by detailed system prompts. Works across all providers.
- **Backend on port 3001, frontend on port 5000**: Vite proxies `/api` to the backend.
- **Rate limiting**: `/api` is protected with `express-rate-limit` (100 req/15min per IP); login attempts capped at 10/15min.
- **Optional password auth**: When `ACCESS_PASSWORD` is set in `backend/.env.local`, all `/api/*` routes require a valid server-side session cookie (`HttpOnly; SameSite=Lax`). The password is never sent to the browser. Login UI shown automatically when auth is required. When unset, API is open (suitable for local use).
- **No Google SDK**: Removed `google-auth-library`, `@google/genai` (vertexai mode), `node-fetch`, `ws`, and the Vertex AI proxy shim entirely.

## Product

- Add medications by name — AI generates a full profile (uses, side effects, contraindications)
- Analyze symptoms against your saved medication list
- View aggregated side-effect summary across all saved medications
- Multiple named profiles — each with its own medication list, persisted in localStorage
- Profile switcher in header: create, rename, delete, switch profiles
- AI provider settings UI — configure base URL / API key / model at runtime, saved to `backend/config.json`

## User preferences

_Populate as you build_

## Gotchas

- Backend requires `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` or it exits with a helpful error
- Backend uses `--env-file=.env.local` flag (requires Node 20+); `.env.local` must use `#` for comments, not `//`
- Frontend Vite dev server must bind to `0.0.0.0:5000` for Replit preview proxy

## Pointers

- [Google AI Studio (free Gemini key)](https://aistudio.google.com/apikey)
- [Ollama local models](https://ollama.com)
- [OpenAI API](https://platform.openai.com)
