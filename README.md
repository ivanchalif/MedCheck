# MedCheck

> An app to help you understand medication interactions and side effects

MedCheck is a full-stack React application that provides an intelligent medication catalog UI. Users can add medications via AI-generated profiles, check symptoms against their medication list, and view aggregated side-effect summaries. The app works seamlessly with any OpenAI-compatible AI provider.

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat-square&logo=react&logoColor=%2361DAFB)
![Node.js](https://img.shields.io/badge/node.js-6DA55F?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/express.js-%23404d59.svg?style=flat-square&logo=express&logoColor=%2361DAFB)

---

## ✨ Features

- **AI-Powered Medication Profiles** — Add medications by name; AI generates complete profiles with uses, side effects, and contraindications
- **Symptom Analysis** — Check symptoms against your saved medication list to identify potential interactions
- **Aggregated Side Effects** — View a comprehensive summary of side effects across all your medications
- **Multiple Profiles** — Create and manage multiple named medication profiles, each with its own list
- **Profile Management** — Switch between profiles, rename them, or delete them using the header switcher
- **Runtime Configuration** — Configure AI provider settings (base URL, API key, model) directly in the UI
- **Local Persistence** — All profiles and data are saved to `localStorage` for seamless offline access
- **Optional Password Protection** — Gate the API behind a password login when needed
- **Provider-Agnostic** — Works with any OpenAI-compatible provider (OpenAI, Gemini, Ollama, Groq, etc.)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ (for the `--env-file` flag)
- **npm** or **yarn**
- An AI API key from a supported provider

### Installation & Setup

```bash
# Install all dependencies (root + frontend + backend workspaces)
npm install

# Create backend environment file
cp backend/.env.local.example backend/.env.local

# Edit backend/.env.local with your AI provider credentials
# See examples below

# Run both frontend and backend concurrently
npm run dev
```

**Frontend** runs on `http://localhost:5000`  
**Backend** runs on `http://localhost:3001`

### Environment Variables

Set these in `backend/.env.local`:

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `AI_BASE_URL` | ✅ | `https://generativelanguage.googleapis.com/v1beta/openai` | OpenAI-compatible base URL |
| `AI_API_KEY` | ✅ | `your-api-key-here` | API key for your provider |
| `AI_MODEL` | ✅ | `gemini-2.0-flash` | Model name to use |
| `API_BACKEND_PORT` | ❌ | `3001` | Backend port (default: `3001`) |
| `API_BACKEND_HOST` | ❌ | `127.0.0.1` | Backend host (default: `127.0.0.1`) |
| `ACCESS_PASSWORD` | ❌ | `secure-password` | Optional: gates API behind password login |

### Provider Examples

See `backend/.env.local.example` for detailed provider configurations:

- **Google Gemini** (free tier available)
- **OpenAI** (GPT-4, GPT-4o)
- **Ollama** (local models)
- **LM Studio** (local)
- **Groq** (fast inference)
- **Together AI**

---

## 📁 Project Structure

```
MedCheck/
├── frontend/                      # React + Vite app
│   ├── src/
│   │   ├── App.tsx
│   │   ├── services/
│   │   │   └── geminiService.ts   # AI API call logic
│   │   └── ...
│   ├── vite.config.ts             # Proxies /api to backend
│   └── package.json
├── backend/                       # Express server
│   ├── server.js                  # Main API proxy
│   ├── .env.local                 # Your credentials (git-ignored)
│   ├── .env.local.example         # Provider config templates
│   ├── config.json                # Runtime AI settings (generated)
│   └── package.json
├── package.json                   # Root workspace config
└── README.md
```

### Key Files

- **`frontend/services/geminiService.ts`** — AI call logic; sends requests to `/api/generate`
- **`frontend/vite.config.ts`** — Vite configuration; dev server proxies `/api` → backend
- **`backend/server.js`** — Express proxy; translates `/api/generate` → upstream OpenAI-compatible API
- **`backend/.env.local`** — Backend environment variables (git-ignored)
- **`backend/config.json`** — Runtime AI provider settings (generated on first run)

---

## 🛠️ Stack

| Layer | Technology | Details |
|-------|-----------|---------|
| **Frontend** | React 18, TypeScript, Vite | Modern SPA with hot module replacement |
| | Tailwind CSS (CDN), lucide-react | Styling & icon library |
| **Backend** | Node.js 20, Express 5 | Lightweight server & API proxy |
| | express-rate-limit | Built-in rate limiting for API protection |
| **AI Integration** | OpenAI Chat Completions API | Works with any compatible provider |
| **Package Manager** | npm workspaces | Monorepo structure |

---

## 🏗️ Architecture

### Design Decisions

1. **OpenAI Chat Completions Format**  
   The backend uses the `/chat/completions` endpoint format, the de-facto standard supported by Gemini, OpenAI, Ollama, LM Studio, Groq, Together AI, and others.

2. **System Prompts for Structured Output**  
   Instead of provider-specific schema enforcement, structured JSON output is driven by detailed system prompts. This ensures compatibility across all providers.

3. **Port Configuration**  
   - Backend: port `3001`  
   - Frontend: port `5000`  
   - Vite dev server proxies `/api` requests to the backend

4. **Rate Limiting**  
   - `/api` endpoints: 100 requests per 15 minutes per IP
   - Login attempts: 10 per 15 minutes per IP

5. **Optional Password Authentication**  
   When `ACCESS_PASSWORD` is set in `.env.local`, all `/api/*` routes require a valid server-side session cookie (`HttpOnly; SameSite=Lax`). The password is never sent in requests; only a session token is used.

6. **No External SDKs**  
   Removed `google-auth-library`, `@google/genai`, and other provider-specific libraries for simplicity and provider agnosticity.

---

## 🚨 Gotchas

- **Node.js 20+ required** — Uses the `--env-file` flag; `.env.local` must use `#` for comments (not `//`)
- **Mandatory environment variables** — Backend exits with a helpful error if `AI_BASE_URL`, `AI_API_KEY`, or `AI_MODEL` are missing
- **Replit preview binding** — Frontend Vite dev server must bind to `0.0.0.0:5000` for Replit preview proxy to work

---

## 📖 Available Scripts

### Root Workspace

```bash
npm install          # Install all dependencies (root + frontend + backend)
npm run dev          # Run frontend + backend concurrently
npm run dev-frontend # Run only frontend (port 5000)
npm run dev-backend  # Run only backend (port 3001)
```

### Frontend

```bash
npm run dev          # Start Vite dev server (port 5000)
npm run build        # Build for production
npm run preview      # Preview production build
```

### Backend

```bash
npm run dev          # Start with nodemon (auto-reload on file changes)
npm start            # Start production server
```

---

## 🔗 Resources

- [Google AI Studio](https://aistudio.google.com/apikey) — Free Gemini API key
- [Ollama](https://ollama.com) — Local AI models
- [OpenAI API](https://platform.openai.com) — Official OpenAI platform
- [Replit](https://replit.com/@ivanchalif/MedCheck) — Live demo (if available)

---

## 🎯 Roadmap

- [x] AI-powered medication profiles
- [x] Symptom analysis against medication list
- [x] Aggregated side-effect summaries
- [x] Multiple profile management
- [x] Runtime AI provider configuration
- [ ] Cloud sync across devices
- [ ] Advanced drug interaction warnings
- [ ] Export medication profiles as PDF

---

## 📝 License

This project is open source and available under the MIT License.

---

## 👨‍💻 Author

Created by [ivanchalif](https://github.com/ivanchalif)

---

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Open issues for bugs or feature requests
- Submit pull requests with improvements
- Share feedback and ideas

---

**Happy medication tracking! 💊**
