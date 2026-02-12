import { eq } from 'drizzle-orm'
import { users } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = useDb()

  const { enabled } = await readBody(event)

  if (typeof enabled !== 'boolean') {
    throw createError({ statusCode: 400, message: 'Ugyldig værdi for notifikationer' })
  }

  await db
    .update(users)
    .set({ notificationsEnabled: enabled, updatedAt: new Date() })
    .where(eq(users.id, user.id))

  audit(event, 'notifications_toggled', enabled ? 'Aktiveret' : 'Deaktiveret')

  return { notificationsEnabled: enabled }
})
