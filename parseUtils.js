function parseValue(input) {
  if (!input) return 0;
  const str = input.toLowerCase().replace(/,/g, '').trim();
  const match = str.match(/^([\d.]+)([kmb])?$/);
  if (!match) return parseInt(str, 10);
  const num = parseFloat(match[1]);
  const suffix = match[2];
  switch (suffix) {
    case 'k': return Math.round(num * 1_000);
    case 'm': return Math.round(num * 1_000_000);
    case 'b': return Math.round(num * 1_000_000_000);
    default: return Math.round(num);
  }
}

function calculatePoints({ power, kp, deaths }) {
  return Math.floor((power / 10000) + (kp / 100000) + (deaths / 1000));
}

module.exports = { parseValue, calculatePoints };
