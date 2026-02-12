import { boardPosts } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['write-board'])
  const db = useDb()

  const { title, content, isPinned, skipNotification } = await readBody(event)

  if (!title?.trim() || !content?.trim()) {
    throw createError({ statusCode: 400, message: 'Titel og indhold er påkrævet' })
  }

  if (title.length > 255) {
    throw createError({ statusCode: 400, message: 'Titel må højst være 255 tegn' })
  }

  const [post] = await db.insert(boardPosts).values({
    title: title.trim(),
    content: content.trim(),
    isPinned: isPinned || false,
    authorId: user.id,
  }).returning()

  audit(event, 'post_created', `"${post.title}"`)

  if (!skipNotification) {
    notifyNewBoardPost(post, user.name, user.id).catch((err) => {
      console.error('[email] Notification failed:', err)
    })
  }

  return post
})
