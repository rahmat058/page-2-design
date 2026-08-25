/**
 * Redacts sensitive URL query/hash tokens and flags sensitive form inputs before capture.
 */
import { SENSITIVE_QUERY_KEYS } from './constants'

export function redactUrl(rawUrl: string): { url: string; redacted: boolean } {
  try {
    const parsed = new URL(rawUrl)
    let redacted = false
    const keys = [...parsed.searchParams.keys()]
    for (const key of keys) {
      if (SENSITIVE_QUERY_KEYS.includes(key.toLowerCase())) {
        parsed.searchParams.set(key, 'REDACTED')
        redacted = true
      }
    }
    if (parsed.hash && /access_token|token|code=/i.test(parsed.hash)) {
      parsed.hash = '#REDACTED'
      redacted = true
    }
    return { url: parsed.toString(), redacted }
  } catch {
    return { url: rawUrl, redacted: false }
  }
}

export function isSensitiveInput(el: Element): boolean {
  const tag = el.tagName
  if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
    return false
  }
  const type = (el.getAttribute('type') ?? 'text').toLowerCase()
  const name = (el.getAttribute('name') ?? '').toLowerCase()
  const autocomplete = (el.getAttribute('autocomplete') ?? '').toLowerCase()
  const id = (el.getAttribute('id') ?? '').toLowerCase()
  const sensitiveHint = /password|passwd|secret|token|otp|cvv|cvc|cc-|card|ssn|auth/
  if (type === 'password' || type === 'hidden') return true
  if (sensitiveHint.test(type) || sensitiveHint.test(name) || sensitiveHint.test(id)) return true
  if (autocomplete.startsWith('cc-') || autocomplete === 'current-password' || autocomplete === 'new-password') {
    return true
  }
  return false
}
