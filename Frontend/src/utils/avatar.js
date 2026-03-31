import { API_BASE_URL } from '../app/api.base'

const RAW_BASE64_IMAGE_PATTERN = /^[A-Za-z0-9+/=\r\n]+$/

function guessBase64ImageMimeType(value) {
  if (value.startsWith('/9j/')) {
    return 'image/jpeg'
  }

  if (value.startsWith('iVBOR')) {
    return 'image/png'
  }

  if (value.startsWith('R0lGOD')) {
    return 'image/gif'
  }

  if (value.startsWith('UklGR')) {
    return 'image/webp'
  }

  if (value.startsWith('PHN2Zy')) {
    return 'image/svg+xml'
  }

  return 'image/jpeg'
}

function looksLikeRawBase64Image(value) {
  return value.length > 128 && RAW_BASE64_IMAGE_PATTERN.test(value)
}

export function resolveAvatarUrl(value) {
  const avatar = String(value || '').trim()

  if (!avatar) {
    return ''
  }

  const normalized = avatar.replace(/\\/g, '/')

  if (normalized.startsWith('data:') || normalized.startsWith('blob:')) {
    return normalized
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized
  }

  if (normalized.startsWith('//')) {
    return `https:${normalized}`
  }

  if (looksLikeRawBase64Image(normalized)) {
    return `data:${guessBase64ImageMimeType(normalized)};base64,${normalized}`
  }

  const relativePath = normalized.startsWith('/') ? normalized : `/${normalized.replace(/^\/+/, '')}`
  return `${API_BASE_URL}${relativePath}`
}
