import { eq, asc } from 'drizzle-orm'
import { boardComments, boardPosts, users } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const db = useDb()
  const postId = getRouterParam(event, 'id')!

  const [post] = await db
    .select({ id: boardPosts.id })
    .from(boardPosts)
    .where(eq(boardPosts.id, postId))

  if (!post) {
    throw createError({ statusCode: 404, message: 'Opslag ikke fundet' })
  }

  const comments = await db
    .select({
      id: boardComments.id,
      postId: boardComments.postId,
      authorId: boardComments.authorId,
      authorName: users.name,
      content: boardComments.content,
      createdAt: boardComments.createdAt,
      updatedAt: boardComments.updatedAt,
    })
    .from(boardComments)
    .leftJoin(users, eq(boardComments.authorId, users.id))
    .where(eq(boardComments.postId, postId))
    .orderBy(asc(boardComments.createdAt))

  return comments
})
