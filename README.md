# Dexaview – Industrial Metaverse Platform

> **A browser-based 3D industrial simulation environment that synchronises with YouTube content, powered by WebGPU rendering, real-time physics, and an AI Technical Advisor.**

---

## What is Dexaview?

Dexaview is an **Industrial Metaverse** — a platform where engineers, educators, and operators can watch technical YouTube content side-by-side with a live 3D simulation of the subject matter. When a specific event happens in the video (for example, a well blowout demonstration at the 1:30 mark), the 3D simulation reacts in real time: physics objects scatter, the AI advisor prompts with the correct safety procedure, and data overlays update instantly.

**Who is it for?**
- Oil & gas training organisations teaching well control procedures.
- Data centre operators running equipment failure drills.
- Technical educators who want immersive, interactive course content.
- Content creators who earn revenue from verified educational watch time.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  Browser                                                             │
│  ┌──────────────┐  ┌───────────────────────────┐  ┌──────────────┐  │
│  │ YouTube      │  │ Three.js / WebGPU          │  │ AI Advisor   │  │
│  │ IFrame API   │◄─► DexaviewEngine             │  │ Panel        │  │
│  │              │  │  ├─ Rapier Physics World    │  │ (React)      │  │
│  │  useSimLink  │  │  ├─ IndustrialAssetLoader  │  │              │  │
│  │  (hook)      │  │  └─ TechnicalAdvisorAgent  │◄─►  OpenAI API  │  │
│  └──────────────┘  └───────────────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │  REST API
┌─────────────────────────────▼───────────────────────────────────────┐
│  Backend (Python / FastAPI)                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────────┐  │
│  │ /auth        │  │ /marketplace │  │ /analytics                │  │
│  │ JWT login    │  │ Asset store  │  │ Watch-time tracking        │  │
│  │ Registration │  │ Purchases    │  │ Creator earnings          │  │
│  └──────────────┘  └──────────────┘  └───────────────────────────┘  │
│                          MySQL Database                              │
└─────────────────────────────────────────────────────────────────────┘
```

**Technology choices explained:**

| Layer | Technology | Why |
|---|---|---|
| 3D rendering | Three.js + WebGPU | Hardware-accelerated GPU rendering directly in the browser; no plugin needed |
| Physics | Rapier (WASM) | Deterministic, high-performance physics at 60 Hz with a small WASM binary |
| AI advisor | OpenAI GPT-4o | Reliable, low-latency responses; temperature 0.3 keeps safety guidance deterministic |
| Frontend | React + Vite | Component-based UI with fast development cycle |
| Backend | Python FastAPI | Async-native, auto-generates OpenAPI docs, fast to iterate |
| Database | MySQL + SQLAlchemy | Relational integrity for financial transactions; DECIMAL types for cent-accurate earnings |
| Auth | JWT (HS256) + bcrypt | Stateless auth; bcrypt ensures passwords are never stored in plain text |

---

## Project Structure

```
dexaview/
├── frontend/
│   ├── src/
│   │   ├── engine/
│   │   │   ├── DexaviewEngine.js        ← Core 3D + physics + AI orchestrator
│   │   │   ├── TechnicalAdvisorAgent.js ← OpenAI wrapper for safety guidance
│   │   │   └── IndustrialAssetLoader.js ← GLB loader with physics + data overlays
│   │   ├── hooks/
│   │   │   └── useSimLink.js            ← YouTube ↔ simulation synchronisation hook
│   │   ├── components/
│   │   │   ├── SimLinkPage.jsx          ← Main three-panel interface
│   │   │   ├── AdvisorPanel.jsx         ← AI chat interface
│   │   │   ├── FpsCounter.jsx           ← Live FPS HUD element
│   │   │   └── SimLinkPage.css          ← Dark industrial UI theme
│   │   └── main.jsx                     ← React root
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── main.py                          ← FastAPI app factory + lifespan
│   ├── requirements.txt
│   ├── .env.example
│   ├── app/
│   │   ├── core/
│   │   │   └── config.py               ← All environment-based settings
│   │   ├── db/
│   │   │   └── session.py              ← Async DB engine + get_db dependency
│   │   ├── models/
│   │   │   └── __init__.py             ← ORM models: User, SimAsset, Purchase, WatchEvent
│   │   └── routers/
│   │       ├── auth.py                 ← Register, login, JWT validation
│   │       ├── marketplace.py          ← Asset listing and purchasing
│   │       └── analytics.py           ← Watch-time events + creator stats
│   └── tests/
│       └── test_marketplace.py         ← Full integration test suite
│
└── docs/
    ├── ARCHITECTURE.md
    ├── DEPLOYMENT.md
    └── TESTING_GUIDE.md
