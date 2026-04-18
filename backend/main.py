from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Union
import anthropic
import base64
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="FieldFit API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """You are FieldFit — a field performance companion for journalists and national correspondents.

Your user is always one of: in transit, on deadline, sleep-deprived, jet-lagged, or eating whatever's available in an airport/hotel/gas station. They have real constraints and zero tolerance for vague advice.

CORE DIRECTIVE: Make the call. Do not present options and leave it to them. Pick one and defend it briefly.

RESPONSE FORMAT RULES — never break these:
- Lead with the action. First sentence = what to do right now.
- Maximum 4 short bullets. No paragraphs unless asked to Explain.
- Be hyper-specific: "order the grilled salmon, skip the sauce" not "eat lean protein"
- Never count calories. Never mention macros unless explicitly asked.
- Never say "it's important to", "you should consider", or "it depends" — just say what to do.
- If options are genuinely bad: say so in one line, then give the least bad move.

WHEN MODE IS "Decide" (default):
Structure your response as:
**Best move:** [exact action in one line]
**Why:** [one line max]
**Avoid:** [one specific thing]

WHEN MODE IS "Explain":
Same structure, but add 2-3 sentences of reasoning after the Why.

WHEN MODE IS "Damage Control":
Lead with: "Here's how we limit the damage."
Then: least bad option → what to pair with it → what to avoid → one recovery move for later.

WHEN CONSTRAINTS ARE STATED (boarding soon, no utensils, vending machine only, etc.):
Treat them as hard limits. Never recommend something that violates a stated constraint.

WHEN A MISSION IS ACTIVE (e.g. "Survive the Airport", "Avoid the 3PM Crash"):
Anchor every response to that mission. Every food choice should serve the stated goal explicitly.

FOOD PHOTO ANALYSIS — Quick Read or Damage Report mode:
**Score:** [X]/10
**Biggest asset:** [one phrase]
**Main risk:** [one phrase]
**Best adjustment:** [one specific change]
If score is 4 or below, start your entire response with exactly: BAD OPTIONS — damage control:

MENU ANALYSIS — Best Pick mode:
**Best pick:** [item] — [one sentence why]
**Backup:** [item]
**Skip:** [item] — [5 words max why]

FRIDGE/PANTRY ANALYSIS — Rescue Meal mode:
**Meal:** [name in 3 words max]
**Steps:** [3 steps max, each one line]
**Why it works:** [one line]

TIME-OF-DAY INTELLIGENCE:
Before 9am: sustained energy, no sugar spikes, electrolytes if fatigued
9am–2pm: cognitive performance foods
2pm–6pm: counter the slump without caffeine dependency
After 8pm (winding down): sleep-promoting foods, skip alcohol
After 8pm (still working): clean protein + complex carbs, no sugar
Post red-eye: electrolytes, anti-inflammatory, nothing that spikes cortisol further

TONE: Seasoned field producer who's been everywhere. Direct, calm, decided. Like telling a junior correspondent what to eat before a live shot. No lectures. No preamble."""


class ChatMessage(BaseModel):
    role: str
    content: Union[str, list]


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    location: Optional[str] = None
    energy_level: Optional[str] = None
    mission: Optional[str] = None
    chat_mode: Optional[str] = None
    constraints: Optional[List[str]] = None


@app.get("/")
def root():
    return {"status": "FieldFit API running", "version": "2.0"}


@app.post("/api/chat")
async def chat(request: ChatRequest):
    now = datetime.now()

    context_parts = [f"Time: {now.strftime('%I:%M %p on %A, %B %d')}"]
    if request.location:
        context_parts.append(f"Location: {request.location}")
    if request.energy_level and request.energy_level != "normal":
        context_parts.append(f"Energy: {request.energy_level}")
    if request.mission:
        context_parts.append(f"Active mission: {request.mission}")
    if request.chat_mode:
        context_parts.append(f"Mode: {request.chat_mode}")
    if request.constraints:
        context_parts.append(f"Constraints: {', '.join(request.constraints)}")

    context_str = " | ".join(context_parts)

    api_messages = []
    for msg in request.messages:
        api_messages.append({"role": msg.role, "content": msg.content})

    if api_messages and api_messages[-1]["role"] == "user":
        last = api_messages[-1]
        context_note = f"\n[Field context: {context_str}]"
        if isinstance(last["content"], str):
            last["content"] = last["content"] + context_note
        elif isinstance(last["content"], list):
            for part in last["content"]:
                if isinstance(part, dict) and part.get("type") == "text":
                    part["text"] = part["text"] + context_note
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


@app.post("/api/analyze")
async def analyze_food(
    file: UploadFile = File(...),
    mode: str = Form("general"),
    location: str = Form(""),
    context: str = Form(""),
):
    image_data = await file.read()
    image_b64 = base64.standard_b64encode(image_data).decode("utf-8")

    content_type = file.content_type
    if not content_type or not content_type.startswith("image/"):
        content_type = "image/jpeg"

    now = datetime.now()
    time_str = now.strftime("%I:%M %p on %A")

    mode_prompts = {
        "general": (
            f"Quick Read assessment. Time: {time_str}. "
            "Respond with this exact structure: "
            "**Score:** X/10 | **Biggest asset:** [one phrase] | "
            "**Main risk:** [one phrase] | **Best adjustment:** [one specific action]. "
            "If score is 4 or below, begin your entire response with: BAD OPTIONS — damage control:"
        ),
        "menu": (
            f"Best Pick analysis for a tired journalist. Time: {time_str}. "
            "Respond with this exact structure: "
            "**Best pick:** [item] — [one sentence why] | "
            "**Backup:** [item] | "
            "**Skip:** [item] — [5 words max why]. "
            "Be decisive — name one winner."
        ),
        "fridge": (
            f"Rescue Meal assessment. Time: {time_str}. Tired person, 15 minutes max. "
            "Respond with this exact structure: "
            "**Meal:** [name in 3 words] | "
            "**Steps:** [3 steps max, each one line] | "
            "**Why it works:** [one line]. "
            "Be realistic — not a chef, it's late."
        ),
        "plate": (
            f"Damage Report. Time: {time_str}. "
            "Respond with this exact structure: "
            "**Score:** X/10 | **Biggest asset:** [one phrase] | "
            "**Main risk:** [one phrase] | **Best adjustment:** [one specific change for next time]. "
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
            max_tokens=700,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": content_type,
                                "data": image_b64,
                            },
                        },
                        {"type": "text", "text": prompt},
                    ],
                }
            ],
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
            max_tokens=250,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        return {"advice": response.content[0].text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
