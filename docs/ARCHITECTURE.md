# Architecture Blueprint

## Data Flow

```
User opens browser
       │
       ▼
React app loads (Vite bundle)
       │
       ├─► DexaviewEngine.init()
       │         │
       │         ├─► WebGPU renderer initialised on <canvas>
       │         ├─► Rapier WASM physics world created (gravity: -9.81 m/s²)
       │         ├─► Scene, camera, lighting added
       │         └─► IndustrialAssetLoader created
       │
       ├─► GLB asset fetched from CDN
       │         │
       │         ├─► GLTFLoader + DRACOLoader decode the model
       │         ├─► Materials upgraded to MeshStandardMaterial (PBR)
       │         ├─► Rapier trimesh collider built from mesh geometry
       │         └─► CSS2DObject data overlay attached above model
       │
       ├─► YouTube IFrame API injected
       │         │
       │         └─► useSimLink hook registers cue points
       │
       └─► Render loop starts (rAF)
                 │
                 ├─► Rapier.step() called 60×/sec
                 ├─► Mesh positions synced from Rapier body transforms
                 └─► Three.js renderer draws frame


── VIDEO PLAYS ──────────────────────────────────────────────────────────────

YouTube player → onStateChange(1=playing)
       │
       └─► useSimLink polling loop starts (rAF)
                 │
                 └─► getCurrentTime() read each frame
                           │
                           └─► [time within 100ms of cue] ──────────────►
                                                                          │
                                          engine.triggerPhysicsEvent() ◄─┘
                                                    │
                                                    ├─► Apply impulses to Rapier bodies
                                                    ├─► Dispatch "dexaview:physics-event"
                                                    └─► engine.askAdvisor(auto-question)
                                                                    │
                                                                    └─► OpenAI API call
                                                                              │
                                                                    onResponse callback
                                                                              │
                                                                    Dispatch "dexaview:ai-response"
                                                                              │
                                                                    React state update
                                                                              │
                                                                    AdvisorPanel re-renders


── PURCHASE FLOW ────────────────────────────────────────────────────────────

User clicks "Buy Asset"
       │
       ▼
POST /api/marketplace/assets/{id}/buy
  + Authorization: Bearer <JWT>
       │
       ▼
FastAPI auth middleware
  └─► Decode JWT → get user_id
  └─► Load User from DB
       │
       ▼
marketplace.purchase_asset()
  ├─► Load SimAsset from DB
  ├─► Check no existing AssetPurchase for this user+asset
  ├─► Calculate creator_earnings = price × (1 - platform_fee_rate)
  ├─► INSERT AssetPurchase row
  ├─► UPDATE User.balance += creator_earnings   ← same transaction
  ├─► UPDATE SimAsset.download_count += 1
  └─► COMMIT
       │
       ▼
Return { purchase_id, glb_url, amount_paid, creator_earnings }
       │
       ▼
Frontend unlocks the GLB URL → loads asset into scene
```

---

## Security Model

### Authentication

- Passwords are hashed using **bcrypt** (work factor 12) before storage.
  The plain-text password is held in memory only for the duration of the
  login request and is then discarded.
- Successful login returns a **JWT** signed with HS256 using a server-side
  `SECRET_KEY`. The token encodes only the user's numeric ID (`sub` claim)
  and an expiry timestamp (`exp` claim).
- Every protected endpoint calls `get_current_user()`, which validates the
  token signature and expiry before touching the database.

### Financial integrity

- Asset prices and creator balances are stored as **SQL DECIMAL(12, 2)** —
  never as `FLOAT` or `DOUBLE`. This prevents the silent rounding errors
  that floating-point arithmetic introduces on financial values.
- The platform fee deduction and creator balance credit happen inside the
  **same database transaction** (`session.commit()` at the end of
  `get_db()`). If any step fails, the transaction rolls back atomically —
  no partial payments can be recorded.
