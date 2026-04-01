import React from 'react'
import { MoonIcon, SunIcon } from '../../../../auth/components/AuthIcons'

function ThemeToggleButton({ nextTheme, onToggle, theme }) {
  return (
    <button
      aria-label={`Switch to ${nextTheme} mode`}
      aria-pressed={theme === 'dark'}
      className="theme-toggle theme-toggle--dashboard"
      onClick={onToggle}
      type="button"
    >
      {theme === 'light' ? <MoonIcon className="theme-toggle__icon" /> : <SunIcon className="theme-toggle__icon" />}
    </button>
  )
}

export default ThemeToggleButton
