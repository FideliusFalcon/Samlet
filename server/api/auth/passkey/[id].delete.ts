import { eq, and } from 'drizzle-orm'
import { passkeyCredentials } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = useDb()
  const id = getRouterParam(event, 'id')!

  const [deleted] = await db
    .delete(passkeyCredentials)
    .where(and(eq(passkeyCredentials.id, id), eq(passkeyCredentials.userId, user.id)))
    .returning()

  if (!deleted) {
    throw createError({ statusCode: 404, message: 'Passkey ikke fundet' })
  }

  audit(event, 'passkey_deleted', deleted.deviceName || 'Passkey')

  return { ok: true }
})
