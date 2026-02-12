<template>
  <div
    v-if="show && users.length"
    class="absolute z-50 mt-1 w-56 bg-white rounded-md shadow-lg border border-gray-200 py-1 max-h-48 overflow-y-auto"
    :style="positionStyle"
  >
    <button
      v-for="(user, i) in users"
      :key="user.id"
      type="button"
      class="w-full text-left px-3 py-1.5 text-sm"
      :class="i === activeIndex ? 'bg-blue-50 text-blue-800' : 'text-gray-700 hover:bg-gray-50'"
      @mousedown.prevent="$emit('select', user)"
    >
      @{{ user.name }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean
  users: { id: string; name: string }[]
  activeIndex: number
  positionStyle?: Record<string, string>
}>()

defineEmits<{
  (e: 'select', user: { id: string; name: string }): void
}>()
</script>
