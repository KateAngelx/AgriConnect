const paths = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19c0-3 2.5-5 6-5s6 2 6 5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15 19c.3-2 1.8-3.5 4-3.5" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <circle cx="16" cy="14" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  package: (
    <>
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </>
  ),
  boxes: (
    <>
      <path d="M4 8 12 4l8 4-8 4-8-4Z" />
      <path d="M4 8v8l8 4 8-4V8" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4h6v3H9z" />
      <path d="M8 12h8M8 16h8" />
    </>
  ),
  truck: (
    <>
      <path d="M3 8h11v8H3z" />
      <path d="M14 10h4l3 3v3h-7z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
    </>
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8M9 10h4a2 2 0 0 1 0 4h-2" />
    </>
  ),
  store: (
    <>
      <path d="M4 10 12 5l8 5v9H4z" />
      <path d="M9 19v-5h6v5" />
    </>
  ),
  bell: (
    <>
      <path d="M12 4a4 4 0 0 0-4 4v3l-2 2h12l-2-2V8a4 4 0 0 0-4-4Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </>
  ),
  leaf: (
    <>
      <path d="M5 20c8 0 13-5 14-15C9 6 4 11 5 20Z" />
      <path d="M5 20c2-5 6-8 11-11" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-4 3-7 7-7s7 3 7 7" />
    </>
  ),
  cart: (
    <>
      <path d="M6 6h15l-2 9H8L6 6Z" />
      <circle cx="10" cy="19" r="1.5" />
      <circle cx="17" cy="19" r="1.5" />
      <path d="M6 6 5 3H3" />
    </>
  ),
}

export function DashboardIcon({ name, className = 'size-5' }) {
  const content = paths[name] || paths.grid
  return (
    <svg viewBox="0 0 24 24" className={`${className} fill-none stroke-current stroke-2`} aria-hidden="true">
      {content}
    </svg>
  )
}
