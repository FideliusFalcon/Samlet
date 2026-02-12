<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Kategorier</h1>
      <button
        @click="openCreate"
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
      >
        Opret kategori
      </button>
    </div>

    <div v-if="status === 'pending'" class="text-center py-12 text-gray-500">Indlæser...</div>
    <div v-else-if="!categoriesList?.length" class="text-center py-12 text-gray-500">
      Ingen kategorier oprettet endnu.
    </div>
    <template v-else>
      <!-- Mobile card layout -->
      <div class="md:hidden space-y-3">
        <div v-for="cat in categoriesList" :key="cat.id" class="bg-white rounded-lg shadow p-4">
          <div class="flex items-center justify-between gap-2">
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium"
              :class="colorClasses(cat.color)"
            >
              {{ cat.name }}
            </span>
            <span class="text-xs text-gray-500">{{ formatDate(cat.createdAt) }}</span>
          </div>
          <div class="mt-3 flex gap-3 text-sm">
            <button @click="openEdit(cat)" class="text-blue-600 hover:text-blue-800">Rediger</button>
            <button @click="handleDelete(cat.id)" class="text-red-600 hover:text-red-800">Slet</button>
          </div>
        </div>
      </div>

      <!-- Desktop table layout -->
      <div class="hidden md:block bg-white rounded-lg shadow overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Navn</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Farve</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Oprettet</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Handlinger</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="cat in categoriesList" :key="cat.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium"
                  :class="colorClasses(cat.color)"
                >
                  {{ cat.name }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ colors.find(c => c.value === cat.color)?.label || cat.color }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatDate(cat.createdAt) }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                <button @click="openEdit(cat)" class="text-blue-600 hover:text-blue-800 mr-3">Rediger</button>
                <button @click="handleDelete(cat.id)" class="text-red-600 hover:text-red-800">Slet</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h2 class="text-lg font-semibold mb-4">{{ editingId ? 'Rediger kategori' : 'Opret kategori' }}</h2>
        <form @submit.prevent="handleSave" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Navn</label>
            <input
              v-model="formName"
              required
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Kategorinavn"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Farve</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="c in colors"
                :key="c.value"
                type="button"
                @click="formColor = c.value"
                class="inline-flex items-center px-3 py-1.5 rounded text-xs font-medium transition-all"
                :class="[
                  c.bg, c.text,
                  formColor === c.value ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'opacity-60 hover:opacity-100',
                ]"
              >
                {{ c.label }}
              </button>
            </div>
          </div>
          <p v-if="formError" class="text-sm text-red-600">{{ formError }}</p>
          <div class="flex gap-2 justify-end">
            <button
              type="button"
              @click="showModal = false"
              class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
            >
              Annuller
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
            >
              {{ editingId ? 'Gem' : 'Opret' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: () => {
    const { isAdmin } = useRoles()
    if (!isAdmin.value) return navigateTo('/')
  },
})

const { colors, colorClasses } = useCategoryColors()

const showModal = ref(false)
const editingId = ref<string | null>(null)
const formName = ref('')
const formColor = ref('gray')
const formError = ref('')

const { data: categoriesList, status, refresh } = useLazyFetch('/api/categories')

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('da-DK')
}

function openCreate() {
  editingId.value = null
  formName.value = ''
  formColor.value = 'gray'
  formError.value = ''
  showModal.value = true
}

function openEdit(cat: any) {
  editingId.value = cat.id
  formName.value = cat.name
  formColor.value = cat.color || 'gray'
  formError.value = ''
  showModal.value = true
}

async function handleSave() {
  formError.value = ''
  try {
    if (editingId.value) {
      await $fetch(`/api/categories/${editingId.value}`, {
        method: 'PUT',
        body: { name: formName.value, color: formColor.value },
      })
    } else {
      await $fetch('/api/categories', {
        method: 'POST',
        body: { name: formName.value, color: formColor.value },
      })
    }
    showModal.value = false
    await refresh()
  } catch (e: any) {
    formError.value = e.data?.message || 'Noget gik galt'
  }
}

async function handleDelete(id: string) {
  if (!confirm('Er du sikker på, at du vil slette denne kategori?')) return
  try {
    await $fetch(`/api/categories/${id}`, { method: 'DELETE' })
    await refresh()
  } catch (e: any) {
    alert(e.data?.message || 'Kunne ikke slette kategorien')
  }
}
</script>
