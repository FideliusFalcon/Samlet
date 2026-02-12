import { categories } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  requireRole(event, ['admin'])
  const db = useDb()

  const { name, color } = await readBody(event)
  if (!name?.trim()) {
    throw createError({ statusCode: 400, message: 'Navn er påkrævet' })
  }

  if (name.length > 100) {
    throw createError({ statusCode: 400, message: 'Navn må højst være 100 tegn' })
  }

  const VALID_COLORS = ['gray', 'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'indigo', 'purple']
  const safeColor = VALID_COLORS.includes(color) ? color : 'gray'

  const [category] = await db.insert(categories).values({
    name: name.trim(),
    color: safeColor,
  }).returning()

  audit(event, 'category_created', `"${category.name}"`)

  return category
})
