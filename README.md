# FieldFit

A personalized AI health coach designed for national correspondents and journalists. Built for real life — airports, hotel rooms, 2am deadlines, and post red-eye recoveries.

## What it does

**Personalized Onboarding** — 60-second setup captures your dietary restrictions, health goals, travel frequency, sleep patterns, caffeine habits, and food sensitivities. Every piece of advice is shaped by your profile.

**Dashboard** — Quick-tap scenario buttons for your exact situation: at the airport, post red-eye, on deadline, late-night shift. Daily check-ins track your energy, sleep, meals, and hydration — the coach learns your patterns over time. Time-aware tips rotate based on the hour and your personal goals. Google Calendar integration shows your schedule and times nutrition advice around your meetings.

**Coach** — Chat with an AI health advisor that knows your dietary needs, your goals, your travel schedule, and your current energy level. Attach food photos for instant analysis. Your full profile and calendar are silently injected into every conversation so the advice is always personal.

**My Profile** — Travel log to track timezone shifts and jet lag impact. Weekly AI-generated health briefings based on your check-in data. Edit your dietary needs, goals, and lifestyle settings anytime. View your check-in history and streaks.

## Key features

- **Profile-aware AI**: Every response factors in dietary restrictions, allergies, health goals, sleep pattern, and caffeine habits
- **Daily check-ins**: 30-second energy/sleep/meal/hydration tracking with AI-generated insights
- **Travel log**: Track city + timezone hops so the coach understands your jet lag state
- **Weekly briefings**: AI-generated health summaries based on accumulated check-in data
- **Google Calendar**: Schedule-aware nutrition timing ("You have 45 min free at 1pm — that's your meal window")
- **Adaptive tips**: Dashboard tips change based on your profile (heavy caffeine users get different advice)
- **Streak tracking**: Gamified consistency to encourage daily health awareness
- **Food photo analysis**: Attach photos in chat for instant nutritional breakdown

## Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Python FastAPI
- **AI**: Claude claude-sonnet-4-6 (vision + text)
- **Calendar**: Google Calendar API (optional)
- **Storage**: localStorage (profile, check-ins, travel log)

## Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env

uvicorn main:app --reload
# API runs on http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# App runs on http://localhost:3000
```

Open http://localhost:3000.

### Google Calendar (optional)

1. Create a project in Google Cloud Console
2. Enable the Google Calendar API
3. Create OAuth 2.0 credentials (Web application)
4. Set redirect URI to `http://localhost:8000/api/calendar/callback`
5. Download `credentials.json` to the `backend/` directory
6. Click "Connect Google Calendar" in the app

## Environment variables

**backend/.env**
```
ANTHROPIC_API_KEY=your-key-here
GOOGLE_REDIRECT_URI=http://localhost:8000/api/calendar/callback
FRONTEND_URL=http://localhost:3000
```

**frontend** (optional — defaults to localhost:8000)
```
VITE_API_URL=http://localhost:8000
```

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/chat` | POST | Profile-aware AI chat with context injection |
| `/api/weekly-briefing` | POST | AI-generated weekly health summary |
| `/api/checkin-insight` | POST | Personalized feedback on daily check-in |
| `/api/calendar/status` | GET | Check Google Calendar connection |
| `/api/calendar/connect` | GET | Start OAuth flow |
| `/api/calendar/events` | GET | Fetch upcoming events |
| `/api/calendar/disconnect` | DELETE | Remove calendar connection |
