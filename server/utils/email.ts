import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import { eq, ne, and, inArray } from 'drizzle-orm'
import { users, auditLogs, documents, calendarEvents, userRoles, roles, eventResponses, boardComments } from '~~/server/db/schema'
import { renderMarkdown } from '~~/shared/utils/markdown'
import { notifyWebhook } from '~~/server/utils/webhook'

const log = useLogger('email')

let transporter: Transporter | null = null

// Rate limiter: max 30 emails per 60 seconds
const rateLimit = {
  max: 30,
  windowMs: 60_000,
  count: 0,
  windowStart: Date.now(),
}

function checkRateLimit(): boolean {
  const now = Date.now()
  if (now - rateLimit.windowStart > rateLimit.windowMs) {
    rateLimit.count = 0
    rateLimit.windowStart = now
  }
  if (rateLimit.count >= rateLimit.max) {
    log.warn('Rate limit reached, skipping email')
    return false
  }
  rateLimit.count++
  return true
}

function getTransporter(): Transporter | null {
  if (transporter) return transporter

  const config = useRuntimeConfig()
  if (!config.smtpHost) return null

  const port = parseInt(config.smtpPort, 10)
  transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  })

  return transporter
}

export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string,
  text?: string,
  headers?: Record<string, string>,
) {
  const transport = getTransporter()
  if (!transport) return

  const config = useRuntimeConfig()
  const recipients = Array.isArray(to) ? to : [to]

  for (const recipient of recipients) {
    if (!checkRateLimit()) return

    await transport.sendMail({
      from: `${config.public.appName} <${config.smtpFrom}>`,
      replyTo: config.smtpFrom,
      to: recipient,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ''),
      headers: {
        'Precedence': 'bulk',
        ...headers,
      },
    })
  }
}

export async function notifyNewBoardPost(
  post: { title: string; content: string },
  authorName: string,
  authorId: string,
) {
  const transport = getTransporter()
  if (!transport) return

  const db = useDb()
  const config = useRuntimeConfig()
  const appName = config.public.appName

  const activeUsers = await db
    .select({ email: users.email })
    .from(users)
    .where(and(eq(users.isActive, true), eq(users.notificationsEnabled, true), ne(users.id, authorId)))

  const recipients = activeUsers.map(u => u.email)
  if (!recipients.length) return

  const rawPreview = post.content.length > 300
    ? post.content.slice(0, 300) + '...'
    : post.content

  const boardUrl = `${config.baseUrl}/board`
  const settingsUrl = `${config.baseUrl}/settings`

  // Resolve [[doc:UUID]] and [[event:UUID]] references
  const docIds = [...rawPreview.matchAll(/\[\[doc:([0-9a-f-]{36})\]\]/gi)].map(m => m[1])
  const eventIds = [...rawPreview.matchAll(/\[\[event:([0-9a-f-]{36})\]\]/gi)].map(m => m[1])

  const docTitleMap = new Map<string, string>()
  if (docIds.length) {
    const docs = await db
      .select({ id: documents.id, title: documents.title })
      .from(documents)
      .where(inArray(documents.id, docIds))
    for (const d of docs) docTitleMap.set(d.id, d.title)
  }

  const eventTitleMap = new Map<string, string>()
  if (eventIds.length) {
    const evts = await db
      .select({ id: calendarEvents.id, title: calendarEvents.title })
      .from(calendarEvents)
      .where(inArray(calendarEvents.id, eventIds))
    for (const e of evts) eventTitleMap.set(e.id, e.title)
  }

  // Render markdown and resolve references for HTML email
  const previewWithLinks = rawPreview
    .replace(/@\[([^\]]+)\]\([0-9a-f-]{36}\)/gi, '**@$1**')
    .replace(/\[\[doc:([0-9a-f-]{36})\]\]/gi, (_match, id) => {
      const title = docTitleMap.get(id) || 'Dokument'
      return `[${title}](${config.baseUrl}/documents/${id})`
    })
    .replace(/\[\[event:([0-9a-f-]{36})\]\]/gi, (_match, id) => {
      const title = eventTitleMap.get(id) || 'Begivenhed'
      return `[${title}](${config.baseUrl}/calendar?event=${id})`
    })
  const previewHtml = markdownToEmailHtml(previewWithLinks)

  const previewText = rawPreview
    .replace(/@\[([^\]]+)\]\([0-9a-f-]{36}\)/gi, '@$1')
    .replace(/\[\[doc:([0-9a-f-]{36})\]\]/gi, (_match, id) => {
      const title = docTitleMap.get(id) || 'Dokument'
      return `${title} (${config.baseUrl}/documents/${id})`
    })
    .replace(/\[\[event:([0-9a-f-]{36})\]\]/gi, (_match, id) => {
      const title = eventTitleMap.get(id) || 'Begivenhed'
      return `${title} (${config.baseUrl}/calendar?event=${id})`
    })
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/#{1,3}\s+/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

  const html = `<!DOCTYPE html>
<html lang="da">
<head><meta charset="utf-8" /></head>
<body style="margin: 0; padding: 0; background-color: #f9fafb;">
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1f2937; margin-bottom: 4px;">${escapeHtml(appName)}</h2>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 12px 0;" />
    <h3 style="color: #111827; margin-bottom: 8px;">${escapeHtml(post.title)}</h3>
    <p style="color: #6b7280; font-size: 14px; margin-bottom: 12px;">Af ${escapeHtml(authorName)}</p>
    <div style="color: #374151; font-size: 14px; line-height: 1.6;">${previewHtml}</div>
    <p style="margin: 16px 0;">
      <a href="${boardUrl}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">Gå til opslagstavlen</a>
    </p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
    <p style="color: #9ca3af; font-size: 12px;">
      Du modtager denne e-mail fordi du er medlem af ${escapeHtml(appName)}.
      <a href="${settingsUrl}" style="color: #9ca3af;">Afmeld notifikationer</a>
    </p>
  </div>
</body>
</html>`

  const text = `${appName} — Nyt opslag

${post.title}
Af ${authorName}

${previewText}

Læs mere: ${boardUrl}

---
Du modtager denne e-mail fordi du er medlem af ${appName}.
Afmeld notifikationer: ${settingsUrl}`

  try {
    await sendEmail(
      recipients,
      `Nyt opslag: ${post.title}`,
      html,
      text,
      { 'List-Unsubscribe': `<${settingsUrl}>` },
    )
    db.insert(auditLogs).values({
      userId: authorId,
      action: 'email_sent',
      details: `"${post.title}" til ${recipients.length} modtagere`,
    }).execute().catch(() => {})
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ukendt fejl'
    db.insert(auditLogs).values({
      userId: authorId,
      action: 'email_failed',
      details: `"${post.title}": ${message}`,
    }).execute().catch(() => {})
    notifyWebhook('email/board-post', message, `Post: "${post.title}"`).catch(() => {})
    throw err
  }
}

