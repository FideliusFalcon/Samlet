<template>
  <div class="max-w-2xl">
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Indstillinger</h1>

    <div class="space-y-6">
      <!-- Notifications section -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Notifikationer</h2>
        <label class="flex items-center justify-between cursor-pointer">
          <div>
            <p class="text-sm font-medium text-gray-700">E-mail notifikationer</p>
            <p class="text-sm text-gray-500">Modtag en e-mail når der oprettes nye opslag på opslagstavlen</p>
          </div>
          <input
            type="checkbox"
            :checked="user?.notificationsEnabled"
            @change="toggleNotifications"
            class="rounded border-gray-300 h-5 w-5"
          />
        </label>
      </div>

      <!-- Passkeys section -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Adgangsnøgler</h2>
        <p class="text-sm text-gray-500 mb-4">
          Log ind med fingeraftryk, ansigtsgenkendelse eller din enheds sikkerhedsnøgle.
        </p>

        <!-- Existing passkeys -->
        <div v-if="passkeys?.length" class="space-y-3 mb-4">
          <div
            v-for="pk in passkeys"
            :key="pk.id"
            class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md"
          >
            <div>
              <p class="text-sm font-medium text-gray-900">{{ pk.deviceName || 'Adgangsnøgle' }}</p>
              <p class="text-xs text-gray-500">Oprettet {{ formatDate(pk.createdAt) }}</p>
            </div>
            <button
              @click="deletePasskey(pk.id)"
              class="text-sm text-red-600 hover:text-red-800"
            >
              Fjern
            </button>
          </div>
        </div>
        <div v-else-if="passkeysStatus !== 'pending'" class="text-sm text-gray-500 mb-4">
          Ingen adgangsnøgler registreret endnu.
        </div>

        <!-- Register new passkey -->
        <div class="flex items-center gap-3">
          <input
            v-model="newPasskeyName"
            type="text"
            placeholder="Navn (f.eks. iPhone, MacBook)"
            class="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            @click="registerPasskey"
            :disabled="registering"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium disabled:opacity-50 whitespace-nowrap"
          >
            {{ registering ? 'Registrerer...' : 'Tilføj adgangsnøgle' }}
          </button>
        </div>
        <p v-if="passkeyError" class="mt-2 text-sm text-red-600">{{ passkeyError }}</p>
        <p v-if="passkeySuccess" class="mt-2 text-sm text-green-600">{{ passkeySuccess }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/browser'

const { user } = useAuth()

// Notifications
async function toggleNotifications() {
  if (!user.value) return
  const newValue = !user.value.notificationsEnabled
  try {
    await $fetch('/api/auth/notifications', {
      method: 'PUT',
      body: { enabled: newValue },
    })
    user.value = { ...user.value, notificationsEnabled: newValue }
  } catch {
    // Revert on failure
  }
}

// Passkeys
const newPasskeyName = ref('')
const registering = ref(false)
const passkeyError = ref('')
const passkeySuccess = ref('')

const { data: passkeys, status: passkeysStatus, refresh: refreshPasskeys } = useLazyFetch('/api/auth/passkey')

async function registerPasskey() {
  passkeyError.value = ''
  passkeySuccess.value = ''
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
      body: { credential, deviceName: newPasskeyName.value || undefined },
    })
    newPasskeyName.value = ''
    passkeySuccess.value = 'Adgangsnøgle registreret'
    await refreshPasskeys()
  } catch (e: any) {
    if (e.name === 'NotAllowedError') {
      passkeyError.value = 'Registrering blev annulleret'
    } else {
      passkeyError.value = e.data?.message || 'Registrering mislykkedes'
    }
  } finally {
    registering.value = false
  }
}

async function deletePasskey(id: string) {
  if (!confirm('Er du sikker på, at du vil fjerne denne adgangsnøgle?')) return
  try {
    await $fetch(`/api/auth/passkey/${id}`, { method: 'DELETE' })
    await refreshPasskeys()
  } catch (e: any) {
    passkeyError.value = e.data?.message || 'Kunne ikke fjerne adgangsnøgle'
  }
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('da-DK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
</script>
