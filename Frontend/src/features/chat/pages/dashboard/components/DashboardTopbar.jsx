import React from 'react'
import { SparkleIcon } from '../../../../auth/components/AuthIcons'
import { MenuIcon } from './DashboardIcons'
import AvatarImage from './AvatarImage'

function DashboardTopbar({ actionLabel, avatar, avatarLabel, isSidebarOpen, onAction, onMenuToggle, onProfileOpen, username }) {
  return (
    <header className="dashboard-topbar">
      <div className="dashboard-topbar__left">
        <button
          aria-expanded={isSidebarOpen}
          aria-label="Open dashboard menu"
          className="dashboard-topbar__circle"
          onClick={onMenuToggle}
          type="button"
        >
          <MenuIcon className="dashboard-topbar__icon" />
        </button>

        <div className="dashboard-brand">
          <span className="dashboard-brand__badge" aria-hidden="true">
            <SparkleIcon className="dashboard-brand__icon" />
          </span>
          <span className="dashboard-brand__name">Clario AI</span>
        </div>
      </div>

      <div className="dashboard-topbar__actions">
        <button className="dashboard-topbar__link" onClick={onAction} type="button">
          {actionLabel}
        </button>

        <button aria-label={`${username} profile`} className="dashboard-avatar" onClick={onProfileOpen} type="button">
          <AvatarImage
            fallback={avatarLabel}
            fallbackClassName="dashboard-avatar__label"
            imageClassName="dashboard-avatar__image"
            src={avatar}
          />
        </button>
      </div>
    </header>
  )
}

export default DashboardTopbar