export async function notifyNewBoardComment(
  post: { id: string; title: string; authorId: string },
  comment: { id: string; content: string },
  commenterName: string,
  commenterId: string,
) {
  const transport = getTransporter()
  if (!transport) return

  const db = useDb()
  const config = useRuntimeConfig()
  const appName = config.public.appName

  // Collect recipient user IDs: post author + previous commenters + mentioned users
  const recipientIds = new Set<string>()

  if (post.authorId !== commenterId) {
    recipientIds.add(post.authorId)
  }

  const previousCommenters = await db
    .selectDistinct({ authorId: boardComments.authorId })
    .from(boardComments)
    .where(and(eq(boardComments.postId, post.id), ne(boardComments.authorId, commenterId)))

  for (const c of previousCommenters) {
    recipientIds.add(c.authorId)
  }

  // Add @mentioned users from comment content
  const mentionedIds = [...comment.content.matchAll(/@\[([^\]]+)\]\(([0-9a-f-]{36})\)/gi)].map(m => m[2])
  for (const id of mentionedIds) {
    if (id !== commenterId) {
      recipientIds.add(id)
    }
  }

  if (recipientIds.size === 0) return

  const recipientUsers = await db
    .select({ email: users.email })
    .from(users)
    .where(and(
      eq(users.isActive, true),
      eq(users.notificationsEnabled, true),
      inArray(users.id, [...recipientIds]),
    ))

  const emails = recipientUsers.map(u => u.email)
  if (!emails.length) return

  const boardUrl = `${config.baseUrl}/board`
  const settingsUrl = `${config.baseUrl}/settings`

  // Clean up @[Name](userId) mentions to just @Name for email preview
  const cleanContent = comment.content.replace(/@\[([^\]]+)\]\([0-9a-f-]{36}\)/gi, '@$1')
  const preview = cleanContent.length > 300
    ? cleanContent.slice(0, 300) + '...'
    : cleanContent

  const html = `<!DOCTYPE html>
<html lang="da">
<head><meta charset="utf-8" /></head>
<body style="margin: 0; padding: 0; background-color: #f9fafb;">
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1f2937; margin-bottom: 4px;">${escapeHtml(appName)}</h2>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 12px 0;" />
    <p style="color: #6b7280; font-size: 14px;">Ny kommentar af ${escapeHtml(commenterName)}</p>
    <h3 style="color: #111827; margin-bottom: 8px;">${escapeHtml(post.title)}</h3>
    <div style="color: #374151; font-size: 14px; line-height: 1.6; white-space: pre-wrap; background-color: #f3f4f6; padding: 12px; border-radius: 8px;">${escapeHtml(preview)}</div>
    <p style="margin: 16px 0;">
      <a href="${boardUrl}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">Gå til opslagstavlen</a>
    </p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
    <p style="color: #9ca3af; font-size: 12px;">
      Du modtager denne e-mail fordi du har kommenteret eller oprettet dette opslag.
      <a href="${settingsUrl}" style="color: #9ca3af;">Afmeld notifikationer</a>
    </p>
  </div>
</body>
</html>`

  const text = `${appName} — Ny kommentar

${post.title}
Kommentar af ${commenterName}

${preview}

Læs mere: ${boardUrl}

---
Du modtager denne e-mail fordi du har kommenteret eller oprettet dette opslag.
Afmeld notifikationer: ${settingsUrl}`

  try {
    await sendEmail(
      emails,
      `Ny kommentar: ${post.title}`,
      html,
      text,
      { 'List-Unsubscribe': `<${settingsUrl}>` },
    )
    db.insert(auditLogs).values({
      userId: commenterId,
      action: 'email_sent',
      details: `Kommentar på "${post.title}" til ${emails.length} modtagere`,
    }).execute().catch(() => {})
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ukendt fejl'
    db.insert(auditLogs).values({
      userId: commenterId,
      action: 'email_failed',
      details: `Kommentar på "${post.title}": ${message}`,
    }).execute().catch(() => {})
    notifyWebhook('email/board-comment', message, `Post: "${post.title}"`).catch(() => {})
    throw err
  }
}

