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

app = FastAPI(title="FieldFit API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

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
- Keep responses under 200 words unless doing a full menu analysis

When analyzing food photos or meals:
- Health rating 1-10
- 2-3 things this meal does well for energy and cognition
- 1-2 specific adjustments for next time
- If it's a menu: name the 2-3 best options, one punchy sentence each + 2 things to skip

When seeing a fridge or pantry:
- Best complete meal they can make in under 15 minutes
- Be realistic — a tired person at midnight, not a chef
- Exact ingredients to use + 3 steps max

Time-of-day intelligence:
- Before 9am: sustained energy, skip sugar spikes
- 9am-2pm: sharp cognitive performance foods
- 2pm-6pm: counter the afternoon slump without caffeine dependency
- After 8pm: if winding down → sleep-promoting foods; if still on deadline → clean alertness (protein + complex carbs, skip sugar)
- Post red-eye: electrolytes, anti-inflammatory foods, skip anything that spikes cortisol further

Always remember and reference what the user has told you: location, energy level, recent meals. Be their on-the-ground health partner, not a textbook."""


class ChatMessage(BaseModel):
    role: str
    content: Union[str, list]


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    location: Optional[str] = None
    energy_level: Optional[str] = None


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
    context_str = " | ".join(context_parts)

    api_messages = []
    for msg in request.messages:
        if isinstance(msg.content, list):
            api_messages.append({"role": msg.role, "content": msg.content})
        else:
            api_messages.append({"role": msg.role, "content": msg.content})

    # Inject live context into the last user message
    if api_messages and api_messages[-1]["role"] == "user":
        last = api_messages[-1]
        context_note = f"\n[Context: {context_str}]"
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
        "general": f"Analyze this food for a busy journalist eating on the go. Health rating 1-10. List 2-3 energy/cognition benefits. Give 1-2 specific next-time adjustments. Time: {time_str}.",
        "menu": f"This is a restaurant menu for a tired journalist who needs sustained energy. Name the 3 best options with one punchy sentence each on why. Flag 2 things to avoid. Time: {time_str}.",
        "fridge": f"This is a fridge/pantry for someone who is tired and has 15 minutes max. Suggest the best complete meal using what's visible. Exact ingredients + 3 steps. Time: {time_str}.",
        "plate": f"Analyze this meal. Health rating 1-10. What works well for sustained energy? What would you change? Any red flags (too heavy before sleep, etc.)? Time: {time_str}.",
    }

    prompt = mode_prompts.get(mode, mode_prompts["general"])
    if location:
        prompt += f" User is in/at: {location}."
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
    prompt += "\n\nGive immediate, specific advice. Under 150 words. Lead with exactly what to do right now."

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
