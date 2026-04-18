# FieldFit

An AI health coach designed for national correspondents and journalists. Built for real life — airports, hotel rooms, 2am deadlines, and post red-eye recoveries.

## Features

**Dashboard** — Set your location and energy level. Quick-tap scenario buttons (airport, post red-eye, on deadline, late-night shift) send pre-loaded context to the coach. Connects to Google Calendar to show your day's schedule and feed that context into every AI response.

**Coach** — Chat with an AI health advisor that knows you're on the road. Attach food photos directly in chat. Automatically receives your location, energy level, and upcoming calendar events so advice is always calibrated to right now.

## Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Python FastAPI
- **AI**: Claude claude-sonnet-4-6
- **Calendar**: Google Calendar API (optional)

---

## Local development

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env: add ANTHROPIC_API_KEY

uvicorn main:app --reload
# → http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

---

## Google Calendar setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → Enable **Google Calendar API**
3. Go to **Credentials** → Create **OAuth 2.0 Client ID** → type: **Web application**
4. Add authorized redirect URI:
   - Local: `http://localhost:8000/api/calendar/callback`
   - Server: `http://YOUR_SERVER_IP/api/calendar/callback` (if using nginx on port 80)
5. Download `credentials.json` → place it in `backend/credentials.json`
6. Add to `backend/.env`:

```
GOOGLE_REDIRECT_URI=http://localhost:8000/api/calendar/callback
FRONTEND_URL=http://localhost:3000
```

7. In the app, click **Connect Google Calendar** in the Dashboard. You'll be redirected to Google's auth page. After approving, you're connected — your schedule now feeds into every coach response.

---

## Deploying to your server

### One-time setup on the server

```bash
# Copy files to server
scp -r . user@your-server:~/fieldfit

# SSH in
ssh user@your-server
cd ~/fieldfit

# Backend setup
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your keys

# Frontend build
cd ../frontend
npm install
npm run build   # outputs to frontend/dist/
```

### Start services

```bash
chmod +x start.sh
./start.sh
```

Uses `screen` to keep both processes running after you disconnect. To check logs:

```bash
screen -r fieldfit-backend
screen -r fieldfit-frontend
# Detach: Ctrl+A then D
```

### Optional: nginx (recommended for port 80 + clean URLs)

1. Build frontend with empty API URL so calls are relative:
   ```bash
   cd frontend
   VITE_API_URL="" npm run build
   ```
2. Edit `deploy/nginx.conf` — update `root` path and `server_name`
3. Install and enable:
   ```bash
   sudo cp deploy/nginx.conf /etc/nginx/sites-available/fieldfit
   sudo ln -s /etc/nginx/sites-available/fieldfit /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```
4. Update Google Cloud Console redirect URI to `http://your-server-ip/api/calendar/callback`
5. Update `backend/.env`:
   ```
   GOOGLE_REDIRECT_URI=http://your-server-ip/api/calendar/callback
   FRONTEND_URL=http://your-server-ip
   ```

With nginx, the app runs on port 80 — no port numbers in the URL.

---

## Environment variables

**backend/.env**
```
ANTHROPIC_API_KEY=your-key-here
GOOGLE_REDIRECT_URI=http://localhost:8000/api/calendar/callback
FRONTEND_URL=http://localhost:3000
```

**frontend** (only needed in dev — leave unset in production with nginx)
```
VITE_API_URL=http://localhost:8000
```
