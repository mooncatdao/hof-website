const SESSION_COOKIE = 'hof_admin_session'
const STATE_COOKIE = 'hof_oauth_state'
const SESSION_TTL_SECONDS = 60 * 60 * 8
const MAX_SESSION_TTL_SECONDS = 60 * 60 * 24
const MIN_SESSION_SECRET_LENGTH = 32

function base64UrlEncode(value) {
  const bytes =
    value instanceof Uint8Array ? value : new TextEncoder().encode(String(value))
  let binary = ''

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function base64UrlDecode(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    Math.ceil(value.length / 4) * 4,
    '=',
  )
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return new TextDecoder().decode(bytes)
}

function timingSafeEqual(left, right) {
  const leftBytes = new TextEncoder().encode(left)
  const rightBytes = new TextEncoder().encode(right)
  const length = Math.max(leftBytes.length, rightBytes.length)
  let diff = leftBytes.length ^ rightBytes.length

  for (let index = 0; index < length; index += 1) {
    diff |= (leftBytes[index] || 0) ^ (rightBytes[index] || 0)
  }

  return diff === 0
}

async function getSigningKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

async function signValue(value, secret) {
  const key = await getSigningKey(secret)
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(value),
  )

  return base64UrlEncode(new Uint8Array(signature))
}

export function getRequiredEnv(env) {
  const required = ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'GITHUB_ORG', 'SESSION_SECRET']
  const missing = required.filter((name) => typeof env[name] !== 'string' || env[name].length === 0)

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  if (env.SESSION_SECRET.length < MIN_SESSION_SECRET_LENGTH) {
    throw new Error(`SESSION_SECRET must be at least ${MIN_SESSION_SECRET_LENGTH} characters`)
  }

  const sessionTtlSeconds = Number(env.ADMIN_SESSION_TTL_SECONDS || SESSION_TTL_SECONDS)
  if (
    !Number.isFinite(sessionTtlSeconds) ||
    sessionTtlSeconds <= 0 ||
    sessionTtlSeconds > MAX_SESSION_TTL_SECONDS
  ) {
    throw new Error(`ADMIN_SESSION_TTL_SECONDS must be between 1 and ${MAX_SESSION_TTL_SECONDS}`)
  }

  return {
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
    githubOrg: env.GITHUB_ORG,
    sessionSecret: env.SESSION_SECRET,
    sessionTtlSeconds,
  }
}

export function getCookie(request, name) {
  const header = request.headers.get('Cookie') || ''
  const cookies = header.split(';').map((part) => part.trim()).filter(Boolean)

  for (const cookie of cookies) {
    const separatorIndex = cookie.indexOf('=')
    if (separatorIndex === -1) continue

    const key = cookie.slice(0, separatorIndex)
    if (key === name) return decodeURIComponent(cookie.slice(separatorIndex + 1))
  }

  return null
}

export function makeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`]

  if (typeof options.maxAge === 'number') parts.push(`Max-Age=${options.maxAge}`)
  parts.push(`Path=${options.path || '/'}`)
  if (options.httpOnly !== false) parts.push('HttpOnly')
  parts.push('Secure')
  parts.push(`SameSite=${options.sameSite || 'Lax'}`)

  return parts.join('; ')
}

export function clearCookie(name, path = '/') {
  return makeCookie(name, '', { maxAge: 0, path })
}

export function getBaseUrl(request) {
  const url = new URL(request.url)
  return `${url.protocol}//${url.host}`
}

export function randomState() {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes)
}

export async function createSession(user, envConfig) {
  const expiresAt = Math.floor(Date.now() / 1000) + envConfig.sessionTtlSeconds
  const payload = base64UrlEncode(JSON.stringify({
    exp: expiresAt,
    login: user.login,
    name: user.name || '',
    avatarUrl: user.avatar_url || '',
    githubOrg: envConfig.githubOrg,
  }))
  const signature = await signValue(payload, envConfig.sessionSecret)

  return `${payload}.${signature}`
}

export async function readSession(request, envConfig) {
  const cookie = getCookie(request, SESSION_COOKIE)
  if (cookie === null) return null

  const [payload, signature] = cookie.split('.')
  if (typeof payload !== 'string' || typeof signature !== 'string') return null

  const expected = await signValue(payload, envConfig.sessionSecret)
  if (!timingSafeEqual(signature, expected)) return null

  try {
    const session = JSON.parse(base64UrlDecode(payload))
    if (typeof session.exp !== 'number' || session.exp < Math.floor(Date.now() / 1000)) {
      return null
    }

    return session
  } catch (error) {
    return null
  }
}

export function makeSessionCookie(session, envConfig) {
  return makeCookie(SESSION_COOKIE, session, {
    httpOnly: true,
    maxAge: envConfig.sessionTtlSeconds,
    path: '/',
    sameSite: 'Lax',
  })
}

export function makeStateCookie(state) {
  return makeCookie(STATE_COOKIE, state, {
    httpOnly: true,
    maxAge: 10 * 60,
    path: '/api/auth',
    sameSite: 'Lax',
  })
}

export function getStateCookie(request) {
  return getCookie(request, STATE_COOKIE)
}

export function clearStateCookie() {
  return clearCookie(STATE_COOKIE, '/api/auth')
}

export function clearSessionCookie() {
  return clearCookie(SESSION_COOKIE, '/')
}
