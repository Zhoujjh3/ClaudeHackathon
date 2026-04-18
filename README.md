# FieldFit

An AI health coach designed for national correspondents and journalists. Built for real life — airports, hotel rooms, 2am deadlines, and post red-eye recoveries.

## What it does

**Coach** — Chat with an AI health advisor that knows you’re on the road and pressed for time. Ask anything, send a food photo, get immediate practical advice.

**Snap & Know** — Upload a photo of a restaurant menu, your hotel fridge, or what’s on your plate. Get instant analysis:
- *Menu mode*: highlights the 2-3 best options with one-sentence explanations
- *Fridge mode*: builds you a 15-minute meal from what you have
- *Plate mode*: rates your meal and flags anything to adjust

**Dashboard** — Quick-tap scenario buttons for your exact situation: at the airport, post red-eye, on deadline, late-night shift. Sets context so every response is calibrated to where you are and how you feel.

## Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Python FastAPI
- **AI**: Claude claude-sonnet-4-6 (vision + text)

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

## Environment variables

**backend/.env**
```
ANTHROPIC_API_KEY=your-key-here
```

**frontend** (optional — defaults to localhost:8000)
```
VITE_API_URL=http://localhost:8000
```