<template>
  <div v-if="showPrompt" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
      <!-- Icon -->
      <div class="flex justify-center mb-4">
        <svg class="h-12 w-12 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
        </svg>
      </div>

      <h2 class="text-lg font-semibold text-gray-900 text-center mb-2">
        Opsæt hurtig adgang på denne enhed?
      </h2>
      <p class="text-sm text-gray-600 text-center mb-6">
        Hvis du stoler på denne enhed, kan du tilføje en adgangsnøgle og logge ind med fingeraftryk eller ansigtsgenkendelse i stedet for adgangskode.
      </p>

      <!-- Success state -->
      <div v-if="success" class="text-center">
        <p class="text-sm text-green-600 font-medium mb-4">Adgangsnøgle oprettet!</p>
        <button
          @click="close"
          class="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          Luk
        </button>
      </div>

      <!-- Registration form -->
      <template v-else>
        <div class="mb-4">
          <label for="device-name" class="block text-sm font-medium text-gray-700 mb-1">Enhedsnavn</label>
          <input
            id="device-name"
            v-model="deviceName"
            type="text"
            class="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <p v-if="error" class="text-sm text-red-600 mb-4">{{ error }}</p>

        <div class="flex flex-col gap-3">
          <button
            @click="register"
            :disabled="registering"
            class="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
          >
            {{ registering ? 'Opsætter...' : 'Opsæt adgangsnøgle' }}
          </button>
          <button
            @click="dismiss"
            class="w-full py-2 px-4 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Ikke nu
          </button>
          <p class="text-xs text-gray-400 text-center">
            Du kan altid opsætte det senere under Indstillinger
          </p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/browser'

const STORAGE_KEY = 'passkey-prompt-dismissed'

const shouldCheck = useState<boolean>('should-check-passkey-setup', () => false)
const showPrompt = ref(false)
const deviceName = ref('')
const registering = ref(false)
const error = ref('')
const success = ref(false)

function guessDeviceName(): string {
  const ua = navigator.userAgent
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua)) return 'iPad'
  if (/Macintosh/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'Windows PC'
  if (/Android/.test(ua)) return 'Android'
  if (/Linux/.test(ua)) return 'Linux PC'
  return 'Enhed'
}

watch(shouldCheck, async (val) => {
  // immediate: true ensures we catch the flag if it was set before this component mounted
  if (!val) return
  shouldCheck.value = false

  if (localStorage.getItem(STORAGE_KEY)) return

  const { browserSupportsWebAuthn } = await import('@simplewebauthn/browser')
  if (!browserSupportsWebAuthn()) return

  try {
    const passkeys = await $fetch<{ id: string }[]>('/api/auth/passkey')
    if (passkeys.length > 0) return
  } catch {
    return
  }

  deviceName.value = guessDeviceName()
  showPrompt.value = true
}, { immediate: true })

async function register() {
  error.value = ''
  registering.value = true
  try {
    const { startRegistration } = await import('@simplewebauthn/browser')
    const options = await $fetch<PublicKeyCredentialCreationOptionsJSON>(
      '/api/auth/passkey/register-options',
      { method: 'POST' },
    )
    const credential = await startRegistration({ optionsJSON: options })
    await $fetch('/api/auth/passkey/register', {
      method: 'POST',
      body: { credential, deviceName: deviceName.value || undefined },
    })
    success.value = true
    localStorage.setItem(STORAGE_KEY, '1')
  } catch (e: any) {
    if (e.name === 'NotAllowedError') {
      error.value = 'Registrering blev annulleret'
    } else {
      error.value = e.data?.message || 'Noget gik galt. Prøv igen senere.'
    }
  } finally {
    registering.value = false
  }
}

function dismiss() {
  localStorage.setItem(STORAGE_KEY, '1')
  showPrompt.value = false
}

function close() {
  showPrompt.value = false
}
</script>
