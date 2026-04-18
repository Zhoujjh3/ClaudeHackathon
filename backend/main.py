from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import RedirectResponse
from pydantic import BaseModel
from typing import List, Optional, Union
import anthropic
from datetime import datetime, timedelta, timezone
import os
from dotenv import load_dotenv

load_dotenv()

# Google Calendar (optional — only imported if credentials.json exists)
try:
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import Flow
    from googleapiclient.discovery import build as build_service
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False

app = FastAPI(title="FieldFit API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

CREDENTIALS_FILE = os.path.join(os.path.dirname(__file__), "credentials.json")
TOKEN_FILE = os.path.join(os.path.dirname(__file__), "token.json")
SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"]
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/calendar/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


# ── Profile-aware system prompt builder ──────────────────────────────────────

def build_system_prompt(profile: Optional[dict] = None) -> str:
    base = """You are FieldFit Coach — a deeply personal health advisor built exclusively for national correspondents and journalists with chaotic, demanding schedules.

You deeply understand your user:
- Travels constantly, crossing multiple time zones every week
- Eats on the go — airports, hotels, fast food, gas stations, hotel minibars
- Works 14-20 hour days and cannot follow any meal schedule
- Faces relentless stress, irregular sleep, and constant adrenaline spikes and crashes
- Needs advice that works RIGHT NOW, wherever they are, in 60 seconds or less

Your communication rules (never break these):
- Lead with the actionable recommendation — never with explanations first
- Use short bullet points, never paragraphs
- Be hyper-specific: "order the grilled salmon with steamed vegetables, skip the sauce" not "eat lean protein"
- Acknowledge the chaos — never suggest meal prep, cooking from scratch, or complex routines
- Keep responses under 200 words unless doing a detailed analysis
- Reference the user's personal profile, dietary needs, and goals in every response
- Track patterns: if they mention eating late repeatedly, address the pattern

Time-of-day intelligence:
- Before 9am: sustained energy, skip sugar spikes
- 9am-2pm: sharp cognitive performance foods
- 2pm-6pm: counter the afternoon slump without caffeine dependency
- After 8pm: if winding down → sleep-promoting foods; if still on deadline → clean alertness (protein + complex carbs, skip sugar)
- Post red-eye: electrolytes, anti-inflammatory foods, skip anything that spikes cortisol further

When calendar events are provided:
- Reference specific upcoming events to time nutrition advice
- Flag tight schedules and spot gaps as eating opportunities
- If back-to-back with no gaps: suggest snacks they can eat during brief pauses

Always remember and reference what the user has told you: location, energy level, recent meals, their profile, their goals. Be their on-the-ground health partner, not a textbook."""

    if profile:
        profile_section = "\n\n--- USER PROFILE (always factor this into every response) ---"
        if profile.get("name"):
            profile_section += f"\nName: {profile['name']}"
        if profile.get("dietaryRestrictions") and len(profile["dietaryRestrictions"]) > 0:
            profile_section += f"\nDietary restrictions: {', '.join(profile['dietaryRestrictions'])}"
        if profile.get("healthGoals") and len(profile["healthGoals"]) > 0:
            profile_section += f"\nHealth goals: {', '.join(profile['healthGoals'])}"
        if profile.get("travelFrequency"):
            profile_section += f"\nTravel frequency: {profile['travelFrequency']}"
        if profile.get("sleepPattern"):
            profile_section += f"\nTypical sleep pattern: {profile['sleepPattern']}"
        if profile.get("caffeineHabit"):
            profile_section += f"\nCaffeine habit: {profile['caffeineHabit']}"
        if profile.get("sensitivities"):
            profile_section += f"\nFood sensitivities/allergies: {profile['sensitivities']}"
        if profile.get("homeBase"):
            profile_section += f"\nHome base timezone: {profile['homeBase']}"
        if profile.get("travelLog") and len(profile["travelLog"]) > 0:
            recent = profile["travelLog"][-5:]
            profile_section += "\nRecent travel log:"
            for entry in recent:
                profile_section += f"\n  - {entry.get('date', '?')}: {entry.get('city', '?')} ({entry.get('timezone', '?')})"
        if profile.get("weeklyCheckins") and len(profile["weeklyCheckins"]) > 0:
            recent_checkins = profile["weeklyCheckins"][-7:]
            profile_section += "\nRecent daily check-ins:"
            for c in recent_checkins:
                profile_section += f"\n  - {c.get('date', '?')}: energy={c.get('energy', '?')}, sleep={c.get('sleepHours', '?')}h, meals={c.get('mealQuality', '?')}, hydration={c.get('hydration', '?')}"
        profile_section += "\n--- END PROFILE ---"
        base += profile_section

    return base


# ── Calendar helpers ─────────────────────────────────────────────────────────

def get_calendar_service():
    if not GOOGLE_AVAILABLE or not os.path.exists(TOKEN_FILE):
        return None
    try:
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open(TOKEN_FILE, "w") as f:
                f.write(creds.to_json())
        return build_service("calendar", "v3", credentials=creds) if creds.valid else None
    except Exception:
        return None


def format_events_for_context(events: list) -> str:
    if not events:
        return "No upcoming events"
    now = datetime.now(timezone.utc)
    parts = []
    for ev in events[:5]:
        try:
            start_str = ev.get("start", "")
            if "T" in start_str:
                start_dt = datetime.fromisoformat(start_str)
                if start_dt.tzinfo is None:
                    start_dt = start_dt.replace(tzinfo=timezone.utc)
                delta = start_dt - now
                mins = int(delta.total_seconds() / 60)
                if mins < 0:
                    time_label = "now"
                elif mins < 60:
                    time_label = f"in {mins}m"
                else:
                    time_label = f"in {mins // 60}h{mins % 60:02d}m"
                parts.append(f"{ev['title']} ({start_dt.strftime('%I:%M %p')}, {time_label})")
            else:
                parts.append(f"{ev['title']} (all day)")
        except Exception:
            parts.append(ev.get("title", "Event"))
    return " → ".join(parts)


# ── Models ───────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str
    content: Union[str, list]


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    location: Optional[str] = None
    energy_level: Optional[str] = None
    calendar_events: Optional[List[dict]] = None
    profile: Optional[dict] = None


class BriefingRequest(BaseModel):
    profile: dict


class CheckinRequest(BaseModel):
    profile: dict
    checkin: dict


# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "FieldFit API running", "version": "2.0"}


@app.post("/api/chat")
async def chat(request: ChatRequest):
    now = datetime.now()
    context_parts = [f"Current time: {now.strftime('%I:%M %p on %A, %B %d')}"]
    if request.location:
        context_parts.append(f"User location: {request.location}")
    if request.energy_level and request.energy_level != "normal":
        context_parts.append(f"User energy level: {request.energy_level}")
    if request.calendar_events is not None:
        context_parts.append(f"Upcoming schedule: {format_events_for_context(request.calendar_events)}")

    context_str = " | ".join(context_parts)

    api_messages = [{"role": m.role, "content": m.content} for m in request.messages]

    if api_messages and api_messages[-1]["role"] == "user":
        last = api_messages[-1]
        note = f"\n[Context: {context_str}]"
        if isinstance(last["content"], str):
            last["content"] += note
        elif isinstance(last["content"], list):
            for part in last["content"]:
                if isinstance(part, dict) and part.get("type") == "text":
                    part["text"] += note
                    break

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=800,
            system=build_system_prompt(request.profile),
            messages=api_messages,
        )
        return {"response": response.content[0].text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/weekly-briefing")
async def weekly_briefing(request: BriefingRequest):
    profile = request.profile
    now = datetime.now()

    prompt = f"""Generate a personalized weekly health briefing for this journalist.
Today is {now.strftime('%A, %B %d')}.

Based on their profile and recent data, provide:
1. **Week Summary** — 2-3 sentences on how their week went health-wise
2. **Pattern Alert** — any concerning patterns you see (sleep, eating, energy)
3. **Win** — one thing they did well this week (find something positive)
4. **Focus for Next Week** — one specific, actionable thing to improve
5. **Road Warrior Tip** — one travel-specific health tip personalized to their upcoming schedule

Keep the entire briefing under 250 words. Be warm but direct. Use their name if available."""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=500,
            system=build_system_prompt(profile),
            messages=[{"role": "user", "content": prompt}],
        )
        return {"briefing": response.content[0].text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/checkin-insight")
async def checkin_insight(request: CheckinRequest):
    checkin = request.checkin
    now = datetime.now()

    prompt = f"""The user just completed a daily health check-in at {now.strftime('%I:%M %p on %A')}.

Today's check-in:
- Energy level: {checkin.get('energy', 'not reported')}
- Sleep last night: {checkin.get('sleepHours', 'not reported')} hours
- Meal quality today: {checkin.get('mealQuality', 'not reported')}
- Hydration: {checkin.get('hydration', 'not reported')}
- Notes: {checkin.get('notes', 'none')}

Give a brief, personalized response (under 100 words):
- Acknowledge how they're doing
- One specific tip for the rest of today based on this check-in
- If you see a pattern from their recent check-ins, mention it briefly"""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=200,
            system=build_system_prompt(request.profile),
            messages=[{"role": "user", "content": prompt}],
        )
        return {"insight": response.content[0].text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Calendar routes ──────────────────────────────────────────────────────────

@app.get("/api/calendar/status")
def calendar_status():
    return {"connected": get_calendar_service() is not None}


@app.get("/api/calendar/connect")
def calendar_connect():
    if not GOOGLE_AVAILABLE:
        raise HTTPException(status_code=500, detail="Google libraries not installed")
    if not os.path.exists(CREDENTIALS_FILE):
        raise HTTPException(
            status_code=404,
            detail="credentials.json not found in backend/. See README for Google Calendar setup."
        )
    flow = Flow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES, redirect_uri=GOOGLE_REDIRECT_URI)
    auth_url, _ = flow.authorization_url(access_type="offline", prompt="consent")
    return RedirectResponse(auth_url)


