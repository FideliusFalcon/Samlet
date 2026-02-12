import { eq } from 'drizzle-orm'
import { categories } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  requireRole(event, ['admin'])
  const db = useDb()
  const id = getRouterParam(event, 'id')!

  const { name, color } = await readBody(event)
  if (!name?.trim()) {
    throw createError({ statusCode: 400, message: 'Navn er påkrævet' })
  }

  if (name.length > 100) {
    throw createError({ statusCode: 400, message: 'Navn må højst være 100 tegn' })
  }

  const VALID_COLORS = ['gray', 'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'indigo', 'purple']
  const set: Record<string, string> = { name: name.trim() }
  if (color && VALID_COLORS.includes(color)) set.color = color

  const [updated] = await db
    .update(categories)
    .set(set)
    .where(eq(categories.id, id))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, message: 'Kategori ikke fundet' })
  }

  audit(event, 'category_updated', `"${updated.name}"`)

  return updated
})
