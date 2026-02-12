<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Dokumenter</h1>
    </div>

    <!-- Upload FAB -->
    <button
      v-if="canWriteFiles"
      @click="showUploadModal = true"
      class="fixed bottom-6 right-6 z-40 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 flex items-center justify-center"
    >
      <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
    </button>

    <!-- Upload modal -->
    <div v-if="showUploadModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="showUploadModal = false">
      <div class="bg-white rounded-lg shadow-xl p-6 w-full mx-4 max-w-lg">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold">Upload dokument</h2>
          <button @click="showUploadModal = false" class="text-gray-400 hover:text-gray-600">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form @submit.prevent="handleUpload" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Titel</label>
            <input
              v-model="uploadTitle"
              required
              class="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Dokumentets titel"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
            <select
              v-model="uploadCategoryId"
              class="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Ingen kategori</option>
              <option v-for="cat in categoriesList" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">PDF-fil</label>
            <input
              ref="uploadFileInput"
              type="file"
              accept=".pdf"
              required
              class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Tilknyt begivenhed</label>
            <select
              v-model="uploadEventId"
              class="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
            >
              <option value="">Ingen begivenhed</option>
              <option v-for="ev in allEvents" :key="ev.id" :value="ev.id">{{ ev.title }} — {{ formatEventDate(ev) }}</option>
            </select>
          </div>
          <p v-if="uploadError" class="text-sm text-red-600">{{ uploadError }}</p>
          <div class="flex justify-end gap-3 pt-2">
            <button
              type="button"
              @click="showUploadModal = false"
              class="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Annuller
            </button>
            <button
              type="submit"
              :disabled="uploading"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
            >
              {{ uploading ? 'Uploader...' : 'Upload' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Search and filter -->
    <div class="bg-white rounded-lg shadow p-4 mb-6 flex flex-col sm:flex-row gap-4">
      <div class="flex-1">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Søg i dokumenter..."
          class="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
        />
      </div>
      <div class="sm:w-48">
        <select
          v-model="filterCategoryId"
          class="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
        >
          <option value="">Alle kategorier</option>
          <option v-for="cat in categoriesList" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
        </select>
      </div>
    </div>

    <!-- Documents list -->
    <div v-if="status === 'pending'" class="text-center py-12 text-gray-500">Indlæser...</div>
    <div v-else-if="!docs?.length" class="text-center py-12 text-gray-500">
      Ingen dokumenter fundet.
    </div>
    <template v-else>
      <!-- Mobile card layout -->
      <div class="md:hidden space-y-3">
        <div v-for="doc in docs" :key="doc.id" class="bg-white rounded-lg shadow p-4">
          <div class="flex items-start justify-between gap-2">
            <NuxtLink :to="`/documents/${doc.id}`" class="text-blue-600 hover:text-blue-800 font-medium text-sm">
              {{ doc.title }}
            </NuxtLink>
            <div class="flex items-center gap-2 shrink-0">
              <a
                :href="`/api/documents/${doc.id}/file`"
                target="_blank"
                class="text-gray-400 hover:text-blue-600"
                title="Åbn i ny fane"
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <button
                v-if="canWriteFiles"
                @click="handleDelete(doc.id)"
                class="text-red-600 hover:text-red-800 text-xs"
              >
                Slet
              </button>
            </div>
          </div>
          <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span>{{ formatSize(doc.fileSize) }}</span>
            <span>&middot;</span>
            <span>{{ doc.uploaderName }}</span>
            <span>&middot;</span>
            <span>{{ formatDate(doc.createdAt) }}</span>
          </div>
          <div class="mt-2">
            <template v-if="editingCategoryDocId === doc.id">
              <select
                v-model="editingCategoryValue"
                @change="saveCategory(doc.id)"
                @blur="editingCategoryDocId = null"
                class="rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Ingen kategori</option>
                <option v-for="cat in categoriesList" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
              </select>
            </template>
            <template v-else>
              <span
                v-if="doc.categoryName"
                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                :class="[colorClasses(doc.categoryColor), canWriteFiles ? 'cursor-pointer hover:opacity-75' : '']"
                @click="canWriteFiles && startEditCategory(doc)"
              >
                {{ doc.categoryName }}
              </span>
              <button
                v-else-if="canWriteFiles"
                @click="startEditCategory(doc)"
                class="text-gray-400 hover:text-gray-600 text-xs"
              >
                + kategori
              </button>
            </template>
          </div>
        </div>
      </div>

      <!-- Desktop table layout -->
      <div class="hidden md:block bg-white rounded-lg shadow overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Titel</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Størrelse</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploadet af</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dato</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Handlinger</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="doc in docs" :key="doc.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <NuxtLink :to="`/documents/${doc.id}`" class="text-blue-600 hover:text-blue-800 font-medium">
                  {{ doc.title }}
                </NuxtLink>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <template v-if="editingCategoryDocId === doc.id">
                  <select
                    v-model="editingCategoryValue"
                    @change="saveCategory(doc.id)"
                    @blur="editingCategoryDocId = null"
                    class="rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Ingen kategori</option>
                    <option v-for="cat in categoriesList" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                  </select>
                </template>
                <template v-else>
                  <span
                    v-if="doc.categoryName"
                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium cursor-pointer"
                    :class="[colorClasses(doc.categoryColor), canWriteFiles ? 'hover:opacity-75' : '']"
                    @click="canWriteFiles && startEditCategory(doc)"
                  >
                    {{ doc.categoryName }}
                  </span>
                  <button
                    v-else-if="canWriteFiles"
                    @click="startEditCategory(doc)"
                    class="text-gray-400 hover:text-gray-600 text-xs"
                  >
                    + kategori
                  </button>
                  <span v-else class="text-gray-400">-</span>
                </template>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatSize(doc.fileSize) }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ doc.uploaderName }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatDate(doc.createdAt) }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                <NuxtLink :to="`/documents/${doc.id}`" class="text-blue-600 hover:text-blue-800 mr-3">Vis</NuxtLink>
                <a
                  :href="`/api/documents/${doc.id}/file`"
                  target="_blank"
                  class="text-gray-500 hover:text-blue-600 mr-3"
                  title="Åbn i ny fane"
                >Åbn</a>
                <button
                  v-if="canWriteFiles"
                  @click="handleDelete(doc.id)"
                  class="text-red-600 hover:text-red-800"
                >
                  Slet
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { LinkedEvent } from '~~/shared/types'

