declare global {
  interface Window {
    turnstile: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string
      reset: (widgetId: string) => void
      getResponse: (widgetId: string) => string | undefined
      remove: (widgetId: string) => void
    }
  }
}

export function useTurnstile() {
  const { turnstileSiteKey, turnstileAppearance, turnstileTheme } = useRuntimeConfig().public
  const isEnabled = computed(() => !!turnstileSiteKey)

  let widgetId: string | null = null
  let resolveToken: ((token: string) => void) | null = null
  let currentToken: string | null = null
  let scriptLoaded = false

  async function loadScript(): Promise<void> {
    if (scriptLoaded || !import.meta.client) return

    // Check if script is already in the DOM (e.g. from a previous navigation)
    if (document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')) {
      scriptLoaded = true
      return
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.onload = () => { scriptLoaded = true; resolve() }
      script.onerror = () => reject(new Error('Failed to load Turnstile script'))
      document.head.appendChild(script)
    })
  }

  function renderWidget(container: HTMLElement): void {
    if (!turnstileSiteKey || !window.turnstile) return
    currentToken = null
    widgetId = window.turnstile.render(container, {
      sitekey: turnstileSiteKey,
      size: 'normal',
      appearance: turnstileAppearance,
      theme: turnstileTheme,
      callback: (token: string) => {
        // Always store the token so getToken() can retrieve it later
        currentToken = token
        if (resolveToken) {
          resolveToken(token)
          resolveToken = null
        }
      },
      'error-callback': () => {
        currentToken = null
        if (resolveToken) {
          resolveToken('')
          resolveToken = null
        }
      },
    })
  }

  async function getToken(): Promise<string | null> {
    if (!isEnabled.value) return null

    // Return stored token from callback (auto-verified before user clicked submit)
    if (currentToken) {
      const token = currentToken
      currentToken = null
      if (widgetId !== null && window.turnstile) {
        window.turnstile.reset(widgetId)
      }
      return token
    }

    // Fallback: check via getResponse API
    if (widgetId !== null && window.turnstile) {
      const existing = window.turnstile.getResponse(widgetId)
      if (existing) {
        window.turnstile.reset(widgetId)
        return existing
      }
      // Trigger a fresh challenge
      window.turnstile.reset(widgetId)
    }

    // Wait for the callback to fire
    return new Promise<string>((resolve) => {
      resolveToken = resolve
      setTimeout(() => {
        if (resolveToken) {
          resolveToken('')
          resolveToken = null
        }
      }, 60_000)
    })
  }

  function cleanup(): void {
    if (widgetId !== null && window.turnstile) {
      window.turnstile.remove(widgetId)
      widgetId = null
    }
    currentToken = null
  }

  return { isEnabled, loadScript, renderWidget, getToken, cleanup }
}
