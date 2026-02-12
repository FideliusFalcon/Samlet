import { desc, eq } from 'drizzle-orm'
import { boardPosts, users } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const db = useDb()

  const posts = await db
    .select({
      id: boardPosts.id,
      title: boardPosts.title,
      content: boardPosts.content,
      isPinned: boardPosts.isPinned,
      authorId: boardPosts.authorId,
      authorName: users.name,
      createdAt: boardPosts.createdAt,
      updatedAt: boardPosts.updatedAt,
    })
    .from(boardPosts)
    .leftJoin(users, eq(boardPosts.authorId, users.id))
    .orderBy(desc(boardPosts.isPinned), desc(boardPosts.createdAt))

  return posts
})
