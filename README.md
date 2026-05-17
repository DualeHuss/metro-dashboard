# Metro Dashboard

A simple dashboard for WMATA Metro riders in the DMV. You can search for any Metro station and see live train arrival times, the weather, and where the station is on a map.

This is my project for INST 377.

## What it does

- Search for any WMATA station by name or code (like A01)
- See real-time train arrivals for that station
- See the current weather at that station
- See the full arrivals board on a separate page with a map
- See which stations have been searched most often

## Target browsers

Built and tested in:
- Chrome (desktop and Android)
- Safari (Mac and iOS)
- Firefox
- Edge

I aimed for modern browsers. Not tested on Internet Explorer.

## Developer Manual

See the [Developer Manual](#developer-manual-1) below. It's also at `docs/DEVELOPER.md`.

---

# Developer Manual

For anyone picking up this project after me.

## Project structure

```
metro-dashboard/
├── api/
│   └── index.js        - Express server (all backend routes)
├── public/
│   ├── index.html      - Home page
│   ├── trains.html     - Train arrivals page
│   ├── about.html      - About page
│   ├── styles.css      - All styles
│   ├── home.js         - Home page JS
│   ├── trains.js       - Trains page JS
│   └── helpers.js      - Shared helper functions
├── db/
│   └── schema.sql      - Supabase table setup
├── docs/
│   └── DEVELOPER.md    - Mirror of this manual
├── tests/
│   └── test.js         - Smoke tests
├── server.js           - Local dev entry
├── package.json
├── vercel.json
└── .env.example
```

## How to install

You'll need Node.js 18 or higher (the server uses built-in `fetch`).

```
git clone <this repo>
cd metro-dashboard
npm install
cp .env.example .env
```

Then fill in `.env` with your keys:

- **WMATA_API_KEY** - sign up at https://developer.wmata.com/signup/
- **OPENWEATHER_API_KEY** - sign up at https://openweathermap.org/api
- **SUPABASE_URL** and **SUPABASE_KEY** - make a free Supabase project at https://supabase.com, then go to Settings → API to get them

### Set up the database

1. In Supabase, open the SQL Editor
2. Paste in the contents of `db/schema.sql`
3. Run it

This creates the `searches` table and sets up access for the anon key.

## How to run it

```
npm start
```

Then open http://localhost:3000

## How to run the tests

```
npm test
```

The tests just check that each endpoint responds. They don't need real API keys to pass.

## API endpoints

All the endpoints live under `/api`.

### `GET /api/health`
Quick check to make sure the server is up.

### `GET /api/stations`
Returns a list of every WMATA station with code, name, lat, lon, and lines.

### `GET /api/predictions/:code`
Live train arrival predictions for the given station. The `code` is the 3-character WMATA code (like A01, B11).

This is the external API call (the WMATA prediction API).

### `GET /api/weather/:code`
Returns current weather at the given station. The server looks up the lat/lon from WMATA, then calls OpenWeather with those coordinates.

### `POST /api/searches`
Records that someone searched for a station. Writes to the Supabase database. Body should be:
```
{ "stationCode": "A01", "stationName": "Metro Center" }
```

### `GET /api/searches/popular`
Reads from the database and returns the most-searched stations. Use `?limit=N` to change how many you get back (default is 5).

## How to deploy on Vercel

1. Push the project to GitHub (must be a public repo)
2. Go to vercel.com and import the repo
3. Under Environment Variables, add all four keys from your `.env`
4. Deploy

The `vercel.json` file handles routing. `/api/*` goes to the Express app, everything else is served from `public/`.

## Known issues

- The predictions API gets hit every time someone searches. I should probably cache responses for like 10 seconds.
- The popular searches count is done in JavaScript, not in SQL. It works fine for now but would need to be a Postgres view if the table got really big.
- If the WMATA or OpenWeather API is down, the page just shows "Could not load". I don't retry.
- The map uses OpenStreetMap tiles, so if their CDN is slow the map takes a second to show up.

## Future improvements

Things I wanted to add but didn't have time for:
- Cache the predictions and weather responses on the server (would cut API calls a lot)
- Let users save favorite stations using localStorage
- Show WMATA service alerts on the page
- Add a trip planner (pick two stations, get directions)
- Add user accounts with Supabase Auth so search history is per-user
