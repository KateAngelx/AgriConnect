export default function manifest() {
  return {
    name: 'AgriConnect',
    short_name: 'AgriConnect',
    description: 'Fresh agricultural products from local Filipino farmers, for pickup or delivery.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'browser'],
    lang: 'en',
    background_color: '#f3f8ef',
    theme_color: '#f3f8ef',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
