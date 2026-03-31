import { useDispatch } from 'react-redux'
import { getGoogleAuthUrl, getme, login, logout, register, resendVerification, updateProfile } from '../service/auth.api'
import { setUser, setError, setInitialized, setLoading } from '../auth.slice'
import { resolveAvatarUrl } from '../../../utils/avatar'

const AUTH_SESSION_KEY = 'clario_ai_has_session'

// Keeps the UI layer simple by turning backend responses into Redux state updates.
/**
 * Builds a readable error message from backend responses or network failures.
 * @param {any} error
 * @param {string} fallbackMessage
 * @returns {string}
 */
const getApiErrorMessage = (error, fallbackMessage) => {
  return error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || fallbackMessage
}

const isUnauthorizedError = (error) => error?.response?.status === 401

const getStorage = () => {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage
}

const saveSessionHint = () => {
  getStorage()?.setItem(AUTH_SESSION_KEY, 'true')
}

const clearSessionHint = () => {
  getStorage()?.removeItem(AUTH_SESSION_KEY)
}

const hasSessionHint = () => getStorage()?.getItem(AUTH_SESSION_KEY) === 'true'

const hasGoogleAuthFlag = () => {
  if (typeof window === 'undefined') {
    return false
  }

  return new URLSearchParams(window.location.search).get('google') === '1'
}

const clearGoogleAuthFlag = () => {
  if (typeof window === 'undefined') {
    return
  }

  const url = new URL(window.location.href)

  if (!url.searchParams.has('google')) {
    return
  }

  url.searchParams.delete('google')
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`)
}

/**
 * Login currently returns `userrname` while other endpoints use `username`.
 * This helper keeps the frontend working with one consistent field.
 * @param {Record<string, any> | null | undefined} user
 * @returns {Record<string, any> | null}
 */
const normalizeUser = (user) => {
  if (!user) {
    return null
  }

  return {
    ...user,
    avatar: resolveAvatarUrl(user.avatar),
    username: user.username ?? user.userrname ?? '',
  }
}

/**
 * Shared auth hook that connects pages to the API layer and Redux updates.
 */
export function useAuth() {
  const dispatch = useDispatch()

  /**
   * Registers a user and returns the backend response for page-level UI handling.
   * @param {{ email: string, username: string, password: string }} payload
   */
  async function handleRegister({ email, username, password }) {
    try {
      dispatch(setLoading(true))
      dispatch(setError(null))
      const data = await register({ email, username, password })
      dispatch(setInitialized(true))
      return data
    } catch (error) {
      dispatch(setError(getApiErrorMessage(error, 'Registration failed')))
      return null
    } finally {
      dispatch(setLoading(false))
    }
  }

  /**
   * Resends a verification email without changing global loading state.
   * @param {{ email: string }} payload
   */
  async function handleResendVerification({ email }) {
    try {
      dispatch(setError(null))
      return await resendVerification({ email })
    } catch (error) {
      dispatch(setError(getApiErrorMessage(error, 'Could not resend verification email')))
      return null
    }
  }

  /**
   * Logs the user in, stores the normalized user in Redux, and returns the raw response.
   * @param {{ email: string, password: string }} payload
   */
  async function handleLogin({ email, password }) {
    try {
      dispatch(setLoading(true))
      dispatch(setError(null))
      const data = await login({ email, password })
      saveSessionHint()
      dispatch(setUser(normalizeUser(data.user)))
      dispatch(setInitialized(true))
      return data
    } catch (error) {
      clearSessionHint()
      dispatch(setError(getApiErrorMessage(error, 'Login failed')))
      return null
    } finally {
      dispatch(setLoading(false))
    }
  }

  /**
   * Loads the current authenticated user from the backend auth cookie.
   */
  async function handleGetme() {
    try {
      dispatch(setLoading(true))
      dispatch(setError(null))
      const data = await getme()
      saveSessionHint()
      dispatch(setUser(normalizeUser(data.user)))
      clearGoogleAuthFlag()
      return data
    } catch (error) {
      clearSessionHint()
      dispatch(setUser(null))

      if (!isUnauthorizedError(error)) {
        dispatch(setError(getApiErrorMessage(error, 'Failed to fetch user data')))
      }

      return null
    } finally {
      dispatch(setLoading(false))
      dispatch(setInitialized(true))
    }
  }

  /**
   * Initializes auth state when the app starts.
   * Logged-out visitors skip the backend call, while returning users still refresh from the server.
   */
  async function handleAppStart() {
    if (!hasSessionHint() && !hasGoogleAuthFlag()) {
      dispatch(setError(null))
      dispatch(setUser(null))
      dispatch(setLoading(false))
      dispatch(setInitialized(true))
      return null
    }

    return handleGetme()
  }

  /**
   * Clears the backend session cookie and resets auth state locally.
   */
  async function handleLogout() {
    try {
      dispatch(setLoading(true))
      dispatch(setError(null))
      await logout()
      return true
    } catch (error) {
      if (!isUnauthorizedError(error)) {
        dispatch(setError(getApiErrorMessage(error, 'Logout failed')))
      }

      return false
    } finally {
      clearSessionHint()
      dispatch(setUser(null))
      dispatch(setLoading(false))
      dispatch(setInitialized(true))
    }
  }

  /**
   * Updates the current user's profile and keeps Redux in sync.
   * @param {{ username: string, avatarFile?: File | null }} payload
   */
  async function handleUpdateProfile({ username, avatarFile }) {
    try {
      dispatch(setLoading(true))
      dispatch(setError(null))
      const data = await updateProfile({ username, avatarFile })
      dispatch(setUser(normalizeUser(data.user)))
      dispatch(setInitialized(true))
      return data
    } catch (error) {
      dispatch(setError(getApiErrorMessage(error, 'Profile update failed')))
      return null
    } finally {
      dispatch(setLoading(false))
    }
  }

  function handleGoogleLogin(screen = 'login') {
    if (typeof window === 'undefined') {
      return
    }

    window.location.href = getGoogleAuthUrl(screen)
  }

  return { handleAppStart, handleGetme, handleGoogleLogin, handleLogin, handleLogout, handleRegister, handleResendVerification, handleUpdateProfile }
}
