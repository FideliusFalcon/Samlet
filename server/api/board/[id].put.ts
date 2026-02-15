import { eq } from 'drizzle-orm'
import { boardPosts } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['write-board'])
  const db = useDb()
  const id = getRouterParam(event, 'id')!

  const { title, content, isPinned, skipNotification, commentsEnabled } = await readBody(event)

  const [updated] = await db
    .update(boardPosts)
    .set({
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
      ...(isPinned !== undefined && { isPinned }),
      ...(commentsEnabled !== undefined && { commentsEnabled }),
      updatedAt: new Date(),
    })
    .where(eq(boardPosts.id, id))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, message: 'Opslag ikke fundet' })
  }

  audit(event, 'post_updated', `"${updated.title}"`)

  if (!skipNotification && (title !== undefined || content !== undefined)) {
    notifyNewBoardPost(updated, user.name, user.id).catch((err) => {
      useLogger('email').error({ err, postId: updated.id }, 'Board post update notification failed')
    })
  }

  return updated
})
