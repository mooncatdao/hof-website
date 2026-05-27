import {
  clearSessionCookie,
  getRequiredEnv,
  readSession,
} from '../../_lib/auth.js'

export async function onRequestGet({ request, env }) {
  const config = getRequiredEnv(env)
  const session = await readSession(request, config)

  if (session === null) {
    return Response.json(
      { authenticated: false },
      { headers: { 'Set-Cookie': clearSessionCookie() } },
    )
  }

  return Response.json({
    authenticated: true,
    user: {
      login: session.login,
      name: session.name,
      avatarUrl: session.avatarUrl,
      githubOrg: session.githubOrg,
    },
  })
}
