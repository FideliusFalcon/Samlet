<template>
  <div>
    <div class="mb-6">
      <NuxtLink to="/documents" class="text-sm text-blue-600 hover:text-blue-800">&larr; Tilbage til dokumenter</NuxtLink>
    </div>

    <div v-if="status === 'pending'" class="text-center py-12 text-gray-500">Indlæser...</div>
    <div v-else-if="error" class="text-center py-12">
      <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p class="text-gray-600 font-medium">Dokumentet blev ikke fundet</p>
      <p class="text-sm text-gray-500 mt-1">Det er muligt, at dokumentet er blevet slettet.</p>
    </div>
    <div v-else-if="doc">
      <div class="mb-4">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">{{ doc.title }}</h1>
            <p class="text-sm text-gray-500 mt-1">
              {{ doc.filename }} &middot; {{ formatSize(doc.fileSize) }} &middot;
              Uploadet af {{ doc.uploaderName }} den {{ formatDate(doc.createdAt) }}
              <span
                v-if="doc.categoryName"
                class="inline-flex items-center ml-2 px-2 py-0.5 rounded text-xs font-medium"
                :class="colorClasses(doc.categoryColor)"
              >
                {{ doc.categoryName }}
              </span>
            </p>
          </div>
          <a
            :href="`/api/documents/${doc.id}/file`"
            target="_blank"
            class="shrink-0 px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 flex items-center gap-1.5"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Åbn i ny fane
          </a>
        </div>
      </div>

      <!-- Settings panel -->
      <div v-if="canWriteFiles" class="mb-4">
        <button
          @click="showSettings = !showSettings"
          class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Indstillinger
          <svg class="h-3 w-3 transition-transform" :class="{ 'rotate-180': showSettings }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div v-if="showSettings" class="mt-3 bg-white rounded-lg shadow p-4 space-y-4">
          <form @submit.prevent="handleRename" class="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div class="flex-1">
              <label class="block text-sm font-medium text-gray-700 mb-1">Titel</label>
              <input
                v-model="editTitle"
                type="text"
                required
                class="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              :disabled="renaming || editTitle === doc?.title"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium disabled:opacity-50 whitespace-nowrap"
            >
              {{ renaming ? 'Gemmer...' : 'Gem titel' }}
            </button>
          </form>
          <p v-if="renameError" class="mt-2 text-sm text-red-600">{{ renameError }}</p>

          <!-- Linked events management -->
          <div class="border-t pt-4">
            <h3 class="text-sm font-medium text-gray-700 mb-2">Begivenheder</h3>
            <div v-if="linkedEvents && linkedEvents.length" class="space-y-1 mb-2">
              <div v-for="ev in linkedEvents" :key="ev.id" class="flex items-center justify-between text-sm py-1">
                <NuxtLink :to="eventDeepLink(ev)" class="text-blue-600 hover:text-blue-800 truncate">
                  {{ ev.title }} — {{ formatEventDate(ev) }}
                </NuxtLink>
                <button
                  @click="unlinkEvent(ev.id)"
                  class="text-gray-400 hover:text-red-600 shrink-0 ml-2"
                  title="Fjern tilknytning"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div v-else-if="linkedEvents" class="text-sm text-gray-400 mb-2">Ingen begivenheder tilknyttet.</div>
            <div class="flex gap-2">
              <select
                v-model="linkEventId"
                class="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Vælg begivenhed...</option>
                <option
                  v-for="ev in availableEvents"
                  :key="ev.id"
                  :value="ev.id"
                >{{ ev.title }} — {{ formatEventDate(ev) }}</option>
              </select>
              <button
                @click="linkEvent"
                :disabled="!linkEventId"
                class="px-3 py-1 text-sm font-medium text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                Tilknyt
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Read-only linked events (visible to everyone) -->
      <div v-if="linkedEvents && linkedEvents.length" class="mb-4">
        <div class="flex flex-wrap gap-2">
          <NuxtLink
            v-for="ev in linkedEvents"
            :key="ev.id"
            :to="eventDeepLink(ev)"
            class="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
          >
            <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {{ ev.title }} — {{ formatEventDate(ev) }}
          </NuxtLink>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow overflow-hidden">
        <iframe
          :src="`/api/documents/${doc.id}/file`"
          class="w-full border-0"
          style="height: calc(100vh - 14rem)"
          type="application/pdf"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LinkedEvent } from '~~/shared/types'

const route = useRoute()
const { colorClasses } = useCategoryColors()
const { canWriteFiles } = useRoles()
const { data: doc, status, error, refresh: refreshDoc } = useLazyFetch(`/api/documents/${route.params.id}`)

// Settings / rename
const showSettings = ref(false)
const editTitle = ref('')
const renaming = ref(false)
const renameError = ref('')

watch(doc, (d) => {
  if (d) editTitle.value = d.title
}, { immediate: true })

async function handleRename() {
  renameError.value = ''
  renaming.value = true
  try {
    await $fetch(`/api/documents/${route.params.id}`, {
      method: 'PUT',
      body: { title: editTitle.value },
    })
    await refreshDoc()
  } catch (e: any) {
    renameError.value = e.data?.message || 'Kunne ikke omdøbe dokumentet'
  } finally {
    renaming.value = false
  }
}

// Linked events
const linkedEvents = ref<LinkedEvent[] | null>(null)
const allEvents = ref<LinkedEvent[] | null>(null)
const linkEventId = ref('')

const availableEvents = computed(() => {
  if (!allEvents.value || !linkedEvents.value) return []
  const linkedIds = new Set(linkedEvents.value.map(e => e.id))
  return allEvents.value.filter(e => !linkedIds.has(e.id))
})

async function fetchLinkedEvents() {
  try {
    linkedEvents.value = await $fetch<LinkedEvent[]>(`/api/documents/${route.params.id}/events`)
  } catch {
    linkedEvents.value = []
  }
}

async function linkEvent() {
  if (!linkEventId.value) return
  await $fetch(`/api/documents/${route.params.id}/events`, {
    method: 'POST',
    body: { eventId: linkEventId.value },
  })
  linkEventId.value = ''
  await fetchLinkedEvents()
}

async function unlinkEvent(eventId: string) {
  await $fetch(`/api/documents/${route.params.id}/events`, {
    method: 'DELETE',
    body: { eventId },
  })
  await fetchLinkedEvents()
}

function eventDeepLink(ev: LinkedEvent): string {
  const start = new Date(ev.startDate)
  const pad = (n: number) => String(n).padStart(2, '0')
  const month = `${start.getFullYear()}-${pad(start.getMonth() + 1)}`
  return `/calendar?event=${ev.id}&month=${month}`
}

function formatEventDate(ev: LinkedEvent): string {
  const d = new Date(ev.startDate)
  return d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Load linked events and event list for picker
onMounted(async () => {
  await fetchLinkedEvents()
  if (canWriteFiles.value) {
    // Fetch recent events for the picker (current + next 2 months)
    const now = new Date()
    const months: string[] = []
    for (let i = -1; i <= 2; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
    const results = await Promise.all(
      months.map(m => $fetch<LinkedEvent[]>('/api/calendar', { params: { month: m } }).catch(() => []))
    )
    const seen = new Set<string>()
    const merged: LinkedEvent[] = []
    for (const list of results) {
      for (const ev of list) {
        if (!seen.has(ev.id)) {
          seen.add(ev.id)
          merged.push(ev)
        }
      }
    }
    allEvents.value = merged.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
  }
})

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('da-DK')
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>
