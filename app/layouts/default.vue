<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16 items-center">
          <div class="flex items-center gap-8">
            <NuxtLink to="/" class="text-xl font-bold text-gray-900">
              {{ appName }}
            </NuxtLink>
            <nav class="hidden md:flex gap-6">
              <NuxtLink
                to="/board"
                class="text-sm font-medium text-gray-600 hover:text-gray-900"
                active-class="text-gray-900"
              >
                Opslagstavle
              </NuxtLink>
              <NuxtLink
                v-if="canReadFiles"
                to="/documents"
                class="text-sm font-medium text-gray-600 hover:text-gray-900"
                active-class="text-gray-900"
              >
                Dokumenter
              </NuxtLink>
              <NuxtLink
                v-if="canReadCalendar"
                to="/calendar"
                class="text-sm font-medium text-gray-600 hover:text-gray-900"
                active-class="text-gray-900"
              >
                Kalender
              </NuxtLink>
              <NuxtLink
                v-if="canReadUsers"
                to="/members"
                class="text-sm font-medium text-gray-600 hover:text-gray-900"
                active-class="text-gray-900"
              >
                Medlemmer
              </NuxtLink>
              <div v-if="isAdmin" class="relative">
                <button
                  @click="adminMenuOpen = !adminMenuOpen"
                  class="text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1"
                  :class="{ 'text-gray-900': $route.path.startsWith('/admin') }"
                >
                  Administration
                  <svg class="h-4 w-4 transition-transform" :class="{ 'rotate-180': adminMenuOpen }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div v-if="adminMenuOpen" class="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                  <NuxtLink
                    to="/admin/users"
                    class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    @click="adminMenuOpen = false"
                  >
                    Brugere
                  </NuxtLink>
                  <NuxtLink
                    to="/admin/categories"
                    class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    @click="adminMenuOpen = false"
                  >
                    Kategorier
                  </NuxtLink>
                  <NuxtLink
                    to="/admin/audit"
                    class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    @click="adminMenuOpen = false"
                  >
                    Revisionslog
                  </NuxtLink>
                </div>
              </div>
            </nav>
          </div>
          <div class="hidden md:flex items-center gap-4">
            <NuxtLink to="/settings" class="text-sm text-gray-600 hover:text-gray-900">
              {{ user?.name }}
            </NuxtLink>
            <button
              @click="logout"
              class="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Log ud
            </button>
          </div>
          <!-- Mobile hamburger -->
          <button
            class="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            @click="mobileMenuOpen = !mobileMenuOpen"
          >
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path v-if="!mobileMenuOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <!-- Mobile menu -->
      <div v-if="mobileMenuOpen" class="md:hidden border-t border-gray-200 bg-white">
        <nav class="px-4 py-3 space-y-2">
          <NuxtLink
            to="/board"
            class="block px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            active-class="text-gray-900 bg-gray-50"
            @click="mobileMenuOpen = false"
          >
            Opslagstavle
          </NuxtLink>
          <NuxtLink
            v-if="canReadFiles"
            to="/documents"
            class="block px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            active-class="text-gray-900 bg-gray-50"
            @click="mobileMenuOpen = false"
          >
            Dokumenter
          </NuxtLink>
          <NuxtLink
            v-if="canReadCalendar"
            to="/calendar"
            class="block px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            active-class="text-gray-900 bg-gray-50"
            @click="mobileMenuOpen = false"
          >
            Kalender
          </NuxtLink>
          <NuxtLink
            v-if="canReadUsers"
            to="/members"
            class="block px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            active-class="text-gray-900 bg-gray-50"
            @click="mobileMenuOpen = false"
          >
            Medlemmer
          </NuxtLink>
          <template v-if="isAdmin">
            <div class="px-3 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase">Administration</div>
            <NuxtLink
              to="/admin/users"
              class="block px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              active-class="text-gray-900 bg-gray-50"
              @click="mobileMenuOpen = false"
            >
              Brugere
            </NuxtLink>
            <NuxtLink
              to="/admin/categories"
              class="block px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              active-class="text-gray-900 bg-gray-50"
              @click="mobileMenuOpen = false"
            >
              Kategorier
            </NuxtLink>
            <NuxtLink
              to="/admin/audit"
              class="block px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              active-class="text-gray-900 bg-gray-50"
              @click="mobileMenuOpen = false"
            >
              Revisionslog
            </NuxtLink>
          </template>
        </nav>
        <div class="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
          <NuxtLink
            to="/settings"
            class="text-sm text-gray-600 hover:text-gray-900"
            @click="mobileMenuOpen = false"
          >
            {{ user?.name }}
          </NuxtLink>
          <button
            @click="logout"
            class="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Log ud
          </button>
        </div>
      </div>
    </header>
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <slot />
    </main>
    <PasskeySetupPrompt />
  </div>
</template>

<script setup lang="ts">
const { user, logout } = useAuth()
const { canReadFiles, canReadCalendar, canReadUsers, isAdmin } = useRoles()
const appName = useRuntimeConfig().public.appName
const mobileMenuOpen = ref(false)
const adminMenuOpen = ref(false)

const route = useRoute()
watch(() => route.path, () => {
  adminMenuOpen.value = false
})

onMounted(() => {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (!target.closest('.relative')) {
      adminMenuOpen.value = false
    }
  })
})
</script>
