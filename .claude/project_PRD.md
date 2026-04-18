# Product Requirements Document
## FieldFit — AI Health Coach for Field Journalists
**Version:** 1.0 · Hackathon MVP  
**Build window:** 3 hours  
**Team:** 2 engineers  
**Last updated:** April 18, 2026

---

## ⚠ Realism Notice — Read This First

This PRD contains everything described in the product vision. **Not all of it will ship in 3 hours.** Every feature is tagged:

| Tag | Meaning |
|---|---|
| `[MUST]` | Core demo breaks without this. Build it first. |
| `[SHOULD]` | Strong demo. Build it if MUST features are done by hour 2. |
| `[STRETCH]` | Only touch this if everything else is done and working. |

**The rule:** If you are unsure whether something is working, fix it before moving to the next feature. A polished 60% beats a broken 100%.

**Cut-line:** If you hit 2:30 and are not in integration/polish, drop all `[STRETCH]` features immediately. Do not attempt them.

---

## 1. Problem Statement

Field journalists eat at wrong times, in wrong places, with no ability to plan. Existing apps assume a controlled life. FieldFit does not.

The core insight: **the journalist's bottleneck is not knowledge — it's the translation gap between "I'm standing in a hotel lobby at midnight" and "here is exactly what you should do right now."**

FieldFit closes that gap across three surfaces: a dashboard that sets context once and uses it everywhere, a conversational coach that always knows where you are, and a camera-based analyzer that works on any food, menu, or fridge they encounter.

---

## 2. Product Vision — Three Screens

### Screen 1 — Home (Dashboard)
Sets the user's current context. Everything else in the app consumes this context automatically.

### Screen 2 — Coach (AI Chat)
Full conversation with a field-aware health advisor. Photos can be attached directly in chat.

### Screen 3 — Snap & Know (Photo Analysis)
Camera-based analysis across four modes: Food rating, Menu picks, Fridge meal builder, Plate post-mortem.

---

## 3. What Is Realistically Buildable in 3 Hours

Honest assessment before specs:

| Feature | Realistic? | Risk |
|---|---|---|
| Home dashboard with context inputs | ✅ Yes | Low |
| Rotating time-based tip | ✅ Yes | Low |
| Scenario preset cards | ✅ Yes | Low |
| Claude chat with context injection | ✅ Yes | Low |
| Photo attachment in chat (file input → base64 → Claude vision) | ✅ Yes | Medium — test in hour 1 |
| Snap & Know: Menu mode | ✅ Yes | Medium |
| Snap & Know: Food mode | ✅ Yes | Low (same pipeline as Menu) |
| Snap & Know: Fridge mode | ⚠ Possible | Medium — prompt engineering takes time |
| Snap & Know: Plate mode | ⚠ Possible | Medium — same caveat |
| Suggested prompts in Coach | ✅ Yes | Low |
| Real camera capture (getUserMedia) | ⚠ Risky | High — browser/device dependent. Use file input instead. |
| Persistent chat history across sessions | ❌ Skip | Unnecessary for demo |
| User accounts / auth | ❌ Skip | Never |
| Calorie calculations | ❌ Skip | Out of scope |

**Camera note:** Do NOT implement `getUserMedia` live camera capture. Use `<input type="file" accept="image/*" capture="environment">`. On mobile, this opens the camera natively. On desktop, it opens a file picker. This works everywhere and takes 5 minutes to build. `getUserMedia` is a rabbit hole.

---

## 4. Architecture Decision — One File

**Single `index.html` file.** No build tools. No npm. No React.

Reasons:
- Portable — demo from any laptop, USB stick, or GitHub Pages URL
- Zero setup time on demo day
- No "it works on my machine" failures
- All judges can open it immediately

Structure inside the file:
```
<style>         ← all CSS
<div#app>       ← three tab panels (Home, Coach, Snap & Know)
<script>        ← all JS, Claude API calls, state
```

