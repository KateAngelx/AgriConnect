const icons = {
  vegetables: (
    <>
      <path d="M12 22c4-4 6-8 6-13a6 6 0 0 0-12 0c0 5 2 9 6 13Z" />
      <path d="M12 22V9" />
      <path d="M9 12c1.5-2 3-3 3-3s1.5 1 3 3" />
    </>
  ),
  fruits: (
    <>
      <path d="M12 20c3.3 0 6-2.7 6-6 0-4-3-7-6-9-3 2-6 5-6 9 0 3.3 2.7 6 6 6Z" />
      <path d="M12 5V3" />
      <path d="M14 3c1 1 2 2 2 4" />
    </>
  ),
  rice: (
    <>
      <path d="M12 3v18" />
      <path d="M8 7c2-2 4-2 4-2s2 0 4 2" />
      <path d="M7 11c2.5-2 5-2 5-2s2.5 0 5 2" />
      <path d="M6 15c3-2 6-2 6-2s3 0 6 2" />
      <path d="M5 19c3.5-2 7-2 7-2s3.5 0 7 2" />
    </>
  ),
  roots: (
    <>
      <path d="M12 4c-4 0-7 3-7 7 0 5 4 9 7 11 3-2 7-6 7-11 0-4-3-7-7-7Z" />
      <path d="M12 4V2" />
      <path d="M9 6c-1 2-1 4 0 6" />
      <path d="M15 6c1 2 1 4 0 6" />
    </>
  ),
  default: (
    <>
      <path d="M5 20c8 0 13-5 14-15C9 6 4 11 5 20Z" />
      <path d="M5 20c2-5 6-8 11-11" />
    </>
  ),
}

export function CategoryIcon({ categoryId, className = 'size-6' }) {
  const paths = icons[categoryId] || icons.default
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-[#173c2c] stroke-2`}
      aria-hidden="true"
    >
      {paths}
    </svg>
  )
}
