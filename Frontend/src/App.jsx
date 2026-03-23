import React from 'react'
import { RouterProvider } from 'react-router-dom'

import { router } from './app.routes'

// The app is route-driven, so this component only mounts the router.
const App = () => <RouterProvider router={router} />

export default App
