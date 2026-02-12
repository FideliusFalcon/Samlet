export const ROLES = {
  READ_FILES: 'read-files',
  WRITE_FILES: 'write-files',
  WRITE_BOARD: 'write-board',
  READ_USERS: 'read-users',
  WRITE_MEMBERS: 'write-members',
  ADMIN: 'admin',
} as const

export type RoleName = typeof ROLES[keyof typeof ROLES]

export const ALL_ROLES: RoleName[] = Object.values(ROLES)
