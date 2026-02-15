const log = useLogger('jobs')

import { eq, and, between, isNull, lt } from 'drizzle-orm'
import { calendarEvents, auditLogs } from '~~/server/db/schema'
import { notifyEventReminder } from '~~/server/utils/email'
import { notifyWebhook } from '~~/server/utils/webhook'
import { purgeTrash } from '~~/server/utils/storage'
import { execFile } from 'child_process'
import { mkdir, readdir, unlink, stat } from 'fs/promises'
import { join, resolve } from 'path'

interface ScheduledJob {
  name: string
  intervalMs: number
  run: () => Promise<void>
}

const jobs: ScheduledJob[] = [
  {
    name: 'event-reminder',
    intervalMs: 15 * 60 * 1000, // every 15 minutes
    async run() {
      const db = useDb()
      const now = new Date()
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      const upcomingEvents = await db
        .select()
        .from(calendarEvents)
        .where(
          and(
            between(calendarEvents.startDate, now, in24h),
            isNull(calendarEvents.reminderSentAt),
          ),
        )

      for (const ev of upcomingEvents) {
        try {
          await notifyEventReminder(ev)
          await db
            .update(calendarEvents)
            .set({ reminderSentAt: new Date() })
            .where(eq(calendarEvents.id, ev.id))
          log.info({ event: ev.title, eventId: ev.id }, 'Sent reminder')
        } catch (err) {
          log.error({ err, event: ev.title, eventId: ev.id }, 'Reminder failed')
        }
      }
    },
  },
  {
    name: 'trash-cleanup',
    intervalMs: 24 * 60 * 60 * 1000, // daily
    async run() {
      const purged = await purgeTrash(30)
      if (purged > 0) {
        log.info({ purged }, 'Purged files from trash')
      }
    },
  },
  {
    name: 'audit-cleanup',
    intervalMs: 24 * 60 * 60 * 1000, // daily
    async run() {
      const db = useDb()
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

      const result = await db
        .delete(auditLogs)
        .where(lt(auditLogs.createdAt, threeMonthsAgo))

      const deleted = result.rowCount ?? 0
      if (deleted > 0) {
        log.info({ deleted }, 'Cleaned up old audit logs')
      }
    },
  },
  {
    name: 'pg-backup',
    intervalMs: 24 * 60 * 60 * 1000, // daily
    async run() {
      const config = useRuntimeConfig()
      const backupDir = resolve((config.backupDir as string) || './backups')
      await mkdir(backupDir, { recursive: true })

      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`
      const filename = `samlet_${timestamp}.sql.gz`
      const filepath = join(backupDir, filename)

      await new Promise<void>((resolve, reject) => {
        const proc = execFile('sh', ['-c', `pg_dump "${config.databaseUrl}" | gzip > "${filepath}"`], (err) => {
          if (err) reject(err)
          else resolve()
        })
        proc.stderr?.on('data', (data: string) => {
          log.warn({ stderr: String(data).trim() }, 'pg_dump stderr output')
        })
      })

      log.info({ filename }, 'Created backup')
    },
  },
  {
    name: 'backup-cleanup',
    intervalMs: 24 * 60 * 60 * 1000, // daily
    async run() {
      const config = useRuntimeConfig()
      const backupDir = resolve((config.backupDir as string) || './backups')

      let files: string[]
      try {
        files = await readdir(backupDir)
      } catch (err) {
        log.debug({ err }, 'Backup directory not readable, skipping cleanup')
        return
      }

      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
      let removed = 0

      for (const f of files) {
        if (!f.startsWith('samlet_') || !f.endsWith('.sql.gz')) continue
        const filePath = join(backupDir, f)
        try {
          const s = await stat(filePath)
          if (s.mtimeMs < cutoff) {
            await unlink(filePath)
            removed++
          }
        } catch (err) {
          log.debug({ err, file: f }, 'Failed to process old backup')
        }
      }

      if (removed > 0) {
        log.info({ removed }, 'Removed old backups')
      }
    },
  },
]

export default defineNitroPlugin(() => {
  // Wait for DB to be ready, then start all jobs
  setTimeout(() => {
    for (const job of jobs) {
      // Run immediately, then on interval
      runJob(job)
      setInterval(() => runJob(job), job.intervalMs)
    }
  }, 30_000)
})

async function runJob(job: ScheduledJob) {
  try {
    await job.run()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error({ err, job: job.name }, `Scheduled job failed: ${job.name}`)
    notifyWebhook(`scheduled-job/${job.name}`, message).catch(() => {})
  }
}
