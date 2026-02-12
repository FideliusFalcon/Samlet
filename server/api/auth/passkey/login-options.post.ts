import { generateAuthenticationOptions } from '@simplewebauthn/server'

const MAX_CHALLENGES = 10_000
const loginChallenges = new Map<string, { challenge: string; expires: number }>()

function purgeExpired() {
  const now = Date.now()
  for (const [key, entry] of loginChallenges) {
    if (entry.expires < now) loginChallenges.delete(key)
  }
}

// Clean up expired entries every 60 seconds
setInterval(purgeExpired, 60_000).unref()

export function storeLoginChallenge(key: string, challenge: string) {
  loginChallenges.set(key, { challenge, expires: Date.now() + 5 * 60_000 })
}

export function getAndDeleteLoginChallenge(key: string): string | null {
  const entry = loginChallenges.get(key)
  loginChallenges.delete(key)
  if (!entry || entry.expires < Date.now()) return null
  return entry.challenge
}

// Rate limiter: max 20 requests per IP per minute
const rateLimitWindow = 60_000
const maxRequests = 20
const ipHits = new Map<string, { count: number; resetAt: number }>()

setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of ipHits) {
    if (entry.resetAt < now) ipHits.delete(ip)
  }
}, 60_000).unref()

export default defineEventHandler(async (event) => {
  // Rate limit by IP
  const ip = getHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
    || getHeader(event, 'x-real-ip')
    || getRequestIP(event)
    || 'unknown'
  const now = Date.now()
  const hit = ipHits.get(ip)
  if (hit && hit.resetAt > now) {
    if (hit.count >= maxRequests) {
      throw createError({ statusCode: 429, message: 'For mange forsøg, prøv igen senere' })
    }
    hit.count++
  } else {
    ipHits.set(ip, { count: 1, resetAt: now + rateLimitWindow })
  }

  // Cap stored challenges to prevent memory exhaustion
  if (loginChallenges.size >= MAX_CHALLENGES) {
    purgeExpired()
    if (loginChallenges.size >= MAX_CHALLENGES) {
      throw createError({ statusCode: 503, message: 'Serveren er overbelastet, prøv igen senere' })
    }
  }

  const config = useRuntimeConfig()

  const options = await generateAuthenticationOptions({
    rpID: config.webauthnRpId,
    userVerification: 'preferred',
  })

  storeLoginChallenge(options.challenge, options.challenge)

  return options
})
