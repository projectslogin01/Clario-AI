import { useDispatch } from 'react-redux'
import { login, register, getme } from '../service/auth.api'
import { setUser, setError, setLoading } from '../auth.slice'

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
      return data
    } catch (error) {
      dispatch(setError(getApiErrorMessage(error, 'Registration failed')))
      return null
    } finally {
      dispatch(setLoading(false))
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
      dispatch(setUser(normalizeUser(data.user)))
      return data
    } catch (error) {
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
      dispatch(setUser(normalizeUser(data.user)))
      return data
    } catch (error) {
      dispatch(setError(getApiErrorMessage(error, 'Failed to fetch user data')))
      return null
    } finally {
      dispatch(setLoading(false))
    }
  }

  return { handleGetme, handleLogin, handleRegister }
}
