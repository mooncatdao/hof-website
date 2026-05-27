import {
  clearStateCookie,
  createSession,
  getRequiredEnv,
  getStateCookie,
  makeSessionCookie,
} from '../../_lib/auth.js'
import {
  assertOrgMembership,
  exchangeCodeForToken,
  getGitHubUser,
} from '../../_lib/github.js'
import { getBaseUrl } from '../../_lib/auth.js'

function redirectWithError(message) {
  const url = new URL('/admin.html', 'https://example.com')
  url.searchParams.set('auth_error', message)

  return new Response(null, {
    status: 302,
    headers: {
      Location: `${url.pathname}${url.search}`,
      'Set-Cookie': clearStateCookie(),
    },
  })
}

export async function onRequestGet({ request, env }) {
  const config = getRequiredEnv(env)
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const expectedState = getStateCookie(request)

  if (typeof code !== 'string' || code.length === 0) {
    return redirectWithError('GitHub did not return an OAuth code')
  }

  if (typeof state !== 'string' || state.length === 0 || state !== expectedState) {
    return redirectWithError('GitHub login state did not match')
  }

  try {
    const redirectUri = `${getBaseUrl(request)}/api/auth/callback`
    const token = await exchangeCodeForToken(code, config, redirectUri)
    const user = await getGitHubUser(token)
    await assertOrgMembership(token, config.githubOrg)

    const session = await createSession(user, config)

    return new Response(null, {
      status: 302,
      headers: [
        ['Location', '/admin.html'],
        ['Set-Cookie', clearStateCookie()],
        ['Set-Cookie', makeSessionCookie(session, config)],
      ],
    })
  } catch (error) {
    return redirectWithError(error.message)
  }
}