@app.get("/api/calendar/callback")
def calendar_callback(code: str, state: str = None):
    flow = Flow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES, redirect_uri=GOOGLE_REDIRECT_URI)
    flow.fetch_token(code=code)
    with open(TOKEN_FILE, "w") as f:
        f.write(flow.credentials.to_json())
    return RedirectResponse(f"{FRONTEND_URL}?calendar=connected")


@app.get("/api/calendar/events")
def get_calendar_events():
    service = get_calendar_service()
    if not service:
        raise HTTPException(status_code=401, detail="Calendar not connected")

    now = datetime.now(timezone.utc)
    end = now + timedelta(hours=14)

    result = service.events().list(
        calendarId="primary",
        timeMin=now.isoformat(),
        timeMax=end.isoformat(),
        maxResults=8,
        singleEvents=True,
        orderBy="startTime",
    ).execute()

    events = []
    for item in result.get("items", []):
        start = item["start"].get("dateTime", item["start"].get("date", ""))
        end_time = item["end"].get("dateTime", item["end"].get("date", ""))
        events.append({
            "title": item.get("summary", "Busy"),
            "start": start,
            "end": end_time,
            "location": item.get("location", ""),
        })

    return {"events": events}


@app.delete("/api/calendar/disconnect")
def calendar_disconnect():
    if os.path.exists(TOKEN_FILE):
        os.remove(TOKEN_FILE)
    return {"disconnected": True}
