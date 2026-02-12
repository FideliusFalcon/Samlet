<template>
  <div>
    <div class="bg-white shadow rounded-lg p-8">
      <h1 class="text-2xl font-bold text-center text-gray-900 mb-6">{{ appName }}</h1>

      <!-- Magic link error from redirect -->
      <p v-if="magicLinkError" class="mb-4 text-sm text-red-600 text-center">{{ magicLinkError }}</p>

      <!-- PASSWORD MODE -->
      <template v-if="mode === 'password'">
        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">E-mail</label>
            <input
              id="email"
              v-model="email"
              type="email"
              required
              autocomplete="username webauthn"
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="din@email.dk"
            />
          </div>
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700">Adgangskode</label>
            <input
              id="password"
              v-model="password"
              type="password"
              required
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
          <button
            type="submit"
            :disabled="loading"
            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {{ loading ? 'Logger ind...' : 'Log ind' }}
          </button>
        </form>
        <div class="mt-4">
          <div class="relative">
            <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-gray-200" /></div>
            <div class="relative flex justify-center text-sm"><span class="bg-white px-2 text-gray-500">eller</span></div>
          </div>
          <button
            @click="handlePasskeyLogin"
            :disabled="loading"
            class="mt-4 w-full flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
            {{ loading ? 'Logger ind...' : 'Log ind med adgangsnøgle' }}
          </button>
          <button
            v-if="smtpEnabled"
            @click="mode = 'magiclink'; error = ''"
            class="mt-3 w-full flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            Log ind med e-mail-link
          </button>
        </div>
      </template>

      <!-- MAGIC LINK MODE -->
      <template v-else>
        <template v-if="!magicLinkSent">
          <p class="text-sm text-gray-600 mb-4">
            Indtast din e-mail, så sender vi dig et link til at logge ind.
          </p>
          <form @submit.prevent="handleMagicLink" class="space-y-4">
            <div>
              <label for="magic-email" class="block text-sm font-medium text-gray-700">E-mail</label>
              <input
                id="magic-email"
                v-model="magicLinkEmail"
                type="email"
                required
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="din@email.dk"
              />
            </div>
            <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
            <button
              type="submit"
              :disabled="loading"
              class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {{ loading ? 'Sender...' : 'Send login-link' }}
            </button>
          </form>
        </template>

        <!-- Success state -->
        <template v-else>
          <div class="text-center">
            <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-4">
              <svg class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <p class="text-sm text-gray-700">
              Hvis e-mailen er registreret, vil du modtage et login-link.<br />
              Tjek din indbakke (og eventuelt spam).
            </p>
          </div>
        </template>

        <button
          @click="mode = 'password'; magicLinkSent = false; error = ''"
          class="mt-4 w-full text-center text-sm text-blue-600 hover:text-blue-700"
        >
          Tilbage til adgangskode
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser'

definePageMeta({ layout: 'auth' })

const { user, login, loginWithPasskey, requestMagicLink } = useAuth()
const { appName, smtpEnabled } = useRuntimeConfig().public
const route = useRoute()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const mode = ref<'password' | 'magiclink'>('password')
const magicLinkEmail = ref('')
const magicLinkSent = ref(false)

const magicLinkError = computed(() => {
  const err = route.query.error
  if (err === 'expired_link') return 'Login-linket er udløbet. Prøv igen.'
  if (err === 'invalid_link') return 'Login-linket er ugyldigt.'
  return ''
})

// Conditional UI: browser shows passkey in autofill when user focuses email input
onMounted(async () => {
  try {
    const { browserSupportsWebAuthnAutofill, startAuthentication } = await import('@simplewebauthn/browser')
    if (!await browserSupportsWebAuthnAutofill()) return

    const options = await $fetch<PublicKeyCredentialRequestOptionsJSON>(
      '/api/auth/passkey/login-options',
      { method: 'POST' },
    )
    const credential = await startAuthentication({
      optionsJSON: options,
      useBrowserAutofill: true,
    })

    // User selected a passkey from autofill
    loading.value = true
    const data = await $fetch<{ user: typeof user.value }>('/api/auth/passkey/login', {
      method: 'POST',
      body: { credential },
    })
    user.value = data.user
    await navigateTo('/')
  } catch {
    // Silently ignore — user simply didn't pick a passkey from autofill
  }
})

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    await login(email.value, password.value)
  } catch (e: any) {
    error.value = e.data?.message || 'Login mislykkedes'
  } finally {
    loading.value = false
  }
}

async function handlePasskeyLogin() {
  error.value = ''
  loading.value = true
  try {
    await loginWithPasskey()
  } catch (e: any) {
    if (e.name === 'NotAllowedError') {
      error.value = 'Login med adgangsnøgle blev annulleret'
    } else {
      error.value = e.data?.message || 'Login med adgangsnøgle mislykkedes'
    }
  } finally {
    loading.value = false
  }
}

async function handleMagicLink() {
  error.value = ''
  loading.value = true
  try {
    await requestMagicLink(magicLinkEmail.value)
    magicLinkSent.value = true
  } catch (e: any) {
    error.value = e.data?.message || 'Kunne ikke sende login-link'
  } finally {
    loading.value = false
  }
}
</script>