```

---

## Quick Start

### Prerequisites

Before you begin, make sure you have these installed on your computer:

| Tool | Version | Download Link |
|---|---|---|
| Node.js | 18 or later | https://nodejs.org |
| Python | 3.11 or later | https://python.org |
| MySQL | 8.0 or later | https://dev.mysql.com/downloads |
| Git | Any recent version | https://git-scm.com |

---

### Step 1 – Clone the repository

```bash
git clone https://github.com/your-org/dexaview.git
cd dexaview
```

---

### Step 2 – Set up the backend

```bash
cd backend

# Create and activate a Python virtual environment
python -m venv .venv
source .venv/bin/activate          # Mac/Linux
.venv\Scripts\activate             # Windows

# Install all Python dependencies
pip install -r requirements.txt

# Copy the example environment file and fill in your values
cp .env.example .env
```

Open `.env` and fill in the following values:

```env
DATABASE_URL=mysql+aiomysql://your_mysql_user:your_password@localhost:3306/dexaview
SECRET_KEY=generate-a-random-64-character-string-here
ALLOWED_ORIGINS=["http://localhost:5173"]
ACCESS_TOKEN_EXPIRE_MINUTES=60
PLATFORM_FEE_RATE=0.10
```

Create the MySQL database:

```sql
CREATE DATABASE dexaview CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Start the backend server:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The server will create all database tables automatically on first start.
Open http://localhost:8000/docs to see the interactive API documentation.

---

### Step 3 – Set up the frontend

```bash
cd ../frontend

# Install all JavaScript dependencies
npm install

# Copy the example environment file
cp .env.example .env
```

Open `.env` and fill in:

```env
VITE_OPENAI_API_KEY=sk-your-openai-api-key-here
VITE_API_BASE_URL=http://localhost:8000
```

Start the frontend development server:

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

> **Note:** The WebGPU renderer requires a Chromium-based browser (Chrome 113+, Edge 113+). Firefox support is expected in late 2025. The engine automatically falls back to WebGL2 on unsupported browsers.

---

### Step 4 – Add a YouTube video to the simulation

In `frontend/src/components/SimLinkPage.jsx`, replace the placeholder:

```js
const DEMO_VIDEO_ID = "REPLACE_WITH_YOUR_YOUTUBE_VIDEO_ID";
```

With an actual YouTube video ID (the 11-character code after `?v=` in the URL).

Then add cue points that match your video:

```js
const DEMO_CUES = [
  { time: 90, eventName: "blowout", origin: new THREE.Vector3(0, 0, 0) },
];
```

The `time` value is in seconds. When the video reaches that timestamp, the
3D simulation will fire the named event automatically.

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Full MySQL connection string including username, password, host, port, and database name |
| `SECRET_KEY` | ✅ | Random string used to sign JWT tokens. Generate with: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `ALGORITHM` | No | JWT signing algorithm. Default: `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | How long login tokens stay valid. Default: `60` |
| `ALLOWED_ORIGINS` | No | JSON array of URLs allowed to call the API. Default: `["http://localhost:5173"]` |
| `PLATFORM_FEE_RATE` | No | Fraction of each sale kept as platform fee (0.0–1.0). Default: `0.10` (10%) |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_OPENAI_API_KEY` | ✅ | Your OpenAI API key. Found at https://platform.openai.com/api-keys |
| `VITE_API_BASE_URL` | No | URL of the backend server. Default: `http://localhost:8000` |