export async function sendMagicLinkEmail(email: string, token: string) {
  const config = useRuntimeConfig()
  const appName = config.public.appName
  const magicLinkUrl = `${config.baseUrl}/api/auth/magic-link-verify?token=${token}`

  const html = `<!DOCTYPE html>
<html lang="da">
<head><meta charset="utf-8" /></head>
<body style="margin: 0; padding: 0; background-color: #f9fafb;">
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1f2937; margin-bottom: 4px;">${escapeHtml(appName)}</h2>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 12px 0;" />
    <p style="color: #374151; font-size: 14px; line-height: 1.6;">
      Du har anmodet om at logge ind. Klik på knappen nedenfor for at logge ind.
      Linket udløber om 15 minutter.
    </p>
    <p style="margin: 20px 0;">
      <a href="${magicLinkUrl}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">Log ind</a>
    </p>
    <p style="color: #6b7280; font-size: 12px;">
      Hvis du ikke har anmodet om dette, kan du ignorere denne e-mail.
    </p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
    <p style="color: #9ca3af; font-size: 12px;">
      Denne e-mail blev sendt fra ${escapeHtml(appName)}.
    </p>
  </div>
</body>
</html>`

  const text = `${appName} — Log ind

Du har anmodet om at logge ind. Brug linket nedenfor:

${magicLinkUrl}

Linket udløber om 15 minutter.

Hvis du ikke har anmodet om dette, kan du ignorere denne e-mail.`

  await sendEmail(email, `Log ind i ${appName}`, html, text)
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function markdownToEmailHtml(text: string): string {
  return renderMarkdown(text)
    .replace(/<h([1-3])>/g, '<h$1 style="margin: 8px 0; color: #111827; font-weight: 600;">')
    .replace(/<a /g, '<a style="color: #2563eb; text-decoration: underline;" ')
    .replace(/<strong>/g, '<strong style="font-weight: 600;">')
    .replace(/<ul>/g, '<ul style="padding-left: 1.5em; margin: 8px 0;">')
    .replace(/<ol>/g, '<ol style="padding-left: 1.5em; margin: 8px 0;">')
    .replace(/<li>/g, '<li style="margin: 4px 0;">')
    .replace(/<p>/g, '<p style="margin: 8px 0;">')
    .replace(/<blockquote>/g, '<blockquote style="border-left: 3px solid #d1d5db; padding-left: 1em; margin: 8px 0; color: #6b7280;">')
}

function formatEventDate(startDate: Date, endDate: Date, allDay: boolean): string {
  const opts: Intl.DateTimeFormatOptions = allDay
    ? { day: 'numeric', month: 'long', year: 'numeric' }
    : { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }
  const startStr = startDate.toLocaleDateString('da-DK', opts)
  const sameDay = startDate.toDateString() === endDate.toDateString()
  if (allDay && sameDay) return startStr
  if (sameDay) {
    const endTime = endDate.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })
    return `${startStr} – ${endTime}`
  }
  return `${startStr} – ${endDate.toLocaleDateString('da-DK', opts)}`
}

async function getCalendarRecipients(db: ReturnType<typeof useDb>, excludeUserId?: string) {
  const calendarUsers = await db
    .select({ email: users.email, userId: users.id })
    .from(users)
    .innerJoin(userRoles, eq(users.id, userRoles.userId))
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(
      and(
        eq(users.isActive, true),
        eq(users.notificationsEnabled, true),
        eq(roles.name, 'read-calendar'),
        ...(excludeUserId ? [ne(users.id, excludeUserId)] : []),
      ),
    )

  // Also include admins who aren't already in the list
  const adminUsers = await db
    .select({ email: users.email, userId: users.id })
    .from(users)
    .innerJoin(userRoles, eq(users.id, userRoles.userId))
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(
      and(
        eq(users.isActive, true),
        eq(users.notificationsEnabled, true),
        eq(roles.name, 'admin'),
        ...(excludeUserId ? [ne(users.id, excludeUserId)] : []),
      ),
    )

  const seen = new Set<string>()
  const result: { email: string; userId: string }[] = []
  for (const u of [...calendarUsers, ...adminUsers]) {
    if (!seen.has(u.userId)) {
      seen.add(u.userId)
      result.push(u)
    }
  }
  return result
}

