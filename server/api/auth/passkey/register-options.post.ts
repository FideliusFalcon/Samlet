import { generateRegistrationOptions } from '@simplewebauthn/server'
import { eq } from 'drizzle-orm'
import { passkeyCredentials } from '~~/server/db/schema'

const challenges = new Map<string, { challenge: string; expires: number }>()

function purgeExpired() {
  const now = Date.now()
  for (const [key, entry] of challenges) {
    if (entry.expires < now) challenges.delete(key)
  }
}

// Clean up expired entries every 60 seconds
setInterval(purgeExpired, 60_000).unref()

export function storeChallenge(userId: string, challenge: string) {
  challenges.set(userId, { challenge, expires: Date.now() + 5 * 60_000 })
}

export function getAndDeleteChallenge(userId: string): string | null {
  const entry = challenges.get(userId)
  challenges.delete(userId)
  if (!entry || entry.expires < Date.now()) return null
  return entry.challenge
}

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = useDb()
  const config = useRuntimeConfig()

  const existing = await db
    .select({ credentialId: passkeyCredentials.credentialId, transports: passkeyCredentials.transports })
    .from(passkeyCredentials)
    .where(eq(passkeyCredentials.userId, user.id))

  const excludeCredentials = existing.map(c => ({
    id: c.credentialId,
    transports: c.transports ? JSON.parse(c.transports) : undefined,
  }))

  const options = await generateRegistrationOptions({
    rpName: config.public.appName,
    rpID: config.webauthnRpId,
    userName: user.email,
    userDisplayName: user.name,
    excludeCredentials,
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  })

  storeChallenge(user.id, options.challenge)

  return options
})
