import { mkdir, readFile, stat, writeFile } from 'fs/promises'
import path from 'path'

const API_BASE_URL = 'https://api.mooncat.community'
const OVERRIDES_PATH = path.join(process.cwd(), 'public', 'overrides.json')
const OUTPUT_ROOT = path.join(process.cwd(), 'public', 'assets', 'mooncats')
const MANIFEST_PATH = path.join(OUTPUT_ROOT, 'manifest.json')
const FETCH_ATTEMPTS = 4
const RETRY_DELAY_MS = 750

const MODE_ENDPOINTS = {
  regular: 'regular-image',
  cat: 'cat-image',
  face: 'face-image',
  accessorized: 'accessorized-image',
  glow: 'glow-image',
  event: 'event-image',
}

const MODE_ALIASES = {
  accessories: 'accessorized',
  accessory: 'accessorized',
  acclimated: 'glow',
  head: 'face',
  heads: 'face',
}

const POSE_BY_SIZE = {
  '240x250': 'stalking',
  '240x180': 'sleeping',
  '250x210': 'standing',
  '210x260': 'pouncing',
}

function getArgs() {
  const args = {
    force: false,
    modes: new Set(['regular']),
  }

  for (const arg of process.argv.slice(2)) {
    if (arg === '--force') {
      args.force = true
      continue
    }

    if (arg === '--all') {
      Object.keys(MODE_ENDPOINTS).forEach((mode) => args.modes.add(mode))
      continue
    }

    if (arg.startsWith('--mode=')) {
      args.modes.clear()
      const modes = arg
        .slice('--mode='.length)
        .split(',')
        .map((mode) => mode.trim())
        .filter(Boolean)

      modes.forEach((mode) => args.modes.add(normalizeMode(mode)))
    }
  }

  return {
    ...args,
    modes: [...args.modes],
  }
}

function normalizeMode(mode) {
  const normalized = mode.toLowerCase()
  const aliased = MODE_ALIASES[normalized] || normalized

  if (typeof MODE_ENDPOINTS[aliased] !== 'string') {
    throw new Error(
      `Unknown image mode "${mode}". Valid modes: ${Object.keys(MODE_ENDPOINTS).join(', ')}`,
    )
  }

  return aliased
}

async function exists(filePath) {
  try {
    await stat(filePath)
    return true
  } catch (error) {
    if (error.code === 'ENOENT') return false
    throw error
  }
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function getCuratedRescueIndexes() {
  const raw = await readFile(OVERRIDES_PATH, 'utf8')
  const overrides = JSON.parse(raw)

  if (!Array.isArray(overrides.members)) {
    throw new Error('public/overrides.json must contain a members array')
  }

  return [
    ...new Set(
      overrides.members
        .map((member) => Number(member.rescueIndex))
        .filter((rescueIndex) => Number.isInteger(rescueIndex)),
    ),
  ].sort((a, b) => a - b)
}

async function getExistingManifestFiles() {
  try {
    const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'))
    const files = Array.isArray(manifest.files) ? manifest.files : []

    return new Map(
      files.map((file) => [`${file.mode}:${file.rescueIndex}`, file]),
    )
  } catch (error) {
    if (error.code === 'ENOENT') return new Map()
    throw error
  }
}

async function fetchPng(url) {
  let lastError

  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
      }

      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('image/png')) {
        throw new Error(
          `Expected PNG from ${url}, received ${contentType || 'unknown content type'}`,
        )
      }

      return {
        bytes: Buffer.from(await response.arrayBuffer()),
        width: response.headers.get('x-image-width'),
        height: response.headers.get('x-image-height'),
        etag: response.headers.get('etag'),
      }
    } catch (error) {
      lastError = error

      if (attempt < FETCH_ATTEMPTS) {
        await wait(RETRY_DELAY_MS * attempt)
      }
    }
  }

  throw lastError
}

async function cacheImage(mode, rescueIndex, force, existingFiles) {
  const endpoint = MODE_ENDPOINTS[mode]
  const modeDir = path.join(OUTPUT_ROOT, mode)
  const outputPath = path.join(modeDir, `${rescueIndex}.png`)

  await mkdir(modeDir, { recursive: true })

  const url = `${API_BASE_URL}/${endpoint}/${rescueIndex}`

  if (!force && (await exists(outputPath))) {
    const existing = existingFiles.get(`${mode}:${rescueIndex}`) || {}

    return {
      ...existing,
      mode,
      rescueIndex,
      status: 'skipped',
      url,
      outputPath,
    }
  }

  const image = await fetchPng(url)
  await writeFile(outputPath, image.bytes)

  return {
    ...image,
    mode,
    rescueIndex,
    status: 'cached',
    url,
    outputPath,
    size: image.bytes.length,
  }
}

async function main() {
  const args = getArgs()
  const rescueIndexes = await getCuratedRescueIndexes()
  const existingFiles = await getExistingManifestFiles()
  const results = []

  for (const mode of args.modes) {
    for (const rescueIndex of rescueIndexes) {
      let result

      try {
        result = await cacheImage(mode, rescueIndex, args.force, existingFiles)
      } catch (error) {
        result = {
          mode,
          rescueIndex,
          status: 'failed',
          error: error.message,
        }
      }

      results.push(result)
      console.log(
        `${result.status} ${mode}/${rescueIndex}.png${result.error ? ` - ${result.error}` : ''}`,
      )
    }
  }

  await writeFile(
    MANIFEST_PATH,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        apiBaseUrl: API_BASE_URL,
        modes: args.modes,
        rescueIndexes,
        files: results.map(
          ({ mode, rescueIndex, status, size, width, height, etag, error, url }) => ({
            mode,
            rescueIndex,
            status,
            size,
            width,
            height,
            pose: POSE_BY_SIZE[`${width}x${height}`],
            etag,
            url,
            error,
          }),
        ),
      },
      null,
      2,
    )}\n`,
    'utf8',
  )

  const cached = results.filter((result) => result.status === 'cached').length
  const skipped = results.filter((result) => result.status === 'skipped').length
  const failed = results.filter((result) => result.status === 'failed').length
  console.log(`Done. Cached ${cached}, skipped ${skipped}, failed ${failed}.`)

  if (failed > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
