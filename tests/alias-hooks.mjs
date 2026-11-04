// Resolves the "@/..." import alias (tsconfig paths) and extensionless relative
// imports to ./src for node --test runs. Use: node --import ./tests/alias-hooks.mjs --test ...
import { existsSync } from 'node:fs'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'
import { resolve as resolvePath } from 'node:path'

const SRC = resolvePath(process.cwd(), 'src')

if (!globalThis.__agriconnectAliasHooks) {
  globalThis.__agriconnectAliasHooks = true
  register(import.meta.url)
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const base = resolvePath(SRC, specifier.slice(2))
    for (const candidate of [base, `${base}.js`, `${base}.jsx`, `${base}.mjs`]) {
      if (existsSync(candidate)) return nextResolve(pathToFileURL(candidate).href, context)
    }
    return nextResolve(pathToFileURL(`${base}.js`).href, context)
  }
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    try {
      return await nextResolve(specifier, context)
    } catch (error) {
      if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error
      return nextResolve(`${specifier}.js`, context)
    }
  }
  return nextResolve(specifier, context)
}
