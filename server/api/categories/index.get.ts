import { categories } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const db = useDb()
  return db.select().from(categories).orderBy(categories.name)
})
