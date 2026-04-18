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
    from googleapiclient.discovery import build
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

SYSTEM_PROMPT = """You are FieldFit Coach — a personal health advisor built exclusively for national correspondents and journalists with chaotic, demanding schedules.

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
- Keep responses under 200 words unless doing a full analysis

Time-of-day intelligence:
- Before 9am: sustained energy, skip sugar spikes
- 9am-2pm: sharp cognitive performance foods
- 2pm-6pm: counter the afternoon slump without caffeine dependency
- After 8pm: if winding down → sleep-promoting foods; if still on deadline → clean alertness (protein + complex carbs, skip sugar)
- Post red-eye: electrolytes, anti-inflammatory foods, skip anything that spikes cortisol further

When calendar events are provided:
- Reference specific upcoming events to time nutrition advice: "You have a press briefing in 90 minutes — eat now so you're not hungry mid-meeting"
- Flag tight schedules: "You're booked solid 2-6pm — this window right now is your only real meal chance"
- Spot gaps as eating opportunities: "You have 45 minutes free at 1pm — that's your window"
- If back-to-back with no gaps: suggest snacks they can eat during brief pauses

Always remember and reference what the user has shared: location, energy level, upcoming schedule. Be their on-the-ground health partner."""


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
        return build("calendar", "v3", credentials=creds) if creds.valid else None
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


# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "FieldFit API running", "version": "1.0"}


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

    # Inject live context into the last user message
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
            system=SYSTEM_PROMPT,
            messages=api_messages,
        )
        return {"response": response.content[0].text}
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
