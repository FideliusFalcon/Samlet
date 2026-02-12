export interface AuthUser {
  id: string
  email: string
  name: string
  roles: string[]
  notificationsEnabled: boolean
}

export interface BoardPost {
  id: string
  title: string
  content: string
  isPinned: boolean
  authorId: string
  authorName?: string
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  name: string
  createdAt: string
}

export interface Document {
  id: string
  title: string
  filename: string
  fileSize: number
  mimeType: string
  categoryId: string | null
  categoryName?: string | null
  uploadedById: string
  uploaderName?: string
  createdAt: string
}

export interface UserWithRoles {
  id: string
  email: string
  name: string
  isActive: boolean
  roles: string[]
  createdAt: string
}

export interface CalendarEvent {
  id: string
  title: string
  description: string | null
  location: string | null
  startDate: string
  endDate: string
  allDay: boolean
  createdById: string
  createdByName?: string
  createdAt: string
  updatedAt: string
  acceptedCount?: number
  declinedCount?: number
  currentUserStatus?: 'accepted' | 'declined' | null
}

export interface EventResponse {
  userId: string
  userName?: string
  status: 'accepted' | 'declined'
  respondedAt: string
}

export interface LinkedDocument {
  id: string
  title: string
  categoryName?: string | null
  categoryColor?: string | null
}

export interface LinkedEvent {
  id: string
  title: string
  startDate: string
  allDay: boolean
}
