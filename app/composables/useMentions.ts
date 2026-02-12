export function useMentions(
  textareaRef: Ref<HTMLTextAreaElement | null>,
  modelRef: Ref<string>,
  users: Ref<{ id: string; name: string }[] | null>,
) {
  const showDropdown = ref(false)
  const query = ref('')
  const activeIndex = ref(0)
  const mentionStartPos = ref(-1)

  const filteredUsers = computed(() => {
    const list = users.value || []
    if (!query.value) return list.slice(0, 8)
    const q = query.value.toLowerCase()
    return list.filter(u => u.name.toLowerCase().includes(q)).slice(0, 8)
  })

  function checkForMention() {
    const textarea = textareaRef.value
    if (!textarea) return

    const pos = textarea.selectionStart
    const text = modelRef.value

    // Look backwards from cursor for '@'
    let atPos = -1
    for (let i = pos - 1; i >= 0; i--) {
      if (text[i] === '@') {
        if (i === 0 || /\s/.test(text[i - 1])) {
          atPos = i
        }
        break
      }
      if (/\s/.test(text[i])) break
    }

    if (atPos >= 0) {
      mentionStartPos.value = atPos
      query.value = text.substring(atPos + 1, pos)
      showDropdown.value = true
      activeIndex.value = 0
    } else {
      showDropdown.value = false
    }
  }

  function selectUser(user: { id: string; name: string }) {
    const textarea = textareaRef.value
    if (!textarea) return

    const cursorPos = textarea.selectionStart
    const before = modelRef.value.substring(0, mentionStartPos.value)
    const after = modelRef.value.substring(cursorPos)
    const mention = `@[${user.name}](${user.id}) `
    modelRef.value = before + mention + after
    showDropdown.value = false

    nextTick(() => {
      const newPos = before.length + mention.length
      textarea.selectionStart = newPos
      textarea.selectionEnd = newPos
      textarea.focus()
    })
  }

  function onKeydown(e: KeyboardEvent) {
    if (!showDropdown.value || !filteredUsers.value.length) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      activeIndex.value = Math.min(activeIndex.value + 1, filteredUsers.value.length - 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      activeIndex.value = Math.max(activeIndex.value - 1, 0)
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      selectUser(filteredUsers.value[activeIndex.value])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      showDropdown.value = false
    }
  }

  function dismiss() {
    showDropdown.value = false
  }

  return {
    showDropdown,
    filteredUsers,
    activeIndex,
    checkForMention,
    selectUser,
    onKeydown,
    dismiss,
  }
}