**API key:** Prompt user to paste Anthropic API key on first load. Store in `sessionStorage` (not `localStorage` — clears on tab close, safer for demo). Show a single input screen before the app renders. Takes 10 minutes to build, never worry about exposed keys.

---

## 5. Screen 1 — Home (Dashboard)

### 5.1 Purpose
Set context once. Everything else reads from it silently. User should not have to re-enter location or energy level for every interaction.

### 5.2 Features

**Context bar** `[MUST]`  
Two inputs, always visible at the top of Home:
- Location: text input, placeholder "Where are you right now?"  
  Examples: "JFK Terminal 4", "Holiday Inn Columbus", "Capitol Hill"
- Energy level: slider 1–5 with labels: 1 = Depleted · 3 = OK · 5 = Sharp

Both values stored in a global JS object (`window.userContext`). Every Claude call reads from this object.

**Rotating time-based tip** `[MUST]`  
A single tip card that changes based on `new Date().getHours()`. Hardcoded — no API call needed. Rotates automatically.

Tips by hour block:
```
5–8 AM:    "Pre-dawn window: eat something now or you'll be running on fumes by 9. 
            Banana + peanut butter beats nothing."

8–11 AM:   "Morning peak: your brain is sharpest right now. 
            Don't waste it. Protect this window."

11 AM–1 PM: "Lunch window: biggest mistake is skipping it to 'power through.' 
             You won't. Eat."

1–4 PM:    "Afternoon wall incoming around 3 PM. 
            A piece of fruit now delays it 90 minutes."

4–7 PM:    "Late afternoon: if you haven't eaten since noon, 
            your cortisol is elevated. Small meal now, not a big one."

7–10 PM:   "Evening: if you're still working, prioritize protein over carbs. 
             Carbs now = crash in 2 hours."

10 PM–midnight: "Late shift: your digestive system is slowing. 
                 Light snack only — nuts, cheese, nothing heavy."

Midnight–5 AM: "After midnight: gut is in shutdown mode. 
                Handful of nuts max. Eating a full meal now will hurt tomorrow."
```

**Scenario preset cards** `[MUST]`  
Six tappable cards. Each one pre-fills and navigates to Coach with a specific prompt.

| Card Label | Pre-filled prompt sent to Coach |
|---|---|
| At the airport | "I'm at [location]. About to go through security / waiting for a flight. What should I eat or grab before boarding?" |
| Late night shift | "It's [time]. I've been working since morning. What should I eat that won't wreck my sleep or tomorrow's focus?" |
| Post red-eye | "Just landed after an overnight flight. Running on [energy]/5. What do I eat first to recover?" |
| On deadline | "I'm on deadline — no time to sit down. What can I grab in under 5 minutes that will keep me sharp?" |
| Between stories | "I have about 30 minutes between assignments. I'm at [location]. What's the smartest thing to do for my health right now?" |
| Quick break (10 min) | "10-minute break. I'm at [location]. Energy is [energy]/5. What's one thing I can do for my health in the next 10 minutes?" |

`[location]` and `[energy]` are replaced with the current values from the context bar before sending.

Tapping a card: fill the prompt → switch to Coach tab → auto-submit the prompt.

### 5.3 What Home Does NOT Do
- No activity tracking
- No water intake logging
- No streaks or gamification
- No persistent history display (this would require a backend)

---

## 6. Screen 2 — Coach (AI Chat)

### 6.1 Purpose
Full conversation with a health advisor who always knows your situation. The user never has to re-explain where they are.

### 6.2 Features

**Chat interface** `[MUST]`  
Standard chat layout: message history above, input below. User messages right-aligned. Claude responses left-aligned.

Session history only — clears on page refresh. Show last 20 messages maximum (trim older ones to avoid context window bloat).

**Context injection** `[MUST]`  
Every message sent to Claude includes a prepended system context block:

```
[Current context]
Location: {location || "not specified"}
Energy level: {energy}/5
Time: {HH:MM, 12h format}
```

This is injected into the system prompt, not the user message. User never sees it. Coach always has it.

