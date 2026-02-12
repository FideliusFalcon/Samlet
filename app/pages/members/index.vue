<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Medlemmer</h1>

    <div v-if="status === 'pending'" class="text-center py-12 text-gray-500">Indlæser...</div>
    <div v-else-if="!members?.length" class="text-center py-12 text-gray-500">
      Ingen medlemmer fundet.
    </div>
    <template v-else>
      <!-- Mobile card layout -->
      <div class="md:hidden space-y-3">
        <div v-for="m in members" :key="m.id" class="bg-white rounded-lg shadow p-4">
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1 min-w-0">
              <div class="font-medium text-gray-900">{{ m.name }}</div>
              <div class="text-sm text-gray-500 truncate">{{ m.email }}</div>
            </div>
            <button
              v-if="canEdit(m.id)"
              @click="openEditModal(m)"
              class="text-sm text-blue-600 hover:text-blue-800 shrink-0"
            >
              Rediger
            </button>
          </div>
          <div class="mt-2 space-y-1 text-sm text-gray-600">
            <div v-if="m.phone" class="flex items-center gap-2">
              <span class="text-gray-400">Tlf:</span>
              <a :href="'tel:' + m.phone" class="text-blue-600 hover:text-blue-800">{{ m.phone }}</a>
            </div>
            <div v-if="m.address">
              <span class="text-gray-400">Adresse:</span> {{ m.address }}
            </div>
            <div v-if="!m.phone && !m.address" class="text-gray-400 italic">
              Ingen kontaktoplysninger
            </div>
          </div>
        </div>
      </div>

      <!-- Desktop table layout -->
      <div class="hidden md:block bg-white rounded-lg shadow overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Navn</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-mail</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefon</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adresse</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="m in members" :key="m.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{{ m.name }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ m.email }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <a v-if="m.phone" :href="'tel:' + m.phone" class="text-blue-600 hover:text-blue-800">{{ m.phone }}</a>
                <span v-else class="text-gray-300">&mdash;</span>
              </td>
              <td class="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                {{ m.address || '\u2014' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                <button
                  v-if="canEdit(m.id)"
                  @click="openEditModal(m)"
                  class="text-blue-600 hover:text-blue-800"
                >
                  Rediger
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Edit modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h2 class="text-lg font-semibold mb-4">Rediger kontaktoplysninger</h2>
        <p class="text-sm text-gray-500 mb-4">{{ editingMemberName }}</p>
        <form @submit.prevent="handleSave" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Telefon</label>
            <input
              v-model="form.phone"
              type="tel"
              placeholder="F.eks. +45 12 34 56 78"
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Adresse</label>
            <textarea
              v-model="form.address"
              rows="3"
              placeholder="Gade, postnr. og by"
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <p v-if="formError" class="text-sm text-red-600">{{ formError }}</p>
          <div class="flex gap-2 justify-end">
            <button
              type="button"
              @click="closeModal"
              class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
            >
              Annuller
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
            >
              Gem
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Member } from '~~/shared/types'

definePageMeta({
  middleware: () => {
    const { canReadUsers } = useRoles()
    if (!canReadUsers.value) return navigateTo('/')
  },
})

const { user } = useAuth()
const { canWriteMembers, isAdmin } = useRoles()

const { data: members, status, refresh } = useLazyFetch<Member[]>('/api/members')

const showModal = ref(false)
const editingMemberId = ref<string | null>(null)
const editingMemberName = ref('')
const formError = ref('')
const form = reactive({
  phone: '',
  address: '',
})

function canEdit(memberId: string): boolean {
  return memberId === user.value?.id || isAdmin.value || canWriteMembers.value
}

function openEditModal(m: Member) {
  editingMemberId.value = m.id
  editingMemberName.value = m.name
  form.phone = m.phone || ''
  form.address = m.address || ''
  formError.value = ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingMemberId.value = null
}

async function handleSave() {
  if (!editingMemberId.value) return
  formError.value = ''
  try {
    await $fetch(`/api/members/${editingMemberId.value}`, {
      method: 'PUT',
      body: {
        phone: form.phone,
        address: form.address,
      },
    })
    closeModal()
    await refresh()
  } catch (e: any) {
    formError.value = e.data?.message || 'Noget gik galt'
  }
}
</script>