---

## API Reference

Once the backend is running, full interactive documentation is available at:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

Key endpoints:

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create a new account |
| `POST` | `/api/auth/login` | Log in and receive a JWT token |
| `GET` | `/api/auth/me` | Get your profile (requires login) |
| `GET` | `/api/marketplace/assets` | List all marketplace assets |
| `POST` | `/api/marketplace/assets` | Publish a new asset (creators only) |
| `POST` | `/api/marketplace/assets/{id}/buy` | Purchase an asset |
| `POST` | `/api/analytics/watch-event` | Record a viewing session |
| `GET` | `/api/analytics/creator-stats` | View your earnings and stats |

---

## Testing Guide

> This section is written for **anyone** — you do not need to be a developer to understand and verify that the application is working correctly.

---

### Test 1 – Physics Stress Test
**What we are checking:** The 3D simulation can handle a large number of objects flying around at the same time without slowing down or crashing.

**How to run it:**
1. Open the application in Chrome at http://localhost:5173.
2. Look at the top-right corner of the 3D view. You will see a small number followed by "FPS" (frames per second). A healthy number is **55 or above**.
3. Click the **"TRIGGER BLOWOUT"** button at the bottom of the 3D view.
4. Watch dozens of objects fly outward from an explosion. The FPS counter should stay **above 30** even during this burst.

**What a passing result looks like:**
- The FPS number does not drop below 30 during the event.
- Objects move realistically — lighter pieces fly further, heavier pieces fall quickly.
- The application does not freeze, go white, or show any error message.

**What a failing result looks like:**
- The FPS drops to single digits (1–5) and the animation becomes a slide show.
- The browser tab crashes with a "Page Unresponsive" message.

---

### Test 2 – AI Technical Advisor Logic Test
**What we are checking:** When you describe a dangerous industrial scenario, the AI advisor gives you the correct safety procedure — not a vague or incorrect answer.

**How to run it:**
1. On the right-hand panel labelled **"TECHNICAL ADVISOR"**, type the following into the text box at the bottom:
   > *"Pressure is rising in the BOP. What is the first step?"*
2. Press **ASK** or hit Enter.
3. Wait up to 10 seconds for the response to appear.

**What a passing result looks like:**
- The advisor responds within 10 seconds.
- The response mentions **"Close the Pipe Rams"** as the first action.
- The response references a safety standard such as **API RP 53**.
- The language is clear and ordered (e.g. "Step 1: … Step 2: …").

**What a failing result looks like:**
- No response appears after 30 seconds (possible network or API key issue).
- The response says something vague like "Contact your supervisor" with no specific procedure.
- An error message appears in red text in the advisor panel.

---

### Test 3 – Sim-Link Synchronisation Test
**What we are checking:** When the YouTube video reaches a specific moment, the 3D simulation reacts at exactly that moment — not a few seconds before or after.

**How to run it:**
1. Make sure a YouTube video ID is set in `SimLinkPage.jsx` (see Quick Start Step 4).
2. Look at the cue list under the YouTube player — you will see buttons like **"⏩ blowout @ 90s"**.
3. Click the **"⏩ blowout @ 90s"** button. The video will jump to the 1 minute 30 second mark.
4. Press Play on the YouTube video.
5. Watch the 3D simulation carefully as the video plays through the 1:30 mark.

**What a passing result looks like:**
- At exactly the 1:30 mark on the video, the 3D simulation shows a blowout explosion.
- A red badge reading **"BLOWOUT TRIGGERED"** flashes in the centre of the 3D view.
- The AI advisor panel automatically displays the safety response procedure.
- The sync feels instant — there is no noticeable delay between the video event and the simulation event.

**What a failing result looks like:**
- The simulation fires several seconds before or after the video reaches 1:30.
- The simulation does not fire at all.
- The YouTube player shows an error (usually caused by an invalid video ID or embedding restrictions on the video).

---

