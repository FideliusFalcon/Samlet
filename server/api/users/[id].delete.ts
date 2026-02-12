import { eq } from 'drizzle-orm'
import { users } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const currentUser = requireRole(event, ['admin'])
  const db = useDb()
  const id = getRouterParam(event, 'id')!

  if (id === currentUser.id) {
    throw createError({ statusCode: 400, message: 'Du kan ikke slette din egen konto' })
  }

  const [deleted] = await db
    .delete(users)
    .where(eq(users.id, id))
    .returning()

  if (!deleted) {
    throw createError({ statusCode: 404, message: 'Bruger ikke fundet' })
  }

  audit(event, 'user_deleted', `${deleted.name} (${deleted.email})`)

  return { ok: true }
})
