// trains page - shows the full arrivals board and a map

let refreshTimer = null;

window.addEventListener('DOMContentLoaded', init);

async function init() {
  // get station code from the URL
  const params = new URLSearchParams(window.location.search);
  const code = (params.get('station') || '').toUpperCase();

  if (!code) {
    document.getElementById('no-station').style.display = 'block';
    return;
  }

  document.getElementById('content').style.display = 'block';
  document.getElementById('station-code').textContent = 'Station ' + code;

  // get the station info so we can show name + lines + map
  const station = await getStation(code);
  if (!station) {
    document.getElementById('station-name').textContent = 'Unknown station: ' + code;
    return;
  }

  document.getElementById('station-name').textContent = station.name;
  showLines(station.lines || []);
  setupMap(station);

  // initial load + start auto-refresh
  loadBoard(code);
  refreshTimer = setInterval(() => loadBoard(code), 30000);
}


async function getStation(code) {
  try {
    const res = await fetch('/api/stations');
    const data = await res.json();
    return (data.stations || []).find(s => s.code === code) || null;
  } catch (err) {
    console.log('error getting station', err);
    return null;
  }
}


async function loadBoard(code) {
  const board = document.getElementById('board');

  try {
    const res = await fetch('/api/predictions/' + code);
    const data = await res.json();
    const trains = data.trains || [];

    if (trains.length === 0) {
      board.innerHTML = '<p class="empty">No trains scheduled.</p>';
    } else {
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
      board.innerHTML = html;
    }

    // update last refresh time
    // had to use a separate variable because 't' was already used for trains above lol
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    document.getElementById('refresh-info').textContent = 'Last updated: ' + timeStr;
  } catch (err) {
    console.log('board error', err);
    board.innerHTML = '<p class="empty">Could not load arrivals.</p>';
  }
}


function showLines(lines) {
  const row = document.getElementById('lines-row');
  let html = '';
  for (const l of lines) {
    html += '<span class="line-pill ' + getLineClass(l) + '">' + escapeHtml(l) + '</span>';
  }
  row.innerHTML = html;
}


function setupMap(station) {
  if (typeof L === 'undefined') return;
  if (!station.lat || !station.lon) return;

  const map = L.map('map').setView([station.lat, station.lon], 15);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  L.marker([station.lat, station.lon])
    .addTo(map)
    .bindPopup('<b>' + escapeHtml(station.name) + '</b><br>' + station.code)
    .openPopup();
}
