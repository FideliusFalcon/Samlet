import bcrypt from 'bcrypt'
import { inArray } from 'drizzle-orm'
import { users, userRoles, roles } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  requireRole(event, ['admin'])
  const db = useDb()

  const { email, name, password, roleNames } = await readBody(event)

  if (!email?.trim() || !name?.trim() || !password) {
    throw createError({ statusCode: 400, message: 'E-mail, navn og adgangskode er påkrævet' })
  }

  if (email.length > 255 || name.length > 255) {
    throw createError({ statusCode: 400, message: 'E-mail og navn må højst være 255 tegn' })
  }

  if (password.length < 6) {
    throw createError({ statusCode: 400, message: 'Adgangskode skal være mindst 6 tegn' })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw createError({ statusCode: 400, message: 'Ugyldigt e-mailformat' })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const [newUser] = await db.insert(users).values({
    email: email.trim(),
    name: name.trim(),
    passwordHash,
  }).returning()

  if (roleNames?.length) {
    const roleRows = await db
      .select()
      .from(roles)
      .where(inArray(roles.name, roleNames))

    if (roleRows.length) {
      await db.insert(userRoles).values(
        roleRows.map(r => ({ userId: newUser.id, roleId: r.id }))
      )
    }
  }

  audit(event, 'user_created', `${newUser.name} (${newUser.email})`)

  return {
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
    isActive: newUser.isActive,
    roles: roleNames || [],
    createdAt: newUser.createdAt,
  }
})
