import { roles } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  requireRole(event, ['admin'])
  const db = useDb()
  return db.select().from(roles).orderBy(roles.name)
})
