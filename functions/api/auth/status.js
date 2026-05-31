import {
  clearSessionCookie,
  getRequiredEnv,
  readSession,
} from '../../_lib/auth.js'
import { jsonResponse } from '../../_lib/security.js'

export async function onRequestGet({ request, env }) {
  let config

  try {
    config = getRequiredEnv(env)
  } catch (error) {
    return jsonResponse({ error: 'Admin GitHub login is not configured' }, 503)
  }

  const session = await readSession(request, config)

  if (session === null) {
    return jsonResponse(
      { authenticated: false },
      200,
      { 'Set-Cookie': clearSessionCookie() },
    )
  }

  return jsonResponse({
    authenticated: true,
    user: {
      login: session.login,
      name: session.name,
      avatarUrl: session.avatarUrl,
      githubOrg: session.githubOrg,
    },
  })
}