**Photo attachment** `[SHOULD]`  
A paperclip/camera icon next to the input field. Tapping it opens:
```html
<input type="file" accept="image/*" capture="environment">
```

On mobile: opens native camera. On desktop: opens file picker.

Selected image:
1. Displayed as a thumbnail preview in the message input area
2. Converted to base64
3. Sent to Claude as a `vision` content block alongside the text message

User flow: attach photo → optionally type "what do you think of this?" → send → Claude responds with analysis in plain conversational language.

**Implementation note:** Test the base64 → Claude vision pipeline in the first 30 minutes. This is the highest-risk feature in the whole app. If it is not working by minute 30, deprioritize and build the rest of Coach without it. Photo analysis still exists in Snap & Know — the demo does not die without it in Chat.

**Suggested prompts** `[SHOULD]`  
Shown only when chat history is empty. Four pill buttons below the input:

- "I haven't eaten in 6+ hours. Help."
- "What should I avoid eating right now?"
- "I have 15 minutes and a hotel minibar. Go."
- "Rate my eating habits this week."

Tapping one fills the input. User can edit before sending.

**System prompt — Coach**

```
You are a health coach embedded in an app called FieldFit, 
designed for journalists and correspondents in the field.

You are direct, practical, and never preachy. You give specific 
recommendations, not general principles. You never say "consider" 
or "you might want to" — you say "eat this" or "skip that."

You understand that your user is:
- Often traveling, jet-lagged, eating at odd hours
- Under deadline pressure with no time to cook or plan
- Smart enough to not need a lecture — they need an answer
- Eating at airports, gas stations, hotel bars, and press canteens

When photos are included, analyze them directly and specifically.
For food photos: rate it 1-10 for energy and cognitive benefit, 
briefly explain why, and give one specific adjustment for next time.
For menus: identify the 2-3 best picks and explain the choice briefly.

Never calculate calories unless specifically asked.
Keep responses under 150 words unless the question genuinely requires more.
No bullet points for casual conversation — write like a knowledgeable friend.
```

### 6.3 What Coach Does NOT Do
- No voice input
- No multi-user conversations
- No memory between sessions
- No exercise recommendations (out of scope)

---

## 7. Screen 3 — Snap & Know (Photo Analysis)

### 7.1 Purpose
Camera-based analysis for four specific situations a journalist encounters. One photo in, specific useful output out.

### 7.2 Mode Overview

All four modes use the same underlying pipeline:
1. File input (same `<input type="file" accept="image/*" capture="environment">`)
2. Base64 encode image
3. Send to Claude vision API with mode-specific system prompt
4. Display structured response

The difference between modes is entirely in the system prompt. The UI is a tab switcher above a single photo upload area.

### 7.3 Mode Specs

**Mode 1 — Food** `[MUST]`  
*"Rate any meal for energy and cognition"*

Input: Photo of any meal or food item.

Output format (enforce in system prompt):
```
Score: X/10

Why this score: [2 sentences max]

Best thing on the plate: [specific item, one sentence]

One adjustment next time: [specific, actionable, one sentence]
```

System prompt addition:
```
The user has photographed a meal or food item. 
Rate it from 1-10 based on its energy and cognitive benefit 
for a journalist on a demanding schedule.
Be specific about what you see. 
Use the output format exactly.
```

**Mode 2 — Menu** `[MUST]`  
*"Snap a menu, get your best picks"*

Input: Photo of any restaurant, diner, or fast-food menu.

Output format:
```
Best pick: [item name] — [one sentence why]

Second pick: [item name] — [one sentence why]

Skip: [item name] — [one sentence why]
```

System prompt addition:
```
The user has photographed a restaurant or food-service menu.
Identify the 2 best options for sustained energy and focus.
Identify 1 item to avoid and briefly explain why.
Be specific to what's visible in the photo.
If the menu is hard to read, identify what you can and note the limitation.
Use the output format exactly. No preamble.
```

**Mode 3 — Fridge** `[SHOULD]`  
*"Hotel fridge → a real meal in 15 minutes"*

Input: Photo of a fridge interior (hotel minibar, Airbnb fridge, break room).

