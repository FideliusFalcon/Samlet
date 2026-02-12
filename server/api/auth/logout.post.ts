export default defineEventHandler(async (event) => {
  audit(event, 'logout')
  deleteCookie(event, 'auth_token', { path: '/' })
  return { ok: true }
})
