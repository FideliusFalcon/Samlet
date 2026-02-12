<template>
  <div class="mt-4 border-t border-gray-200 pt-3">
    <!-- Toggle button -->
    <button
      @click="toggleComments"
      class="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
    >
      <svg class="w-4 h-4 transition-transform" :class="{ 'rotate-90': isOpen }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
      <span>Kommentarer ({{ localCount }})</span>
    </button>

    <!-- Comment section (collapsed by default) -->
    <div v-if="isOpen" class="mt-3 space-y-3">
      <!-- Loading -->
      <p v-if="loading" class="text-sm text-gray-400">Indlæser kommentarer...</p>

      <!-- Comment list -->
      <div v-else-if="comments.length" class="space-y-3">
        <div
          v-for="comment in comments"
          :key="comment.id"
          class="bg-gray-50 rounded-lg p-3"
        >
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-900">{{ comment.authorName }}</p>
              <p class="text-xs text-gray-500">
                {{ formatDate(comment.createdAt) }}
                <span v-if="comment.updatedAt !== comment.createdAt"> (redigeret)</span>
              </p>
            </div>
            <div class="flex gap-2 ml-2">
              <button
                v-if="comment.authorId === userId"
                @click="startEdit(comment)"
                class="text-xs text-blue-600 hover:text-blue-800"
              >
                Rediger
              </button>
              <button
                v-if="comment.authorId === userId || canWriteBoard || isAdmin"
                @click="handleDelete(comment.id)"
                class="text-xs text-red-600 hover:text-red-800"
              >
                Slet
              </button>
            </div>
          </div>
          <!-- Edit form inline -->
          <div v-if="editingComment === comment.id" class="mt-2 relative">
            <textarea
              :ref="(el: any) => { activeEditTextarea = el }"
              v-model="editContent"
              rows="2"
              maxlength="2000"
              @input="editMentions.checkForMention()"
              @keydown="editMentions.onKeydown"
              class="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <MentionDropdown
              :show="editMentions.showDropdown.value"
              :users="editMentions.filteredUsers.value"
              :active-index="editMentions.activeIndex.value"
              @select="editMentions.selectUser"
            />
            <div class="flex gap-2 mt-2 justify-end">
              <button @click="saveEdit(comment.id)" class="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">Gem</button>
              <button @click="cancelEdit" class="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300">Annuller</button>
            </div>
          </div>
          <!-- Normal display -->
          <p v-else class="mt-1 text-sm text-gray-700 whitespace-pre-wrap" v-html="renderCommentContent(comment.content)" />
        </div>
      </div>

      <p v-else class="text-sm text-gray-400">Ingen kommentarer endnu.</p>

      <!-- New comment form -->
      <div v-if="canWriteComment && post.commentsEnabled" class="mt-3 relative">
        <textarea
          ref="newCommentTextarea"
          v-model="newComment"
          rows="2"
          maxlength="2000"
          placeholder="Skriv en kommentar..."
          @input="newCommentMentions.checkForMention()"
          @keydown="newCommentMentions.onKeydown"
          class="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <MentionDropdown
          :show="newCommentMentions.showDropdown.value"
          :users="newCommentMentions.filteredUsers.value"
          :active-index="newCommentMentions.activeIndex.value"
          @select="newCommentMentions.selectUser"
        />
        <div class="flex items-center justify-between mt-2">
          <span class="text-xs text-gray-400">{{ newComment.length }}/2000</span>
          <button
            @click="submitComment"
            :disabled="!newComment.trim() || submitting"
            class="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Kommentér
          </button>
        </div>
      </div>

      <!-- Comments disabled message -->
      <p v-else-if="!post.commentsEnabled" class="text-sm text-gray-400 italic">
        Kommentarer er deaktiveret for dette opslag.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BoardComment, BoardPost } from '~~/shared/types'

const props = defineProps<{
  post: BoardPost
  commentCount: number
}>()

const emit = defineEmits<{
  (e: 'commentCountChanged', delta: number): void
}>()

const { user } = useAuth()
const { canWriteBoard, canWriteComment, isAdmin } = useRoles()
const userId = computed(() => user.value?.id)

const isOpen = ref(false)
const comments = ref<BoardComment[]>([])
const loading = ref(false)
const newComment = ref('')
const submitting = ref(false)
const editingComment = ref<string | null>(null)
const editContent = ref('')
const localCount = ref(props.commentCount)
const newCommentTextarea = ref<HTMLTextAreaElement | null>(null)
const activeEditTextarea = ref<HTMLTextAreaElement | null>(null)

const { data: mentionUsers } = useLazyFetch<{ id: string; name: string }[]>('/api/users/mentions')

const newCommentMentions = useMentions(newCommentTextarea, newComment, mentionUsers)
const editMentions = useMentions(activeEditTextarea, editContent, mentionUsers)

watch(() => props.commentCount, (val) => {
  localCount.value = val
})

async function toggleComments() {
  isOpen.value = !isOpen.value
  if (isOpen.value && !comments.value.length && localCount.value > 0) {
    await fetchComments()
  }
}

async function fetchComments() {
  loading.value = true
  try {
    comments.value = await $fetch<BoardComment[]>(`/api/board/${props.post.id}/comments`)
  } catch {
    comments.value = []
  } finally {
    loading.value = false
  }
}

async function submitComment() {
  if (!newComment.value.trim() || submitting.value) return
  submitting.value = true
  try {
    const created = await $fetch<BoardComment>(`/api/board/${props.post.id}/comments`, {
      method: 'POST',
      body: { content: newComment.value },
    })
    comments.value.push(created)
    newComment.value = ''
    localCount.value++
    emit('commentCountChanged', 1)
  } catch (e: any) {
    alert(e.data?.message || 'Kunne ikke oprette kommentar')
  } finally {
    submitting.value = false
  }
}

function startEdit(comment: BoardComment) {
  editingComment.value = comment.id
  editContent.value = comment.content
}

function cancelEdit() {
  editingComment.value = null
  editContent.value = ''
}

async function saveEdit(commentId: string) {
  try {
    const updated = await $fetch<BoardComment>(`/api/board/${props.post.id}/comments/${commentId}`, {
      method: 'PUT',
      body: { content: editContent.value },
    })
    const idx = comments.value.findIndex(c => c.id === commentId)
    if (idx !== -1) {
      comments.value[idx] = { ...comments.value[idx], ...updated }
    }
    cancelEdit()
  } catch (e: any) {
    alert(e.data?.message || 'Kunne ikke opdatere kommentar')
  }
}

async function handleDelete(commentId: string) {
  if (!confirm('Er du sikker på, at du vil slette denne kommentar?')) return
  try {
    await $fetch(`/api/board/${props.post.id}/comments/${commentId}`, { method: 'DELETE' })
    comments.value = comments.value.filter(c => c.id !== commentId)
    localCount.value--
    emit('commentCountChanged', -1)
  } catch (e: any) {
    alert(e.data?.message || 'Kunne ikke slette kommentar')
  }
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderCommentContent(content: string) {
  // Escape HTML first, then replace mention patterns with styled HTML
  let html = escapeHtml(content)
  html = html.replace(/@\[([^\]]+)\]\([0-9a-f-]{36}\)/gi, (_match, name) => {
    return `<span class="inline-flex items-center px-1 rounded bg-blue-100 text-blue-800 font-medium text-sm">@${escapeHtml(name)}</span>`
  })
  return html
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
</script>
