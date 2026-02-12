<template>
  <div class="bg-white rounded-lg shadow">
    <!-- Month header with nav arrows -->
    <div class="flex items-center justify-between px-4 py-3 border-b">
      <button @click="$emit('prev-month')" class="p-1 hover:bg-gray-100 rounded">
        <svg class="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h2 class="text-lg font-semibold text-gray-900 capitalize">
        {{ monthLabel }}
      </h2>
      <button @click="$emit('next-month')" class="p-1 hover:bg-gray-100 rounded">
        <svg class="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>

    <!-- Day headers -->
    <div class="grid grid-cols-7 border-b">
      <div
        v-for="day in weekDays"
        :key="day"
        class="px-2 py-2 text-xs font-medium text-gray-500 text-center"
      >
        {{ day }}
      </div>
    </div>

    <!-- Calendar cells -->
    <div class="grid grid-cols-7">
      <div
        v-for="(cell, i) in calendarCells"
        :key="i"
        class="min-h-[80px] border-b border-r p-1 text-sm"
        :class="{
          'bg-gray-50 text-gray-400': !cell.isCurrentMonth,
          'bg-blue-50': cell.isToday,
        }"
      >
        <div class="font-medium text-xs mb-1" :class="cell.isToday ? 'text-blue-700' : ''">
          {{ cell.day }}
        </div>
        <div
          v-for="ev in cell.events"
          :key="ev.id"
          @click="$emit('select-event', ev)"
          class="text-xs truncate px-1 py-0.5 rounded mb-0.5 cursor-pointer bg-blue-100 text-blue-800 hover:bg-blue-200"
        >
          {{ ev.title }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CalendarEvent } from '~~/shared/types'

const props = defineProps<{
  events: CalendarEvent[]
  currentMonth: Date
}>()

defineEmits<{
  'prev-month': []
  'next-month': []
  'select-event': [event: CalendarEvent]
}>()

const weekDays = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn']

const monthLabel = computed(() => {
  return props.currentMonth.toLocaleDateString('da-DK', { month: 'long', year: 'numeric' })
})

interface CalendarCell {
  day: number
  isCurrentMonth: boolean
  isToday: boolean
  date: Date
  events: CalendarEvent[]
}

const calendarCells = computed((): CalendarCell[] => {
  const year = props.currentMonth.getFullYear()
  const month = props.currentMonth.getMonth()
  const today = new Date()

  const firstDay = new Date(year, month, 1)
  // Monday = 0, Sunday = 6
  let startOffset = firstDay.getDay() - 1
  if (startOffset < 0) startOffset = 6

  const cells: CalendarCell[] = []

  // Fill 42 cells (6 rows)
  for (let i = 0; i < 42; i++) {
    const date = new Date(year, month, 1 - startOffset + i)
    const isCurrentMonth = date.getMonth() === month && date.getFullYear() === year
    const isToday = date.getDate() === today.getDate()
      && date.getMonth() === today.getMonth()
      && date.getFullYear() === today.getFullYear()

    const cellEvents = props.events.filter(ev => {
      const start = new Date(ev.startDate)
      const end = new Date(ev.endDate)
      // Check if the event overlaps this day
      const cellStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const cellEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
      return start <= cellEnd && end >= cellStart
    })

    cells.push({
      day: date.getDate(),
      isCurrentMonth,
      isToday,
      date,
      events: cellEvents,
    })
  }

  return cells
})
</script>
