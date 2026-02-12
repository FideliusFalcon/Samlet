export const ROLES = {
  READ_FILES: 'read-files',
  WRITE_FILES: 'write-files',
  WRITE_BOARD: 'write-board',
  ADMIN: 'admin',
} as const

export type RoleName = typeof ROLES[keyof typeof ROLES]

export const ALL_ROLES: RoleName[] = Object.values(ROLES)
