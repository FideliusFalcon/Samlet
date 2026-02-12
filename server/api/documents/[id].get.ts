import { eq } from 'drizzle-orm'
import { documents, users, categories } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  requireRole(event, ['read-files'])
  const db = useDb()
  const id = getRouterParam(event, 'id')!

  const [doc] = await db
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
    .where(eq(documents.id, id))

  if (!doc) {
    throw createError({ statusCode: 404, message: 'Dokument ikke fundet' })
  }

  return doc
})
