import { eq } from 'drizzle-orm'
import { boardComments, boardPosts } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['write-comment'])
  const db = useDb()
  const postId = getRouterParam(event, 'id')!

  const { content } = await readBody(event)

  if (!content?.trim()) {
    throw createError({ statusCode: 400, message: 'Kommentaren må ikke være tom' })
  }

  if (content.length > 2000) {
    throw createError({ statusCode: 400, message: 'Kommentaren må højst være 2000 tegn' })
  }

  const [post] = await db
    .select({
      id: boardPosts.id,
      title: boardPosts.title,
      authorId: boardPosts.authorId,
      commentsEnabled: boardPosts.commentsEnabled,
    })
    .from(boardPosts)
    .where(eq(boardPosts.id, postId))

  if (!post) {
    throw createError({ statusCode: 404, message: 'Opslag ikke fundet' })
  }

  if (!post.commentsEnabled) {
    throw createError({ statusCode: 403, message: 'Kommentarer er deaktiveret for dette opslag' })
  }

  const [comment] = await db.insert(boardComments).values({
    postId,
    authorId: user.id,
    content: content.trim(),
  }).returning()

  audit(event, 'comment_created', `På "${post.title}"`)

  notifyNewBoardComment(post, comment, user.name, user.id).catch((err) => {
    console.error('[email] Comment notification failed:', err)
  })

  return {
    ...comment,
    authorName: user.name,
  }
})
