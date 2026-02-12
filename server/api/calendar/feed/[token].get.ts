import { eq, and, gte, asc, inArray } from 'drizzle-orm'
import { users, userRoles, roles, calendarEvents, eventResponses } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const rawToken = getRouterParam(event, 'token')!
  const token = rawToken.replace(/\.ics$/, '')

  const db = useDb()
  const config = useRuntimeConfig()
  const appName = config.public.appName

  // Look up user by token
  const [user] = await db
    .select({ id: users.id, name: users.name, isActive: users.isActive })
    .from(users)
    .where(eq(users.icsToken, token))

  if (!user || !user.isActive) {
    throw createError({ statusCode: 404, message: 'Not found' })
  }

  // Verify user has read-calendar or admin role
  const userRoleRows = await db
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, user.id))

  const roleNames = userRoleRows.map(r => r.roleName)
  if (!roleNames.includes('read-calendar') && !roleNames.includes('admin')) {
    throw createError({ statusCode: 404, message: 'Not found' })
  }

  // Query events: past 30 days + all future
  const since = new Date()
  since.setDate(since.getDate() - 30)

  const events = await db
    .select()
    .from(calendarEvents)
    .where(gte(calendarEvents.endDate, since))
    .orderBy(asc(calendarEvents.startDate))

  // Get user's responses
  const eventIds = events.map(e => e.id)
  let responseMap = new Map<string, string>()
  if (eventIds.length) {
    const responses = await db
      .select({ eventId: eventResponses.eventId, status: eventResponses.status })
      .from(eventResponses)
      .where(
        and(
          inArray(eventResponses.eventId, eventIds),
          eq(eventResponses.userId, user.id),
        ),
      )
    responseMap = new Map(responses.map(r => [r.eventId, r.status]))
  }

  // Build ICS
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${escapeIcs(appName)}//Calendar//DA`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcs(appName)}`,
  ]

  for (const ev of events) {
    const uid = `${ev.id}@${new URL(config.baseUrl).hostname}`
    const status = responseMap.get(ev.id)
    const pad2 = (n: number) => String(n).padStart(2, '0')
    const evMonth = `${ev.startDate.getFullYear()}-${pad2(ev.startDate.getMonth() + 1)}`
    const eventUrl = `${config.baseUrl}/calendar?event=${ev.id}&month=${evMonth}`

    let description = ev.description || ''
    if (status === 'accepted') {
      description = description ? `${description}\n\nDin status: Deltager` : 'Din status: Deltager'
    } else if (status === 'declined') {
      description = description ? `${description}\n\nDin status: Afbud` : 'Din status: Afbud'
    }
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${uid}`)
    lines.push(`DTSTAMP:${formatIcsDateUtc(ev.updatedAt)}`)

    if (ev.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(ev.startDate)}`)
      lines.push(`DTEND;VALUE=DATE:${formatIcsDate(ev.endDate)}`)
    } else {
      lines.push(`DTSTART:${formatIcsDateUtc(ev.startDate)}`)
      lines.push(`DTEND:${formatIcsDateUtc(ev.endDate)}`)
    }

    lines.push(`SUMMARY:${escapeIcs(ev.title)}`)
    lines.push(`DESCRIPTION:${escapeIcs(description)}`)
    if (ev.location) lines.push(`LOCATION:${escapeIcs(ev.location)}`)
    lines.push(`URL:${eventUrl}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')

  const ics = lines.join('\r\n')

  setResponseHeaders(event, {
    'Content-Type': 'text/calendar; charset=utf-8',
    'Content-Disposition': `attachment; filename="${appName}.ics"`,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  })

  return ics
})

function formatIcsDateUtc(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
}

function formatIcsDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`
}

function escapeIcs(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}
