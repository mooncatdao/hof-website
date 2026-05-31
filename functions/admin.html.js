import {
  clearSessionCookie,
  getRequiredEnv,
  readSession,
} from './_lib/auth.js'
import {
  textResponse,
  withSecurityHeaders,
} from './_lib/security.js'

function redirectToLogin(request) {
  return withSecurityHeaders(new Response(null, {
    status: 302,
    headers: {
      Location: new URL('/api/auth/login', request.url).toString(),
      'Set-Cookie': clearSessionCookie(),
    },
  }))
}

export async function onRequestGet({ request, env, next }) {
  let config

  try {
    config = getRequiredEnv(env)
  } catch (error) {
    return textResponse('Admin GitHub login is not configured.', 503)
  }

  const session = await readSession(request, config)
  if (session === null) {
    return redirectToLogin(request)
  }

  return withSecurityHeaders(await next())
}
