import { mkdir, readFile, stat, writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const API_BASE_URL = 'https://api.mooncat.community'
const OVERRIDES_PATH = path.join(process.cwd(), 'public', 'overrides.json')
const OUTPUT_ROOT = path.join(process.cwd(), 'public', 'assets', 'mooncats')
const MANIFEST_PATH = path.join(OUTPUT_ROOT, 'manifest.json')
const FETCH_ATTEMPTS = 4
const RETRY_DELAY_MS = 750
const DEFAULT_VARIANT = 'regular'
const IMAGE_ENDPOINT = 'image'
const IMAGE_VARIANTS = {
  regular: {
    acc: '',
    glow: 'false',
  },
  glow: {
    acc: '',
    glow: 'true',
  },
  accessorized: {
    glow: 'false',
  },
  'accessorized-glow': {
    glow: 'true',
  },
}
const BASE_IMAGE_OPTIONS = {
  scale: '2',
  padding: '0',
  backgroundColor: 'transparent',
}

function getArgs(argv = process.argv.slice(2)) {
  const args = { force: false, variants: [DEFAULT_VARIANT] }
  let selectedVariant = null
  let cacheAll = false

  for (const arg of argv) {
    if (arg === '--force') {
      args.force = true
      continue
    }

    if (arg === '--all') {
      cacheAll = true
      continue
    }

    if (arg.startsWith('--variant=')) {
      selectedVariant = arg.slice('--variant='.length)
      continue
    }

    throw new Error(`Unknown cache argument: ${arg}`)
  }

  if (cacheAll && selectedVariant !== null) {
    throw new Error('Use either --all or --variant=<name>, not both.')
  }

  if (selectedVariant !== null) {
    if (!Object.hasOwn(IMAGE_VARIANTS, selectedVariant)) {
      throw new Error(
        `Unknown image variant: ${selectedVariant}. Expected one of: ${Object.keys(IMAGE_VARIANTS).join(', ')}`,
      )
    }

    args.variants = [selectedVariant]
  } else if (cacheAll) {
    args.variants = Object.keys(IMAGE_VARIANTS)
  }

  return args
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

function getManifestFileKey({ rescueIndex, variant = DEFAULT_VARIANT }) {
  return `${variant}:${rescueIndex}`
}

async function getExistingManifestFiles() {
  try {
    const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'))
    const files = Array.isArray(manifest.files) ? manifest.files : []

    return new Map(
      files.map((file) => {
        const normalizedFile = {
          ...file,
          variant: file.variant || DEFAULT_VARIANT,
        }

        return [getManifestFileKey(normalizedFile), normalizedFile]
      }),
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

function getImageOptions(variant) {
  if (!Object.hasOwn(IMAGE_VARIANTS, variant)) {
    throw new Error(`Unknown image variant: ${variant}`)
  }

  return {
    ...BASE_IMAGE_OPTIONS,
    ...IMAGE_VARIANTS[variant],
  }
}

function getImageUrl(rescueIndex, variant = DEFAULT_VARIANT) {
  const url = new URL(`${API_BASE_URL}/${IMAGE_ENDPOINT}/${rescueIndex}`)
  const imageOptions = getImageOptions(variant)

  Object.entries(imageOptions).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })

  return url.toString()
}

function hasMatchingCachedImage(existing, url, variant, imageOptions) {
  if (existing?.url !== url || existing.variant !== variant) return false

  return Object.entries(imageOptions).every(
    ([key, value]) => existing.imageOptions?.[key] === value,
  )
}

async function cacheImage(rescueIndex, variant, force, existingFiles) {
  const variantDir = path.join(OUTPUT_ROOT, variant)
  const outputPath = path.join(variantDir, `${rescueIndex}.png`)

  await mkdir(variantDir, { recursive: true })

  const url = getImageUrl(rescueIndex, variant)
  const imageOptions = getImageOptions(variant)
  const existing = existingFiles.get(getManifestFileKey({ rescueIndex, variant })) || {}

  if (
    !force &&
    hasMatchingCachedImage(existing, url, variant, imageOptions) &&
    (await exists(outputPath))
  ) {
    return {
      ...existing,
      rescueIndex,
      variant,
      status: 'skipped',
      url,
      imageOptions,
      outputPath,
    }
  }

  const image = await fetchPng(url)
  await writeFile(outputPath, image.bytes)

  return {
    ...image,
    rescueIndex,
    variant,
    status: 'cached',
    url,
    imageOptions,
    outputPath,
    size: image.bytes.length,
  }
}

function getManifestFile({
  rescueIndex,
  variant,
  status,
  size,
  width,
  height,
  etag,
  error,
  url,
  imageOptions,
}) {
  return {
    rescueIndex,
    variant,
    status,
    size,
    width,
    height,
    etag,
    url,
    imageOptions,
    error,
  }
}

async function main() {
  const args = getArgs()
  const rescueIndexes = await getCuratedRescueIndexes()
  const existingFiles = await getExistingManifestFiles()
  const manifestFiles = new Map(existingFiles)
  const results = []

  for (const variant of args.variants) {
    console.log(`Caching MoonCat image variant: ${variant}`)

    for (const rescueIndex of rescueIndexes) {
      let result

      try {
        result = await cacheImage(rescueIndex, variant, args.force, existingFiles)
      } catch (error) {
        result = {
          rescueIndex,
          variant,
          status: 'failed',
          url: getImageUrl(rescueIndex, variant),
          imageOptions: getImageOptions(variant),
          error: error.message,
        }
      }

      results.push(result)
      manifestFiles.set(getManifestFileKey(result), getManifestFile(result))
      console.log(
        `${result.status} ${variant}/${rescueIndex}.png${result.error ? ` - ${result.error}` : ''}`,
      )
    }
  }

  const files = [...manifestFiles.values()].sort(
    (left, right) =>
      Object.keys(IMAGE_VARIANTS).indexOf(left.variant) -
        Object.keys(IMAGE_VARIANTS).indexOf(right.variant) ||
      left.rescueIndex - right.rescueIndex,
  )

  await writeFile(
    MANIFEST_PATH,
    `${JSON.stringify(
      {
        apiBaseUrl: API_BASE_URL,
        rescueIndexes,
        files,
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
  DEFAULT_VARIANT,
  IMAGE_VARIANTS,
  getArgs,
  getImageOptions,
  getImageUrl,
  getManifestFileKey,
}
