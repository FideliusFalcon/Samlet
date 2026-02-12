<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Opslagstavle</h1>
      <button
        v-if="canWriteBoard"
        @click="showEditor = !showEditor"
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
      >
        {{ showEditor ? 'Annuller' : 'Nyt opslag' }}
      </button>
    </div>

    <!-- New post editor -->
    <div v-if="showEditor" class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-lg font-semibold mb-4">{{ editingPost ? 'Rediger opslag' : 'Nyt opslag' }}</h2>
      <form @submit.prevent="handleSave" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Titel</label>
          <input
            v-model="form.title"
            required
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Indhold</label>
          <MarkdownEditor ref="editor" v-model="form.content" :rows="6" required />
          <div v-if="(canReadFiles && docsList?.length) || (canReadCalendar && eventsList?.length)" class="mt-2 flex flex-wrap gap-3">
            <div v-if="canReadFiles && docsList?.length">
              <label class="block text-xs text-gray-500 mb-1">Indsæt dokumentreference:</label>
              <select
                @change="insertDocRef($event)"
                class="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Vælg dokument...</option>
                <option v-for="d in docsList" :key="d.id" :value="d.id">{{ d.title }}</option>
              </select>
            </div>
            <div v-if="canReadCalendar && eventsList?.length">
              <label class="block text-xs text-gray-500 mb-1">Indsæt begivenhedsreference:</label>
              <select
                @change="insertEventRef($event)"
                class="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Vælg begivenhed...</option>
                <option v-for="ev in eventsList" :key="ev.id" :value="ev.id">{{ ev.title }}</option>
              </select>
            </div>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <input id="pinned" v-model="form.isPinned" type="checkbox" class="rounded border-gray-300" />
            <label for="pinned" class="text-sm text-gray-700">Fastgjort opslag</label>
          </div>
          <div class="flex items-center gap-2">
            <input id="skipNotification" v-model="form.skipNotification" type="checkbox" class="rounded border-gray-300" />
            <label for="skipNotification" class="text-sm text-gray-700">Undlad at sende notifikation</label>
          </div>
        </div>
        <div class="flex gap-2">
          <button
            type="submit"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            {{ editingPost ? 'Gem' : 'Publicer' }}
          </button>
          <button
            type="button"
            @click="cancelEdit"
            class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
          >
            Annuller
          </button>
        </div>
      </form>
    </div>

    <!-- Posts list -->
    <div v-if="status === 'pending'" class="text-center py-12 text-gray-500">Indlæser...</div>
    <div v-else-if="!posts?.length" class="text-center py-12 text-gray-500">
      Ingen opslag endnu.
    </div>
    <div v-else class="space-y-4">
      <div
        v-for="post in posts"
        :key="post.id"
        class="bg-white rounded-lg shadow p-6"
      >
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span
                v-if="post.isPinned"
                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800"
              >
                Fastgjort
              </span>
              <h2 class="text-lg font-semibold text-gray-900">{{ post.title }}</h2>
            </div>
            <p class="text-sm text-gray-500 mb-3">
              Af {{ post.authorName }} &middot; {{ formatDate(post.createdAt) }}
              <span v-if="post.updatedAt !== post.createdAt"> &middot; Opdateret {{ formatDate(post.updatedAt) }}</span>
            </p>
            <div class="text-gray-700 markdown-content" v-html="renderContent(post.content)" />
          </div>
          <div v-if="canWriteBoard" class="flex gap-2 ml-4">
            <button
              @click="startEdit(post)"
              class="text-sm text-blue-600 hover:text-blue-800"
            >
              Rediger
            </button>
            <button
              v-if="isAdmin"
              @click="handleDelete(post.id)"
              class="text-sm text-red-600 hover:text-red-800"
            >
              Slet
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { renderMarkdown, sanitizeHtml } from '~~/shared/utils/markdown'

