import React, { useEffect, useState } from 'react'

function AvatarImage({ alt = '', fallback, fallbackClassName, imageClassName, src }) {
  const [hasImageError, setHasImageError] = useState(false)

  useEffect(() => {
    setHasImageError(false)
  }, [src])

  if (!src || hasImageError) {
    return fallbackClassName ? <span className={fallbackClassName}>{fallback}</span> : fallback
  }

  return <img alt={alt} className={imageClassName} onError={() => setHasImageError(true)} src={src} />
}

export default AvatarImage