Output format:
```
What I see: [comma-separated list of identified items]

Quick meal (15 min or less): [specific meal, written like a sentence]

Why it works: [one sentence]

If you have nothing to cook with: [one no-cook option]
```

System prompt addition:
```
The user has photographed the inside of a refrigerator or minibar.
List what you can identify.
Build the best possible quick meal from those ingredients.
Assume they have basic access (microwave at minimum, possibly a kettle).
If ingredients are limited, acknowledge it and work with what's there.
Use the output format exactly.
```

**Mode 4 — Plate** `[STRETCH]`  
*"Post-meal analysis — adjust for next time"*

Input: Photo of a finished or partially-eaten meal.

Output format:
```
What you ate: [brief description of what's visible]

How this lands: [one sentence on energy/cognition impact]

One thing to change next time: [specific, one sentence]

Timing note: [brief note if time of day matters for this meal]
```

System prompt addition:
```
The user has photographed a meal they just ate or are finishing.
Analyze what's visible and give a brief post-meal assessment.
Focus on how it will affect their energy and focus in the next 2-3 hours.
Give one specific, actionable adjustment for next time.
Use the output format exactly.
```

**Why Plate is STRETCH:** Food + Menu are the demo-winning modes. Fridge is interesting but requires good prompt engineering. Plate is useful but adds 20-30 minutes for marginal demo value. Build Food and Menu first, ship them, then revisit.

### 7.4 Shared UI for All Modes

```
[FOOD]  [MENU]  [FRIDGE]  [PLATE]    ← mode tabs

┌──────────────────────────────┐
│                              │
│   [Upload photo or tap to    │
│    open camera]              │
│                              │
│   [Image thumbnail once      │
│    selected]                 │
│                              │
└──────────────────────────────┘

[Analyze →]                          ← submit button, disabled until photo selected

─────────────────────────────────────
[Result area — appears after submit]
```

**Loading state:** "Reading your photo..." in the result area. Do not use a spinner — use a blinking cursor or a simple text animation. Feels more intentional.

**Error state:** "Couldn't read that photo clearly — try better lighting or a closer shot." Never show a raw API error to the user.

### 7.5 Context Injection in Snap & Know
User's location and energy level are injected into every Snap & Know call, same as Coach:
```
[Current context]
Location: {location}
Energy level: {energy}/5
Time: {time}
```

This means the Fridge response can say "Given it's 11 PM and your energy is 2/5, skip the cheese and go straight for the…" without the user having to explain anything.

---

## 8. Shared Architecture

### 8.1 Global State Object

```javascript
window.userContext = {
  location: '',       // from Home input
  energy: 3,          // from Home slider (1-5)
  apiKey: '',         // from key entry screen
};

window.chatHistory = [];  // array of {role, content} — session only
```

### 8.2 Claude API Wrapper

Single function used by all three screens:

```javascript
async function askClaude(systemPrompt, userMessage, imageBase64 = null) {
  const contextBlock = `
[Current context]
Location: ${window.userContext.location || 'not specified'}
Energy level: ${window.userContext.energy}/5
Time: ${new Date().toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}
  `.trim();

  const fullSystem = contextBlock + '\n\n' + systemPrompt;

  const content = imageBase64
    ? [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
        { type: 'text', text: userMessage }
      ]
    : userMessage;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': window.userContext.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: fullSystem,
      messages: [{ role: 'user', content }]
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.content[0].text;
}
```

### 8.3 Image Encoding Helper

```javascript
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
```

### 8.4 Navigation

No router. Just CSS `display: none / block` toggling on three panels. Three tab buttons at the bottom of the screen (mobile nav bar style). Active tab highlighted.

---

## 9. UI/UX Specifications

### 9.1 Design Direction

**Aesthetic:** Clean field utility. Think wire-service terminal — dark background, warm amber accents, monospace for data, readable serif for responses. Feels like a tool journalists would actually carry, not a wellness influencer's app.

**Never:** Pastel gradients, confetti, gamification badges, "great job!" feedback, calorie graphs.

