import { randomUUID } from 'crypto'
import { join, extname, resolve, basename } from 'path'
import { mkdir, writeFile, readFile, unlink, rename, readdir, stat } from 'fs/promises'

function getUploadDir(): string {
  const config = useRuntimeConfig()
  return config.uploadDir || './uploads'
}

export async function saveFile(data: Buffer, originalFilename: string): Promise<string> {
  const uploadDir = getUploadDir()
  const now = new Date()
  const yearMonth = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`
  const dir = join(uploadDir, yearMonth)

  await mkdir(dir, { recursive: true })

  const rawExt = extname(originalFilename) || '.pdf'
  const ext = rawExt.replace(/[^a-zA-Z0-9.]/g, '')
  const uniqueName = `${randomUUID()}${ext}`
  const relativePath = join(yearMonth, uniqueName)
  const fullPath = join(dir, uniqueName)

  await writeFile(fullPath, data)

  return relativePath
}

export function resolveStoragePath(relativePath: string): string {
  const uploadDir = resolve(getUploadDir())
  const fullPath = resolve(join(uploadDir, relativePath))
  if (!fullPath.startsWith(uploadDir)) {
    throw new Error('Invalid storage path')
  }
  return fullPath
}

export async function readStoredFile(relativePath: string): Promise<Buffer> {
  return readFile(resolveStoragePath(relativePath))
}

export async function deleteStoredFile(relativePath: string): Promise<void> {
  try {
    await unlink(resolveStoragePath(relativePath))
  } catch {
    // File may already be deleted
  }
}

export async function trashStoredFile(relativePath: string): Promise<void> {
  const uploadDir = resolve(getUploadDir())
  const trashDir = join(uploadDir, '.trash')
  await mkdir(trashDir, { recursive: true })

  const sourcePath = resolveStoragePath(relativePath)
  const trashName = `${Date.now()}_${basename(relativePath)}`
  const trashPath = join(trashDir, trashName)

  try {
    await rename(sourcePath, trashPath)
  } catch {
    // File may already be deleted — ignore
  }
}

export async function purgeTrash(maxAgeDays: number = 30): Promise<number> {
  const uploadDir = resolve(getUploadDir())
  const trashDir = join(uploadDir, '.trash')

  let files: string[]
  try {
    files = await readdir(trashDir)
  } catch {
    return 0
  }

  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000
  let purged = 0

  for (const file of files) {
    const filePath = join(trashDir, file)
    try {
      const s = await stat(filePath)
      if (s.mtimeMs < cutoff) {
        await unlink(filePath)
        purged++
      }
    } catch {
      // ignore
    }
  }

  return purged
}
