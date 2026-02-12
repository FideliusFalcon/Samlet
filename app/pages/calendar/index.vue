<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Kalender</h1>
      <div class="flex items-center gap-3">
        <!-- View toggle -->
        <div class="flex rounded-md shadow-sm">
          <button
            @click="activeView = 'calendar'"
            class="px-3 py-1.5 text-sm font-medium border"
            :class="activeView === 'calendar'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'"
          >
            Kalender
          </button>
          <button
            @click="activeView = 'list'"
            class="px-3 py-1.5 text-sm font-medium border border-l-0"
            :class="activeView === 'list'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'"
          >
            Liste
          </button>
        </div>
        <button
          v-if="canWriteCalendar"
          @click="openCreateModal"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          Ny begivenhed
        </button>
      </div>
    </div>

    <!-- ICS subscription -->
    <div class="mb-6">
      <button
        @click="toggleIcsPanel"
        class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        Abonnér på kalender
        <svg class="h-3 w-3 transition-transform" :class="{ 'rotate-180': showIcsPanel }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div v-if="showIcsPanel" class="mt-3 p-4 bg-white border border-gray-200 rounded-lg space-y-3">
        <p class="text-sm text-gray-600">
          Abonnér på kalenderen i din kalenderapp. Begivenheder synkroniseres automatisk.
        </p>
        <div v-if="icsUrl" class="flex gap-2">
          <input
            type="text"
            readonly
            :value="icsUrl"
            class="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 bg-gray-50"
            @focus="($event.target as HTMLInputElement).select()"
          />
          <button
            @click="copyIcsUrl"
            class="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium whitespace-nowrap"
          >
            {{ icsCopied ? 'Kopieret!' : 'Kopiér' }}
          </button>
        </div>
        <div v-else class="text-sm text-gray-400">Indlæser...</div>
        <div class="text-xs text-gray-500 space-y-1">
          <p><strong>Google Calendar:</strong> Indstillinger → Tilføj kalender → Fra URL → Indsæt link</p>
          <p><strong>Apple Calendar:</strong> Arkiv → Nyt kalenderabonnement → Indsæt link</p>
          <p><strong>Outlook:</strong> Tilføj kalender → Abonnér fra internettet → Indsæt link</p>
        </div>
        <p class="text-xs text-amber-600">
          Dette link er personligt — del det ikke med andre.
        </p>
      </div>
    </div>

    <!-- Deep link error -->
    <div v-if="deepLinkError" class="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-sm text-amber-800">
      <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      {{ deepLinkError }}
      <button @click="deepLinkError = ''" class="ml-auto text-amber-600 hover:text-amber-800">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="status === 'pending'" class="text-center py-12 text-gray-500">Indlæser...</div>

    <template v-else>
      <!-- Calendar grid view -->
      <CalendarGrid
        v-if="activeView === 'calendar'"
        :events="events || []"
        :current-month="currentMonth"
        @prev-month="prevMonth"
        @next-month="nextMonth"
        @select-event="openDetailModal"
      />

      <!-- List view -->
      <div v-else>
        <!-- Month nav for list view -->
        <div class="flex items-center justify-between mb-4">
          <button @click="prevMonth" class="p-1 hover:bg-gray-100 rounded">
            <svg class="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 class="text-lg font-semibold text-gray-900 capitalize">
            {{ currentMonth.toLocaleDateString('da-DK', { month: 'long', year: 'numeric' }) }}
          </h2>
          <button @click="nextMonth" class="p-1 hover:bg-gray-100 rounded">
            <svg class="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div v-if="!events?.length" class="text-center py-12 text-gray-500">
          Ingen begivenheder denne måned.
        </div>
        <div v-else class="space-y-4">
          <div v-for="ev in sortedEvents" :key="ev.id" class="bg-white rounded-lg shadow p-6">
            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div class="flex-1 min-w-0">
                <h2
                  class="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
                  @click="openDetailModal(ev)"
                >
                  {{ ev.title }}
                </h2>
                <p class="text-sm text-gray-500 mt-1">
                  {{ formatEventDate(ev) }}
                  <span v-if="ev.location"> &middot; {{ ev.location }}</span>
                </p>
                <p v-if="ev.description" class="mt-2 text-gray-700 text-sm">{{ ev.description }}</p>
                <div class="mt-3 flex items-center gap-4 text-sm">
                  <span class="text-green-600">{{ ev.acceptedCount || 0 }} deltager</span>
                  <span class="text-red-600">{{ ev.declinedCount || 0 }} afbud</span>
                  <span v-if="ev.currentUserStatus === 'accepted'" class="font-medium text-green-700">Du deltager</span>
                  <span v-else-if="ev.currentUserStatus === 'declined'" class="font-medium text-red-700">Du har afbudt</span>
                </div>
              </div>
              <div v-if="!isEventPast(ev)" class="flex gap-2 shrink-0">
                <button
                  @click="handleRespond(ev.id, 'accepted')"
                  class="px-3 py-1.5 text-sm font-medium rounded-md border"
                  :class="ev.currentUserStatus === 'accepted'
                    ? 'bg-green-100 text-green-800 border-green-300'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'"
                >
                  Deltag
                </button>
                <button
                  @click="handleRespond(ev.id, 'declined')"
                  class="px-3 py-1.5 text-sm font-medium rounded-md border"
                  :class="ev.currentUserStatus === 'declined'
                    ? 'bg-red-100 text-red-800 border-red-300'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'"
                >
                  Afbud
                </button>
              </div>
              <span v-else class="text-xs text-gray-400 italic shrink-0">Afholdt</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Event detail modal -->
    <div v-if="selectedEvent" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="selectedEvent = null">
      <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-start mb-4">
          <h2 class="text-xl font-bold text-gray-900">{{ selectedEvent.title }}</h2>
          <button @click="selectedEvent = null" class="text-gray-400 hover:text-gray-600">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="space-y-3 text-sm">
          <div class="flex items-center gap-2 text-gray-600">
            <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {{ formatEventDate(selectedEvent) }}
          </div>
          <div v-if="selectedEvent.location" class="flex items-center gap-2 text-gray-600">
            <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {{ selectedEvent.location }}
          </div>
          <div v-if="selectedEvent.createdByName" class="flex items-center gap-2 text-gray-600">
            <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Oprettet af {{ selectedEvent.createdByName }}
          </div>
        </div>

        <p v-if="selectedEvent.description" class="mt-4 text-gray-700 text-sm whitespace-pre-line">{{ selectedEvent.description }}</p>

        <!-- Response buttons -->
        <div v-if="!isEventPast(selectedEvent)" class="mt-6 flex gap-3">
          <button
            @click="handleRespond(selectedEvent!.id, 'accepted')"
            class="flex-1 py-2 px-4 text-sm font-medium rounded-md border"
            :class="selectedEvent.currentUserStatus === 'accepted'
              ? 'bg-green-100 text-green-800 border-green-300'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'"
          >
            Deltag ({{ selectedEvent.acceptedCount || 0 }})
          </button>
          <button
            @click="handleRespond(selectedEvent!.id, 'declined')"
            class="flex-1 py-2 px-4 text-sm font-medium rounded-md border"
            :class="selectedEvent.currentUserStatus === 'declined'
              ? 'bg-red-100 text-red-800 border-red-300'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'"
          >
            Afbud ({{ selectedEvent.declinedCount || 0 }})
          </button>
        </div>
        <div v-else class="mt-6 text-sm text-gray-400 italic">Denne begivenhed er afholdt.</div>

        <!-- Attendee list -->
        <div v-if="attendees" class="mt-4">
          <button
            @click="showAttendees = !showAttendees"
            class="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {{ showAttendees ? 'Skjul deltagere' : 'Vis deltagere' }}
          </button>
          <div v-if="showAttendees" class="mt-2 space-y-1">
            <div v-for="a in attendees" :key="a.userId" class="flex items-center justify-between text-sm py-1">
              <span class="text-gray-900">{{ a.userName }}</span>
              <span
                class="text-xs font-medium px-2 py-0.5 rounded"
                :class="a.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
              >
                {{ a.status === 'accepted' ? 'Deltager' : 'Afbud' }}
              </span>
            </div>
            <div v-if="attendees.length === 0" class="text-sm text-gray-500">Ingen svar endnu.</div>
          </div>
        </div>

        <!-- Linked documents (read-only) -->
        <div v-if="linkedDocs && linkedDocs.length" class="mt-4 pt-4 border-t">
          <h3 class="text-sm font-medium text-gray-700 mb-2">Dokumenter</h3>
          <div class="space-y-1">
            <div v-for="d in linkedDocs" :key="d.id" class="text-sm py-1">
              <NuxtLink :to="`/documents/${d.id}`" class="text-blue-600 hover:text-blue-800 truncate">
                {{ d.title }}
              </NuxtLink>
            </div>
          </div>
        </div>

        <!-- Edit/Delete buttons -->
        <div v-if="canWriteCalendar" class="mt-6 pt-4 border-t flex gap-3">
          <button
            @click="openEditModal(selectedEvent!)"
            class="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            Rediger
          </button>
          <button
            v-if="isAdmin"
            @click="handleDelete(selectedEvent!.id)"
            class="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800"
          >
            Slet
          </button>
        </div>
      </div>
    </div>

    <!-- Create/Edit modal -->
    <div v-if="showFormModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="showFormModal = false">
      <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">
          {{ editingEventId ? 'Rediger begivenhed' : 'Ny begivenhed' }}
        </h2>

        <form @submit.prevent="handleSave" class="space-y-4">
          <div>
            <label for="event-title" class="block text-sm font-medium text-gray-700 mb-1">Titel</label>
            <input
              id="event-title"
              v-model="form.title"
              type="text"
              required
              class="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label for="event-description" class="block text-sm font-medium text-gray-700 mb-1">Beskrivelse</label>
            <textarea
              id="event-description"
              v-model="form.description"
              rows="3"
              class="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label for="event-location" class="block text-sm font-medium text-gray-700 mb-1">Sted</label>
            <input
              id="event-location"
              v-model="form.location"
              type="text"
              class="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div class="flex items-center gap-2">
            <input
              id="event-allday"
              v-model="form.allDay"
              type="checkbox"
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label for="event-allday" class="text-sm font-medium text-gray-700">Heldagsbegivenhed</label>
          </div>

          <div v-if="form.allDay" class="grid grid-cols-2 gap-4">
            <div>
              <label for="event-start-date" class="block text-sm font-medium text-gray-700 mb-1">Startdato</label>
              <input
                id="event-start-date"
                v-model="form.startDate"
                type="date"
                required
                class="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label for="event-end-date" class="block text-sm font-medium text-gray-700 mb-1">Slutdato</label>
              <input
                id="event-end-date"
                v-model="form.endDate"
                type="date"
                required
                class="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <template v-else>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="event-start-date2" class="block text-sm font-medium text-gray-700 mb-1">Startdato</label>
                <input
                  id="event-start-date2"
                  v-model="form.startDate"
                  type="date"
                  required
                  class="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label for="event-start-time" class="block text-sm font-medium text-gray-700 mb-1">Starttid</label>
                <select
                  id="event-start-time"
                  v-model="form.startTime"
                  required
                  class="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="" disabled>Vælg tid</option>
                  <option v-for="t in timeOptions" :key="'s-'+t" :value="t">{{ t }}</option>
                </select>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="event-end-date2" class="block text-sm font-medium text-gray-700 mb-1">Slutdato</label>
                <input
                  id="event-end-date2"
                  v-model="form.endDate"
                  type="date"
                  required
                  class="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label for="event-end-time" class="block text-sm font-medium text-gray-700 mb-1">Sluttid</label>
                <select
                  id="event-end-time"
                  v-model="form.endTime"
                  required
                  class="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="" disabled>Vælg tid</option>
                  <option v-for="t in timeOptions" :key="'e-'+t" :value="t">{{ t }}</option>
                </select>
              </div>
            </div>
          </template>

          <!-- Link documents -->
          <div v-if="canReadFiles">
            <label class="block text-sm font-medium text-gray-700 mb-1">Dokumenter</label>
            <div v-if="formDocIds.length" class="space-y-1 mb-2">
              <div v-for="docId in formDocIds" :key="docId" class="flex items-center justify-between text-sm py-1 px-2 bg-gray-50 rounded">
                <span class="truncate">{{ formDocLabel(docId) }}</span>
                <button type="button" @click="formDocIds = formDocIds.filter(id => id !== docId)" class="text-gray-400 hover:text-red-600 shrink-0 ml-2">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div class="flex gap-2">
              <select
                v-model="formDocPick"
                class="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Vælg dokument...</option>
                <option
                  v-for="d in formAvailableDocs"
                  :key="d.id"
                  :value="d.id"
                >{{ d.title }}</option>
              </select>
              <button
                type="button"
                @click="addFormDoc"
                :disabled="!formDocPick"
                class="px-3 py-1 text-sm font-medium text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                Tilføj
              </button>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <input
              id="skip-notification"
              v-model="form.skipNotification"
              type="checkbox"
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label for="skip-notification" class="text-sm text-gray-700">Undlad at sende notifikation</label>
          </div>

          <p v-if="formError" class="text-sm text-red-600">{{ formError }}</p>

          <div class="flex justify-end gap-3 pt-2">
            <button
              type="button"
              @click="showFormModal = false"
              class="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Annuller
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
            >
              {{ saving ? 'Gemmer...' : 'Gem' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CalendarEvent, EventResponse, LinkedDocument } from '~~/shared/types'

definePageMeta({
  middleware: () => {
    const { canReadCalendar } = useRoles()
    if (!canReadCalendar.value) return navigateTo('/')
  },
})

const route = useRoute()
const router = useRouter()
const { canWriteCalendar, canReadFiles, canWriteFiles, isAdmin } = useRoles()

// ICS subscription
const showIcsPanel = ref(false)
const icsUrl = ref('')
const icsCopied = ref(false)

async function toggleIcsPanel() {
  showIcsPanel.value = !showIcsPanel.value
  if (showIcsPanel.value && !icsUrl.value) {
    try {
      const data = await $fetch<{ url: string }>('/api/calendar/ics-token')
      icsUrl.value = data.url
    } catch {
      icsUrl.value = ''
    }
  }
}

async function copyIcsUrl() {
  await navigator.clipboard.writeText(icsUrl.value)
  icsCopied.value = true
  setTimeout(() => { icsCopied.value = false }, 2000)
}

const activeView = ref<'calendar' | 'list'>('calendar')
const currentMonth = ref(new Date())

const monthParam = computed(() => {
  const d = currentMonth.value
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
})

const { data: events, status, refresh } = useLazyFetch<CalendarEvent[]>('/api/calendar', {
  query: computed(() => ({ month: monthParam.value })),
})

const sortedEvents = computed(() => {
  if (!events.value) return []
  return [...events.value].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
})

function isEventPast(ev: CalendarEvent): boolean {
  return new Date(ev.endDate) < new Date()
}

// Deep link: ?event=<id>&month=YYYY-MM opens the detail modal
const pendingEventId = ref<string | null>(null)
const deepLinkError = ref('')

onMounted(() => {
  const eventId = route.query.event as string | undefined
  const monthQuery = route.query.month as string | undefined
  if (eventId) {
    if (monthQuery && /^\d{4}-\d{2}$/.test(monthQuery)) {
      const [y, m] = monthQuery.split('-').map(Number)
      currentMonth.value = new Date(y, m - 1, 1)
    }
    pendingEventId.value = eventId
    // Don't clear URL here — openDetailModal will set the correct deep link URL
  }
})

watch([events, pendingEventId], async ([evts, eid]) => {
  if (!eid) return
  // Wait for events to load
  if (evts === null) return

  const ev = evts.find(e => e.id === eid)
  if (ev) {
    pendingEventId.value = null
    nextTick(() => openDetailModal(ev))
    return
  }

  // Event not in current month — fetch it directly to find its month or confirm deletion
  try {
    const fetched = await $fetch<{ id: string; startDate: string }>(`/api/calendar/${eid}`)
    // Switch to the event's month and let the watch fire again when events reload
    const start = new Date(fetched.startDate)
    const pad = (n: number) => String(n).padStart(2, '0')
    const eventMonth = `${start.getFullYear()}-${pad(start.getMonth() + 1)}`
    if (eventMonth !== monthParam.value) {
      currentMonth.value = new Date(start.getFullYear(), start.getMonth(), 1)
      // pendingEventId stays set — watch will fire again when events reload for the new month
    }
  } catch {
    pendingEventId.value = null
    router.replace({ query: {} })
    deepLinkError.value = 'Begivenheden blev ikke fundet. Den er muligvis blevet slettet.'
    setTimeout(() => { deepLinkError.value = '' }, 6000)
  }
})

function prevMonth() {
  const d = new Date(currentMonth.value)
  d.setMonth(d.getMonth() - 1)
  currentMonth.value = d
}

function nextMonth() {
  const d = new Date(currentMonth.value)
  d.setMonth(d.getMonth() + 1)
  currentMonth.value = d
}

// Event detail
const selectedEvent = ref<CalendarEvent | null>(null)
const showAttendees = ref(false)
const attendees = ref<EventResponse[] | null>(null)

// Linked documents
const linkedDocs = ref<LinkedDocument[] | null>(null)
const allDocs = ref<{ id: string; title: string }[] | null>(null)
const linkDocId = ref('')

const availableDocs = computed(() => {
  if (!allDocs.value || !linkedDocs.value) return []
  const linkedIds = new Set(linkedDocs.value.map(d => d.id))
  return allDocs.value.filter(d => !linkedIds.has(d.id))
})

async function fetchLinkedDocs(eventId: string) {
  linkedDocs.value = null
  try {
    linkedDocs.value = await $fetch<LinkedDocument[]>(`/api/calendar/${eventId}/documents`)
  } catch {
    linkedDocs.value = []
  }
}

async function linkDocument() {
  if (!selectedEvent.value || !linkDocId.value) return
  await $fetch(`/api/calendar/${selectedEvent.value.id}/documents`, {
    method: 'POST',
    body: { documentId: linkDocId.value },
  })
  linkDocId.value = ''
  await fetchLinkedDocs(selectedEvent.value.id)
}

async function unlinkDocument(documentId: string) {
  if (!selectedEvent.value) return
  await $fetch(`/api/calendar/${selectedEvent.value.id}/documents`, {
    method: 'DELETE',
    body: { documentId },
  })
  await fetchLinkedDocs(selectedEvent.value.id)
}

async function openDetailModal(ev: CalendarEvent) {
  selectedEvent.value = ev
  showAttendees.value = false
  attendees.value = null
  linkedDocs.value = null
  linkDocId.value = ''

  // Update URL to deep link
  router.replace({ query: { event: ev.id, month: monthParam.value } })

  try {
    attendees.value = await $fetch<EventResponse[]>(`/api/calendar/${ev.id}/responses`)
  } catch {
    attendees.value = []
  }
  await fetchLinkedDocs(ev.id)

  // Load document list for the picker if user can write
  if (canWriteCalendar.value) {
    loadAllDocsIfNeeded()
  }
}

// Clear URL when modal closes
watch(selectedEvent, (ev) => {
  if (!ev) {
    router.replace({ query: {} })
  }
})

// Respond
async function handleRespond(eventId: string, responseStatus: 'accepted' | 'declined') {
  await $fetch(`/api/calendar/${eventId}/respond`, {
    method: 'POST',
    body: { status: responseStatus },
  })
  await refresh()
  // Update selected event if open
  if (selectedEvent.value?.id === eventId) {
    const updated = events.value?.find(e => e.id === eventId)
    if (updated) selectedEvent.value = updated
    try {
      attendees.value = await $fetch<EventResponse[]>(`/api/calendar/${eventId}/responses`)
    } catch { /* ignore */ }
  }
}

// Time options for dropdown (15-minute intervals)
const timeOptions = computed(() => {
  const opts: string[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return opts
})

function roundToQuarter(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const rounded = Math.round(m / 15) * 15
  const adjustedH = rounded === 60 ? h + 1 : h
  const adjustedM = rounded === 60 ? 0 : rounded
  return `${String(adjustedH % 24).padStart(2, '0')}:${String(adjustedM).padStart(2, '0')}`
}

// Form
const showFormModal = ref(false)
const editingEventId = ref<string | null>(null)
const saving = ref(false)
const formError = ref('')
const form = reactive({
  title: '',
  description: '',
  location: '',
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
  allDay: false,
  skipNotification: false,
})

// Document linking in create/edit form
const formDocIds = ref<string[]>([])
const formDocPick = ref('')

const formAvailableDocs = computed(() => {
  if (!allDocs.value) return []
  const selected = new Set(formDocIds.value)
  return allDocs.value.filter(d => !selected.has(d.id))
})

function formDocLabel(docId: string): string {
  return allDocs.value?.find(d => d.id === docId)?.title || docId
}

function addFormDoc() {
  if (formDocPick.value && !formDocIds.value.includes(formDocPick.value)) {
    formDocIds.value.push(formDocPick.value)
  }
  formDocPick.value = ''
}

async function loadAllDocsIfNeeded() {
  if (canReadFiles.value && !allDocs.value) {
    try {
      allDocs.value = await $fetch<{ id: string; title: string }[]>('/api/documents')
    } catch {
      allDocs.value = []
    }
  }
}

function openCreateModal() {
  editingEventId.value = null
  form.title = ''
  form.description = ''
  form.location = ''
  form.startDate = ''
  form.startTime = ''
  form.endDate = ''
  form.endTime = ''
  form.allDay = false
  form.skipNotification = false
  formError.value = ''
  formDocIds.value = []
  formDocPick.value = ''
  showFormModal.value = true
  loadAllDocsIfNeeded()
}

// Auto-set end date/time to start + 2 hours when start changes
watch([() => form.startDate, () => form.startTime], ([date, time]) => {
  if (!date) return
  if (form.allDay) {
    if (!form.endDate) form.endDate = date
    return
  }
  if (!time) return
  const start = new Date(`${date}T${time}`)
  if (isNaN(start.getTime())) return
  const end = new Date(start.getTime() + 2 * 60 * 60_000)
  const pad = (n: number) => String(n).padStart(2, '0')
  form.endDate = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`
  form.endTime = `${pad(end.getHours())}:${pad(end.getMinutes())}`
})

async function openEditModal(ev: CalendarEvent) {
  editingEventId.value = ev.id
  form.title = ev.title
  form.description = ev.description || ''
  form.location = ev.location || ''
  form.allDay = ev.allDay

  const pad = (n: number) => String(n).padStart(2, '0')
  const start = new Date(ev.startDate)
  const end = new Date(ev.endDate)

  form.startDate = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`
  form.endDate = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`

  if (ev.allDay) {
    form.startTime = ''
    form.endTime = ''
  } else {
    form.startTime = roundToQuarter(`${pad(start.getHours())}:${pad(start.getMinutes())}`)
    form.endTime = roundToQuarter(`${pad(end.getHours())}:${pad(end.getMinutes())}`)
  }

  formError.value = ''
  form.skipNotification = false
  formDocPick.value = ''
  selectedEvent.value = null
  showFormModal.value = true

  // Load current linked docs for this event
  loadAllDocsIfNeeded()
  try {
    const linked = await $fetch<LinkedDocument[]>(`/api/calendar/${ev.id}/documents`)
    formDocIds.value = linked.map(d => d.id)
  } catch {
    formDocIds.value = []
  }
}

async function handleSave() {
  formError.value = ''
  saving.value = true

  try {
    let startDate: string
    let endDate: string

    if (form.allDay) {
      startDate = new Date(form.startDate + 'T00:00:00').toISOString()
      endDate = new Date(form.endDate + 'T23:59:59').toISOString()
    } else {
      startDate = new Date(`${form.startDate}T${form.startTime}`).toISOString()
      endDate = new Date(`${form.endDate}T${form.endTime}`).toISOString()
    }

    if (new Date(startDate) >= new Date(endDate)) {
      formError.value = 'Sluttidspunkt skal være efter starttidspunkt'
      saving.value = false
      return
    }

    const body = {
      title: form.title,
      description: form.description || null,
      location: form.location || null,
      startDate,
      endDate,
      allDay: form.allDay,
      skipNotification: form.skipNotification,
    }

    let eventId: string

    if (editingEventId.value) {
      await $fetch(`/api/calendar/${editingEventId.value}`, {
        method: 'PUT',
        body,
      })
      eventId = editingEventId.value
    } else {
      const created = await $fetch<{ id: string }>('/api/calendar', {
        method: 'POST',
        body,
      })
      eventId = created.id
    }

    // Sync document links
    if (canReadFiles.value && eventId) {
      try {
        const currentLinked = await $fetch<LinkedDocument[]>(`/api/calendar/${eventId}/documents`).catch(() => [])
        const currentIds = new Set(currentLinked.map(d => d.id))
        const wantedIds = new Set(formDocIds.value)

        // Unlink removed docs
        for (const id of currentIds) {
          if (!wantedIds.has(id)) {
            await $fetch(`/api/calendar/${eventId}/documents`, { method: 'DELETE', body: { documentId: id } }).catch(() => {})
          }
        }
        // Link new docs
        for (const id of wantedIds) {
          if (!currentIds.has(id)) {
            await $fetch(`/api/calendar/${eventId}/documents`, { method: 'POST', body: { documentId: id } }).catch(() => {})
          }
        }
      } catch { /* ignore */ }
    }

    showFormModal.value = false
    await refresh()
  } catch (e: any) {
    formError.value = e.data?.message || 'Noget gik galt'
  } finally {
    saving.value = false
  }
}

async function handleDelete(eventId: string) {
  if (!confirm('Er du sikker på, at du vil slette denne begivenhed?')) return

  await $fetch(`/api/calendar/${eventId}`, { method: 'DELETE' })
  selectedEvent.value = null
  await refresh()
}

function formatEventDate(ev: CalendarEvent): string {
  const start = new Date(ev.startDate)
  const end = new Date(ev.endDate)

  if (ev.allDay) {
    const startStr = start.toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' })
    const endDate = new Date(end)
    // For all-day events, end is stored as 23:59:59 so compare dates
    const sameDay = start.getFullYear() === endDate.getFullYear()
      && start.getMonth() === endDate.getMonth()
      && start.getDate() === endDate.getDate()
    if (sameDay) return startStr
    const endStr = endDate.toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' })
    return `${startStr} – ${endStr}`
  }

  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }
  const startStr = start.toLocaleDateString('da-DK', opts)
  const sameDay = start.toDateString() === end.toDateString()
  if (sameDay) {
    const endTime = end.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })
    return `${startStr} – ${endTime}`
  }
  const endStr = end.toLocaleDateString('da-DK', opts)
  return `${startStr} – ${endStr}`
}
</script>
