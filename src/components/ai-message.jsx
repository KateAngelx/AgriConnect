'use client'

function inlineParts(text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, index) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>
    }
    return <span key={`${part}-${index}`}>{part.replaceAll('*', '')}</span>
  })
}

export function AiMessage({ text }) {
  const lines = String(text || '').replace(/\r/g, '').split('\n')
  const blocks = []
  let bullets = []

  function flushBullets() {
    if (!bullets.length) return
    blocks.push(
      <ul key={`bullets-${blocks.length}`} className="ml-4 list-disc space-y-1 marker:text-[#4f8d3b]">
        {bullets.map((bullet, index) => (
          <li key={`${bullet}-${index}`}>{inlineParts(bullet)}</li>
        ))}
      </ul>,
    )
    bullets = []
  }

  lines.forEach((line) => {
    const trimmed = line.trim()
    const bullet = trimmed.match(/^[-*•]\s*(.+)$/)?.[1]
    if (bullet) {
      bullets.push(bullet)
      return
    }
    flushBullets()
    if (!trimmed) return
    blocks.push(
      <p key={`paragraph-${blocks.length}`} className="leading-6">
        {inlineParts(trimmed)}
      </p>,
    )
  })
  flushBullets()

  return <div className="space-y-2">{blocks}</div>
}
