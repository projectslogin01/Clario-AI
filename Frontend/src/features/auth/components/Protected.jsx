import React from 'react'
import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'

const Protected = ({ children }) => {
  const { loading, user } = useSelector((state) => state.auth)

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <Navigate replace to="/login" />
  }

  return children
}

export default Protected
