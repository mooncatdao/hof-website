const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const { pathToFileURL } = require('node:url')

const adminCore = require('../public/scripts/admin-core.js')

function importSourceModule(relativePath) {
  const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8')
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
}

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8')
}

test('parseRescueIndex accepts only integer rescue indexes', () => {
  assert.equal(adminCore.parseRescueIndex(199), 199)
  assert.equal(adminCore.parseRescueIndex('199'), 199)
  assert.equal(adminCore.parseRescueIndex(0), 0)
  assert.equal(adminCore.parseRescueIndex(491), 491)
  assert.equal(adminCore.parseRescueIndex(''), null)
  assert.equal(adminCore.parseRescueIndex(null), null)
  assert.equal(adminCore.parseRescueIndex(undefined), null)
  assert.equal(adminCore.parseRescueIndex(-1), null)
  assert.equal(adminCore.parseRescueIndex(492), null)
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

test('Twitter handle helpers create parenthesized X links for normalized handles', () => {
  assert.equal(adminCore.getTwitterHandleDisplay('example'), '(@example)')
  assert.equal(adminCore.getTwitterHandleUrl('example'), 'https://x.com/example')
  assert.equal(adminCore.getTwitterHandleDisplay('@example'), '(@example)')
  assert.equal(adminCore.getTwitterHandleUrl('@example'), 'https://x.com/example')
})

test('Twitter handle helpers leave empty and non-Twitter values unlinked', () => {
  assert.equal(adminCore.getTwitterHandleUrl(''), null)
  assert.equal(adminCore.getTwitterHandleUrl(null), null)
  assert.equal(adminCore.getTwitterHandleUrl(undefined), null)
  assert.equal(adminCore.getTwitterHandleUrl('name.eth'), null)
  assert.equal(adminCore.getTwitterHandleUrl('https://example.com'), null)
  assert.equal(adminCore.getTwitterHandleDisplay('name.eth'), null)
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
      { rescueIndex: 304, variant: 'glow', status: 'cached' },
      { rescueIndex: 'bad', status: 'cached' },
    ],
  }

  const cachedImages = adminCore.getCachedImages(manifest)
  assert.equal(cachedImages.has(2), true)
  assert.equal(cachedImages.has(199), false)
  assert.equal(cachedImages.has(304), false)
  assert.equal(cachedImages.has('bad'), false)
})

test('display options map toggle states to cached variant paths and useful fallbacks', () => {
  const displayOptions = require('../public/scripts/display-options.js')

  assert.equal(displayOptions.getImageVariant(), 'regular')
  assert.equal(displayOptions.getImageVariant({ glow: true }), 'glow')
  assert.equal(displayOptions.getImageVariant({ accessories: true }), 'accessorized')
  assert.equal(
    displayOptions.getImageVariant({ glow: true, accessories: true }),
    'accessorized-glow',
  )
  assert.equal(
    displayOptions.getCachedCatImage(304, 'accessorized-glow'),
    './assets/mooncats/accessorized-glow/304.png',
  )
  assert.deepEqual(
    displayOptions.getCachedImageFallbackVariants('accessorized-glow'),
    ['accessorized-glow', 'accessorized', 'glow', 'regular'],
  )
})

test('compact holder link mode defaults on and links holder names for valid handles', () => {
  const displayOptions = require('../public/scripts/display-options.js')

  assert.equal(displayOptions.COMPACT_HOLDER_LINK_MODE, true)
  assert.deepEqual(displayOptions.getHolderTopTextOptions('@example'), {
    handleDisplay: '(@example)',
    linkHolderName: true,
    showHandle: false,
    title: '@example',
    url: 'https://x.com/example',
  })
  assert.deepEqual(displayOptions.getHolderTopTextOptions('example'), {
    handleDisplay: '(@example)',
    linkHolderName: true,
    showHandle: false,
    title: '@example',
    url: 'https://x.com/example',
  })
})

