import { pgTable, uuid, varchar, text, boolean, timestamp, integer, primaryKey } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  notificationsEnabled: boolean('notifications_enabled').notNull().default(true),
  icsToken: varchar('ics_token', { length: 64 }).unique(),
  phone: varchar('phone', { length: 50 }),
  address: text('address'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
})

export const roles = pgTable('roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  description: text('description'),
})

export const userRoles = pgTable('user_roles', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
}, (table) => [
  primaryKey({ columns: [table.userId, table.roleId] }),
])

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  color: varchar('color', { length: 20 }).notNull().default('gray'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
})

export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  filename: varchar('filename', { length: 255 }).notNull(),
  storagePath: varchar('storage_path', { length: 500 }).notNull(),
  fileSize: integer('file_size').notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull().default('application/pdf'),
  categoryId: uuid('category_id').references(() => categories.id),
  uploadedById: uuid('uploaded_by_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
})

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 50 }).notNull(),
  details: text('details'),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
})

export const passkeyCredentials = pgTable('passkey_credentials', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  credentialId: text('credential_id').notNull().unique(),
  publicKey: text('public_key').notNull(),
  counter: integer('counter').notNull().default(0),
  transports: text('transports'),
  deviceName: varchar('device_name', { length: 255 }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
})

export const boardPosts = pgTable('board_posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  isPinned: boolean('is_pinned').notNull().default(false),
  commentsEnabled: boolean('comments_enabled').notNull().default(true),
  authorId: uuid('author_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
})

export const boardComments = pgTable('board_comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  postId: uuid('post_id').notNull().references(() => boardPosts.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
})

export const calendarEvents = pgTable('calendar_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  location: varchar('location', { length: 255 }),
  startDate: timestamp('start_date', { mode: 'date' }).notNull(),
  endDate: timestamp('end_date', { mode: 'date' }).notNull(),
  allDay: boolean('all_day').notNull().default(false),
  createdById: uuid('created_by_id').notNull().references(() => users.id),
  reminderSentAt: timestamp('reminder_sent_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
})

export const eventResponses = pgTable('event_responses', {
  eventId: uuid('event_id').notNull().references(() => calendarEvents.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).notNull(),
  respondedAt: timestamp('responded_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.eventId, table.userId] }),
])

export const documentEvents = pgTable('document_events', {
  documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  eventId: uuid('event_id').notNull().references(() => calendarEvents.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.documentId, table.eventId] }),
])

export const magicLinks = pgTable('magic_links', {
  id: uuid('id').defaultRandom().primaryKey(),
  token: varchar('token', { length: 36 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  usedAt: timestamp('used_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
})
