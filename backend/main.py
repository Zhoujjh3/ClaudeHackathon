from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import RedirectResponse
from pydantic import BaseModel
from typing import List, Optional, Union
import anthropic
import base64
from datetime import datetime, timedelta, timezone
import os
from dotenv import load_dotenv

load_dotenv()

# Google Calendar — optional, only used if credentials.json is present
try:
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import Flow
    from googleapiclient.discovery import build
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False

app = FastAPI(title="FieldFit API", version="3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

CREDENTIALS_FILE = os.path.join(os.path.dirname(__file__), "credentials.json")
TOKEN_FILE       = os.path.join(os.path.dirname(__file__), "token.json")
SCOPES           = ["https://www.googleapis.com/auth/calendar.readonly"]
REDIRECT_URI     = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/calendar/callback")
FRONTEND_URL     = os.getenv("FRONTEND_URL", "http://localhost:8000")

SYSTEM_PROMPT = """You are FieldFit — a field decision system for journalists and correspondents in chaotic food environments.

Your user is always one of: in transit, on deadline, sleep-deprived, jet-lagged, or eating whatever's available. They need the move — not an explanation of nutrition science.

CORE DIRECTIVE: Make the call. Name the best option. Defend it briefly. Move on.

━━━ RESPONSE FORMAT ━━━

WHEN MODE IS "Decide" (default — use this unless told otherwise):
**Best move:** [exact action, one line]
**Why:** [one line max]
**Backup:** [if best move unavailable, do this instead]
**Avoid:** [one specific thing and why in 5 words]
**Recovery:** [what to do in 2-3 hours]

Then, when the decision has meaningful time consequences, add:
**NOW →** [action for next 30 minutes]
**LATER →** [2-3 hour note]
**TOMORROW →** [morning note, only if truly relevant — skip if not]

WHEN MODE IS "Explain":
Same labels as Decide, but add 2-3 sentences of reasoning after Why.
Still include NOW → / LATER → when relevant.

WHEN MODE IS "Damage Control":
User already made a bad choice or only has bad options. Do not judge.
**Least bad option:** [specific item/action]
**Pair with:** [what to have alongside to blunt the damage]
**Don't stack:** [what not to add on top]
**Recovery move:** [what to do in 2-3 hours to stabilize]

Then add time horizons:
**NOW →** [immediate action]
**LATER →** [2-3 hour stabilization note]
**TOMORROW →** [morning recovery note if relevant]

━━━ COMPOUNDING MISTAKES ━━━

When you detect a bad chain — pastry + black coffee on empty stomach, chips + energy drink + no water, late heavy meal + poor sleep timing, sugar spike followed by long food gap — flag it:
⚡ Stack warning: [what you see] — [what usually follows if they don't act]

This is one of the most valuable things you can tell them. Use it when the pattern is genuinely there.

━━━ CONSTRAINTS ━━━

When constraints are stated (boarding soon, no utensils, vending machine only, need sleep soon, eating while walking, nothing fresh, etc.):
- Treat them as hard limits. Never recommend something that violates one.
- "Need sleep soon" — always add a **Sleep impact:** note and include TOMORROW → section.

━━━ MISSION ━━━

When a mission is active, anchor every recommendation to it explicitly.
- "Survive travel day" = every choice prioritizes staying functional in transit
- "Avoid the 3PM crash" = everything serves blood sugar stability through the afternoon
- "Recover from bad sleep" = prioritize anti-inflammatory foods, electrolytes, nothing cortisol-spiking
- "Late shift survival" = no sugar spikes, slow fuel, protect the next sleep window
- "Stay sharp on deadline" = cognitive performance, nothing that makes you foggy
- "Damage control" = stabilize from bad choices, prevent compounding, plan recovery

━━━ SNAP / IMAGE ANALYSIS ━━━

Quick Read and Damage Report modes:
**Score:** [X]/10
**Biggest asset:** [one phrase]
**Main risk:** [one phrase]
**Best adjustment:** [one specific change]
**Situation read:** [environment type — gas station, hotel buffet, airport grab-and-go, etc.]
**Crash risk:** [Low / Medium / High — one phrase why]
**Focus support:** [how this helps or hurts focus, one phrase]
**Sleep impact:** [only include if evening context or "need sleep soon" constraint is set]
If score is 4 or below, begin your entire response with: BAD OPTIONS — damage control:

Best Pick / menu mode:
**Best pick:** [item] — [one sentence why]
**Backup:** [item]
**Skip:** [item] — [5 words max why]
**Situation read:** [venue type and what it implies]
**Crash risk:** [based on what they'll likely order]

Rescue Meal / fridge mode:
**Meal:** [name in 3 words max]
**Steps:** [3 steps max, each one line]
**Why it works:** [one line]
**Situation read:** [what this fridge/pantry says about their situation]

━━━ RULES ━━━

- Never count calories. Never mention macros unless asked.
- Never say "it's important to", "you should consider", "it depends" — just say what to do.
- If options are genuinely bad: acknowledge it in one line, give the move.
- No lectures. No preamble. No moralizing.

━━━ TIME-OF-DAY INTELLIGENCE ━━━

Before 9am: sustained energy, no sugar spikes, electrolytes if fatigued
9am–2pm: cognitive performance window — prioritize protein + slow carbs
2pm–6pm: counter the slump without adding caffeine dependency
After 8pm, winding down: sleep-promoting foods, skip alcohol, nothing cortisol-spiking
After 8pm, still working: clean protein + complex carbs, no sugar
Post red-eye: electrolytes first, anti-inflammatory foods, nothing that spikes cortisol

━━━ CALENDAR ━━━

When calendar events are provided:
- Reference upcoming events to time nutrition advice: "You have a press briefing in 90 minutes — eat now so you're not hungry mid-meeting"
- Flag tight schedules: "You're booked solid 2–6pm — this window right now is your only real meal chance"
- Spot gaps as eating opportunities

━━━ TONE ━━━

Seasoned field producer who's been everywhere. Direct, calm, decided. Like telling a colleague what to eat before a live shot. You've seen all the bad options and you know what works."""


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
                dt = datetime.fromisoformat(start_str)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                mins = int((dt - now).total_seconds() / 60)
                label = "now" if mins < 0 else f"in {mins}m" if mins < 60 else f"in {mins//60}h{mins%60:02d}m"
                parts.append(f"{ev['title']} ({dt.strftime('%I:%M %p')}, {label})")
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
    mission: Optional[str] = None
    chat_mode: Optional[str] = None
    constraints: Optional[List[str]] = None


# ── Core routes ──────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "FieldFit API running", "version": "3.0"}


@app.post("/api/chat")
async def chat(request: ChatRequest):
    now = datetime.now()

    context_parts = [f"Time: {now.strftime('%I:%M %p on %A, %B %d')}"]
    if request.location:
        context_parts.append(f"Location: {request.location}")
    if request.energy_level and request.energy_level != "normal":
        context_parts.append(f"Energy: {request.energy_level}")
    if request.calendar_events is not None:
        context_parts.append(f"Upcoming schedule: {format_events_for_context(request.calendar_events)}")
    if request.mission:
        context_parts.append(f"Active mission: {request.mission}")
    if request.chat_mode:
        context_parts.append(f"Mode: {request.chat_mode}")
    if request.constraints:
        constraints_str = ", ".join(request.constraints)
        context_parts.append(f"Hard constraints: {constraints_str}")
        if "need sleep soon" in request.constraints:
            context_parts.append("SLEEP FLAG: always include Sleep impact note and TOMORROW → section")

    context_str = " | ".join(context_parts)

    api_messages = []
    for msg in request.messages:
        api_messages.append({"role": msg.role, "content": msg.content})

    if api_messages and api_messages[-1]["role"] == "user":
        last = api_messages[-1]
        context_note = f"\n[Field context: {context_str}]"
        if isinstance(last["content"], str):
            last["content"] += context_note
        elif isinstance(last["content"], list):
            for part in last["content"]:
                if isinstance(part, dict) and part.get("type") == "text":
                    part["text"] += context_note
                    break

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=900,
            system=SYSTEM_PROMPT,
            messages=api_messages,
        )
        return {"response": response.content[0].text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/analyze")
async def analyze_food(
    file: UploadFile = File(...),
    mode: str = Form("general"),
    location: str = Form(""),
    context: str = Form(""),
):
    image_data = await file.read()
    image_b64 = base64.standard_b64encode(image_data).decode("utf-8")

    SUPPORTED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    content_type = file.content_type or ""
    if content_type not in SUPPORTED_TYPES:
        content_type = "image/jpeg"

    now = datetime.now()
    time_str = now.strftime("%I:%M %p on %A")

    scene_instruction = (
        "Also include a scene-level read: "
        "**Situation read:** [environment type in one phrase] | "
        "**Crash risk:** [Low/Medium/High — one phrase why] | "
        "**Focus support:** [one phrase on how this affects focus]"
    )

    mode_prompts = {
        "general": (
            f"Quick Read field assessment. Time: {time_str}. "
            "Use this exact structure: "
            "**Score:** X/10 | **Biggest asset:** [one phrase] | "
            "**Main risk:** [one phrase] | **Best adjustment:** [one specific action]. "
            f"{scene_instruction}. "
            "If score is 4 or below, begin your entire response with: BAD OPTIONS — damage control:"
        ),
        "menu": (
            f"Best Pick analysis for a tired journalist. Time: {time_str}. "
            "Use this exact structure: "
            "**Best pick:** [item] — [one sentence why] | "
            "**Backup:** [item] | "
            "**Skip:** [item] — [5 words max why] | "
            "**Situation read:** [venue type and what it implies for a journalist] | "
            "**Crash risk:** [based on what they'll likely order]. "
            "Be decisive — name one winner."
        ),
        "fridge": (
            f"Rescue Meal assessment. Time: {time_str}. Tired person, 15 minutes max. "
            "Use this exact structure: "
            "**Meal:** [name in 3 words max] | "
            "**Steps:** [3 steps max, each one line] | "
            "**Why it works:** [one line] | "
            "**Situation read:** [what this fridge says about their current state]. "
            "Be realistic — not a chef, likely exhausted."
        ),
        "plate": (
            f"Damage Report. Time: {time_str}. "
            "Use this exact structure: "
            "**Score:** X/10 | **Biggest asset:** [one phrase] | "
            "**Main risk:** [one phrase] | **Best adjustment:** [one specific change for next time]. "
            f"{scene_instruction}. "
            "If score is 4 or below, begin your entire response with: BAD OPTIONS — damage control:"
        ),
    }

    prompt = mode_prompts.get(mode, mode_prompts["general"])
    if location:
        prompt += f" User is at: {location}."
    if context:
        prompt += f" Additional context: {context}"

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=800,
            system=SYSTEM_PROMPT,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": content_type, "data": image_b64}},
                    {"type": "text", "text": prompt},
                ],
            }],
        )
        return {"analysis": response.content[0].text, "mode": mode}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/quick-advice")
