const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

let _secretKey: string | null | undefined

function getSecretKey(): string | null {
  if (_secretKey !== undefined) return _secretKey
  const config = useRuntimeConfig()
  _secretKey = config.turnstileSecretKey || null
  return _secretKey
}

interface TurnstileVerifyResponse {
  success: boolean
  'error-codes'?: string[]
}

/**
 * Verify a Turnstile token server-side.
 * No-op if Turnstile is not configured (secret key is empty).
 * Throws H3 error if configured and verification fails.
 */
export async function verifyTurnstile(token: string | undefined, ip?: string): Promise<void> {
  const secretKey = getSecretKey()

  // Not configured — skip verification entirely
  if (!secretKey) return

  // Configured but no token provided — reject
  if (!token) {
    throw createError({
      statusCode: 400,
      message: 'Sikkerhedsverifikation mangler',
    })
  }

  try {
    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
        ...(ip && { remoteip: ip }),
      }),
      signal: AbortSignal.timeout(10_000),
    })

    const result: TurnstileVerifyResponse = await response.json()

    if (!result.success) {
      console.warn('[turnstile] Verification failed:', result['error-codes'])
      throw createError({
        statusCode: 403,
        message: 'Sikkerhedsverifikation mislykkedes',
      })
    }
  } catch (err: any) {
    // Re-throw H3 errors (our own createError calls)
    if (err.statusCode) throw err

    // Network/timeout errors — log but allow through to prevent
    // Cloudflare outages from locking all users out
    console.error('[turnstile] API call failed:', err)
  }
}
