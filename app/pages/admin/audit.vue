<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Revisionslog</h1>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-3 mb-6">
      <select
        v-model="filterUser"
        class="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="">Alle brugere</option>
        <option v-for="u in usersList" :key="u.id" :value="u.id">{{ u.name }}</option>
      </select>
      <select
        v-model="filterCategory"
        class="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="">Alle kategorier</option>
        <option v-for="(cat, key) in categories" :key="key" :value="key">{{ cat.label }}</option>
      </select>
    </div>

    <div v-if="status === 'pending'" class="text-center py-12 text-gray-500">Indlæser...</div>
    <div v-else-if="!logs?.length" class="text-center py-12 text-gray-500">Ingen logposter fundet.</div>
    <template v-else>
      <!-- Desktop table -->
      <div class="hidden md:block bg-white rounded-lg shadow overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tidspunkt</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bruger</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Handling</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detaljer</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="log in logs" :key="log.id" class="hover:bg-gray-50">
              <td class="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{{ formatDate(log.createdAt) }}</td>
              <td class="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{{ log.userName || '—' }}</td>
              <td class="px-4 py-3 whitespace-nowrap">
                <span :class="categoryBadgeClass(log.action)" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium">
                  {{ categoryLabel(log.action) }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{{ actionLabel(log.action) }}</td>
              <td class="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{{ log.details || '—' }}</td>
              <td class="px-4 py-3 text-sm text-gray-400 whitespace-nowrap font-mono">{{ log.ipAddress || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile cards -->
      <div class="md:hidden space-y-3">
        <div v-for="log in logs" :key="log.id" class="bg-white rounded-lg shadow p-4">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <span :class="categoryBadgeClass(log.action)" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium">
                {{ categoryLabel(log.action) }}
              </span>
              <span class="text-xs text-gray-600">{{ actionLabel(log.action) }}</span>
            </div>
            <span class="text-xs text-gray-400">{{ formatDate(log.createdAt) }}</span>
          </div>
          <p class="text-sm text-gray-900">{{ log.userName || 'System' }}</p>
          <p v-if="log.details" class="text-sm text-gray-600 mt-1 truncate">{{ log.details }}</p>
          <p class="text-xs text-gray-400 mt-1 font-mono">{{ log.ipAddress }}</p>
        </div>
      </div>

      <!-- Load more -->
      <div v-if="logs.length >= pageSize" class="mt-6 text-center">
        <button
          @click="loadMore"
          :disabled="loading"
          class="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {{ loading ? 'Indlæser...' : 'Indlæs flere' }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const pageSize = 50
const offset = ref(0)
const loading = ref(false)
const filterUser = ref('')
const filterCategory = ref('')

const { data: usersList } = useLazyFetch('/api/users')

const queryParams = computed(() => ({
  limit: pageSize,
  offset: 0,
  ...(filterUser.value && { userId: filterUser.value }),
  ...(filterCategory.value && { category: filterCategory.value }),
}))

const { data: logs, status } = useLazyFetch('/api/admin/audit', {
  query: queryParams,
  watch: [filterUser, filterCategory],
})

watch([filterUser, filterCategory], () => {
  offset.value = 0
})

async function loadMore() {
  if (!logs.value) return
  loading.value = true
  offset.value += pageSize
  try {
    const more = await $fetch('/api/admin/audit', {
      query: {
        limit: pageSize,
        offset: offset.value,
        ...(filterUser.value && { userId: filterUser.value }),
        ...(filterCategory.value && { category: filterCategory.value }),
      },
    })
    if (more.length) {
      logs.value = [...logs.value, ...more]
    }
  } finally {
    loading.value = false
  }
}

const categories: Record<string, { label: string; actions: string[] }> = {
  authentication: { label: 'Login', actions: ['login', 'login_failed', 'logout', 'passkey_registered', 'passkey_deleted', 'passkey_login', 'magic_link_requested', 'magic_link_login'] },
  email: { label: 'E-mail', actions: ['email_sent', 'email_failed'] },
  posts: { label: 'Opslag', actions: ['post_created', 'post_updated', 'post_deleted', 'category_created', 'category_updated', 'category_deleted'] },
  documents: { label: 'Dokumenter', actions: ['document_uploaded', 'document_updated', 'document_deleted'] },
  users: { label: 'Brugere', actions: ['user_created', 'user_updated', 'user_deleted', 'member_updated'] },
  calendar: { label: 'Kalender', actions: ['event_created', 'event_updated', 'event_deleted', 'event_response'] },
  settings: { label: 'Indstillinger', actions: ['notifications_toggled'] },
}

const actionToCategoryKey = new Map<string, string>()
for (const [key, cat] of Object.entries(categories)) {
  for (const action of cat.actions) {
    actionToCategoryKey.set(action, key)
  }
}

const actionLabels: Record<string, string> = {
  login: 'Login',
  login_failed: 'Login fejlet',
  logout: 'Logud',
  email_sent: 'E-mail sendt',
  email_failed: 'E-mail fejlet',
  post_created: 'Opslag oprettet',
  post_updated: 'Opslag opdateret',
  post_deleted: 'Opslag slettet',
  document_uploaded: 'Dokument uploadet',
  document_updated: 'Dokument opdateret',
  document_deleted: 'Dokument slettet',
  user_created: 'Bruger oprettet',
  user_updated: 'Bruger opdateret',
  user_deleted: 'Bruger slettet',
  category_created: 'Kategori oprettet',
  category_updated: 'Kategori opdateret',
  category_deleted: 'Kategori slettet',
  notifications_toggled: 'Notifikationer ændret',
  passkey_registered: 'Adgangsnøgle registreret',
  passkey_deleted: 'Adgangsnøgle fjernet',
  passkey_login: 'Adgangsnøgle login',
  magic_link_requested: 'Magic link anmodet',
  magic_link_login: 'Magic link login',
  event_created: 'Begivenhed oprettet',
  event_updated: 'Begivenhed opdateret',
  event_deleted: 'Begivenhed slettet',
  event_response: 'Begivenhedssvar',
  member_updated: 'Medlemsoplysninger opdateret',
}

function actionLabel(action: string) {
  return actionLabels[action] || action
}

function categoryLabel(action: string) {
  const key = actionToCategoryKey.get(action)
  return key ? categories[key].label : 'Andet'
}

const categoryBadgeColors: Record<string, string> = {
  authentication: 'bg-blue-100 text-blue-800',
  email: 'bg-purple-100 text-purple-800',
  posts: 'bg-green-100 text-green-800',
  documents: 'bg-amber-100 text-amber-800',
  users: 'bg-indigo-100 text-indigo-800',
  calendar: 'bg-orange-100 text-orange-800',
  settings: 'bg-gray-100 text-gray-800',
}

function categoryBadgeClass(action: string) {
  const key = actionToCategoryKey.get(action) || ''
  return categoryBadgeColors[key] || 'bg-gray-100 text-gray-800'
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('da-DK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
</script>
