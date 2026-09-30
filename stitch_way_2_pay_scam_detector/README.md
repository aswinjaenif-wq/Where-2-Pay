# Where 2 Pay — Ready-to-Run Project

This project contains the original Where 2 Pay backend, Stitch design assets, and the completed React/Vite frontend.

## Project structure

- `where2pay-frontend/` — React + Vite frontend
- `w2p_backend/` — Express backend API
- `way_2_pay_w2p_ai_pre_payment_scam_detection_platform/` — original Stitch UI
- `way_2_pay_shield_logo/` — original logo assets
- `way_2_pay_cyber_intelligence/` — design documentation

## Requirements

- Node.js 18+
- npm

## Run the backend

Open a terminal:

```bash
cd w2p_backend
npm install
npm run dev
```

Backend runs at `http://localhost:5000`.

## Run the frontend

Open a second terminal:

```bash
cd where2pay-frontend
npm install
npm run dev
```

Vite will show the local frontend URL, normally `http://localhost:5173`.

The frontend is configured to call:

`http://localhost:5000/api`

To use another backend URL, create `where2pay-frontend/.env` with:

```env
VITE_API_BASE=http://localhost:5000/api
```

## Main API features connected

- Message scam scan
- URL scan
- Payment request scan
- QR scan endpoint
- Scan history
- Clear history
- Incident reporting
- Community reporting

The original Stitch HTML remains in the project for reference; the new React frontend is the runnable application frontend.

## Strong URL risk engine (v2.0)

This build includes phishing-pattern detection, brand/domain mismatch checks, suspicious path/query checks, URL-obfuscation checks, DNS/HTTPS signals, improved scoring, and contextual recommended next steps. See `URL_DETECTION_FEATURES.md` and `URL_ENGINE_TESTS.md`.

### Run the project

From `stitch_way_2_pay_scam_detector`:

```powershell
npm run install:all
```

Then use two terminals:

```powershell
npm run backend:start
```

```powershell
npm run frontend
```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:5000`

If port 5000 is already in use on Windows:

```powershell
netstat -ano | findstr :5000
```

Then terminate the old PID if it belongs to a previous W2P backend:

```powershell
taskkill /PID <PID> /F
```
