import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import { eq } from 'drizzle-orm'
import { passkeyCredentials, users, userRoles, roles } from '~~/server/db/schema'
import { getAndDeleteLoginChallenge } from './login-options.post'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const config = useRuntimeConfig()

  const { credential } = await readBody(event)

  if (!credential?.id) {
    throw createError({ statusCode: 400, message: 'Manglende credential data' })
  }

  // Find the credential in DB
  const [stored] = await db
    .select()
    .from(passkeyCredentials)
    .where(eq(passkeyCredentials.credentialId, credential.id))
    .limit(1)

  if (!stored) {
    audit(event, 'login_failed', 'Ukendt passkey')
    throw createError({ statusCode: 401, message: 'Ugyldige loginoplysninger' })
  }

  // Find the user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, stored.userId))
    .limit(1)

  if (!user || !user.isActive) {
    audit(event, 'login_failed', `Deaktiveret konto via passkey: ${user?.email || stored.userId}`)
    throw createError({ statusCode: 403, message: 'Kontoen er deaktiveret' })
  }

  // Extract challenge from clientDataJSON and verify it
  let clientData: { challenge?: string }
  try {
    clientData = JSON.parse(Buffer.from(credential.response.clientDataJSON, 'base64url').toString('utf-8'))
  } catch {
    throw createError({ statusCode: 400, message: 'Ugyldig credential data' })
  }

  if (!clientData.challenge) {
    throw createError({ statusCode: 400, message: 'Ugyldig credential data' })
  }

  const storedChallenge = getAndDeleteLoginChallenge(clientData.challenge)

  if (!storedChallenge) {
    throw createError({ statusCode: 400, message: 'Challenge udløbet, prøv igen' })
  }

  const verification = await verifyAuthenticationResponse({
    response: credential,
    expectedChallenge: storedChallenge,
    expectedOrigin: config.webauthnOrigin,
    expectedRPID: config.webauthnRpId,
    credential: {
      id: stored.credentialId,
      publicKey: Buffer.from(stored.publicKey, 'base64url'),
      counter: stored.counter,
      transports: stored.transports ? JSON.parse(stored.transports) : undefined,
    },
  })

  if (!verification.verified) {
    audit(event, 'login_failed', `Passkey verifikation fejlet: ${user.email}`)
    throw createError({ statusCode: 401, message: 'Ugyldige loginoplysninger' })
  }

  // Update counter
  await db
    .update(passkeyCredentials)
    .set({ counter: verification.authenticationInfo.newCounter })
    .where(eq(passkeyCredentials.id, stored.id))

  // Get roles
  const userRoleRows = await db
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, user.id))

  const roleNames = userRoleRows.map(r => r.roleName)

  // Issue JWT (same as password login)
  const token = await signJwt({
    sub: user.id,
    email: user.email,
    name: user.name,
    roles: roleNames,
  })

  setCookie(event, 'auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 45,
    path: '/',
  })

  event.context.user = { id: user.id, email: user.email, name: user.name, roles: roleNames }
  audit(event, 'passkey_login', `${user.name} (${user.email})`)

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: roleNames,
      notificationsEnabled: user.notificationsEnabled,
    },
  }
})
