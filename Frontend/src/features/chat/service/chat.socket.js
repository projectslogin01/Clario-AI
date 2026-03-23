import { io } from 'socket.io-client'

const SOCKET_URL = 'http://localhost:5000'

let socket = null

export const connectSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      withCredentials: true,
    })

    socket.on('connect', () => {
      console.log('Connected to Socket.IO server')
    })
  }

  if (!socket.connected) {
    socket.connect()
  }

  return socket
}

export const disconnectSocket = () => {
  if (!socket) {
    return
  }

  socket.disconnect()
  socket = null
}
