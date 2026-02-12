export function useRoles() {
  const { user } = useAuth()

  function hasRole(role: string): boolean {
    if (!user.value) return false
    if (user.value.roles.includes('admin')) return true
    return user.value.roles.includes(role)
  }

  const canReadFiles = computed(() => hasRole('read-files'))
  const canWriteFiles = computed(() => hasRole('write-files'))
  const canWriteBoard = computed(() => hasRole('write-board'))
  const canReadCalendar = computed(() => hasRole('read-calendar'))
  const canWriteCalendar = computed(() => hasRole('write-calendar'))
  const canReadUsers = computed(() => hasRole('read-users'))
  const canWriteMembers = computed(() => hasRole('write-members'))
  const isAdmin = computed(() => user.value?.roles.includes('admin') ?? false)

  return { hasRole, canReadFiles, canWriteFiles, canWriteBoard, canReadCalendar, canWriteCalendar, canReadUsers, canWriteMembers, isAdmin }
}