- The creator cannot manipulate their own earnings figure; it is always
  computed server-side from the asset's listed price and the configured fee
  rate.

### API security

- **CORS** is restricted to explicitly listed origins (`ALLOWED_ORIGINS`).
  Wildcard origins are not used in production.
- The OpenAI API key is stored in the frontend `.env` file (prefixed
  `VITE_`) and injected at build time. It is never exposed through the
  backend API. Rotate this key if it is ever committed to version control.
- The backend `.env` file is listed in `.gitignore` and must never be
  committed to the repository.

---

## Database Schema

```sql
-- Users table
CREATE TABLE users (
    id               INT           AUTO_INCREMENT PRIMARY KEY,
    email            VARCHAR(255)  UNIQUE NOT NULL,
    username         VARCHAR(64)   UNIQUE NOT NULL,
    hashed_password  VARCHAR(128)  NOT NULL,
    is_creator       BOOLEAN       DEFAULT FALSE NOT NULL,
    is_active        BOOLEAN       DEFAULT TRUE  NOT NULL,
    balance          DECIMAL(12,2) DEFAULT 0.00  NOT NULL,
    created_at       DATETIME      DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3D assets listed on the marketplace
CREATE TABLE sim_assets (
    id              INT           AUTO_INCREMENT PRIMARY KEY,
    creator_id      INT           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(128)  NOT NULL,
    description     TEXT,
    glb_url         VARCHAR(512)  NOT NULL,
    preview_url     VARCHAR(512),
    industry        VARCHAR(64)   NOT NULL,
    price_usd       DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    is_published    BOOLEAN       DEFAULT TRUE  NOT NULL,
    download_count  INT           DEFAULT 0     NOT NULL,
    created_at      DATETIME      DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at      DATETIME      DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    INDEX idx_creator (creator_id),
    INDEX idx_industry (industry)
);

-- Purchase records
CREATE TABLE asset_purchases (
    id                 INT           AUTO_INCREMENT PRIMARY KEY,
    buyer_id           INT           REFERENCES users(id) ON DELETE SET NULL,
    asset_id           INT           NOT NULL REFERENCES sim_assets(id) ON DELETE CASCADE,
    amount_paid        DECIMAL(10,2) NOT NULL,
    creator_earnings   DECIMAL(10,2) NOT NULL,
    payment_reference  VARCHAR(128),
    purchased_at       DATETIME      DEFAULT CURRENT_TIMESTAMP NOT NULL,
    INDEX idx_buyer  (buyer_id),
    INDEX idx_asset  (asset_id)
);

-- Education Player watch-time events
CREATE TABLE watch_events (
    id               INT          AUTO_INCREMENT PRIMARY KEY,
    video_id         VARCHAR(32)  NOT NULL,
    viewer_user_id   INT          REFERENCES users(id) ON DELETE SET NULL,
    creator_user_id  INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seconds_watched  INT          DEFAULT 0 NOT NULL,
    locale           VARCHAR(8),
    recorded_at      DATETIME     DEFAULT CURRENT_TIMESTAMP NOT NULL,
    INDEX idx_video   (video_id),
    INDEX idx_creator (creator_user_id),
    INDEX idx_viewer  (viewer_user_id)
);
```

---

## Performance Targets

| Metric | Target | Measurement method |
|---|---|---|
| Render FPS (mid-range laptop) | ≥ 55 fps | FpsCounter HUD in SimLinkPage |
| Render FPS during blowout event | ≥ 30 fps | FpsCounter during triggerPhysicsEvent |
| AI advisor response time | ≤ 10 seconds | Timestamp difference between ask and response |
| Sim-Link sync drift | ≤ 100 ms | Browser DevTools performance timeline |
| API response time (purchase) | ≤ 300 ms | Network tab or pytest timing |
| Database transaction (purchase) | ≤ 100 ms | SQLAlchemy echo log or pytest timing |
