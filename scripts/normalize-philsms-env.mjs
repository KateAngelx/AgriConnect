import fs from 'node:fs'

const path = '.env.local'
let text = fs.readFileSync(path, 'utf8')
text = text.replace(/^PHILSMS_API_TOKEN=.*$/m, (line) => {
  const raw = line.slice('PHILSMS_API_TOKEN='.length).trim()
  const value = raw
    .replace(/^["']|["']$/g, '')
    .replace(/[\uFEFF\u200B-\u200D\r\n]/g, '')
    .trim()
  return `PHILSMS_API_TOKEN=${value}`
})
fs.writeFileSync(path, text)
console.log('PHILSMS_API_TOKEN normalized (trimmed quotes/spaces).')