### Test 4 – Marketplace Earnings Test
**What we are checking:** When someone buys a 3D asset, the creator receives the correct payment in their account, and the transaction is saved accurately in the database.

**How to run it using the API documentation page:**

1. Open http://localhost:8000/docs in your browser.

2. **Create a creator account:**
   - Click `POST /api/auth/register` → **Try it out** → fill in:
     ```json
     { "email": "creator@test.com", "username": "testcreator", "password": "password123", "is_creator": true }
     ```
   - Click **Execute**. You should see `"id": 1` in the response.

3. **Log in as the creator:**
   - Click `POST /api/auth/login` → **Try it out** → fill in `username: creator@test.com`, `password: password123`
   - Click **Execute**. Copy the `access_token` value from the response.

4. **Authorise as the creator:**
   - Click the green **Authorize** button at the top of the page.
   - Paste the token into the `Value` field and click **Authorize**.

5. **List a $10.00 asset:**
   - Click `POST /api/marketplace/assets` → **Try it out** → fill in:
     ```json
     { "title": "Test Rig", "glb_url": "https://example.com/rig.glb", "industry": "oil_gas", "price_usd": "10.00" }
     ```
   - Click **Execute**. Note the `"id"` of the new asset (e.g. `1`).

6. **Create a buyer account and log in** (repeat steps 2–4 with `"is_creator": false`).

7. **Buy the asset:**
   - Click `POST /api/marketplace/assets/{asset_id}/buy` → **Try it out** → enter `asset_id: 1`
   - Click **Execute**.

**What a passing result looks like:**
- The purchase response shows `"amount_paid": 10.00` and `"creator_earnings": 9.00` (the platform keeps 10%).
- A `"glb_url"` is returned, unlocking the 3D asset for the buyer.
- If you log back in as the creator and call `GET /api/analytics/creator-stats`, the `"balance_usd"` will show `9.00`.

**What a failing result looks like:**
- The purchase returns an error instead of a purchase record.
- `"creator_earnings"` shows `10.00` instead of `9.00` (fee not applied).
- Buying the same asset twice does not produce a `409 Conflict` error.

---

### Running the Automated Tests (for developers)

The backend includes a full automated test suite that runs all four test scenarios programmatically:

```bash
cd backend
source .venv/bin/activate
pytest tests/ -v
```

Expected output:
```
tests/test_marketplace.py::test_register_and_login           PASSED
tests/test_marketplace.py::test_login_wrong_password         PASSED
tests/test_marketplace.py::test_create_asset                 PASSED
tests/test_marketplace.py::test_non_creator_cannot_list_asset PASSED
tests/test_marketplace.py::test_purchase_asset_credits_creator PASSED
tests/test_marketplace.py::test_duplicate_purchase_rejected  PASSED
tests/test_marketplace.py::test_record_watch_event           PASSED

7 passed in 2.31s
```

---

## Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the complete guide covering:
- Deploying the frontend to **Vercel**
- Deploying the backend to **AWS EC2** or **Railway**
- Setting up a managed **PlanetScale** MySQL database
- Configuring environment variables in production
- Setting up a custom domain and SSL

---

## Security Notes

- **API keys** (OpenAI, etc.) must never be committed to Git. They are loaded from `.env` files which are listed in `.gitignore`.
- **Passwords** are stored as bcrypt hashes — the plain-text password is never written to the database.
- **Financial values** use the SQL `DECIMAL` type with explicit precision — never `FLOAT` — to prevent cent-rounding errors on creator earnings.
- **JWT tokens** expire after 60 minutes by default. Adjust `ACCESS_TOKEN_EXPIRE_MINUTES` in `.env` if needed.
- The **platform fee** is applied server-side — clients cannot send a manipulated earnings figure.

---

## Contributing

1. Fork the repository.
2. Create a branch: `git checkout -b feature/your-feature-name`
3. Make your changes with clear, descriptive commit messages.
4. Run the test suite: `pytest tests/ -v`
5. Open a pull request with a description of what you changed and why.

---

## License

MIT License — see `LICENSE` for details.
