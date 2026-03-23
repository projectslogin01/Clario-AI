import React from 'react'
import { useSelector } from 'react-redux'
import { useChat } from '../hook/useChat'

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth)

  useChat(Boolean(user))

  return (
    <div />
  )
}

export default Dashboard
