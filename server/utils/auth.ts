import type { H3Event } from 'h3'
import type { AuthUser } from '~~/shared/types'

export function requireAuth(event: H3Event): AuthUser {
  const user = event.context.user as AuthUser | undefined
  if (!user) {
    throw createError({ statusCode: 401, message: 'Login påkrævet' })
  }
  return user
}

export function requireRole(event: H3Event, allowedRoles: string[]): AuthUser {
  const user = requireAuth(event)

  if (user.roles.includes('admin')) return user

  const hasRole = allowedRoles.some(role => user.roles.includes(role))
  if (!hasRole) {
    throw createError({ statusCode: 403, message: 'Utilstrækkelige rettigheder' })
  }
  return user
}
