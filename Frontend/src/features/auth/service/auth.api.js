import axios from 'axios'

// Shared Axios client for auth requests. Cookies stay enabled for session-based auth.
const api = axios.create({
  baseURL: 'http://localhost:5000',
  withCredentials: true,
})

/**
 * Calls the backend register endpoint.
 * @param {{ email: string, username: string, password: string }} payload
 */
export async function register({ email, username, password }) {
  const response = await api.post('/api/auth/register', { email, username, password })

  return response.data
}

/**
 * Calls the backend login endpoint.
 * @param {{ email: string, password: string }} payload
 */
export async function login({ email, password }) {
  const response = await api.post('/api/auth/login', { email, password })

  return response.data
}

/**
 * Fetches the currently authenticated user from the backend.
 */
export async function getme() {
  const response = await api.get('/api/auth/get-me')

  return response.data
}
