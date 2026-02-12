import { SignJWT, jwtVerify } from 'jose'

interface JwtPayload {
  sub: string
  email: string
  name: string
  roles: string[]
}

function getSecret() {
  const config = useRuntimeConfig()
  return new TextEncoder().encode(config.jwtSecret)
}

export async function signJwt(payload: JwtPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('45d')
    .sign(getSecret())
}

export async function verifyJwt(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, getSecret())
  return payload as unknown as JwtPayload
}
