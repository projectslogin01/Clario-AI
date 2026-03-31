import React, { useEffect, useRef, useState } from 'react'
import { getAvatarLabel } from '../helpers'
import AvatarImage from './AvatarImage'

function ProfileModal({ initialAvatar, initialUsername, isOpen, isSaving, onClose, onSubmit }) {
  const fileInputRef = useRef(null)
  const [username, setUsername] = useState(initialUsername || '')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(initialAvatar || '')

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setUsername(initialUsername || '')
    setAvatarFile(null)
    setAvatarPreview(initialAvatar || '')
  }, [initialAvatar, initialUsername, isOpen])

  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview)
      }
    }
  }, [avatarPreview])

  function handleFileChange(event) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    if (avatarPreview && avatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview)
    }

    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  function handleFormSubmit(event) {
    event.preventDefault()
    onSubmit?.({
      username,
      avatarFile,
    })
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="dashboard-modal">
      <button aria-label="Close profile dialog" className="dashboard-modal__backdrop" onClick={onClose} type="button" />

      <div aria-modal="true" className="dashboard-modal__panel" role="dialog">
        <div className="dashboard-modal__header">
          <div>
            <h2 className="dashboard-modal__title">Edit profile</h2>
            <p className="dashboard-modal__copy">Update your display name and profile picture.</p>
          </div>

          <button className="dashboard-modal__close" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <form className="dashboard-profile-form" onSubmit={handleFormSubmit}>
          <div className="dashboard-profile-form__avatar-row">
            <div className="dashboard-profile-form__avatar-preview">
              <AvatarImage
                alt="Profile preview"
                fallback={getAvatarLabel(username || initialUsername)}
                fallbackClassName="dashboard-profile-form__avatar-fallback"
                imageClassName="dashboard-profile-form__avatar-image"
                src={avatarPreview}
              />
            </div>

            <div className="dashboard-profile-form__avatar-actions">
              <button className="dashboard-profile-form__avatar-button" onClick={() => fileInputRef.current?.click()} type="button">
                Choose photo
              </button>
              <input
                accept="image/*"
                className="sr-only"
                onChange={handleFileChange}
                ref={fileInputRef}
                type="file"
              />
              <span className="dashboard-profile-form__hint">PNG, JPG, or WebP works best.</span>
            </div>
          </div>

          <label className="dashboard-profile-form__field">
            <span>Username</span>
            <input
              className="dashboard-profile-form__input"
              onChange={(event) => setUsername(event.target.value)}
              required
              type="text"
              value={username}
            />
          </label>

          <div className="dashboard-profile-form__actions">
            <button className="dashboard-profile-form__secondary" onClick={onClose} type="button">
              Cancel
            </button>

            <button className="dashboard-profile-form__primary" disabled={isSaving} type="submit">
              {isSaving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProfileModal
