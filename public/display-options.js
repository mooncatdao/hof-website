(function (root, factory) {
  const api = factory();

  if (typeof module === "object" && typeof module.exports === "object") {
    module.exports = api;
  }

  root.DisplayOptions = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  const COMPACT_HOLDER_LINK_MODE = true;
  const IMAGE_VARIANTS = new Set([
    "regular",
    "glow",
    "accessorized",
    "accessorized-glow",
  ]);

  function normalizeTwitter(value) {
    if (typeof value !== "string" || value.length === 0) return null;
    return value.startsWith("@") ? value : "@" + value;
  }

  function isTwitterHandle(value) {
    return (
      typeof value === "string" && /^@?[A-Za-z0-9_]{1,15}$/.test(value.trim())
    );
  }

  function getTwitterHandleUrl(value) {
    if (!isTwitterHandle(value)) return null;
    return "https://x.com/" + normalizeTwitter(value.trim()).slice(1);
  }

  function getTwitterHandleDisplay(value) {
    if (!isTwitterHandle(value)) return null;
    return "(" + normalizeTwitter(value.trim()) + ")";
  }

  function getHolderTopTextOptions(
    value,
    compactMode = COMPACT_HOLDER_LINK_MODE,
  ) {
    const url = getTwitterHandleUrl(value);
    const normalizedHandle =
      url === null ? null : normalizeTwitter(value.trim());

    return {
      handleDisplay: url === null ? value : getTwitterHandleDisplay(value),
      linkHolderName: compactMode && url !== null,
      showHandle: !compactMode,
      title: normalizedHandle === null ? null : normalizedHandle,
      url,
    };
  }

  function getImageVariant({ glow = false, accessories = false } = {}) {
    if (accessories && glow) return "accessorized-glow";
    if (accessories) return "accessorized";
    if (glow) return "glow";
    return "regular";
  }

  function getCachedCatImage(rescueIndex, variant = "regular") {
    const nextVariant = IMAGE_VARIANTS.has(variant) ? variant : "regular";
    return `./assets/mooncats/${nextVariant}/${rescueIndex}.png`;
  }

  function getCachedImageFallbackVariants(variant = "regular") {
    if (variant === "accessorized-glow") {
      return ["accessorized-glow", "accessorized", "glow", "regular"];
    }

    if (variant === "accessorized") return ["accessorized", "regular"];
    if (variant === "glow") return ["glow", "regular"];
    return ["regular"];
  }

  return {
    COMPACT_HOLDER_LINK_MODE,
    getCachedCatImage,
    getCachedImageFallbackVariants,
    getHolderTopTextOptions,
    getImageVariant,
  };
});
