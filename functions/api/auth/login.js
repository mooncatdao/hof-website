import {
  getBaseUrl,
  getRequiredEnv,
  makeStateCookie,
  randomState,
} from '../../_lib/auth.js'
import {
  textResponse,
  withSecurityHeaders,
} from '../../_lib/security.js'

export async function onRequestGet({ request, env }) {
  let config

  try {
    config = getRequiredEnv(env)
  } catch (error) {
    return textResponse('Admin GitHub login is not configured.', 503)
  }

  const state = randomState()
  const redirectUri = `${getBaseUrl(request)}/api/auth/callback`
  const url = new URL('https://github.com/login/oauth/authorize')

  url.searchParams.set('client_id', config.clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', 'read:org')
  url.searchParams.set('state', state)

  return withSecurityHeaders(new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      'Set-Cookie': makeStateCookie(state),
    },
  }))
}
