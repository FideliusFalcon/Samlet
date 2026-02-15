export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname

  if (!path.startsWith('/api/')) return

  const start = Date.now()
  const method = getMethod(event)

  event.node.res.on('finish', () => {
    const log = useLogger('http')
    const duration = Date.now() - start
    const statusCode = event.node.res.statusCode
    const userId = event.context.user?.id || undefined

    const data = { method, path, statusCode, duration, userId }

    if (statusCode >= 500) {
      log.error(data, `${method} ${path} ${statusCode}`)
    } else if (statusCode >= 400) {
      log.warn(data, `${method} ${path} ${statusCode}`)
    } else {
      log.info(data, `${method} ${path} ${statusCode}`)
    }
  })
})
