import { eq } from 'drizzle-orm'
import { users } from '~~/server/db/schema'

function normalizePhone(raw: string): string {
  // Strip everything except digits and leading +
  let cleaned = raw.replace(/[^\d+]/g, '')

  // Convert 00-prefix to + (e.g. 0045 → +45)
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2)
  }

  // +45 followed by 8 digits → "+45 XXXX XXXX"
  if (/^\+45\d{8}$/.test(cleaned)) {
    return `+45 ${cleaned.slice(3, 7)} ${cleaned.slice(7)}`
  }

  // 8 digits (Danish number without country code) → "XXXX XXXX"
  if (/^\d{8}$/.test(cleaned)) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`
  }

  // Other international: keep + prefix, group remaining digits in fours
  if (cleaned.startsWith('+')) {
    const ccMatch = cleaned.match(/^\+\d{1,3}/)
    const cc = ccMatch ? ccMatch[0] : '+'
    const rest = cleaned.slice(cc.length)
    if (rest.length) {
      return `${cc} ${rest.match(/.{1,4}/g)!.join(' ')}`
    }
  }

  return cleaned
}

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const id = getRouterParam(event, 'id')!

  const isSelf = user.id === id
  const isAdmin = user.roles.includes('admin')
  const canWriteMembers = user.roles.includes('write-members')

  if (!isSelf && !isAdmin && !canWriteMembers) {
    throw createError({ statusCode: 403, message: 'Utilstrækkelige rettigheder' })
  }

  const { phone, address } = await readBody(event)
  const db = useDb()

  if (phone !== undefined && phone !== null && typeof phone !== 'string') {
    throw createError({ statusCode: 400, message: 'Ugyldigt telefonnummer' })
  }
  if (address !== undefined && address !== null && typeof address !== 'string') {
    throw createError({ statusCode: 400, message: 'Ugyldig adresse' })
  }

  // Normalize and validate phone
  const normalizedPhone = typeof phone === 'string' && phone.trim()
    ? normalizePhone(phone)
    : null

  if (normalizedPhone && !/^\+?\d[\d ]{3,}$/.test(normalizedPhone)) {
    throw createError({ statusCode: 400, message: 'Ugyldigt telefonnummer' })
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() }
  if (phone !== undefined) updateData.phone = normalizedPhone
  if (address !== undefined) updateData.address = address || null

  const [updated] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      address: users.address,
    })

  if (!updated) {
    throw createError({ statusCode: 404, message: 'Medlem ikke fundet' })
  }

  audit(event, 'member_updated', `${updated.name} (${updated.email})`)

  return updated
})
