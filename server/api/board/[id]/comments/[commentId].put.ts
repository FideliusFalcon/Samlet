import { eq, and } from 'drizzle-orm'
import { boardComments, boardPosts } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = useDb()
  const postId = getRouterParam(event, 'id')!
  const commentId = getRouterParam(event, 'commentId')!

  const { content } = await readBody(event)

  if (!content?.trim()) {
    throw createError({ statusCode: 400, message: 'Kommentaren må ikke være tom' })
  }

  if (content.length > 2000) {
    throw createError({ statusCode: 400, message: 'Kommentaren må højst være 2000 tegn' })
  }

  const [comment] = await db
    .select()
    .from(boardComments)
    .where(and(eq(boardComments.id, commentId), eq(boardComments.postId, postId)))

  if (!comment) {
    throw createError({ statusCode: 404, message: 'Kommentar ikke fundet' })
  }

  if (comment.authorId !== user.id && !user.roles.includes('admin')) {
    throw createError({ statusCode: 403, message: 'Du kan kun redigere dine egne kommentarer' })
  }

  const [updated] = await db
    .update(boardComments)
    .set({
      content: content.trim(),
      updatedAt: new Date(),
    })
    .where(eq(boardComments.id, commentId))
    .returning()

  const [post] = await db
    .select({ title: boardPosts.title })
    .from(boardPosts)
    .where(eq(boardPosts.id, postId))

  audit(event, 'comment_updated', `På "${post?.title || 'ukendt'}"`)

  return updated
})
