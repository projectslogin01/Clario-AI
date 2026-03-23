import React, { useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'

import { MoonIcon, SunIcon } from '../components/AuthIcons'

const STORAGE_KEY = 'perplexity-auth-theme'

const getInitialTheme = () => {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const savedTheme = window.localStorage.getItem(STORAGE_KEY)

  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const AuthLayout = () => {
  const [theme, setTheme] = useState(getInitialTheme)
  const [isThemeTransitioning, setIsThemeTransitioning] = useState(false)
  const transitionTimeoutRef = useRef(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        window.clearTimeout(transitionTimeoutRef.current)
      }
    }
  }, [])

  const nextTheme = theme === 'light' ? 'dark' : 'light'

  const handleThemeToggle = () => {
    if (transitionTimeoutRef.current) {
      window.clearTimeout(transitionTimeoutRef.current)
    }

    setIsThemeTransitioning(true)
    setTheme(nextTheme)

    transitionTimeoutRef.current = window.setTimeout(() => {
      setIsThemeTransitioning(false)
      transitionTimeoutRef.current = null
    }, 520)
  }

  return (
    <div className={`auth-scene${isThemeTransitioning ? ' auth-scene--theme-shift' : ''}`}>
      <span aria-hidden="true" className="theme-transition-layer" />
      <Outlet />

      <button
        aria-label={`Switch to ${nextTheme} mode`}
        aria-pressed={theme === 'dark'}
        className="theme-toggle"
        onClick={handleThemeToggle}
        type="button"
      >
        {theme === 'light' ? (
          <MoonIcon className="theme-toggle__icon" />
        ) : (
          <SunIcon className="theme-toggle__icon" />
        )}
      </button>
    </div>
  )
}

export default AuthLayout
