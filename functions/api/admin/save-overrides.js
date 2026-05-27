import {
  getRequiredEnv,
  readSession,
} from '../../_lib/auth.js'
import {
  getGitHubWriteConfig,
  updateRepositoryFile,
} from '../../_lib/github.js'

const MAX_BODY_BYTES = 120_000
const MAX_MEMBERS = 500
const EDITABLE_FIELDS = ['name', 'handle', 'catName']

function jsonResponse(body, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

function parseRescueIndex(value) {
  if (value === '' || value === null || typeof value === 'undefined') return null

  const rescueIndex = Number(value)
  return Number.isInteger(rescueIndex) ? rescueIndex : null
}

function cleanMember(member) {
  const output = {}
  const rescueIndex = parseRescueIndex(member?.rescueIndex)

  if (rescueIndex === null) {
    throw new Error('Every member needs a valid integer rescue index')
  }

  output.rescueIndex = rescueIndex

  EDITABLE_FIELDS.forEach((field) => {
    if (field === 'handle' && Object.prototype.hasOwnProperty.call(member, field)) {
      output[field] = typeof member[field] === 'string' ? member[field].trim() : ''
      return
    }

    if (typeof member[field] === 'string' && member[field].trim().length > 0) {
      output[field] = member[field].trim()
    }
  })

  return output
}

function normalizeOverrides(input) {
  const members = Array.isArray(input?.members)
    ? input.members
    : Array.isArray(input?.overrides?.members)
      ? input.overrides.members
      : null

  if (members === null) {
    throw new Error('Request body must include a members array')
  }

  if (members.length > MAX_MEMBERS) {
    throw new Error(`Request body cannot include more than ${MAX_MEMBERS} members`)
  }

  const seen = new Set()
  const cleanedMembers = members.map(cleanMember)

  cleanedMembers.forEach((member) => {
    if (seen.has(member.rescueIndex)) {
      throw new Error(`MoonCat #${member.rescueIndex} appears more than once`)
    }

    seen.add(member.rescueIndex)
  })

  return { members: cleanedMembers }
}

export async function onRequestPost({ request, env }) {
  let authConfig
  let writeConfig

  try {
    authConfig = getRequiredEnv(env)
    writeConfig = getGitHubWriteConfig(env)
  } catch (error) {
    return jsonResponse({ error: error.message }, 503)
  }

  const session = await readSession(request, authConfig)
  if (session === null) {
    return jsonResponse({ error: 'Not authenticated' }, 401)
  }

  const bodyText = await request.text()
  if (bodyText.length > MAX_BODY_BYTES) {
    return jsonResponse({ error: 'Request body is too large' }, 413)
  }

  let overrides

  try {
    overrides = normalizeOverrides(JSON.parse(bodyText))
  } catch (error) {
    return jsonResponse({ error: error.message }, 400)
  }

  const content = `${JSON.stringify(overrides, null, 2)}\n`
  const message = `Update Hall of Fame overrides from ${session.login}`

  try {
    const result = await updateRepositoryFile(writeConfig, content, message)

    return jsonResponse({
      ok: true,
      branch: writeConfig.branch,
      commitSha: result.commit?.sha || null,
      commitUrl: result.commit?.html_url || null,
      path: writeConfig.overridesPath,
    })
  } catch (error) {
    return jsonResponse({ error: error.message }, 502)
  }
}
