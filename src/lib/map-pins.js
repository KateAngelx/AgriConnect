const COLORS = {
  pickup: '#2e7d32',
  dropoff: '#ef7d32',
  place: '#2e7d32',
}

const GLYPHS = {
  pickup: `<path fill="#fff" fill-rule="evenodd" d="M0-6.6 6.6-1.3-6.6-1.3ZM-5-1h10V6.2H-5ZM-1.35 6.2V2.35h2.7V6.2z"/>`,
  dropoff: `<path fill="#fff" fill-rule="evenodd" d="M0-6.8 7.2.2H5.3V6.2h-10.6V.2H-7.2ZM-1.4 6.2V2.55h2.8V6.2z"/>`,
  place: `<circle cx="0" cy="0" r="4.3" fill="none" stroke="#fff" stroke-width="1.8"/><circle cx="0" cy="0" r="1.7" fill="#fff"/>`,
}

export function mapPinHtml(kind = 'place') {
  const color = COLORS[kind] || COLORS.place
  const glyph = GLYPHS[kind] || GLYPHS.place
  return `<span style="display:block;line-height:0;filter:drop-shadow(0 2px 4px rgba(20,32,22,.32))"><svg xmlns="http://www.w3.org/2000/svg" width="36" height="46" viewBox="0 0 36 46" aria-hidden="true"><path d="M18 44.4c.4 0 7.6-9 11.4-15.6C32.6 23.4 34 19.2 34 15.6 34 6.8 26.8 1.2 18 1.2S2 6.8 2 15.6c0 3.6 1.4 7.8 4.6 13.2C10.4 35.4 17.6 44.4 18 44.4z" fill="${color}" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><g transform="translate(18 16.2)">${glyph}</g></svg></span>`
}

export function mapPinIcon(L, kind = 'place') {
  return L.divIcon({
    className: 'agriconnect-map-pin',
    html: mapPinHtml(kind),
    iconSize: [36, 46],
    iconAnchor: [18, 44],
    popupAnchor: [0, -42],
  })
}
