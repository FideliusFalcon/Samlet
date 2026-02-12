import { eq, lt } from 'drizzle-orm'
import { users, magicLinks } from '~~/server/db/schema'

const rateLimitWindow = 15 * 60_000
const maxRequests = 5
const ipHits = new Map<string, { count: number; resetAt: number }>()

setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of ipHits) {
    if (entry.resetAt < now) ipHits.delete(ip)
  }
}, 60_000).unref()

export default defineEventHandler(async (event) => {
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

  const body = await readBody(event)
  const email = String(body.email || '').toLowerCase().trim().slice(0, 255)

  if (!email) {
    throw createError({ statusCode: 400, message: 'E-mail er påkrævet' })
  }

  const db = useDb()

  // Clean up expired tokens older than 1 hour
  await db.delete(magicLinks).where(
    lt(magicLinks.expiresAt, new Date(Date.now() - 60 * 60_000)),
  )

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)

  if (user && user.isActive) {
    const token = crypto.randomUUID()

    await db.insert(magicLinks).values({
      token,
      email,
      expiresAt: new Date(Date.now() + 15 * 60_000),
    })

    sendMagicLinkEmail(email, token).catch((err) => {
      console.error('[magic-link] Failed to send email:', err)
    })

    audit(event, 'magic_link_requested', email)
  }

  return { message: 'Hvis e-mailen er registreret, vil du modtage et login-link.' }
})
