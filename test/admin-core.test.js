const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const adminCore = require('../public/admin-core.js')

test('parseRescueIndex accepts only integer rescue indexes', () => {
  assert.equal(adminCore.parseRescueIndex(199), 199)
  assert.equal(adminCore.parseRescueIndex('199'), 199)
  assert.equal(adminCore.parseRescueIndex(''), null)
  assert.equal(adminCore.parseRescueIndex(null), null)
  assert.equal(adminCore.parseRescueIndex(undefined), null)
  assert.equal(adminCore.parseRescueIndex('199.5'), null)
  assert.equal(adminCore.parseRescueIndex('cat-199'), null)
})

test('cleanMember trims editable fields and preserves intentionally blank handles', () => {
  assert.deepEqual(
    adminCore.cleanMember({
      rescueIndex: '199',
      name: '  Test Cat  ',
      handle: '   ',
      catName: '  Moon Test  ',
      pose: '  pouncing  ',
      ignored: '<script>alert(1)</script>',
    }),
    {
      rescueIndex: 199,
      name: 'Test Cat',
      handle: '',
      catName: 'Moon Test',
    },
  )
})

test('getExportMembers filters incomplete rows out of exported JSON', () => {
  assert.deepEqual(
    adminCore.getExportMembers([
      { rescueIndex: '', name: 'blank row' },
      { rescueIndex: 'abc', name: 'bad row' },
      { rescueIndex: '2', name: 'Lawrence Forman' },
    ]),
    [{ rescueIndex: 2, name: 'Lawrence Forman' }],
  )
})

test('getExportData returns the exact overrides payload for saving', () => {
  assert.deepEqual(
    adminCore.getExportData([
      { rescueIndex: '2', name: 'Lawrence Forman', pose: 'stalking' },
    ]),
    { members: [{ rescueIndex: 2, name: 'Lawrence Forman' }] },
  )
})

test('manifest helpers expose cached rescue indexes and ignore failed cache files', () => {
  const manifest = {
    files: [
      { rescueIndex: 2, status: 'cached' },
      { rescueIndex: 199, status: 'failed' },
      { rescueIndex: 'bad', status: 'cached' },
    ],
  }

  const cachedImages = adminCore.getCachedImages(manifest)
  assert.equal(cachedImages.has(2), true)
  assert.equal(cachedImages.has(199), false)
  assert.equal(cachedImages.has('bad'), false)
})

test('cache status reports missing images for newly added rescue indexes', () => {
  const cachedImages = new Set([2])

  assert.equal(adminCore.getCacheStatus({ rescueIndex: 2 }, cachedImages), 'Image cached')
  assert.equal(
    adminCore.getCacheStatus({ rescueIndex: 199 }, cachedImages),
    'Image cache missing; export JSON, replace public/overrides.json, then run npm run cache:images',
  )
  assert.equal(
    adminCore.getCacheStatus({ rescueIndex: '' }, cachedImages),
    'Enter a rescue index to check image cache',
  )
})

test('validateMembers reports errors that should block export', () => {
  const validation = adminCore.validateMembers(
    [
      { rescueIndex: '', name: 'blank' },
      { rescueIndex: '2', name: 'One' },
      { rescueIndex: '2', name: 'Duplicate' },
    ],
    new Set([2]),
  )

  assert.equal(validation.exportableCount, 2)
  assert.deepEqual(
    validation.errors.map((error) => error.code).sort(),
    [
      'duplicate-rescue-index',
      'invalid-rescue-index',
    ],
  )
})

test('validateMembers ignores deprecated pose fields', () => {
  const validation = adminCore.validateMembers(
    [{ rescueIndex: '2', name: 'One', pose: 'floating' }],
    new Set([2]),
  )

  assert.equal(validation.errors.length, 0)
  assert.equal(validation.warnings.length, 0)
})

test('validateMembers reports warnings without blocking export', () => {
  const validation = adminCore.validateMembers(
    [
      { rescueIndex: '199', name: '', handle: 'not_a_handle' },
      { rescueIndex: '2', name: 'Cached', handle: '@cached' },
    ],
    new Set([2]),
  )

  assert.equal(validation.errors.length, 0)
  assert.equal(validation.exportableCount, 2)
  assert.deepEqual(
    validation.warnings.map((warning) => warning.code).sort(),
    ['blank-name', 'handle-format', 'missing-cache'],
  )
})

test('admin page avoids direct HTML injection sinks', () => {
  const adminHtml = fs.readFileSync(
    path.join(__dirname, '..', 'public', 'admin.html'),
    'utf8',
  )

  assert.doesNotMatch(adminHtml, /\.innerHTML\s*=/)
  assert.doesNotMatch(adminHtml, /\.outerHTML\s*=/)
  assert.doesNotMatch(adminHtml, /insertAdjacentHTML\s*\(/)
  assert.doesNotMatch(adminHtml, /document\.write\s*\(/)
  assert.doesNotMatch(adminHtml, /javascript:/i)
})

test('admin page loads the tested admin core module', () => {
  const adminHtml = fs.readFileSync(
    path.join(__dirname, '..', 'public', 'admin.html'),
    'utf8',
  )

  assert.match(adminHtml, /<script src="\.\/admin-core\.js"><\/script>/)
  assert.match(adminHtml, /const adminCore = window\.AdminCore/)
  assert.match(adminHtml, /validateMembers/)
})

test('Cloudflare admin route requires a signed GitHub session', () => {
  const adminRoute = fs.readFileSync(
    path.join(__dirname, '..', 'functions', 'admin.html.js'),
    'utf8',
  )

  assert.match(adminRoute, /readSession/)
  assert.match(adminRoute, /\/api\/auth\/login/)
  assert.match(adminRoute, /next\(\)/)
})

test('save endpoint gates GitHub writes behind a signed session', () => {
  const saveEndpoint = fs.readFileSync(
    path.join(__dirname, '..', 'functions', 'api', 'admin', 'save-overrides.js'),
    'utf8',
  )

  assert.match(saveEndpoint, /readSession/)
  assert.match(saveEndpoint, /getGitHubWriteConfig/)
  assert.match(saveEndpoint, /updateRepositoryFile/)
  assert.match(saveEndpoint, /normalizeOverrides/)
})

test('auth cookies are HttpOnly, Secure, and SameSite=Lax', () => {
  const authLib = fs.readFileSync(
    path.join(__dirname, '..', 'functions', '_lib', 'auth.js'),
    'utf8',
  )

  assert.match(authLib, /HttpOnly/)
  assert.match(authLib, /Secure/)
  assert.match(authLib, /SameSite=.*Lax/)
  assert.match(authLib, /MIN_SESSION_SECRET_LENGTH = 32/)
})
