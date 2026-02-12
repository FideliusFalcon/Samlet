import bcrypt from 'bcrypt'
import { eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import * as schema from '../db/schema'

export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig()
  const db = drizzle(config.databaseUrl, { schema })

  // Run migrations
  try {
    await migrate(db, { migrationsFolder: './server/db/migrations' })
    console.log('[seed] Migrations applied successfully')
  } catch (err) {
    console.error('[seed] Migration error:', err)
  }

  // Seed roles (upsert so new roles are added to existing deployments)
  const allRoles = [
    { name: 'read-files', description: 'Can view and download documents' },
    { name: 'write-files', description: 'Can upload and delete documents' },
    { name: 'write-board', description: 'Can create and edit board posts' },
    { name: 'read-calendar', description: 'Kan se kalenderbegivenheder' },
    { name: 'write-calendar', description: 'Kan oprette og redigere kalenderbegivenheder' },
    { name: 'read-users', description: 'Kan se medlemsoversigten' },
    { name: 'write-members', description: 'Kan redigere medlemmers kontaktoplysninger' },
    { name: 'admin', description: 'Full system access' },
  ]
  for (const role of allRoles) {
    await db.insert(schema.roles).values(role).onConflictDoNothing({ target: schema.roles.name })
  }
  console.log('[seed] Roles synced')

  // Seed admin user if no users exist
  const existingUsers = await db.select().from(schema.users).limit(1)
  if (existingUsers.length === 0) {
    const adminEmail = config.adminEmail || 'admin@samlet.local'
    const adminPassword = config.adminPassword || 'herervisamlet'
    const passwordHash = await bcrypt.hash(adminPassword, 12)

    const [adminUser] = await db.insert(schema.users).values({
      email: adminEmail,
      name: 'Administrator',
      passwordHash,
    }).returning()

    const [adminRole] = await db
      .select()
      .from(schema.roles)
      .where(eq(schema.roles.name, 'admin'))

    if (adminRole) {
      await db.insert(schema.userRoles).values({
        userId: adminUser.id,
        roleId: adminRole.id,
      })
    }

    console.log(`[seed] Admin user created: ${adminEmail}`)
  }
})
