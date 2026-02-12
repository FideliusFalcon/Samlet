<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Administrer brugere</h1>
      <button
        @click="openCreateModal"
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
      >
        Opret bruger
      </button>
    </div>

    <!-- Users list -->
    <div v-if="status === 'pending'" class="text-center py-12 text-gray-500">Indlæser...</div>
    <template v-else>
      <!-- Mobile card layout -->
      <div class="md:hidden space-y-3">
        <div v-for="u in usersList" :key="u.id" class="bg-white rounded-lg shadow p-4">
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="font-medium text-gray-900">{{ u.name }}</div>
              <div class="text-sm text-gray-500">{{ u.email }}</div>
            </div>
            <span
              class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium shrink-0"
              :class="u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
            >
              {{ u.isActive ? 'Aktiv' : 'Inaktiv' }}
            </span>
          </div>
          <div class="mt-2 flex flex-wrap gap-1">
            <span
              v-for="role in u.roles"
              :key="role"
              class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
              :class="roleBadgeClass(role)"
            >
              {{ role }}
            </span>
          </div>
          <div class="mt-3 flex gap-3 text-sm">
            <button @click="openEditModal(u)" class="text-blue-600 hover:text-blue-800">Rediger</button>
            <button @click="handleDelete(u.id)" class="text-red-600 hover:text-red-800">Slet</button>
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
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roller</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Handlinger</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="u in usersList" :key="u.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{{ u.name }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ u.email }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  v-for="role in u.roles"
                  :key="role"
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mr-1"
                  :class="roleBadgeClass(role)"
                >
                  {{ role }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                  :class="u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                >
                  {{ u.isActive ? 'Aktiv' : 'Inaktiv' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                <button @click="openEditModal(u)" class="text-blue-600 hover:text-blue-800 mr-3">Rediger</button>
                <button @click="handleDelete(u.id)" class="text-red-600 hover:text-red-800">Slet</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- User modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h2 class="text-lg font-semibold mb-4">{{ editingUser ? 'Rediger bruger' : 'Opret bruger' }}</h2>
        <form @submit.prevent="handleSave" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Navn</label>
            <input
              v-model="form.name"
              required
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">E-mail</label>
            <input
              v-model="form.email"
              type="email"
              required
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">
              Adgangskode {{ editingUser ? '(lad stå tom for at beholde)' : '' }}
            </label>
            <input
              v-model="form.password"
              type="password"
              :required="!editingUser"
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Roller</label>
            <div class="space-y-2">
              <label v-for="role in availableRoles" :key="role.name" class="flex items-center gap-2">
                <input
                  type="checkbox"
                  :value="role.name"
                  v-model="form.roleNames"
                  class="rounded border-gray-300"
                />
                <span class="text-sm text-gray-700">{{ role.name }}</span>
                <span class="text-xs text-gray-400">{{ role.description }}</span>
              </label>
            </div>
          </div>
          <div v-if="editingUser" class="flex items-center gap-2">
            <input id="active" v-model="form.isActive" type="checkbox" class="rounded border-gray-300" />
            <label for="active" class="text-sm text-gray-700">Aktiv</label>
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
              {{ editingUser ? 'Gem' : 'Opret' }}
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

const showModal = ref(false)
const editingUser = ref<string | null>(null)
const formError = ref('')
const form = reactive({
  name: '',
  email: '',
  password: '',
  roleNames: [] as string[],
  isActive: true,
})

const { data: usersList, status, refresh } = useLazyFetch('/api/users')
const { data: availableRoles } = useLazyFetch('/api/roles')

function roleBadgeClass(role: string) {
  switch (role) {
    case 'admin': return 'bg-purple-100 text-purple-800'
    case 'write-board': return 'bg-blue-100 text-blue-800'
    case 'write-files': return 'bg-green-100 text-green-800'
    case 'read-files': return 'bg-gray-100 text-gray-800'
    case 'read-calendar': return 'bg-orange-100 text-orange-800'
    case 'write-calendar': return 'bg-yellow-100 text-yellow-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

function openCreateModal() {
  editingUser.value = null
  form.name = ''
  form.email = ''
  form.password = ''
  form.roleNames = ['read-files', 'read-calendar']
  form.isActive = true
  formError.value = ''
  showModal.value = true
}

function openEditModal(user: any) {
  editingUser.value = user.id
  form.name = user.name
  form.email = user.email
  form.password = ''
  form.roleNames = [...user.roles]
  form.isActive = user.isActive
  formError.value = ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingUser.value = null
}

async function handleSave() {
  formError.value = ''
  try {
    if (editingUser.value) {
      const body: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        roleNames: form.roleNames,
        isActive: form.isActive,
      }
      if (form.password) body.password = form.password
      await $fetch(`/api/users/${editingUser.value}`, { method: 'PUT', body })
    } else {
      await $fetch('/api/users', {
        method: 'POST',
        body: {
          name: form.name,
          email: form.email,
          password: form.password,
          roleNames: form.roleNames,
        },
      })
    }
    closeModal()
    await refresh()
  } catch (e: any) {
    formError.value = e.data?.message || 'Noget gik galt'
  }
}

async function handleDelete(id: string) {
  if (!confirm('Er du sikker på, at du vil slette denne bruger?')) return
  try {
    await $fetch(`/api/users/${id}`, { method: 'DELETE' })
    await refresh()
  } catch (e: any) {
    alert(e.data?.message || 'Kunne ikke slette brugeren')
  }
}
</script>
