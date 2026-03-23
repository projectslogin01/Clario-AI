import { useEffect } from 'react'

import { connectSocket, disconnectSocket } from '../service/chat.socket'

// Keeps the dashboard focused on UI while the hook owns the socket lifecycle.
export const useChat = (shouldConnect) => {
  useEffect(() => {
    if (!shouldConnect) {
      return undefined
    }

    connectSocket()

    return () => {
      disconnectSocket()
    }
  }, [shouldConnect])
}
