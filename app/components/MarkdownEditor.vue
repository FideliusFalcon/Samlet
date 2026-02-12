<template>
  <div class="rounded-md border border-gray-300 overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
    <!-- Tab bar + toolbar -->
    <div class="flex items-center bg-gray-50 border-b border-gray-200 px-2 py-1">
      <div class="flex gap-1 mr-3">
        <button
          type="button"
          @click="previewMode = false"
          class="px-2.5 py-1 text-xs font-medium rounded"
          :class="!previewMode ? 'bg-white shadow-sm text-gray-900 border border-gray-200' : 'text-gray-500 hover:text-gray-700'"
        >
          Skriv
        </button>
        <button
          type="button"
          @click="previewMode = true"
          class="px-2.5 py-1 text-xs font-medium rounded"
          :class="previewMode ? 'bg-white shadow-sm text-gray-900 border border-gray-200' : 'text-gray-500 hover:text-gray-700'"
        >
          Eksempel
        </button>
      </div>

      <div v-if="!previewMode" class="flex items-center gap-0.5 ml-auto">
        <button
          type="button"
          @click="insertHeading"
          title="Overskrift"
          class="p-1.5 rounded text-gray-500 hover:bg-gray-200 hover:text-gray-900"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M4 4v16M20 4v16M4 12h16" />
          </svg>
        </button>
        <button
          type="button"
          @click="toggleBold"
          :title="`Fed (${modKey}+B)`"
          class="p-1.5 rounded text-gray-500 hover:bg-gray-200 hover:text-gray-900 text-sm font-bold"
        >
          B
        </button>
        <button
          type="button"
          @click="toggleItalic"
          :title="`Kursiv (${modKey}+I)`"
          class="p-1.5 rounded text-gray-500 hover:bg-gray-200 hover:text-gray-900 text-sm italic"
        >
          I
        </button>

        <div class="w-px h-4 bg-gray-300 mx-0.5" />

        <button
          type="button"
          @click="insertLink"
          title="Link"
          class="p-1.5 rounded text-gray-500 hover:bg-gray-200 hover:text-gray-900"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
          </svg>
        </button>
        <button
          type="button"
          @click="insertList"
          title="Liste"
          class="p-1.5 rounded text-gray-500 hover:bg-gray-200 hover:text-gray-900"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round">
            <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
          </svg>
        </button>
        <button
          type="button"
          @click="insertChecklist"
          title="Tjekliste"
          class="p-1.5 rounded text-gray-500 hover:bg-gray-200 hover:text-gray-900"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <path d="M14 6h7M14 18h7" />
            <path d="M3 17l2 2 4-4" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Textarea (write mode) -->
    <textarea
      v-show="!previewMode"
      ref="textarea"
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      @keydown="handleKeydown"
      :rows="rows"
      :required="required"
      class="block w-full px-3 py-2 border-0 focus:outline-none focus:ring-0 resize-y"
      :placeholder="placeholder"
    />

    <!-- Preview (preview mode) -->
    <div
      v-if="previewMode"
      class="markdown-content px-3 py-2"
      :style="{ minHeight: `${(rows || 6) * 1.5 + 1}rem` }"
      v-html="previewHtml"
    />
  </div>
</template>

<script setup lang="ts">
import { renderMarkdown } from '~~/shared/utils/markdown'

const props = withDefaults(defineProps<{
  rows?: number
  required?: boolean
  placeholder?: string
}>(), {
  rows: 6,
  required: false,
  placeholder: '',
})

const modelValue = defineModel<string>({ required: true })

const textarea = ref<HTMLTextAreaElement | null>(null)
const previewMode = ref(false)
const modKey = import.meta.client && navigator?.userAgent?.includes('Mac') ? '⌘' : 'Ctrl'

const previewHtml = computed(() => {
  if (!previewMode.value || !modelValue.value) return '<p class="text-gray-400">Intet indhold at vise.</p>'
  return renderMarkdown(modelValue.value)
})

