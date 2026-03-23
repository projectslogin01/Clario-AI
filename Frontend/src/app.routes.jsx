import React from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'

import AuthLayout from './features/auth/layouts/AuthLayout'
import Login from './features/auth/pages/Login'
import Register from './features/auth/pages/Register'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AuthLayout />,
    children: [
      {
        index: true,
        element: <Navigate replace to="/login" />,
      },
      {
        path: 'login',
        element: <Login />,
      },
      {
        path: 'register',
        element: <Register />,
      },
      {
        path: '*',
        element: <Navigate replace to="/login" />,
      },
    ],
  },
])