async def quick_advice(scenario: str, location: Optional[str] = None):
    now = datetime.now()
    prompt = f"Scenario: {scenario}\nTime: {now.strftime('%I:%M %p on %A')}"
    if location:
        prompt += f"\nLocation: {location}"
    prompt += "\n\nMake the call. Under 150 words. Lead with exactly what to do right now."

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=300,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        return {"advice": response.content[0].text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Calendar routes ──────────────────────────────────────────────────────────

@app.get("/api/calendar/status")
def calendar_status():
    return {"connected": get_calendar_service() is not None}


@app.get("/api/calendar/connect")
def calendar_connect():
    if not GOOGLE_AVAILABLE:
        raise HTTPException(status_code=500, detail="Google libraries not installed. Run: pip install -r requirements.txt")
    if not os.path.exists(CREDENTIALS_FILE):
        raise HTTPException(status_code=404, detail="backend/credentials.json not found. See README.")
    flow = Flow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES, redirect_uri=REDIRECT_URI)
    auth_url, _ = flow.authorization_url(access_type="offline", prompt="consent")
    return RedirectResponse(auth_url)


@app.get("/api/calendar/callback")
def calendar_callback(code: str, state: str = None):
    flow = Flow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES, redirect_uri=REDIRECT_URI)
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
    result = service.events().list(
        calendarId="primary",
        timeMin=now.isoformat(),
        timeMax=(now + timedelta(hours=14)).isoformat(),
        maxResults=8,
        singleEvents=True,
        orderBy="startTime",
    ).execute()

    events = []
    for item in result.get("items", []):
        events.append({
            "title":    item.get("summary", "Busy"),
            "start":    item["start"].get("dateTime", item["start"].get("date", "")),
            "end":      item["end"].get("dateTime", item["end"].get("date", "")),
            "location": item.get("location", ""),
        })
    return {"events": events}


@app.delete("/api/calendar/disconnect")
def calendar_disconnect():
    if os.path.exists(TOKEN_FILE):
        os.remove(TOKEN_FILE)
    return {"disconnected": True}
