import { eq } from 'drizzle-orm'
import { documentEvents, documents, categories } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  requireRole(event, ['read-calendar'])
  const db = useDb()
  const id = getRouterParam(event, 'id')!

  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      categoryName: categories.name,
      categoryColor: categories.color,
    })
    .from(documentEvents)
    .innerJoin(documents, eq(documentEvents.documentId, documents.id))
    .leftJoin(categories, eq(documents.categoryId, categories.id))
    .where(eq(documentEvents.eventId, id))

  return rows
})