test('holder top text options preserve two-line mode and avoid broken links', () => {
  const displayOptions = require('../public/scripts/display-options.js')

  assert.deepEqual(displayOptions.getHolderTopTextOptions('@example', false), {
    handleDisplay: '(@example)',
    linkHolderName: false,
    showHandle: true,
    title: '@example',
    url: 'https://x.com/example',
  })
  assert.deepEqual(displayOptions.getHolderTopTextOptions(''), {
    handleDisplay: '',
    linkHolderName: false,
    showHandle: false,
    title: null,
    url: null,
  })
  assert.deepEqual(displayOptions.getHolderTopTextOptions('', false), {
    handleDisplay: '',
    linkHolderName: false,
    showHandle: true,
    title: null,
    url: null,
  })
})

test('image cache variants generate the expected API options and CLI selections', async () => {
  const cacheImages = await import(
    pathToFileURL(path.join(__dirname, '..', 'scripts', 'cache-mooncat-images.mjs'))
  )

  assert.deepEqual(cacheImages.getArgs([]), {
    force: false,
    variants: ['regular'],
  })
  assert.deepEqual(cacheImages.getArgs(['--all', '--force']), {
    force: true,
    variants: ['regular', 'glow', 'accessorized', 'accessorized-glow'],
  })
  assert.deepEqual(cacheImages.getImageOptions('regular'), {
    scale: '2',
    padding: '0',
    backgroundColor: 'transparent',
    acc: '',
    glow: 'false',
  })
  assert.deepEqual(cacheImages.getImageOptions('accessorized-glow'), {
    scale: '2',
    padding: '0',
    backgroundColor: 'transparent',
    glow: 'true',
  })
  assert.doesNotMatch(cacheImages.getImageUrl(304, 'accessorized'), /[?&]acc=/)
})

test('MoonCat name sync trims API names and preserves emoji', async () => {
  const nameSync = await import(
    pathToFileURL(path.join(__dirname, '..', 'scripts', 'sync-mooncat-names.mjs'))
  )

  assert.equal(
    nameSync.extractApiName({
      name: {
        isNamed: true,
        value: '  BokkyPooBah❤️Anna  ',
      },
    }),
    'BokkyPooBah❤️Anna',
  )
})

test('MoonCat name sync updates cat names without touching unrelated overrides', async () => {
  const nameSync = await import(
    pathToFileURL(path.join(__dirname, '..', 'scripts', 'sync-mooncat-names.mjs'))
  )
  const overrides = {
    members: [
      {
        rescueIndex: 17,
        name: 'BokkyPooBah',
        handle: '@BokkyPooBah',
        catName: 'Old Name',
      },
      {
        rescueIndex: 39,
        name: 'damn',
        handle: '@paulocete',
        catName: 'Whiskers',
      },
    ],
  }
  const apiNames = new Map([[17, 'BokkyPooBah❤️Anna']])
  const updates = nameSync.getCatNameUpdates(overrides, apiNames)
  const nextOverrides = nameSync.applyCatNameUpdates(overrides, updates)

  assert.deepEqual(updates, [
    {
      index: 0,
      rescueIndex: 17,
      oldValue: 'Old Name',
      newValue: 'BokkyPooBah❤️Anna',
    },
  ])
  assert.deepEqual(nextOverrides.members[0], {
    rescueIndex: 17,
    name: 'BokkyPooBah',
    handle: '@BokkyPooBah',
    catName: 'BokkyPooBah❤️Anna',
  })
  assert.deepEqual(nextOverrides.members[1], overrides.members[1])
  assert.deepEqual(overrides.members[0].catName, 'Old Name')
})

test('MoonCat name sync does not wipe local cat names when API names are missing', async () => {
  const nameSync = await import(
    pathToFileURL(path.join(__dirname, '..', 'scripts', 'sync-mooncat-names.mjs'))
  )
  const overrides = {
    members: [
      {
        rescueIndex: 39,
        name: 'damn',
        handle: '@paulocete',
        catName: 'Whiskers',
      },
    ],
  }

  assert.equal(nameSync.extractApiName({ name: { isNamed: false } }), null)
  assert.deepEqual(nameSync.getCatNameUpdates(overrides, new Map()), [])
  assert.deepEqual(nameSync.getCatNameUpdates(overrides, new Map([[39, null]])), [])
  assert.deepEqual(nameSync.getCatNameUpdates(overrides, new Map([[39, '']])), [])
})

