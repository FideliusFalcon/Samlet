import { desc, eq, ilike, and } from 'drizzle-orm'
import { documents, users, categories } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  requireRole(event, ['read-files'])
  const db = useDb()

  const query = getQuery(event)
  const search = query.search as string | undefined
  const categoryId = query.categoryId as string | undefined

  const conditions = []
  if (search) {
    const escaped = search.replace(/[%_\\]/g, '\\$&')
    conditions.push(ilike(documents.title, `%${escaped}%`))
  }
  if (categoryId) {
    conditions.push(eq(documents.categoryId, categoryId))
  }

  const docs = await db
    .select({
      id: documents.id,
      title: documents.title,
      filename: documents.filename,
      fileSize: documents.fileSize,
      mimeType: documents.mimeType,
      categoryId: documents.categoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
      uploadedById: documents.uploadedById,
      uploaderName: users.name,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .leftJoin(users, eq(documents.uploadedById, users.id))
    .leftJoin(categories, eq(documents.categoryId, categories.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(documents.createdAt))

  return docs
})
