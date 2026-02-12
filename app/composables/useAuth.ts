import type { AuthUser } from '~~/shared/types'
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser'

function safeRedirect(value: unknown): string {
  if (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')) {
    return value
  }
  return '/'
}

export function useAuth() {
  const user = useState<AuthUser | null>('auth-user', () => null)
  const isAuthenticated = computed(() => !!user.value)

  async function fetchUser() {
    try {
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
      const data = await $fetch<{ user: AuthUser }>('/api/auth/me', { headers })
      user.value = data.user
    } catch {
      user.value = null
    }
  }

  async function login(email: string, password: string) {
    const data = await $fetch<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    user.value = data.user
    useState<boolean>('should-check-passkey-setup', () => false).value = true
    await navigateTo(safeRedirect(useRoute().query.redirect))
  }

  async function loginWithPasskey() {
    const { startAuthentication } = await import('@simplewebauthn/browser')
    const options = await $fetch<PublicKeyCredentialRequestOptionsJSON>('/api/auth/passkey/login-options', { method: 'POST' })
    const credential = await startAuthentication({ optionsJSON: options })
    const data = await $fetch<{ user: AuthUser }>('/api/auth/passkey/login', {
      method: 'POST',
      body: { credential },
    })
    user.value = data.user
    await navigateTo(safeRedirect(useRoute().query.redirect))
  }

  async function requestMagicLink(email: string) {
    await $fetch('/api/auth/magic-link', {
      method: 'POST',
      body: { email },
    })
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    await navigateTo('/login')
  }

  return { user, isAuthenticated, fetchUser, login, loginWithPasskey, requestMagicLink, logout }
}
