import axios from 'axios'

const API_BASE_URL = 'http://localhost:5000'

// Shared client for cookie-based chat requests.
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

const buildChatPayload = ({ chatId, message, model }) => ({
  message,
  ...(chatId ? { chatId } : {}),
  ...(model ? { model } : {}),
})

const getJsonErrorMessage = async (response) => {
  try {
    const data = await response.json()
    return data?.message || 'Request failed'
  } catch {
    return 'Request failed'
  }
}

/**
 * Loads the current user's chat list.
 */
export async function getChats() {
  const response = await api.get('/api/chats')
  return response.data
}

/**
 * Loads all messages for one saved chat thread.
 * @param {string} chatId
 */
export async function getChatMessages(chatId) {
  const response = await api.get(`/api/chats/${chatId}/messages`)
  return response.data
}

/**
 * Sends a normal chat message and waits for the full AI response.
 * @param {{ message: string, chatId?: string | null, model?: string | null }} payload
 */
export async function sendMessage(payload) {
  const response = await api.post('/api/chats/message', buildChatPayload(payload))
  return response.data
}

/**
 * Deletes a saved chat and all of its messages.
 * @param {string} chatId
 */
export async function deleteChat(chatId) {
  const response = await api.delete(`/api/chats/${chatId}`)
  return response.data
}

/**
 * Loads available AI models from the backend.
 */
export async function getModels() {
  const response = await api.get('/api/chats/models')
  return response.data
}

/**
 * Streams chat events from the backend SSE endpoint.
 * The callback receives objects shaped like: { event, data }.
 *
 * @param {{
 *   message: string,
 *   chatId?: string | null,
 *   model?: string | null,
 *   signal?: AbortSignal,
 *   onEvent?: (event: { event: string, data: any }) => void
 * }} payload
 */
export async function streamMessage({ chatId, message, model, onEvent, signal }) {
  const response = await fetch(`${API_BASE_URL}/api/chats/message/stream`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildChatPayload({ chatId, message, model })),
    signal,
  })

  if (!response.ok) {
    throw new Error(await getJsonErrorMessage(response))
  }

  if (!response.body) {
    throw new Error('Streaming is not available in this browser.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let currentEvent = 'message'

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const chunks = buffer.split('\n\n')
    buffer = chunks.pop() || ''

    for (const chunk of chunks) {
      const lines = chunk.split('\n')
      let dataLine = ''

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim()
        }

        if (line.startsWith('data: ')) {
          dataLine += line.slice(6)
        }
      }

      if (!dataLine) {
        continue
      }

      const parsedData = JSON.parse(dataLine)

      onEvent?.({
        event: currentEvent,
        data: parsedData,
      })

      if (currentEvent === 'error') {
        throw new Error(parsedData?.message || 'Streaming failed.')
      }

      currentEvent = 'message'
    }
  }
}
