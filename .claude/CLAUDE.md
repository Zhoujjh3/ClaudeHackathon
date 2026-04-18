# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

FieldFit — an AI health coach for journalists and correspondents. React + Vite frontend, Python FastAPI backend, Claude claude-sonnet-4-6 for all AI (text + vision).

## Dev commands

### Backend
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload   # http://localhost:8000
```

Requires `backend/.env` with `ANTHROPIC_API_KEY`.

### Frontend
```bash
cd frontend
npm run dev     # http://localhost:3000
npm run build
npm run preview
```

Optional: `frontend/.env` with `VITE_API_URL` (defaults to `http://localhost:8000`).

## Architecture

All AI logic lives in `backend/main.py` — a single-file FastAPI app with three endpoints:

| Endpoint | Purpose |
|---|---|
| `POST /api/chat` | Conversational coach — accepts message history + optional `location`/`energy_level`; injects live time/context into the last user message before sending to Claude |
| `POST /api/analyze` | Vision endpoint — accepts image upload + `mode` (`general`, `menu`, `fridge`, `plate`); constructs mode-specific prompts |
| `POST /api/quick-advice` | One-shot scenario advice from the Dashboard quick-tap buttons |

The system prompt (`SYSTEM_PROMPT` in `main.py`) is the core product definition. It encodes persona, communication rules, and time-of-day behavior. Changes here affect all three endpoints.

Frontend is a three-tab SPA (`App.jsx`):
- **Dashboard** — scenario buttons that set `context` state and deep-link into the Coach tab via `handleScenario`
- **ChatCoach** — multi-turn chat; receives `context` (location, energy level) from App and passes it to `/api/chat`
- **SnapAnalyze** — image upload with mode selector; calls `/api/analyze`

`context` state (location + energyLevel) is owned by `App.jsx` and passed as props down to all three tabs. Tab switching uses `hidden`/`block` CSS (components stay mounted).
