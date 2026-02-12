export default defineNuxtRouteMiddleware((to) => {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated.value && to.path !== '/login') {
    const redirect = to.fullPath === '/' ? undefined : to.fullPath
    return navigateTo({ path: '/login', query: redirect ? { redirect } : undefined })
  }

  if (isAuthenticated.value && to.path === '/login') {
    const redirect = to.query.redirect
    const safe = typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/'
    return navigateTo(safe)
  }
})
