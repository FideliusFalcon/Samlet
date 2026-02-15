import pino from 'pino'
import type { Logger } from 'pino'
import { join } from 'path'

// Ensure pino-roll is traced by Nitro's bundler for production builds
import 'pino-roll'

const LOG_LEVEL = process.env.LOG_LEVEL || process.env.NUXT_LOG_LEVEL || 'info'
const LOG_DIR = process.env.LOG_DIR || process.env.NUXT_LOG_DIR || ''

function createLogger(): Logger {
  const targets: pino.TransportTargetOptions[] = [
    {
      target: 'pino/file',
      options: { destination: 1 },
      level: LOG_LEVEL,
    },
  ]

  if (LOG_DIR) {
    targets.push({
      target: 'pino-roll',
      options: {
        file: join(LOG_DIR, 'samlet'),
        frequency: 'daily',
        dateFormat: 'yyyy-MM-dd',
        mkdir: true,
      },
      level: LOG_LEVEL,
    })
  }

  return pino({
    level: LOG_LEVEL,
    timestamp: pino.stdTimeFunctions.isoTime,
    transport: { targets },
  })
}

const rootLogger = createLogger()

export function useLogger(module?: string): Logger {
  if (module) {
    return rootLogger.child({ module })
  }
  return rootLogger
}
