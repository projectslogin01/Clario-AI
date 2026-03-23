import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../features/auth/auth.slice'

// Central Redux store. Auth pages read loading, error, and user state from here.
export const store = configureStore({
  reducer: { auth: authReducer },
})
