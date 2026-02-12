import { eq } from 'drizzle-orm'
import { documents } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  requireRole(event, ['write-files'])
  const db = useDb()
  const id = getRouterParam(event, 'id')!

  const { categoryId, title } = await readBody(event)

  const updates: Record<string, any> = {}

  if (categoryId !== undefined) {
    updates.categoryId = categoryId || null
  }

  if (title !== undefined) {
    if (!title || !title.trim()) {
      throw createError({ statusCode: 400, message: 'Titel må ikke være tom' })
    }
    if (title.length > 255) {
      throw createError({ statusCode: 400, message: 'Titel må højst være 255 tegn' })
    }
    updates.title = title.trim()
  }

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, message: 'Ingen ændringer angivet' })
  }

  const [updated] = await db
    .update(documents)
    .set(updates)
    .where(eq(documents.id, id))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, message: 'Dokument ikke fundet' })
  }

  if (title !== undefined) {
    audit(event, 'document_updated', `Renamed to "${updates.title}"`)
  }

  return updated
})
