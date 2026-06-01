(function (root, factory) {
  const api = factory()

  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = api
  }

  root.DisplayOptions = api
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  const IMAGE_VARIANTS = new Set([
    'regular',
    'glow',
    'accessorized',
    'accessorized-glow',
  ])

  function getImageVariant({ glow = false, accessories = false } = {}) {
    if (accessories && glow) return 'accessorized-glow'
    if (accessories) return 'accessorized'
    if (glow) return 'glow'
    return 'regular'
  }

  function getCachedCatImage(rescueIndex, variant = 'regular') {
    const nextVariant = IMAGE_VARIANTS.has(variant) ? variant : 'regular'
    return `./assets/mooncats/${nextVariant}/${rescueIndex}.png`
  }

  function getCachedImageFallbackVariants(variant = 'regular') {
    if (variant === 'accessorized-glow') {
      return ['accessorized-glow', 'accessorized', 'glow', 'regular']
    }

    if (variant === 'accessorized') return ['accessorized', 'regular']
    if (variant === 'glow') return ['glow', 'regular']
    return ['regular']
  }

  return {
    getCachedCatImage,
    getCachedImageFallbackVariants,
    getImageVariant,
  }
})
