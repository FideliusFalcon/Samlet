import { eq } from 'drizzle-orm'
import { passkeyCredentials } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = useDb()

  const credentials = await db
    .select({
      id: passkeyCredentials.id,
      deviceName: passkeyCredentials.deviceName,
      createdAt: passkeyCredentials.createdAt,
    })
    .from(passkeyCredentials)
    .where(eq(passkeyCredentials.userId, user.id))

  return credentials
})
