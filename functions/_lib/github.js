const GITHUB_API_BASE = 'https://api.github.com'

async function githubFetch(path, token) {
  return fetch(`${GITHUB_API_BASE}${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'mooncat-hof-admin',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
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
