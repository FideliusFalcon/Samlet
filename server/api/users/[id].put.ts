import bcrypt from 'bcrypt'
import { eq, inArray } from 'drizzle-orm'
import { users, userRoles, roles } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  requireRole(event, ['admin'])
  const db = useDb()
  const id = getRouterParam(event, 'id')!

  const { email, name, password, isActive, roleNames } = await readBody(event)

  const updateData: Record<string, unknown> = { updatedAt: new Date() }
  if (email !== undefined) updateData.email = email
  if (name !== undefined) updateData.name = name
  if (isActive !== undefined) updateData.isActive = isActive
  if (password) updateData.passwordHash = await bcrypt.hash(password, 12)

  const [updated] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, id))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, message: 'Bruger ikke fundet' })
  }

  if (roleNames !== undefined) {
    await db.delete(userRoles).where(eq(userRoles.userId, id))

    if (roleNames.length) {
      const roleRows = await db
        .select()
        .from(roles)
        .where(inArray(roles.name, roleNames))

      if (roleRows.length) {
        await db.insert(userRoles).values(
          roleRows.map(r => ({ userId: id, roleId: r.id }))
        )
      }
    }
  }

  audit(event, 'user_updated', `${updated.name} (${updated.email})`)

  return {
    id: updated.id,
    email: updated.email,
    name: updated.name,
    isActive: updated.isActive,
    roles: roleNames,
    createdAt: updated.createdAt,
  }
})
