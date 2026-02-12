import { eq, and, isNull } from 'drizzle-orm'
import { users, magicLinks, userRoles, roles } from '~~/server/db/schema'

// Rate limit: max 10 verify attempts per IP per 15 minutes
const rateLimitWindow = 15 * 60_000
const maxAttempts = 10
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
    if (hit.count >= maxAttempts) {
      return sendRedirect(event, '/login?error=expired_link')
    }
    hit.count++
  } else {
    ipHits.set(ip, { count: 1, resetAt: now + rateLimitWindow })
  }

  const query = getQuery(event)
  const token = String(query.token || '')

  if (!token) {
    return sendRedirect(event, '/login?error=invalid_link')
  }

  const db = useDb()

  const [link] = await db
    .select()
    .from(magicLinks)
    .where(
      and(
        eq(magicLinks.token, token),
        isNull(magicLinks.usedAt),
      ),
    )
    .limit(1)

  if (!link || link.expiresAt < new Date()) {
    return sendRedirect(event, '/login?error=expired_link')
  }

  // Mark token as used atomically
  const [updated] = await db
    .update(magicLinks)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(magicLinks.id, link.id),
        isNull(magicLinks.usedAt),
      ),
    )
    .returning()

  if (!updated) {
    return sendRedirect(event, '/login?error=expired_link')
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, link.email))
    .limit(1)

  if (!user || !user.isActive) {
    return sendRedirect(event, '/login?error=invalid_link')
  }

  const userRoleRows = await db
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, user.id))

  const roleNames = userRoleRows.map(r => r.roleName)

  const jwtToken = await signJwt({
    sub: user.id,
    email: user.email,
    name: user.name,
    roles: roleNames,
  })

  setCookie(event, 'auth_token', jwtToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 45,
    path: '/',
  })

  event.context.user = { id: user.id, email: user.email, name: user.name, roles: roleNames }
  audit(event, 'magic_link_login', `${user.name} (${user.email})`)

  return sendRedirect(event, '/')
})
