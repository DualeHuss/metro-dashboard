# Developer Manual

This is the same dev manual that's in the bottom half of the main `README.md`, mirrored here for the `docs/` folder.

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
├── tests/
│   └── test.js         - Smoke tests
├── server.js           - Local dev entry
├── package.json
├── vercel.json
└── .env.example
```

## How to install

Need Node.js 18 or newer.

```
git clone <this repo>
cd metro-dashboard
npm install
cp .env.example .env
```

Fill in `.env` with:
- WMATA_API_KEY (from https://developer.wmata.com/signup/)
- OPENWEATHER_API_KEY (from https://openweathermap.org/api)
- SUPABASE_URL and SUPABASE_KEY (from your Supabase project's Settings → API)

### Database setup

In Supabase, open SQL Editor → paste in `db/schema.sql` → run it.

## How to run

```
npm start
```

Open http://localhost:3000

## How to test

```
npm test
```

## API endpoints

| Method | Path | What it does |
|--------|------|--------------|
| GET | /api/health | Health check |
| GET | /api/stations | Get all stations (external - WMATA) |
| GET | /api/predictions/:code | Get arrivals (external - WMATA) |
| GET | /api/weather/:code | Get weather (external - OpenWeather) |
| POST | /api/searches | Save a search (DB write) |
| GET | /api/searches/popular | Get popular stations (DB read) |

## Deployment

Push to GitHub → import on Vercel → add env vars → deploy.

The `vercel.json` handles routing.

## Known issues

- No caching on the predictions endpoint, so every search hits WMATA
- Popular search counts happen in JS instead of SQL
- No retry logic if the external APIs fail
- Map tiles come from OpenStreetMap so they're sometimes slow

## Future improvements

- Add server-side caching
- Save favorite stations to localStorage
- Show WMATA service alerts
- Add a trip planner
- Add user accounts
