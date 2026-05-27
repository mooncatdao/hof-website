import {
  clearSessionCookie,
  getRequiredEnv,
  readSession,
} from './_lib/auth.js'

function redirectToLogin(request) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: new URL('/api/auth/login', request.url).toString(),
      'Set-Cookie': clearSessionCookie(),
    },
  })
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
    return redirectToLogin(request)
  }

  return next()
}