export async function notifyCalendarEvent(
  ev: { id: string; title: string; description: string | null; location: string | null; startDate: Date; endDate: Date; allDay: boolean },
  authorName: string,
  authorId: string,
  isUpdate: boolean,
) {
  const transport = getTransporter()
  if (!transport) return

  const db = useDb()
  const config = useRuntimeConfig()
  const appName = config.public.appName

  const recipients = await getCalendarRecipients(db)
  const emails = recipients.map(r => r.email)
  if (!emails.length) return

  const pad2 = (n: number) => String(n).padStart(2, '0')
  const evMonth = `${ev.startDate.getFullYear()}-${pad2(ev.startDate.getMonth() + 1)}`
  const eventUrl = `${config.baseUrl}/calendar?event=${ev.id}&month=${evMonth}`
  const settingsUrl = `${config.baseUrl}/settings`
  const dateStr = formatEventDate(ev.startDate, ev.endDate, ev.allDay)
  const action = isUpdate ? 'opdateret' : 'oprettet'
  const subject = isUpdate ? `Begivenhed opdateret: ${ev.title}` : `Ny begivenhed: ${ev.title}`

  const html = `<!DOCTYPE html>
<html lang="da">
<head><meta charset="utf-8" /></head>
<body style="margin: 0; padding: 0; background-color: #f9fafb;">
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1f2937; margin-bottom: 4px;">${escapeHtml(appName)}</h2>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 12px 0;" />
    <p style="color: #6b7280; font-size: 14px;">Begivenhed ${action} af ${escapeHtml(authorName)}</p>
    <h3 style="color: #111827; margin-bottom: 8px;">${escapeHtml(ev.title)}</h3>
    <p style="color: #374151; font-size: 14px;">📅 ${escapeHtml(dateStr)}</p>
    ${ev.location ? `<p style="color: #374151; font-size: 14px;">📍 ${escapeHtml(ev.location)}</p>` : ''}
    ${ev.description ? `<p style="color: #374151; font-size: 14px; white-space: pre-wrap; margin-top: 12px;">${escapeHtml(ev.description.length > 300 ? ev.description.slice(0, 300) + '...' : ev.description)}</p>` : ''}
    <p style="margin: 20px 0; color: #374151; font-size: 14px; font-weight: 500;">Gå ind på kalenderen for at svare om du deltager.</p>
    <p style="margin: 16px 0;">
      <a href="${eventUrl}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">Se begivenhed</a>
    </p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
    <p style="color: #9ca3af; font-size: 12px;">
      Du modtager denne e-mail fordi du er medlem af ${escapeHtml(appName)}.
      <a href="${settingsUrl}" style="color: #9ca3af;">Afmeld notifikationer</a>
    </p>
  </div>
</body>
</html>`

  const text = `${appName} — Begivenhed ${action}

${ev.title}
Af ${authorName}

Dato: ${dateStr}${ev.location ? `\nSted: ${ev.location}` : ''}${ev.description ? `\n\n${ev.description.slice(0, 300)}` : ''}

Se begivenhed og svar: ${eventUrl}

---
Du modtager denne e-mail fordi du er medlem af ${appName}.
Afmeld notifikationer: ${settingsUrl}`

  try {
    await sendEmail(emails, subject, html, text, { 'List-Unsubscribe': `<${settingsUrl}>` })
    db.insert(auditLogs).values({
      userId: authorId,
      action: 'email_sent',
      details: `Begivenhed "${ev.title}" til ${emails.length} modtagere`,
    }).execute().catch(() => {})
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ukendt fejl'
    db.insert(auditLogs).values({
      userId: authorId,
      action: 'email_failed',
      details: `Begivenhed "${ev.title}": ${message}`,
    }).execute().catch(() => {})
    notifyWebhook('email/calendar-event', message, `Event: "${ev.title}"`).catch(() => {})
    throw err
  }
}

