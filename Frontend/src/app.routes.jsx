import React from 'react'
import { createBrowserRouter } from 'react-router-dom'

import AuthLayout from './features/auth/layouts/AuthLayout'
import Login from './features/auth/pages/Login'
import Register from './features/auth/pages/Register'
import Dashboard from './features/chat/pages/Dashboard'
import Protected from './features/auth/components/Protected'

// Central route table for the current auth experience.
export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      {
        path: '/login',
        element: <Login />,
      },
      {
        path: '/register',
        element: <Register />,
      },
    ],
  },
  {
    path: '/',
    element: (
      <Protected>
        <Dashboard />
      </Protected>
    ),
  },
])
