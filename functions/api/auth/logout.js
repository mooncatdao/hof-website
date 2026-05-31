import { clearSessionCookie } from '../../_lib/auth.js'
import {
  isSameOriginRequest,
  jsonResponse,
} from '../../_lib/security.js'

export async function onRequestPost({ request }) {
  if (!isSameOriginRequest(request)) {
    return jsonResponse({ error: 'Cross-origin request rejected' }, 403)
  }

  return jsonResponse(
    { ok: true },
    200,
    { 'Set-Cookie': clearSessionCookie() },
  )
}
