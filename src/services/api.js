/**
 * WordPress Headless API service layer.
 * Replace BASE_URL and endpoints when the backend is ready.
 */

const BASE_URL = import.meta.env.VITE_WP_API_URL || ''

const defaultHeaders = {
  'Content-Type': 'application/json',
}

async function request(endpoint, options = {}) {
  if (!BASE_URL) {
    throw new Error('VITE_WP_API_URL is not configured yet.')
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return response.json()
}

export const wpApi = {
  /**
   * @returns {Promise<Array>}
   */
  getFigures: () => request('/wp-json/wp/v2/figures'),

  /**
   * @param {string} token
   * @returns {Promise<object>}
   */
  getProfile: (token) =>
    request('/wp-json/album/v1/profile', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  /**
   * @param {{ username: string, password: string }} credentials
   * @returns {Promise<object>}
   */
  login: (credentials) =>
    request('/wp-json/jwt-auth/v1/token', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  /**
   * @param {number} figureId
   * @param {FormData} photo
   * @returns {Promise<object>}
   */
  unlockFigure: (figureId, photo) =>
    request(`/wp-json/album/v1/figures/${figureId}/unlock`, {
      method: 'POST',
      body: photo,
    }),
}

export const isWpConfigured = () => Boolean(BASE_URL)
