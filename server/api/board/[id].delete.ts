import { eq } from 'drizzle-orm'
import { boardPosts } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  requireRole(event, ['admin'])
  const db = useDb()
  const id = getRouterParam(event, 'id')!

  const [deleted] = await db
    .delete(boardPosts)
    .where(eq(boardPosts.id, id))
    .returning()

  if (!deleted) {
    throw createError({ statusCode: 404, message: 'Opslag ikke fundet' })
  }

  audit(event, 'post_deleted', `"${deleted.title}"`)

  return { ok: true }
})