function handleKeydown(e: KeyboardEvent) {
  const mod = e.metaKey || e.ctrlKey
  if (mod && e.key === 'b') {
    e.preventDefault()
    toggleBold()
  } else if (mod && e.key === 'i') {
    e.preventDefault()
    toggleItalic()
  }
}

function wrapSelection(before: string, after: string, placeholder: string) {
  const ta = textarea.value
  if (!ta) return

  const start = ta.selectionStart
  const end = ta.selectionEnd
  const text = modelValue.value || ''
  const selected = text.slice(start, end)

  if (selected) {
    // Check if already wrapped — toggle off
    const beforeMatch = text.slice(start - before.length, start)
    const afterMatch = text.slice(end, end + after.length)
    if (beforeMatch === before && afterMatch === after) {
      modelValue.value = text.slice(0, start - before.length) + selected + text.slice(end + after.length)
      nextTick(() => {
        ta.selectionStart = start - before.length
        ta.selectionEnd = end - before.length
        ta.focus()
      })
      return
    }
    const replacement = `${before}${selected}${after}`
    modelValue.value = text.slice(0, start) + replacement + text.slice(end)
    nextTick(() => {
      ta.selectionStart = start + before.length
      ta.selectionEnd = start + before.length + selected.length
      ta.focus()
    })
  } else {
    const replacement = `${before}${placeholder}${after}`
    modelValue.value = text.slice(0, start) + replacement + text.slice(end)
    nextTick(() => {
      ta.selectionStart = start + before.length
      ta.selectionEnd = start + before.length + placeholder.length
      ta.focus()
    })
  }
}

function prefixLines(prefix: string) {
  const ta = textarea.value
  if (!ta) return

  const start = ta.selectionStart
  const end = ta.selectionEnd
  const text = modelValue.value || ''

  const lineStart = text.lastIndexOf('\n', start - 1) + 1
  const lineEnd = end > start ? end : (text.indexOf('\n', start) === -1 ? text.length : text.indexOf('\n', start))

  const lines = text.slice(lineStart, lineEnd).split('\n')
  const prefixed = lines.map(line => prefix + line).join('\n')
  const lengthDiff = prefixed.length - (lineEnd - lineStart)

  modelValue.value = text.slice(0, lineStart) + prefixed + text.slice(lineEnd)
  nextTick(() => {
    ta.selectionStart = start + prefix.length
    ta.selectionEnd = end + lengthDiff
    ta.focus()
  })
}

function toggleBold() {
  wrapSelection('**', '**', 'fed tekst')
}

function toggleItalic() {
  wrapSelection('*', '*', 'kursiv tekst')
}

function insertHeading() {
  prefixLines('## ')
}

function insertList() {
  prefixLines('- ')
}

function insertChecklist() {
  prefixLines('- [ ] ')
}

function insertLink() {
  const ta = textarea.value
  if (!ta) return

  const start = ta.selectionStart
  const end = ta.selectionEnd
  const text = modelValue.value || ''
  const selected = text.slice(start, end)

  if (selected) {
    const replacement = `[${selected}](url)`
    modelValue.value = text.slice(0, start) + replacement + text.slice(end)
    nextTick(() => {
      // Select "url" for easy replacement
      ta.selectionStart = start + selected.length + 3
      ta.selectionEnd = start + selected.length + 6
      ta.focus()
    })
  } else {
    const replacement = '[linktekst](url)'
    modelValue.value = text.slice(0, start) + replacement + text.slice(end)
    nextTick(() => {
      ta.selectionStart = start + 1
      ta.selectionEnd = start + 10
      ta.focus()
    })
  }
}

function insertAtCursor(textToInsert: string) {
  const ta = textarea.value
  if (!ta) {
    modelValue.value = (modelValue.value || '') + textToInsert
    return
  }
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const text = modelValue.value || ''
  modelValue.value = text.slice(0, start) + textToInsert + text.slice(end)
  nextTick(() => {
    ta.selectionStart = ta.selectionEnd = start + textToInsert.length
    ta.focus()
  })
}

defineExpose({ insertAtCursor })
</script>
