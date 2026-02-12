export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'auth_token')

  if (token) {
    try {
      const payload = await verifyJwt(token)
      event.context.user = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        roles: payload.roles,
      }
    } catch {
      deleteCookie(event, 'auth_token')
    }
  }
})
