# Where 2 Pay (W2P) Backend

This is the backend API for the Where 2 Pay pre-payment scam detection website.

## Requirements

- Node.js 18 or newer
- npm

## 1. Install

Open a terminal inside this `backend` folder:

```bash
npm install
```

## 2. Start

Development mode:

```bash
npm run dev
```

Normal mode:

```bash
npm start
```

The API runs at:

```text
http://localhost:5000
```

Health check:

```text
GET http://localhost:5000/api/health
```

## 3. Connect the existing HTML frontend

The original Stitch HTML is currently client-side only. Replace its simulated scan functions with API calls.

Add this near the end of the HTML before `</body>`:

```html
<script src="./w2p-api.js"></script>
```

Then use the supplied `w2p-api.js` from the integration folder.

### Important

If you open the HTML by double-clicking it, browser security can block API requests. Serve the frontend with a local web server instead.

A simple option:

```bash
npx serve .
```

Then open the URL printed by `serve` (usually port 3000), while the backend remains on port 5000.

## API endpoints

- `GET /api/health`
- `POST /api/scan/message`
- `POST /api/scan/url`
- `POST /api/scan/payment`
- `POST /api/scan/qr`
- `GET /api/history`
- `DELETE /api/history`
- `POST /api/reports`
- `GET /api/reports/:id`
- `POST /api/community/reports`
- `GET /api/stats`

The backend intentionally does not request or store passwords, PINs, OTPs, CVVs, or full card numbers.