test('public image controls persist settings and refresh member images in place', () => {
  const indexHtml = readProjectFile('public/index.html')
  const siteJs = readProjectFile('public/scripts/site.js')

  assert.match(siteJs, /localStorage\.setItem\("hof-glow", nextValue\)/)
  assert.match(siteJs, /localStorage\.setItem\("hof-accessories", nextValue\)/)
  assert.match(siteJs, /document\.querySelectorAll\("\.member-image"\)\.forEach\(setMemberImage\)/)
  assert.match(indexHtml, /id="glowToggle"[\s\S]*?aria-pressed="false"/)
  assert.match(indexHtml, /id="accessoriesToggle"[\s\S]*?aria-pressed="false"/)
})

test('public theme controls include an early-use dismissible hint', () => {
  const indexHtml = readProjectFile('public/index.html')
  const siteJs = readProjectFile('public/scripts/site.js')
  const siteCss = readProjectFile('public/styles/site.css')

  assert.match(indexHtml, /id="themeHint"[\s\S]*?Themes and Options/)
  assert.match(indexHtml, /class="themeHint-hide"[\s\S]*?HIDE/)
  assert.match(siteJs, /THEME_HINT_VIEWS_KEY = "hofThemeHintViews"/)
  assert.match(siteJs, /THEME_HINT_HIDDEN_KEY = "hofThemeHintHidden"/)
  assert.match(siteJs, /THEME_HINT_MAX_VIEWS = 2/)
  assert.match(siteJs, /controlsToggle\.classList\.add\("is-highlighted"\)/)
  assert.match(siteCss, /\.controlsToggle\.is-highlighted\s*\{[\s\S]*?outline:\s*2px solid var\(--mint\)/)
  assert.match(siteCss, /\.themeHint\s*\{[\s\S]*?right:\s*0/)
  assert.match(siteCss, /\.themeHint\s*\{[\s\S]*?background:\s*#f0f4df/)
  assert.match(siteCss, /\.displayControls\.is-hinting,/)
  assert.match(siteCss, /\.themeHint-arrow\s*\{[\s\S]*?font-size:\s*24px/)
})

test('public MoonCat images link to rescue-index profiles with secure new-tab attributes', () => {
  const siteJs = readProjectFile('public/scripts/site.js')
  const profileUrlHelper = siteJs.match(
    /function getMoonCatProfileUrl\(member\) \{[\s\S]*?\n\}/,
  )
  const imageLink = siteJs.match(
    /const imageLink = document\.createElement\("a"\);[\s\S]*?imageFrame\.appendChild\(imageLink\);/,
  )

  assert.notEqual(profileUrlHelper, null)
  assert.match(
    profileUrlHelper[0],
    /"https:\/\/mooncatrescue\.com\/mooncats\/" \+ member\.rescueIndex/,
  )
  assert.notEqual(imageLink, null)
  assert.match(imageLink[0], /imageLink\.className = "member-imageLink"/)
  assert.match(imageLink[0], /imageLink\.href = getMoonCatProfileUrl\(member\)/)
  assert.match(imageLink[0], /imageLink\.target = "_blank"/)
  assert.match(imageLink[0], /imageLink\.rel = "noopener noreferrer"/)
  assert.doesNotMatch(imageLink[0], /\.title\s*=/)
  assert.match(siteJs, /img\.alt = "MoonCat #" \+ member\.rescueIndex/)
})

test('public MoonCat image links zoom smoothly without layout resize or touch hover', () => {
  const css = fs.readFileSync(
    path.join(__dirname, '..', 'public', 'styles', 'site.css'),
    'utf8',
  )

  assert.match(css, /\.member-imageLink\s*\{[\s\S]*?display:\s*inline-block/)
  assert.match(css, /\.member-imageLink\s*\{[\s\S]*?line-height:\s*0/)
  assert.match(css, /\.member-image\s*\{[\s\S]*?transition:\s*transform 150ms ease/)
  assert.match(css, /\.member-image\s*\{[\s\S]*?will-change:\s*transform/)
  assert.match(css, /\.member-imageLink:focus-visible \.member-image\s*\{[\s\S]*?transform:\s*scale\(1\.15\)/)
  assert.match(css, /@media \(hover: hover\)\s*\{[\s\S]*?\.member-imageLink:hover \.member-image\s*\{[\s\S]*?transform:\s*scale\(1\.15\)/)
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
  const adminHtml = readProjectFile('public/admin.html')
  const adminJs = readProjectFile('public/scripts/admin.js')
  const adminSource = adminHtml + adminJs

  assert.doesNotMatch(adminSource, /\.innerHTML\s*=/)
  assert.doesNotMatch(adminSource, /\.outerHTML\s*=/)
  assert.doesNotMatch(adminSource, /insertAdjacentHTML\s*\(/)
  assert.doesNotMatch(adminSource, /document\.write\s*\(/)
  assert.doesNotMatch(adminSource, /javascript:/i)
})

test('member card renderers create secure new-tab handle links', () => {
  ;['public/scripts/site.js', 'public/scripts/admin.js'].forEach((relativePath) => {
    const source = readProjectFile(relativePath)

    assert.match(source, /DisplayOptions\.getHolderTopTextOptions/)
    assert.match(source, /if \(options\.showHandle\) top\.appendChild\(createHandleElement\(member\)\)/)
    assert.match(source, /link\.target = ['"]_blank['"]/)
    assert.match(source, /link\.rel = ['"]noopener noreferrer['"]/)
    assert.match(source, /link\.title = options\.title/)
    assert.match(source, /Open Twitter\/X profile for/)
  })
})

test('member card renderers expose MoonCat poses for CSS positioning', () => {
  ;['public/scripts/site.js', 'public/scripts/admin.js'].forEach((relativePath) => {
    const source = readProjectFile(relativePath)

    assert.match(source, /LibMoonCat\.getTraits\(\s*['"]basic['"]/)
    assert.match(source, /card\.dataset\.pose = getPose\(member\)/)
  })

  ;['public/styles/site.css', 'public/styles/admin.css'].forEach((relativePath) => {
    const css = readProjectFile(relativePath)

    assert.match(css, /\.member-card\[data-pose=['"]sleeping['"]\]/)
    assert.match(css, /\.member-card\[data-pose=['"]standing['"]\]/)
    assert.match(css, /--card-top-text-safe-offset-y:\s*\d+px/)
    assert.match(css, /--card-top-text-offset-y:\s*var\(--card-top-text-safe-offset-y\)/)
    assert.match(css, /\.member-card\[data-pose=['"]sleeping['"]\] \.member-handle,/)
    assert.match(css, /\.member-card\[data-pose=['"]standing['"]\] \.member-handle\s*\{/)
    assert.match(css, /min-height:\s*1\.05em/)
  })
})

test('admin page loads the tested admin core module', () => {
  const adminHtml = readProjectFile('public/admin.html')
  const adminJs = readProjectFile('public/scripts/admin.js')

  assert.match(adminHtml, /<script src="\.\/scripts\/admin-core\.js"><\/script>/)
  assert.match(adminHtml, /<script src="\.\/scripts\/display-options\.js"><\/script>/)
  assert.match(adminHtml, /<script src="\.\/scripts\/admin\.js"><\/script>/)
  assert.match(adminJs, /const adminCore = window\.AdminCore/)
  assert.match(adminJs, /validateMembers/)
})

test('public page rejects out-of-range override rescue indexes before rendering', () => {
  const siteJs = readProjectFile('public/scripts/site.js')

  assert.match(siteJs, /rescueIndex < 0\s*\|\|\s*rescueIndex > 491/)
  assert.match(siteJs, /\.filter\(\(member\) => member !== null\)/)
})

test('admin field updates do not rebuild rows and reset editor scroll position', () => {
  const adminJs = readProjectFile('public/scripts/admin.js')
  const updateMember = adminJs.match(
    /function updateMember\(index, field, value\) \{[\s\S]*?\n\}/,
  )

  assert.notEqual(updateMember, null)
  assert.doesNotMatch(updateMember[0], /renderRows\(\)/)
  assert.match(updateMember[0], /renderValidation\(\)/)
  assert.match(updateMember[0], /renderPreview\(\)/)
  assert.match(updateMember[0], /updateCount\(\)/)
})

test('security helpers reject cross-origin requests and measure UTF-8 bytes', async () => {
  const security = await importSourceModule('functions/_lib/security.js')

  assert.equal(
    security.isSameOriginRequest(new Request('https://example.com/api', {
      headers: { Origin: 'https://example.com' },
    })),
    true,
  )
  assert.equal(
    security.isSameOriginRequest(new Request('https://example.com/api', {
      headers: { Origin: 'https://attacker.example' },
    })),
    false,
  )
  assert.equal(
    security.isJsonRequest(new Request('https://example.com/api', {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })),
    true,
  )
  assert.equal(security.getUtf8ByteLength('\u20ac'), 3)
})

test('security responses include low-risk hardening headers', async () => {
  const security = await importSourceModule('functions/_lib/security.js')
  const response = security.withSecurityHeaders(new Response(null, {
    headers: [
      ['Set-Cookie', 'one=1; Path=/'],
      ['Set-Cookie', 'two=2; Path=/'],
    ],
  }))

  assert.equal(response.headers.get('Cache-Control'), 'no-store')
  assert.equal(
    response.headers.get('Content-Security-Policy'),
    "base-uri 'self'; frame-ancestors 'none'; object-src 'none'",
  )
  assert.equal(response.headers.get('Permissions-Policy'), 'camera=(), microphone=(), geolocation=()')
  assert.equal(response.headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin')
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff')
  assert.equal(response.headers.get('X-Frame-Options'), 'DENY')
  assert.deepEqual(response.headers.getSetCookie(), ['one=1; Path=/', 'two=2; Path=/'])
})

test('signed sessions are rejected after the configured GitHub organization changes', async () => {
  const auth = await importSourceModule('functions/_lib/auth.js')
  const config = {
    githubOrg: 'mooncatdao',
    sessionSecret: 'x'.repeat(32),
    sessionTtlSeconds: 60,
  }
  const session = await auth.createSession({ login: 'zibzub' }, config)
  const request = new Request('https://example.com/admin.html', {
    headers: { Cookie: `hof_admin_session=${encodeURIComponent(session)}` },
  })

  assert.equal((await auth.readSession(request, config)).login, 'zibzub')
  assert.equal(await auth.readSession(request, { ...config, githubOrg: 'other' }), null)
})

test('GitHub write config rejects unsafe repository paths', async () => {
  const github = await importSourceModule('functions/_lib/github.js')
  const env = {
    GITHUB_CONTENT_TOKEN: 'test-token',
    GITHUB_REPO: 'mooncatdao/hof-website',
  }

  assert.equal(github.getGitHubWriteConfig(env).overridesPath, 'public/overrides.json')
  assert.throws(
    () => github.getGitHubWriteConfig({
      ...env,
      GITHUB_OVERRIDES_PATH: '../README.md',
    }),
    /repository-relative file path/,
  )
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
  assert.match(saveEndpoint, /isSameOriginRequest/)
  assert.match(saveEndpoint, /isJsonRequest/)
  assert.match(saveEndpoint, /getUtf8ByteLength/)
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

test('static Cloudflare responses declare low-risk security headers', () => {
  const headers = fs.readFileSync(
    path.join(__dirname, '..', 'public', '_headers'),
    'utf8',
  )

  assert.match(headers, /Content-Security-Policy: base-uri 'self'; frame-ancestors 'none'; object-src 'none'/)
  assert.match(headers, /Permissions-Policy: camera=\(\), microphone=\(\), geolocation=\(\)/)
  assert.match(headers, /Referrer-Policy: strict-origin-when-cross-origin/)
  assert.match(headers, /X-Content-Type-Options: nosniff/)
  assert.match(headers, /X-Frame-Options: DENY/)
})
