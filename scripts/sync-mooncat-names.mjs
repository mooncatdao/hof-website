import { readFile, writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const API_BASE_URL = 'https://api.mooncatrescue.com/mooncat/traits'
const OVERRIDES_PATH = path.join(process.cwd(), 'public', 'overrides.json')
const FETCH_ATTEMPTS = 3
const RETRY_DELAY_MS = 750
const MIN_RESCUE_INDEX = 0
const MAX_RESCUE_INDEX = 25439

function getArgs(argv = process.argv.slice(2)) {
  const args = {
    check: false,
    dryRun: false,
    overridesPath: OVERRIDES_PATH,
  }

  for (const arg of argv) {
    if (arg === '--check') {
      args.check = true
      args.dryRun = true
      continue
    }

    if (arg === '--dry-run') {
      args.dryRun = true
      continue
    }

    if (arg.startsWith('--overrides=')) {
      args.overridesPath = path.resolve(arg.slice('--overrides='.length))
      continue
    }

    throw new Error(`Unknown sync argument: ${arg}`)
  }

  return args
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function parseRescueIndex(value) {
  const rescueIndex = Number(value)

  return Number.isInteger(rescueIndex) &&
    rescueIndex >= MIN_RESCUE_INDEX &&
    rescueIndex <= MAX_RESCUE_INDEX
    ? rescueIndex
    : null
}

function normalizeApiName(value) {
  return typeof value === 'string' ? value.trim() : null
}

function extractApiName(traits) {
  if (!traits || typeof traits !== 'object') return null

  const name = traits.name

  if (name && typeof name === 'object') {
    if (name.isNamed === false) return null

    return normalizeApiName(name.value)
  }

  return normalizeApiName(name)
}

function getMembersToCheck(overrides) {
  if (!Array.isArray(overrides?.members)) {
    throw new Error('public/overrides.json must contain a members array')
  }

  return overrides.members
    .map((member, index) => ({
      index,
      member,
      rescueIndex: parseRescueIndex(member?.rescueIndex),
    }))
    .filter((entry) => entry.rescueIndex !== null)
}

function formatJsonValue(value) {
  return JSON.stringify(value ?? null)
}

function getCatNameUpdates(overrides, apiNamesByRescueIndex) {
  const updates = []

  for (const entry of getMembersToCheck(overrides)) {
    if (!apiNamesByRescueIndex.has(entry.rescueIndex)) continue

    const apiName = apiNamesByRescueIndex.get(entry.rescueIndex)
    if (typeof apiName !== 'string' || apiName.length === 0) continue

    const currentName =
      typeof entry.member.catName === 'string' ? entry.member.catName : null

    if (currentName !== apiName) {
      updates.push({
        index: entry.index,
        rescueIndex: entry.rescueIndex,
        oldValue: currentName,
        newValue: apiName,
      })
    }
  }

  return updates
}

function applyCatNameUpdates(overrides, updates) {
  if (updates.length === 0) return overrides

  const members = overrides.members.map((member) => ({ ...member }))

  for (const update of updates) {
    members[update.index].catName = update.newValue
  }

  return {
    ...overrides,
    members,
  }
}

async function fetchTraits(rescueIndex, fetchImpl = fetch) {
  const url = `${API_BASE_URL}/${encodeURIComponent(rescueIndex)}`
  let lastError

  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetchImpl(url)

      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
      }

      return response.json()
    } catch (error) {
      lastError = error

      if (attempt < FETCH_ATTEMPTS) {
        await wait(RETRY_DELAY_MS * attempt)
      }
    }
  }

  throw lastError
}

async function getApiNamesForMembers(membersToCheck, fetchImpl = fetch) {
  const apiNamesByRescueIndex = new Map()
  const failures = []
  const missingNames = []

  for (const entry of membersToCheck) {
    try {
      const traits = await fetchTraits(entry.rescueIndex, fetchImpl)
      const apiName = extractApiName(traits)

      if (apiName && apiName.length > 0) {
        apiNamesByRescueIndex.set(entry.rescueIndex, apiName)
      } else {
        missingNames.push(entry.rescueIndex)
      }
    } catch (error) {
      failures.push({
        rescueIndex: entry.rescueIndex,
        error: error.message,
      })
    }
  }

  return { apiNamesByRescueIndex, failures, missingNames }
}

async function syncMoonCatNames({
  overridesPath = OVERRIDES_PATH,
  dryRun = false,
  check = false,
  fetchImpl = fetch,
} = {}) {
  const raw = await readFile(overridesPath, 'utf8')
  const overrides = JSON.parse(raw)
  const membersToCheck = getMembersToCheck(overrides)

  console.log(`Checking ${membersToCheck.length} MoonCat API names.`)

  const { apiNamesByRescueIndex, failures, missingNames } =
    await getApiNamesForMembers(membersToCheck, fetchImpl)

  const updates = getCatNameUpdates(overrides, apiNamesByRescueIndex)

  for (const update of updates) {
    console.log(
      `MoonCat #${update.rescueIndex}: ${formatJsonValue(update.oldValue)} -> ${formatJsonValue(update.newValue)}`,
    )
  }

  if (missingNames.length > 0) {
    console.log(
      `Skipped ${missingNames.length} MoonCats without API names: ${missingNames.join(', ')}`,
    )
  }

  if (failures.length > 0) {
    failures.forEach((failure) => {
      console.error(`MoonCat #${failure.rescueIndex}: ${failure.error}`)
    })
    console.error(
      `MoonCat name sync failed for ${failures.length} of ${membersToCheck.length} cats; not writing ${overridesPath}.`,
    )
    return {
      checked: membersToCheck.length,
      updated: updates.length,
      failures,
      missingNames,
      wrote: false,
      exitCode: 1,
    }
  }

  if (updates.length > 0 && !dryRun) {
    const nextOverrides = applyCatNameUpdates(overrides, updates)
    await writeFile(overridesPath, `${JSON.stringify(nextOverrides, null, 2)}\n`, 'utf8')
  }

  console.log(
    `Done. Checked ${membersToCheck.length}, updated ${updates.length}, skipped missing names ${missingNames.length}.`,
  )

  if (updates.length > 0 && dryRun) {
    console.log(
      check
        ? 'Check mode found MoonCat name updates.'
        : 'Dry run found MoonCat name updates.',
    )
  } else if (updates.length === 0) {
    console.log('No MoonCat name updates needed.')
  }

  return {
    checked: membersToCheck.length,
    updated: updates.length,
    failures,
    missingNames,
    wrote: updates.length > 0 && !dryRun,
    exitCode: check && updates.length > 0 ? 1 : 0,
  }
}

async function main() {
  const args = getArgs()
  const result = await syncMoonCatNames(args)
  process.exitCode = result.exitCode
}

const isMain =
  typeof process.argv[1] === 'string' &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}

export {
  API_BASE_URL,
  applyCatNameUpdates,
  extractApiName,
  getArgs,
  getCatNameUpdates,
  getMembersToCheck,
  normalizeApiName,
  syncMoonCatNames,
}
