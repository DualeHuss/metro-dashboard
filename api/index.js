// Backend for Metro Dashboard
// Express server with WMATA, OpenWeather, and Supabase

require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// supabase client
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
}

// cache the station list so we don't keep hitting WMATA
let stationsCache = null;

async function getStations() {
  if (stationsCache) return stationsCache;

  const res = await fetch('https://api.wmata.com/Rail.svc/json/jStations', {
    headers: { api_key: process.env.WMATA_API_KEY }
  });
  const data = await res.json();
  stationsCache = data.Stations || [];
  return stationsCache;
}


// --- GET all stations (used to populate search dropdown) ---
app.get('/api/stations', async (req, res) => {
  try {
    const stations = await getStations();
    // simplify the response
    const result = stations.map(s => ({
      code: s.Code,
      name: s.Name,
      lat: s.Lat,
      lon: s.Lon,
      lines: [s.LineCode1, s.LineCode2, s.LineCode3, s.LineCode4].filter(x => x)
    }));
    result.sort((a, b) => a.name.localeCompare(b.name));
    res.json({ stations: result });
  } catch (err) {
    console.log('error getting stations:', err.message);
    res.status(500).json({ error: 'could not get stations' });
  }
});


// --- GET predictions for a station (the main external API call) ---
app.get('/api/predictions/:code', async (req, res) => {
  const code = req.params.code.toUpperCase();

  // basic validation
  if (!/^[A-Z]\d\d$/.test(code)) {
    return res.status(400).json({ error: 'invalid station code' });
  }

  try {
    const url = 'https://api.wmata.com/StationPrediction.svc/json/GetPrediction/' + code;
    const r = await fetch(url, { headers: { api_key: process.env.WMATA_API_KEY } });
    const data = await r.json();
    res.json({ stationCode: code, trains: data.Trains || [] });
  } catch (err) {
    console.log('predictions error:', err.message);
    res.status(500).json({ error: 'could not get predictions' });
  }
});


// --- GET weather at a station ---
app.get('/api/weather/:code', async (req, res) => {
  const code = req.params.code.toUpperCase();
  try {
    const stations = await getStations();
    const station = stations.find(s => s.Code === code);
    if (!station) {
      return res.status(404).json({ error: 'station not found' });
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${station.Lat}&lon=${station.Lon}&units=imperial&appid=${process.env.OPENWEATHER_API_KEY}`;
    const r = await fetch(url);
    const data = await r.json();

    res.json({
      stationName: station.Name,
      weather: {
        temp: Math.round(data.main?.temp),
        feelsLike: Math.round(data.main?.feels_like),
        humidity: data.main?.humidity,
        windSpeed: Math.round(data.wind?.speed),
        description: data.weather?.[0]?.description || '',
        main: data.weather?.[0]?.main || ''
      }
    });
  } catch (err) {
    console.log('weather error:', err.message);
    res.status(500).json({ error: 'could not get weather' });
  }
});


// --- POST a search (writes to supabase) ---
app.post('/api/searches', async (req, res) => {
  const { stationCode, stationName } = req.body;

  if (!stationCode) {
    return res.status(400).json({ error: 'missing stationCode' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'database not configured' });
  }

  try {
    const { data, error } = await supabase
      .from('searches')
      .insert([{ station_code: stationCode, station_name: stationName }])
      .select();

    if (error) throw error;
    res.status(201).json({ ok: true, row: data[0] });
  } catch (err) {
    console.log('insert error:', err.message);
    res.status(500).json({ error: 'could not save search' });
  }
});


// --- GET popular searches (reads from supabase) ---
app.get('/api/searches/popular', async (req, res) => {
  const limit = parseInt(req.query.limit) || 5;

  if (!supabase) {
    return res.status(500).json({ error: 'database not configured' });
  }

  try {
    // grab recent searches and count them up in JS
    // TODO: do this with a SQL view instead, this won't scale forever
    const { data, error } = await supabase
      .from('searches')
      .select('station_code, station_name')
      .order('searched_at', { ascending: false })
      .limit(500);

    if (error) throw error;

    const counts = {};
    for (const row of data) {
      if (!counts[row.station_code]) {
        counts[row.station_code] = {
          station_code: row.station_code,
          station_name: row.station_name,
          count: 0
        };
      }
      counts[row.station_code].count++;
    }

    const list = Object.values(counts);
    list.sort((a, b) => b.count - a.count);
    res.json({ popular: list.slice(0, limit) });
  } catch (err) {
    console.log('popular error:', err.message);
    res.status(500).json({ error: 'could not get popular searches' });
  }
});


// simple health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});


module.exports = app;
