let _webhookUrl: string | null | undefined

function getWebhookUrl(): string | null {
  if (_webhookUrl !== undefined) return _webhookUrl
  const config = useRuntimeConfig()
  _webhookUrl = config.webhookUrl || null
  return _webhookUrl
}

export async function notifyWebhook(source: string, error: string, details?: string) {
  const url = getWebhookUrl()
  if (!url) return

  const payload = {
    timestamp: new Date().toISOString(),
    source,
    error,
    ...(details && { details }),
  }

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    })
  } catch (err) {
    // Don't let webhook failures cascade
    console.error(`[webhook] Failed to send notification:`, err)
  }
}
