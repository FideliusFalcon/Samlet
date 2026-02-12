import { eq } from 'drizzle-orm'
import { categories } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  requireRole(event, ['admin'])
  const db = useDb()
  const id = getRouterParam(event, 'id')!

  const [deleted] = await db
    .delete(categories)
    .where(eq(categories.id, id))
    .returning()

  if (!deleted) {
    throw createError({ statusCode: 404, message: 'Kategori ikke fundet' })
  }

  audit(event, 'category_deleted', `"${deleted.name}"`)

  return { ok: true }
})
