export function safeRedirectPath(input: string | null | undefined, fallback = '/my'): string {
  if (!input) return fallback
  try {
    const resolved = new URL(input, 'https://__internal__')
    if (resolved.origin !== 'https://__internal__') return fallback
    return resolved.pathname + resolved.search + resolved.hash
  } catch {
    return fallback
  }
}
