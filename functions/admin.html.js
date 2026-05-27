import {
  clearSessionCookie,
  getRequiredEnv,
  readSession,
} from './_lib/auth.js'

function redirectToLogin(request) {
  return Response.redirect(new URL('/api/auth/login', request.url), 302)
}

export async function onRequestGet({ request, env, next }) {
  let config

  try {
    config = getRequiredEnv(env)
  } catch (error) {
    return new Response('Admin GitHub login is not configured.', {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  const session = await readSession(request, config)
  if (session === null) {
    const response = redirectToLogin(request)
    response.headers.append('Set-Cookie', clearSessionCookie())
    return response
  }

  return next()
}
