const SECURITY_HEADERS = {
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "base-uri 'self'; frame-ancestors 'none'; object-src 'none'",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
}

export function withSecurityHeaders(response) {
  const headers = new Headers(response.headers)

  Object.entries(SECURITY_HEADERS).forEach(([name, value]) => {
    headers.set(name, value)
  })

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  })
}

export function jsonResponse(body, status = 200, headers = {}) {
  return withSecurityHeaders(Response.json(body, { status, headers }))
}

export function textResponse(body, status = 200, headers = {}) {
  return withSecurityHeaders(new Response(body, { status, headers }))
}

export function isSameOriginRequest(request) {
  const origin = request.headers.get('Origin')
  return origin === null || origin === new URL(request.url).origin
}

export function isJsonRequest(request) {
  const contentType = request.headers.get('Content-Type') || ''
  return contentType.split(';', 1)[0].trim().toLowerCase() === 'application/json'
}

export function getContentLength(request) {
  const value = request.headers.get('Content-Length')
  if (value === null) return null

  const length = Number(value)
  return Number.isSafeInteger(length) && length >= 0 ? length : null
}

export function getUtf8ByteLength(value) {
  return new TextEncoder().encode(value).byteLength
}
