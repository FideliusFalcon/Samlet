import bcrypt from 'bcrypt'
import { eq } from 'drizzle-orm'
import { users, userRoles, roles } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const email = String(body.email || '').slice(0, 255)
  const password = body.password

  if (!email || !password) {
    throw createError({ statusCode: 400, message: 'E-mail og adgangskode er påkrævet' })
  }

  const db = useDb()

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (!user) {
    audit(event, 'login_failed', `E-mail: ${email}`)
    throw createError({ statusCode: 401, message: 'Ugyldige loginoplysninger' })
  }

  if (!user.isActive) {
    audit(event, 'login_failed', `Deaktiveret konto: ${email}`)
    throw createError({ statusCode: 403, message: 'Kontoen er deaktiveret' })
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    audit(event, 'login_failed', `Forkert adgangskode: ${email}`)
    throw createError({ statusCode: 401, message: 'Ugyldige loginoplysninger' })
  }

  const userRoleRows = await db
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, user.id))

  const roleNames = userRoleRows.map(r => r.roleName)

  const token = await signJwt({
    sub: user.id,
    email: user.email,
    name: user.name,
    roles: roleNames,
  })

  setCookie(event, 'auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 45,
    path: '/',
  })

  event.context.user = { id: user.id, email: user.email, name: user.name, roles: roleNames }
  audit(event, 'login', `${user.name} (${user.email})`)

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: roleNames,
      notificationsEnabled: user.notificationsEnabled,
    },
  }
})
