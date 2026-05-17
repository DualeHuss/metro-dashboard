// shared helper functions used by home.js and trains.js

// formats the minutes field from the WMATA API
// it comes back as a string and can be "BRD", "ARR", "---", or a number like "3"
function formatMin(min) {
  if (min === 'BRD') return 'Boarding';
  if (min === 'ARR') return 'Arriving';
  if (!min || min === '---') return '--';
  return min + ' min';
}

function getLineClass(line) {
  const valid = ['RD', 'OR', 'YL', 'GR', 'BL', 'SV'];
  if (valid.includes(line)) return 'line-' + line;
  return '';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
