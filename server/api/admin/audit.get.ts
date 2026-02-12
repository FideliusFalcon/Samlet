import { desc, eq, and, inArray, type SQL } from 'drizzle-orm'
import { auditLogs, users } from '~~/server/db/schema'
import { auditCategories, type AuditCategory } from '~~/server/utils/audit'

export default defineEventHandler(async (event) => {
  requireRole(event, ['admin'])
  const db = useDb()

  const query = getQuery(event)
  const limit = Math.min(Number(query.limit) || 50, 200)
  const offset = Number(query.offset) || 0

  const conditions: SQL[] = []
  if (query.userId && typeof query.userId === 'string') {
    conditions.push(eq(auditLogs.userId, query.userId))
  }
  if (query.category && typeof query.category === 'string') {
    const cat = auditCategories[query.category as AuditCategory]
    if (cat) {
      conditions.push(inArray(auditLogs.action, cat.actions))
    }
  } else if (query.action && typeof query.action === 'string') {
    conditions.push(eq(auditLogs.action, query.action))
  }

  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      details: auditLogs.details,
      ipAddress: auditLogs.ipAddress,
      createdAt: auditLogs.createdAt,
      userId: auditLogs.userId,
      userName: users.name,
      userEmail: users.email,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset)

  return rows
})
