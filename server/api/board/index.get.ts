import { desc, eq, sql } from 'drizzle-orm'
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
      commentsEnabled: boardPosts.commentsEnabled,
      authorId: boardPosts.authorId,
      authorName: users.name,
      commentCount: sql<number>`(SELECT count(*) FROM board_comments WHERE board_comments.post_id = ${boardPosts.id})`.as('comment_count'),
      createdAt: boardPosts.createdAt,
      updatedAt: boardPosts.updatedAt,
    })
    .from(boardPosts)
    .leftJoin(users, eq(boardPosts.authorId, users.id))
    .orderBy(desc(boardPosts.isPinned), desc(boardPosts.createdAt))

  return posts
})