export async function notifyEventReminder(
  ev: { id: string; title: string; description: string | null; location: string | null; startDate: Date; endDate: Date; allDay: boolean },
) {
  const transport = getTransporter()
  if (!transport) return

  const db = useDb()
  const config = useRuntimeConfig()
  const appName = config.public.appName

  const recipients = await getCalendarRecipients(db)
  if (!recipients.length) return

  // Get all responses for this event
  const responses = await db
    .select()
    .from(eventResponses)
    .where(eq(eventResponses.eventId, ev.id))

  const responseMap = new Map(responses.map(r => [r.userId, r.status]))

  // Exclude users who have declined
  const activeRecipients = recipients.filter(r => responseMap.get(r.userId) !== 'declined')
  if (!activeRecipients.length) return

  const pad2 = (n: number) => String(n).padStart(2, '0')
  const evMonth = `${ev.startDate.getFullYear()}-${pad2(ev.startDate.getMonth() + 1)}`
  const eventUrl = `${config.baseUrl}/calendar?event=${ev.id}&month=${evMonth}`
  const settingsUrl = `${config.baseUrl}/settings`
  const dateStr = formatEventDate(ev.startDate, ev.endDate, ev.allDay)

  for (const recipient of activeRecipients) {
    const userStatus = responseMap.get(recipient.userId)
    let statusText: string
    let statusHtml: string
    if (userStatus === 'accepted') {
      statusText = 'Du har svaret: Deltager'
      statusHtml = '<span style="color: #16a34a; font-weight: 600;">✓ Du har svaret: Deltager</span>'
    } else {
      statusText = 'Du har ikke svaret endnu'
      statusHtml = '<span style="color: #d97706; font-weight: 600;">⚠ Du har ikke svaret endnu</span>'
    }

    const html = `<!DOCTYPE html>
<html lang="da">
<head><meta charset="utf-8" /></head>
<body style="margin: 0; padding: 0; background-color: #f9fafb;">
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1f2937; margin-bottom: 4px;">${escapeHtml(appName)}</h2>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 12px 0;" />
    <p style="color: #d97706; font-size: 14px; font-weight: 600;">Påmindelse: Begivenhed i morgen</p>
    <h3 style="color: #111827; margin-bottom: 8px;">${escapeHtml(ev.title)}</h3>
    <p style="color: #374151; font-size: 14px;">📅 ${escapeHtml(dateStr)}</p>
    ${ev.location ? `<p style="color: #374151; font-size: 14px;">📍 ${escapeHtml(ev.location)}</p>` : ''}
    ${ev.description ? `<p style="color: #374151; font-size: 14px; white-space: pre-wrap; margin-top: 12px;">${escapeHtml(ev.description.length > 300 ? ev.description.slice(0, 300) + '...' : ev.description)}</p>` : ''}
    <div style="margin: 20px 0; padding: 12px 16px; background-color: #f3f4f6; border-radius: 8px; font-size: 14px;">
      ${statusHtml}
    </div>
    <p style="margin: 16px 0;">
      <a href="${eventUrl}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">Se begivenhed</a>
    </p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
    <p style="color: #9ca3af; font-size: 12px;">
      Du modtager denne e-mail fordi du er medlem af ${escapeHtml(appName)}.
      <a href="${settingsUrl}" style="color: #9ca3af;">Afmeld notifikationer</a>
    </p>
  </div>
</body>
</html>`

    const text = `${appName} — Påmindelse: Begivenhed i morgen

${ev.title}

Dato: ${dateStr}${ev.location ? `\nSted: ${ev.location}` : ''}${ev.description ? `\n\n${ev.description.slice(0, 300)}` : ''}

${statusText}

Se begivenhed: ${eventUrl}

---
Du modtager denne e-mail fordi du er medlem af ${appName}.
Afmeld notifikationer: ${settingsUrl}`

    try {
      await sendEmail(recipient.email, `Påmindelse: ${ev.title} i morgen`, html, text, { 'List-Unsubscribe': `<${settingsUrl}>` })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      log.error({ err, recipient: recipient.email }, 'Reminder failed')
      notifyWebhook('email/event-reminder', message, `Event: "${ev.title}", Recipient: ${recipient.email}`).catch(() => {})
    }
  }

  db.insert(auditLogs).values({
    action: 'email_sent',
    details: `Påmindelse "${ev.title}" til ${activeRecipients.length} modtagere`,
  }).execute().catch(() => {})
}