### 9.2 Color Palette

```css
--bg:           #0f0f0f;   /* page background */
--surface:      #1a1a1a;   /* cards, inputs */
--border:       #2e2e2e;   /* dividers */
--text:         #e8e4dc;   /* primary text */
--text-muted:   #7a7570;   /* labels, secondary */
--accent:       #d4a843;   /* amber — primary action color */
--accent-dim:   #2a2218;   /* amber tint for bg highlights */
--danger:       #c94c3a;   /* skip / avoid */
--success:      #4a8c5c;   /* good pick */
--tab-active:   #d4a843;   /* active tab indicator */
```

### 9.3 Typography

```
Headlines / labels:  'IBM Plex Mono', monospace  (Google Fonts)
AI responses:        'Lora', serif               (Google Fonts)
UI chrome:           'IBM Plex Sans', sans-serif  (Google Fonts)
```

### 9.4 Bottom Navigation

Fixed to bottom of screen. Three tabs: Home · Coach · Snap & Know. Icon + label. Active tab: amber underline + amber icon.

### 9.5 Mobile First

Max width 480px, centered on desktop. Full-height on mobile. `viewport meta` tag: `width=device-width, initial-scale=1`.

---

## 10. Build Order (3-Hour Clock)

**Shared principle:** Engineer 1 owns Home + Coach. Engineer 2 owns Snap & Know + integration wiring. Both work in the same file — communicate before touching shared functions.

| Time | Engineer 1 | Engineer 2 |
|---|---|---|
| 0:00–0:20 | HTML skeleton, CSS variables, fonts, bottom nav tabs, key entry screen | Same file — build the base64 helper and bare Claude API wrapper. Test a single text call in the console. This is the foundation everything else sits on. **Do not proceed until this works.** |
| 0:20–0:50 | Home: context bar (location + energy slider). Rotating tip card. Store values to `window.userContext`. | Snap & Know: photo file input + thumbnail preview. base64 encode. Wire up Food mode system prompt. Test with a real food photo. |
| 0:50–1:30 | Home: six scenario cards. Navigation to Coach with pre-filled prompt. Coach: chat UI, message rendering, submit handler, Claude API call with context injection. | Snap & Know: Menu mode (same UI, different system prompt). Fridge mode if Food + Menu both working. Result display area. Error state. |
| 1:30–2:00 | Coach: suggested prompts (empty state pills). Photo attachment in chat (file input → base64 → vision call). | Snap & Know: polish mode tabs, loading states. Add context injection to all Snap & Know calls. Start Plate mode if ahead of schedule. |
| 2:00–2:30 | **Integration:** scenario card tap → fills Coach input → auto-submits. Verify context injection working in all three screens. | **Integration:** same pass — Snap & Know modes verified, context showing up in responses. |
| 2:30–2:50 | Demo dry run: Home → scenario card → Coach response. Coach photo. Snap & Know Food + Menu. Fix anything broken. | Same — support the dry run, fix issues. |
| 2:50–3:00 | Freeze. No new features. Prepare demo script talking points. | Same. |

**If behind at 1:30:** Drop Fridge and Plate from Snap & Know. Food + Menu is the compelling demo. Everything else is bonus.

**If behind at 2:00:** Drop Coach photo attachment. The chat still works — you demo it with text. Snap & Know handles the photo use case.

**If behind at 2:30:** Stop coding. Spend the remaining time on demo script and making sure the happy path works flawlessly. A broken feature is worse than a missing one.

---

## 11. Demo Script

**Total runtime: ~4 minutes**

### Setup (before demo)
- API key entered, app loaded
- Location set to "JFK Terminal 4"
- Energy set to 2/5
- Chat history cleared

### Beat 1 — Home (45 seconds)
Open to Home screen. Point to the context bar: "This is the only time they set context. Location and energy level — everything else reads from this automatically."

Show the rotating tip: "It knows it's [current time period] and it's already giving advice based on that. No input needed."

