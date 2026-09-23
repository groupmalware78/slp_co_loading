// Shared by internal/files/** — the common image types every upload slot
// accepts; avatar uses exactly this set.
export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

// Logo also accepts SVG (vector logos are common and this slot
// historically allowed it).
export const ALLOWED_LOGO_TYPES: Record<string, string> = {
  ...ALLOWED_IMAGE_TYPES,
  "image/svg+xml": "svg",
};

// Favicon accepts ICO/SVG instead of JPEG — favicons are rarely
// photographic, and .ico is the traditional format for one.
export const ALLOWED_FAVICON_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
  "image/svg+xml": "svg",
};

// Hero image also accepts GIF (for an animated banner).
export const ALLOWED_HERO_TYPES: Record<string, string> = {
  ...ALLOWED_IMAGE_TYPES,
  "image/gif": "gif",
};

export const ALLOWED_RECEIPT_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  gif: "image/gif",
  pdf: "application/pdf",
};

export function contentTypeForFileName(fileName: string | null): string {
  const extension = fileName?.split(".").pop()?.toLowerCase();
  return (extension && EXTENSION_CONTENT_TYPES[extension]) || "application/octet-stream";
}
