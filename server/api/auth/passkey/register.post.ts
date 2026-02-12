import { verifyRegistrationResponse } from '@simplewebauthn/server'
import { passkeyCredentials } from '~~/server/db/schema'
import { getAndDeleteChallenge } from './register-options.post'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = useDb()
  const config = useRuntimeConfig()

  const body = await readBody(event)
  const { credential } = body
  const deviceName = body.deviceName ? String(body.deviceName).slice(0, 255) : undefined

  if (!credential) {
    throw createError({ statusCode: 400, message: 'Manglende credential data' })
  }

  const expectedChallenge = getAndDeleteChallenge(user.id)
  if (!expectedChallenge) {
    throw createError({ statusCode: 400, message: 'Challenge udløbet, prøv igen' })
  }

  const verification = await verifyRegistrationResponse({
    response: credential,
    expectedChallenge,
    expectedOrigin: config.webauthnOrigin,
    expectedRPID: config.webauthnRpId,
  })

  if (!verification.verified || !verification.registrationInfo) {
    throw createError({ statusCode: 400, message: 'Verifikation fejlede' })
  }

  const { credential: regCredential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo

  await db.insert(passkeyCredentials).values({
    userId: user.id,
    credentialId: regCredential.id,
    publicKey: Buffer.from(regCredential.publicKey).toString('base64url'),
    counter: regCredential.counter,
    transports: credential.response.transports
      ? JSON.stringify(credential.response.transports)
      : null,
    deviceName: deviceName || `${credentialDeviceType}${credentialBackedUp ? ' (synkroniseret)' : ''}`,
  })

  audit(event, 'passkey_registered', deviceName || 'Passkey')

  return { ok: true }
})