Tap "At the airport" scenario card. Watch it switch to Coach with the pre-filled message.

### Beat 2 — Coach (60 seconds)
The pre-filled prompt submits: "I'm at JFK Terminal 4. About to go through security..."

Watch the response. Point to: "It knows they're at JFK, it knows their energy is 2/5, it knows the time — the user never typed any of that. It was injected automatically."

Type or paste: "I have 20 minutes before boarding. What's the one thing I should not eat right now?" — show second response.

### Beat 3 — Snap & Know Menu mode (75 seconds)
Switch to Snap & Know tab. Select Menu mode.

Upload a pre-saved photo of a diner or fast-food menu. (Have this photo ready on the demo laptop — do not rely on live camera.)

Show the result: 2 picks highlighted, 1 skip. Point to: "It read the whole menu, it knows this person is exhausted and at an airport, it made a specific call. Not 'eat protein' — 'get the grilled chicken wrap, skip the burger.'"

### Beat 4 — Snap & Know Food mode (45 seconds)
Switch to Food mode. Upload a pre-saved photo of a meal (hotel breakfast plate, airport snack, etc.).

Show the 1-10 score and the "one adjustment" output.

### Closing line
"Three screens. One context. No logging, no tracking, no planning required. It meets the journalist where they are."

---

## 12. Success Criteria

### Must hit all three for a passable demo
- [ ] Home scenario card → navigates to Coach with pre-filled, auto-submitted prompt
- [ ] Coach response reflects current location and energy level (verify in response text)
- [ ] Snap & Know Menu mode: upload photo → get 2 picks + 1 skip within 10 seconds

### Strong demo — hit 2 of 3
- [ ] Rotating time-based tip on Home matches current hour block
- [ ] Snap & Know Food mode: 1-10 score + one adjustment
- [ ] Coach photo attachment: upload food photo → conversational analysis

### Table stakes — non-negotiable
- [ ] Works on mobile Safari (use `input type=file` not getUserMedia)
- [ ] API key entry screen works and stores to sessionStorage
- [ ] Graceful error if Claude call fails — user sees a message, not a white screen

---

## 13. Out of Scope — Do Not Build

These are explicitly excluded. If a teammate suggests building one of these, say no.

- Voice input or transcription
- GPS / location auto-detection
- Push or browser notifications
- Persistent history (localStorage chat logs)
- User accounts or profiles
- Calorie or macro counting
- Exercise or sleep tracking
- Wearable device integration
- Restaurant database lookups
- Live camera preview (getUserMedia) — use file input only
- Dark/light mode toggle
- Onboarding tutorial or tooltips
- Sharing or export features
- Any backend server

---

## 14. Open Questions — Decide Before You Start the Clock

1. **Fonts:** Google Fonts require a CDN call. If the demo environment has no internet access (some conference rooms), the fonts fall back to system defaults. Decision: load fonts + have a system-font fallback stack. Test this before demo day.

2. **Image size:** Large photos (iPhone camera = 3-8MB) will slow the base64 encode and the API call. Decision: resize images client-side to max 1024px on the longest edge before encoding. There is a `<canvas>` resize technique that takes 20 lines of JS. Build it in hour 1 alongside the base64 helper. **This is not optional** — without it, Snap & Know will time out on real device photos.

3. **Photo for demo:** Do not rely on taking a live photo during the demo. Prepare 3 photos in advance and store them on the demo laptop: (a) a diner menu, (b) a hotel breakfast plate, (c) a hotel fridge. These are your guaranteed demo assets.

4. **API key visibility:** `sessionStorage` clears on tab close. If the browser crashes mid-demo, the key is gone and the app shows the key entry screen. Decision: during the actual demo presentation, hardcode the key in a `const` at the top of the script. Remove it before sharing the file publicly. The key entry screen is for any demo where the file is shared with judges.

5. **Model:** Use `claude-sonnet-4-20250514`. Do not use Haiku — the structured output compliance and vision quality are not reliable enough for a live demo. Sonnet is fast enough (~3-5 seconds) and the quality difference is visible.