const { canWriteFiles } = useRoles()
const { colorClasses } = useCategoryColors()

const uploadTitle = ref('')
const uploadCategoryId = ref('')
const uploadEventId = ref('')
const uploading = ref(false)
const uploadError = ref('')
const uploadFileInput = ref<HTMLInputElement | null>(null)
const showUploadModal = ref(false)

const searchQuery = ref('')
const filterCategoryId = ref('')

const editingCategoryDocId = ref<string | null>(null)
const editingCategoryValue = ref('')

const allEvents = ref<LinkedEvent[]>([])

const { data: categoriesList } = useLazyFetch('/api/categories')

const fetchParams = computed(() => {
  const params: Record<string, string> = {}
  if (searchQuery.value) params.search = searchQuery.value
  if (filterCategoryId.value) params.categoryId = filterCategoryId.value
  return params
})

const { data: docs, status, refresh } = useLazyFetch('/api/documents', {
  params: fetchParams,
})

// Load events for the event picker
onMounted(async () => {
  if (canWriteFiles.value) {
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

function formatEventDate(ev: LinkedEvent): string {
  const d = new Date(ev.startDate)
  return d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function startEditCategory(doc: any) {
  editingCategoryDocId.value = doc.id
  editingCategoryValue.value = doc.categoryId || ''
}

async function saveCategory(docId: string) {
  await $fetch(`/api/documents/${docId}`, {
    method: 'PUT',
    body: { categoryId: editingCategoryValue.value || null },
  })
  editingCategoryDocId.value = null
  await refresh()
}

async function handleUpload() {
  uploadError.value = ''
  const file = uploadFileInput.value?.files?.[0]
  if (!file) return

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('title', uploadTitle.value)
    formData.append('file', file)
    if (uploadCategoryId.value) {
      formData.append('categoryId', uploadCategoryId.value)
    }

    const doc = await $fetch<{ id: string }>('/api/documents', {
      method: 'POST',
      body: formData,
    })

    // Link to event if selected
    if (uploadEventId.value && doc.id) {
      await $fetch(`/api/documents/${doc.id}/events`, {
        method: 'POST',
        body: { eventId: uploadEventId.value },
      }).catch(() => {})
    }

    uploadTitle.value = ''
    uploadCategoryId.value = ''
    uploadEventId.value = ''
    if (uploadFileInput.value) uploadFileInput.value.value = ''
    await refresh()
    showUploadModal.value = false
  } catch (e: any) {
    uploadError.value = e.data?.message || 'Upload mislykkedes'
  } finally {
    uploading.value = false
  }
}

async function handleDelete(id: string) {
  if (!confirm('Er du sikker på, at du vil slette dette dokument?')) return
  await $fetch(`/api/documents/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>
