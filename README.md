# myvoice

A ChatGPT-like, low-latency conversational voice agent — free beta MVP.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Stack:** Spring Boot 3.5 · Java 21 · Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · MySQL 8 · Redis 7 · Docker Compose · nginx

---

## Product

- **Audio-native voice chat** via Gemini Live (native audio) — no STT → LLM → TTS chaining
- **Barge-in**, multilingual (English / Bangla / Korean), JWT WebSocket relay
- **Free beta caps:** per-session duration, daily minutes per user, global concurrency
- Auth foundation: register, login, password reset, profile, sessions

---

## Architecture

```
Browser (Next.js UI)
  → nginx (:5174)
      /            → next (:3000)
      /api /uploads /ws → Spring Boot (:9090)
                          → Gemini Live (BidiGenerateContent)
```

---

## Project structure

```
├── saas-nextjs/          # Next.js App Router frontend (product UI)
├── saas-springboot/      # Spring Boot API + /ws/voice
├── saas-reactjs/         # Legacy Vite frontend (deprecated)
├── docker-compose.yml
└── .env.example
```

---

## Quick start

1. `cp .env.example .env` — set `GEMINI_API_KEY` and a 32+ char `APP_JWT_SECRET`
2. `docker compose up -d --build`
3. Open http://localhost:5174
4. Register / sign in → **Talk** (`/voice`) → allow mic

### Local frontend (without Docker UI)

```bash
cd saas-nextjs
cp .env.example .env.local
# NEXT_PUBLIC_API_BASE_URL=http://localhost:9090
npm install
npm run dev
```

Backend on `:9090` with CORS including `http://localhost:3000`.

---

## Free beta limits

| Cap | Default env |
|-----|-------------|
| Max sessions / user | `VOICE_MAX_SESSIONS_PER_USER=1` |
| Max session length | `VOICE_MAX_SESSION_DURATION_SECONDS=600` |
| Daily minutes / user | `VOICE_MAX_DAILY_MINUTES_PER_USER=30` |
| Global concurrent sessions | `VOICE_MAX_GLOBAL_SESSIONS=50` |

Exceeded limits return WebSocket error codes: `USAGE_LIMIT`, `SESSION_DURATION_LIMIT`, `GLOBAL_CAPACITY`.

---

## Testing

```bash
cd saas-springboot && ./mvnw -ntp test
cd saas-nextjs && npm run type-check && npm run build
```

---

## License

MIT — see [LICENSE](LICENSE).