const { canWriteBoard, canReadFiles, canReadCalendar, isAdmin } = useRoles()

const showEditor = ref(false)
const editingPost = ref<string | null>(null)
const form = reactive({ title: '', content: '', isPinned: false, skipNotification: false })
const editor = ref<{ insertAtCursor: (text: string) => void } | null>(null)

const { data: posts, status, refresh } = useLazyFetch('/api/board')
const { data: docsList } = useLazyFetch('/api/documents')

const now = new Date()
const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
const { data: eventsList } = canReadCalendar.value
  ? useLazyFetch<{ id: string; title: string }[]>('/api/calendar', { query: { month: currentMonthStr } })
  : { data: ref(null) }

// Build maps of id -> title for rendering references
const docTitleMap = computed(() => {
  const map = new Map<string, string>()
  if (docsList.value) {
    for (const d of docsList.value) {
      map.set(d.id, d.title)
    }
  }
  return map
})

const eventTitleMap = computed(() => {
  const map = new Map<string, string>()
  if (eventsList.value) {
    for (const ev of eventsList.value) {
      map.set(ev.id, ev.title)
    }
  }
  return map
})

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderContent(content: string) {
  // Replace [[doc:UUID]] and [[event:UUID]] with placeholders before markdown parsing
  const placeholders = new Map<string, string>()
  let idx = 0

  let withPlaceholders = content.replace(/\[\[doc:([0-9a-f-]{36})\]\]/gi, (_match, id) => {
    const key = `DOCREF_${idx++}_DOCREF`
    const title = docTitleMap.value.get(id) || 'Dokument'
    placeholders.set(key, `<a href="/documents/${escapeHtml(id)}" class="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline font-medium">&#128196; ${escapeHtml(title)}</a>`)
    return key
  })

  withPlaceholders = withPlaceholders.replace(/\[\[event:([0-9a-f-]{36})\]\]/gi, (_match, id) => {
    const key = `EVTREF_${idx++}_EVTREF`
    const title = eventTitleMap.value.get(id) || 'Begivenhed'
    placeholders.set(key, `<a href="/calendar?event=${escapeHtml(id)}" class="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline font-medium">&#128197; ${escapeHtml(title)}</a>`)
    return key
  })

  // Render markdown
  let html = renderMarkdown(withPlaceholders)

  // Replace placeholders with actual links
  for (const [key, link] of placeholders) {
    html = html.replace(key, link)
  }

  return sanitizeHtml(html)
}

function insertDocRef(event: Event) {
  const select = event.target as HTMLSelectElement
  const docId = select.value
  if (!docId) return
  editor.value?.insertAtCursor(`[[doc:${docId}]]`)
  select.value = ''
}

function insertEventRef(event: Event) {
  const select = event.target as HTMLSelectElement
  const eventId = select.value
  if (!eventId) return
  editor.value?.insertAtCursor(`[[event:${eventId}]]`)
  select.value = ''
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('da-DK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function startEdit(post: any) {
  editingPost.value = post.id
  form.title = post.title
  form.content = post.content
  form.isPinned = post.isPinned
  showEditor.value = true
}

function cancelEdit() {
  editingPost.value = null
  form.title = ''
  form.content = ''
  form.isPinned = false
  form.skipNotification = false
  showEditor.value = false
}

async function handleSave() {
  if (editingPost.value) {
    await $fetch(`/api/board/${editingPost.value}`, {
      method: 'PUT',
      body: { title: form.title, content: form.content, isPinned: form.isPinned, skipNotification: form.skipNotification },
    })
  } else {
    await $fetch('/api/board', {
      method: 'POST',
      body: { title: form.title, content: form.content, isPinned: form.isPinned, skipNotification: form.skipNotification },
    })
  }
  cancelEdit()
  await refresh()
}

async function handleDelete(id: string) {
  if (!confirm('Er du sikker på, at du vil slette dette opslag?')) return
  await $fetch(`/api/board/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>
