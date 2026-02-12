import type { H3Event } from 'h3'
import { auditLogs } from '~~/server/db/schema'

export type AuditAction =
  | 'login'
  | 'login_failed'
  | 'logout'
  | 'email_sent'
  | 'email_failed'
  | 'post_created'
  | 'post_updated'
  | 'post_deleted'
  | 'document_uploaded'
  | 'document_updated'
  | 'document_deleted'
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'category_created'
  | 'category_updated'
  | 'category_deleted'
  | 'notifications_toggled'
  | 'passkey_registered'
  | 'passkey_deleted'
  | 'passkey_login'
  | 'magic_link_requested'
  | 'magic_link_login'
  | 'event_created'
  | 'event_updated'
  | 'event_deleted'
  | 'event_response'
  | 'member_updated'

export type AuditCategory = 'authentication' | 'email' | 'posts' | 'documents' | 'users' | 'calendar' | 'settings'

export const auditCategories: Record<AuditCategory, { label: string; actions: AuditAction[] }> = {
  authentication: {
    label: 'Login',
    actions: ['login', 'login_failed', 'logout', 'passkey_registered', 'passkey_deleted', 'passkey_login', 'magic_link_requested', 'magic_link_login'],
  },
  email: {
    label: 'E-mail',
    actions: ['email_sent', 'email_failed'],
  },
  posts: {
    label: 'Opslag',
    actions: ['post_created', 'post_updated', 'post_deleted', 'category_created', 'category_updated', 'category_deleted'],
  },
  documents: {
    label: 'Dokumenter',
    actions: ['document_uploaded', 'document_updated', 'document_deleted'],
  },
  users: {
    label: 'Brugere',
    actions: ['user_created', 'user_updated', 'user_deleted', 'member_updated'],
  },
  calendar: {
    label: 'Kalender',
    actions: ['event_created', 'event_updated', 'event_deleted', 'event_response'],
  },
  settings: {
    label: 'Indstillinger',
    actions: ['notifications_toggled'],
  },
}

function getClientIp(event: H3Event): string {
  const forwarded = getHeader(event, 'x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const real = getHeader(event, 'x-real-ip')
  if (real) return real
  return getRequestIP(event) || 'unknown'
}

export function audit(event: H3Event, action: AuditAction, details?: string) {
  const userId = event.context.user?.id || null
  const ip = getClientIp(event)

  const db = useDb()
  db.insert(auditLogs).values({
    userId,
    action,
    details,
    ipAddress: ip,
  }).execute().catch((err) => {
    console.error('[audit] Failed to write log:', err)
  })
}
