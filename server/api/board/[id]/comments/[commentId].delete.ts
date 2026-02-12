import { eq, and } from 'drizzle-orm'
import { boardComments, boardPosts } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = useDb()
  const postId = getRouterParam(event, 'id')!
  const commentId = getRouterParam(event, 'commentId')!

  const [comment] = await db
    .select()
    .from(boardComments)
    .where(and(eq(boardComments.id, commentId), eq(boardComments.postId, postId)))

  if (!comment) {
    throw createError({ statusCode: 404, message: 'Kommentar ikke fundet' })
  }

  const isOwner = comment.authorId === user.id
  const isAdmin = user.roles.includes('admin')
  const isBoardWriter = user.roles.includes('write-board')

  if (!isOwner && !isAdmin && !isBoardWriter) {
    throw createError({ statusCode: 403, message: 'Utilstrækkelige rettigheder til at slette denne kommentar' })
  }

  await db
    .delete(boardComments)
    .where(eq(boardComments.id, commentId))

  const [post] = await db
    .select({ title: boardPosts.title })
    .from(boardPosts)
    .where(eq(boardPosts.id, postId))

  audit(event, 'comment_deleted', `På "${post?.title || 'ukendt'}"`)

  return { ok: true }
})
