// home page logic

let stationList = [];
let chart = null;

window.addEventListener('DOMContentLoaded', function() {
  loadStations();
  loadPopular();

  document.getElementById('search-form').addEventListener('submit', handleSearch);
});


// load all stations and put them in the datalist
async function loadStations() {
  try {
    const res = await fetch('/api/stations');
    const data = await res.json();
    stationList = data.stations || [];

    const dl = document.getElementById('station-list');
    for (const s of stationList) {
      const opt = document.createElement('option');
      opt.value = s.name + ' (' + s.code + ')';
      dl.appendChild(opt);
    }
  } catch (err) {
    console.log('failed to load stations', err);
    showError('Could not load station list');
  }
}


// figure out which station the user typed
function findStation(input) {
  if (!input) return null;
  const text = input.trim().toLowerCase();

  // try matching by code first (like A01)
  const codeMatch = text.toUpperCase().match(/[A-Z]\d\d/);
  if (codeMatch) {
    const byCode = stationList.find(s => s.code === codeMatch[0]);
    if (byCode) return byCode;
  }

  // then try matching by name
  for (const s of stationList) {
    if (s.name.toLowerCase() === text) return s;
  }
  // partial match
  for (const s of stationList) {
    if (s.name.toLowerCase().includes(text)) return s;
  }
  return null;
}


async function handleSearch(e) {
  e.preventDefault();
  hideError();

  const input = document.getElementById('station-input').value;
  const station = findStation(input);

  if (!station) {
    showError('No station matches "' + input + '"');
    return;
  }

  // show the results section
  document.getElementById('results').style.display = 'block';
  document.getElementById('result-name').textContent = station.name;
  document.getElementById('full-link').href = '/trains?station=' + station.code;

  // fire off all the calls
  loadPredictions(station.code);
  loadWeather(station.code);
  saveSearch(station);
}


async function loadPredictions(code) {
  const target = document.getElementById('predictions');
  target.innerHTML = '<p class="empty">Loading...</p>';

  try {
    const res = await fetch('/api/predictions/' + code);
    const data = await res.json();
    const trains = (data.trains || []).slice(0, 4);

    if (trains.length === 0) {
      target.innerHTML = '<p class="empty">No trains right now.</p>';
      return;
    }

    let html = '';
    for (const t of trains) {
      const line = t.Line || '?';
      const dest = t.DestinationName || 'Unknown';
      const cars = t.Car ? (t.Car + ' cars') : '';
      html += '<div class="pred">';
      html += '<span class="line-pill ' + getLineClass(line) + '">' + escapeHtml(line) + '</span>';
      html += '<span class="pred-dest">' + escapeHtml(dest) + '</span>';
      html += '<span class="pred-cars">' + escapeHtml(cars) + '</span>';
      html += '<span class="pred-min">' + escapeHtml(formatMin(t.Min)) + '</span>';
      html += '</div>';
    }
    target.innerHTML = html;
  } catch (err) {
    console.log('predictions error', err);
    target.innerHTML = '<p class="empty">Could not load predictions.</p>';
  }
}


async function loadWeather(code) {
  const target = document.getElementById('weather');
  target.innerHTML = '<p class="empty">Loading...</p>';

  try {
    const res = await fetch('/api/weather/' + code);
    const data = await res.json();
    const w = data.weather || {};

    let html = '';
    html += '<div class="weather-temp">' + (w.temp != null ? w.temp + '°' : '--') + '</div>';
    html += '<div class="weather-desc">' + escapeHtml(w.description || 'no data') + '</div>';
    html += '<div class="weather-row"><span>Feels like</span><span>' + (w.feelsLike != null ? w.feelsLike + '°' : '--') + '</span></div>';
    html += '<div class="weather-row"><span>Humidity</span><span>' + (w.humidity != null ? w.humidity + '%' : '--') + '</span></div>';
    html += '<div class="weather-row"><span>Wind</span><span>' + (w.windSpeed != null ? w.windSpeed + ' mph' : '--') + '</span></div>';
    target.innerHTML = html;
  } catch (err) {
    console.log('weather error', err);
    target.innerHTML = '<p class="empty">Could not load weather.</p>';
  }
}


// log the search so we can show popular stations
async function saveSearch(station) {
  try {
    await fetch('/api/searches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stationCode: station.code,
        stationName: station.name
      })
    });
    // refresh the chart after saving
    loadPopular();
  } catch (err) {
    console.log('save search error', err);
  }
}


async function loadPopular() {
  try {
    const res = await fetch('/api/searches/popular?limit=7');
    const data = await res.json();
    const rows = data.popular || [];

    const canvas = document.getElementById('chart');
    const emptyMsg = document.getElementById('chart-empty');

    if (rows.length === 0) {
      canvas.style.display = 'none';
      emptyMsg.style.display = 'block';
      return;
    }

    canvas.style.display = 'block';
    emptyMsg.style.display = 'none';

    const labels = rows.map(r => r.station_name || r.station_code);
    const counts = rows.map(r => r.count);

    if (chart) chart.destroy();
    chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Searches',
          data: counts,
          backgroundColor: '#bf0d3e'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    });
  } catch (err) {
    console.log('popular chart error', err);
  }
}


function showError(msg) {
  const box = document.getElementById('error-box');
  box.textContent = msg;
  box.style.display = 'block';
}

function hideError() {
  document.getElementById('error-box').style.display = 'none';
}
