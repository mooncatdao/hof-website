const GITHUB_API_BASE = 'https://api.github.com'
const DEFAULT_OVERRIDES_PATH = 'public/overrides.json'

function base64UrlPath(value) {
  return value
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/')
}

function base64EncodeUtf8(value) {
  const bytes = new TextEncoder().encode(value)
  let binary = ''

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return btoa(binary)
}

async function githubFetch(path, token, options = {}) {
  return fetch(`${GITHUB_API_BASE}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'mooncat-hof-admin',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {}),
    },
  })
}

export function getGitHubWriteConfig(env) {
  const required = ['GITHUB_CONTENT_TOKEN', 'GITHUB_REPO']
  const missing = required.filter((name) => typeof env[name] !== 'string' || env[name].length === 0)

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  if (!/^[^/\s]+\/[^/\s]+$/.test(env.GITHUB_REPO)) {
    throw new Error('GITHUB_REPO must be in owner/name format')
  }

  return {
    branch: env.GITHUB_BRANCH || 'main',
    overridesPath: env.GITHUB_OVERRIDES_PATH || DEFAULT_OVERRIDES_PATH,
    repo: env.GITHUB_REPO,
    token: env.GITHUB_CONTENT_TOKEN,
  }
}

export async function exchangeCodeForToken(code, envConfig, redirectUri) {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'mooncat-hof-admin',
    },
    body: JSON.stringify({
      client_id: envConfig.clientId,
      client_secret: envConfig.clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  })
  const data = await response.json()

  if (!response.ok || typeof data.access_token !== 'string') {
    throw new Error(data.error_description || data.error || 'Could not exchange GitHub OAuth code')
  }

  return data.access_token
}

export async function getGitHubUser(token) {
  const response = await githubFetch('/user', token)

  if (!response.ok) {
    throw new Error('Could not fetch GitHub user')
  }

  return response.json()
}

export async function assertOrgMembership(token, org) {
  const response = await githubFetch(`/user/memberships/orgs/${encodeURIComponent(org)}`, token)

  if (!response.ok) {
    throw new Error(`GitHub account is not an active member of ${org}`)
  }

  const membership = await response.json()
  if (membership.state !== 'active') {
    throw new Error(`GitHub account is not an active member of ${org}`)
  }

  return membership
}

export async function getRepositoryFile(config) {
  const response = await githubFetch(
    `/repos/${config.repo}/contents/${base64UrlPath(config.overridesPath)}?ref=${encodeURIComponent(config.branch)}`,
    config.token,
  )

  if (response.status === 404) return null

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'Could not read current overrides.json from GitHub')
  }

  return data
}

export async function updateRepositoryFile(config, content, message) {
  const currentFile = await getRepositoryFile(config)
  const body = {
    branch: config.branch,
    content: base64EncodeUtf8(content),
    message,
  }

  if (typeof currentFile?.sha === 'string') {
    body.sha = currentFile.sha
  }

  const response = await githubFetch(
    `/repos/${config.repo}/contents/${base64UrlPath(config.overridesPath)}`,
    config.token,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Could not save overrides.json to GitHub')
  }

  return data
}
