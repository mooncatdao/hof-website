import {
  getBaseUrl,
  getRequiredEnv,
  makeStateCookie,
  randomState,
} from '../../_lib/auth.js'

export async function onRequestGet({ request, env }) {
  const config = getRequiredEnv(env)
  const state = randomState()
  const redirectUri = `${getBaseUrl(request)}/api/auth/callback`
  const url = new URL('https://github.com/login/oauth/authorize')

  url.searchParams.set('client_id', config.clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', 'read:org')
  url.searchParams.set('state', state)

  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      'Set-Cookie': makeStateCookie(state),
    },
  })
}
