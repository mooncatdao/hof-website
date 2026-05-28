(function (root, factory) {
  const api = factory()

  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = api
  }

  root.AdminCore = api
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  const EXPORT_FIELDS = ['name', 'handle', 'catName']

  function normalizeTwitter(value) {
    if (typeof value !== 'string' || value.length === 0) return ''
    return value.startsWith('@') ? value : '@' + value
  }

  function stripEth(value) {
    return typeof value === 'string' ? value.replace(/\.eth$/i, '') : ''
  }

  function titleCase(value) {
    return value
      .split(/[\s_-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }

  function parseRescueIndex(value) {
    if (value === '' || value === null || typeof value === 'undefined') return null

    const rescueIndex = Number(value)
    return Number.isInteger(rescueIndex) ? rescueIndex : null
  }

  function getCachedImageKey(member) {
    const rescueIndex = parseRescueIndex(member.rescueIndex)
    if (rescueIndex === null) return null

    return rescueIndex
  }

  function getCacheStatus(member, cachedImages) {
    const cacheKey = getCachedImageKey(member)
    if (cacheKey === null) return 'Enter a rescue index to check image cache'
    if (cachedImages.has(cacheKey)) return 'Image cached'

    return 'Image cache missing; export JSON, replace public/overrides.json, then run npm run cache:images'
  }

  function getCachedImages(manifest) {
    const cachedImages = new Set()

    if (!Array.isArray(manifest?.files)) return cachedImages

    manifest.files.forEach((file) => {
      if (
        Number.isInteger(file.rescueIndex) &&
        file.status !== 'failed'
      ) {
        cachedImages.add(file.rescueIndex)
      }
    })

    return cachedImages
  }

  function cleanMember(member) {
    const output = {}
    const rescueIndex = parseRescueIndex(member.rescueIndex)

    if (rescueIndex !== null) output.rescueIndex = rescueIndex

    EXPORT_FIELDS.forEach((field) => {
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

  function getExportMembers(members) {
    return members
      .map(cleanMember)
      .filter((member) => Number.isInteger(member.rescueIndex))
  }

  function getExportJson(members) {
    return `${JSON.stringify(getExportData(members), null, 2)}\n`
  }

  function getExportData(members) {
    return { members: getExportMembers(members) }
  }

  function getWarningsForMember(member, cachedImages) {
    const warnings = []
    const rescueIndex = parseRescueIndex(member.rescueIndex)

    if (rescueIndex === null) return warnings

    if (!cachedImages.has(rescueIndex)) {
      warnings.push({
        code: 'missing-cache',
        rescueIndex,
        message: `MoonCat #${rescueIndex} is missing a cached image.`,
      })
    }

    const handle = typeof member.handle === 'string' ? member.handle.trim() : ''
    if (
      handle.length > 0 &&
      !handle.startsWith('@') &&
      !handle.includes('.') &&
      !handle.startsWith('http://') &&
      !handle.startsWith('https://')
    ) {
      warnings.push({
        code: 'handle-format',
        rescueIndex,
        message: `MoonCat #${rescueIndex} handle does not start with @.`,
      })
    }

    return warnings
  }

  function validateMembers(members, cachedImages = new Set()) {
    const errors = []
    const warnings = []
    const rescueIndexCounts = new Map()

    members.forEach((member, index) => {
      const row = index + 1
      const rescueIndex = parseRescueIndex(member.rescueIndex)

      if (rescueIndex === null) {
        errors.push({
          code: 'invalid-rescue-index',
          row,
          message: `Row ${row} needs a valid integer rescue index.`,
        })
        return
      }

      rescueIndexCounts.set(rescueIndex, (rescueIndexCounts.get(rescueIndex) || 0) + 1)

      if (typeof member.name !== 'string' || member.name.trim().length === 0) {
        warnings.push({
          code: 'blank-name',
          rescueIndex,
          row,
          message: `MoonCat #${rescueIndex} has a blank display name.`,
        })
      }

      warnings.push(...getWarningsForMember(member, cachedImages).map((warning) => ({
        ...warning,
        row,
      })))
    })

    rescueIndexCounts.forEach((count, rescueIndex) => {
      if (count > 1) {
        errors.push({
          code: 'duplicate-rescue-index',
          rescueIndex,
          message: `MoonCat #${rescueIndex} appears ${count} times.`,
        })
      }
    })

    return {
      cardCount: members.length,
      exportableCount: getExportMembers(members).length,
      errors,
      warnings,
    }
  }

  return {
    cleanMember,
    getCachedImageKey,
    getCachedImages,
    getCacheStatus,
    getExportData,
    getExportJson,
    getExportMembers,
    getWarningsForMember,
    normalizeTwitter,
    parseRescueIndex,
    stripEth,
    titleCase,
    validateMembers,
  }
})
