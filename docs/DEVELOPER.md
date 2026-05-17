# Developer Manual

This document is for future developers who want to set up, run, or build on the Metro Dashboard project. I tried to write it so you don't need to know anything about this specific codebase going in — just general web dev knowledge.

(This is also mirrored in the bottom half of `README.md`.)

## Project structure

```
metro-dashboard/
├── api/
│   └── index.js        - Express server (all backend routes live here)
├── public/
│   ├── index.html      - Home page
│   ├── trains.html     - Full arrivals board page
│   ├── about.html      - About page
│   ├── styles.css      - All CSS for the whole app
│   ├── home.js         - JavaScript for the home page
│   ├── trains.js       - JavaScript for the trains page
│   └── helpers.js      - Shared utility functions (used by both pages)
├── db/
│   └── schema.sql      - SQL to set up the Supabase database
├── docs/
│   └── DEVELOPER.md    - This file
├── tests/
│   └── test.js         - Smoke tests for the API
├── server.js           - Entry point for local development
├── package.json
├── vercel.json         - Vercel deployment config
└── .env.example        - Template for environment variables
```

## How to install

You'll need **Node.js 18 or higher** (the backend uses the built-in `fetch`, which requires 18+).

```bash
git clone <this repo>
cd metro-dashboard
npm install
cp .env.example .env
```

Then open `.env` and fill in your keys:

```
WMATA_API_KEY=your_key_here
OPENWEATHER_API_KEY=your_key_here
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your_anon_key_here
PORT=3000
```

Where to get each key:
- **WMATA_API_KEY** — sign up at https://developer.wmata.com/signup/ (free)
- **OPENWEATHER_API_KEY** — sign up at https://openweathermap.org/api (free tier is fine)
- **SUPABASE_URL** and **SUPABASE_KEY** — create a free project at https://supabase.com, then go to Settings → API

### Database setup

1. In your Supabase project, open the **SQL Editor**
2. Paste in the contents of `db/schema.sql`
3. Click Run

This creates the `searches` table and sets the RLS policy so the anon key can read and write to it. If you skip this step the search logging and popular stations chart won't work (but the rest of the app will).

## How to run the app

```bash
npm start
```

Open http://localhost:3000 in your browser. You should see the home page with a station search form.

For development you can also use `npm run dev` — it does the same thing right now, I just kept both scripts in case I added a watcher later.

## How to run the tests

```bash
npm test
```

The test file is `tests/test.js`. It spins up the Express app on port 4567 and hits each endpoint to make sure it responds with an expected status code. The tests are designed to pass even without real API keys — they accept both success and error responses, so you don't need `.env` configured to run them.

Expected output when everything is working:

```
Running tests...

PASS  GET /api/health
PASS  GET /api/stations
PASS  GET /api/predictions/A01
PASS  GET /api/predictions/bad returns 400
PASS  GET /api/weather/A01
PASS  POST /api/searches
PASS  POST /api/searches with no body returns 400
PASS  GET /api/searches/popular
```

## API endpoints

All routes are prefixed with `/api`. The server code is in `api/index.js`.

---

### `GET /api/health`

Returns `{ "ok": true }`. Used to check if the server is running. No parameters.

---

### `GET /api/stations`

Returns the full list of WMATA stations, fetched from the WMATA API and simplified.

**Response:**
```json
{
  "stations": [
    { "code": "A01", "name": "Metro Center", "lat": 38.898, "lon": -77.028, "lines": ["RD", "OR", "SV", "BL"] },
    ...
  ]
}
```

The list is cached in memory after the first call so we don't hammer the WMATA API on every search.

---

### `GET /api/predictions/:code`

Returns live train arrival predictions for a station. `:code` is the 3-character WMATA station code (like `A01`, `B11`).

Returns 400 if the code format is invalid. Returns the raw WMATA `Trains` array wrapped in our response shape.

**Response:**
```json
{
  "stationCode": "A01",
  "trains": [
    { "Line": "RD", "DestinationName": "Shady Grove", "Min": "3", "Car": "6" },
    ...
  ]
}
```

This is the **external API call** endpoint — it proxies WMATA's StationPrediction API.

---

### `GET /api/weather/:code`

Returns current weather at a station by looking up its lat/lon from WMATA, then calling the OpenWeather API.

Returns 404 if the station code isn't found.

**Response:**
```json
{
  "stationName": "Metro Center",
  "weather": {
    "temp": 72,
    "feelsLike": 70,
    "humidity": 55,
    "windSpeed": 8,
    "description": "partly cloudy",
    "main": "Clouds"
  }
}
```

---

### `POST /api/searches`

Logs a station search to the Supabase database. Called automatically whenever a user searches for a station on the home page.

**Request body:**
```json
{ "stationCode": "A01", "stationName": "Metro Center" }
```

Returns 400 if `stationCode` is missing. Returns 500 if Supabase isn't configured.

**Response:**
```json
{ "ok": true, "row": { "id": 1, "station_code": "A01", "station_name": "Metro Center", "searched_at": "..." } }
```

This is the **database write** endpoint.

---

### `GET /api/searches/popular`

Reads from the Supabase database and returns the most-searched stations.

Query param: `?limit=N` (default 5)

**Response:**
```json
{
  "popular": [
    { "station_code": "A01", "station_name": "Metro Center", "count": 12 },
    ...
  ]
}
```

This is the **database read** endpoint. Note: the count aggregation currently happens in JavaScript, not SQL — see Known Issues below.

---

## Known issues

- **No caching on predictions** — every search hits the WMATA API directly. Fine for a class project but would need server-side caching if traffic picked up.
- **Popular count done in JS** — the `/api/searches/popular` endpoint pulls up to 500 rows and counts them in JavaScript. I should have done this with a SQL `GROUP BY` query or a Postgres view, but got it working this way and ran out of time to refactor.
- **No retry logic** — if WMATA or OpenWeather returns an error, the frontend just shows "Could not load." There's no retry.
- **Map tiles can be slow** — the Leaflet map uses OpenStreetMap tiles which are sometimes slow to load, especially on mobile.

## Future development roadmap

- Move the popular search aggregation to a Postgres view in Supabase
- Add server-side caching for predictions (even a 10-second cache would help a lot)
- Add WMATA service alerts to the trains page
- Let users save favorite stations in localStorage
- Add a trip planner (enter two stations, show the route)
- Add user accounts via Supabase Auth so each user has their own search history
