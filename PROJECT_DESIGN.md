# Project Design

## Project Overview

This project is a full-stack app with:

- a React + Vite frontend
- an Express + MongoDB backend
- cookie-based authentication
- email verification during registration
- a protected dashboard route
- Socket.IO for real-time chat connectivity

The current codebase is focused on a solid auth flow first, with the dashboard already prepared to open a real-time socket connection after login.

## Tech Stack

### Frontend

- React
- Vite
- React Router DOM
- Redux Toolkit
- React Redux
- Axios
- Socket.IO Client
- SCSS

### Backend

- Express
- MongoDB with Mongoose
- JWT
- Nodemailer
- Express Validator
- Socket.IO

## Current Architecture

### Frontend Structure

- `Frontend/src/App.jsx`
  - mounts the router and kicks off the initial `get-me` auth check
- `Frontend/src/app.routes.jsx`
  - defines auth routes under `AuthLayout`
  - protects the dashboard route at `/`
- `Frontend/src/app/app.store.js`
  - configures the Redux store
- `Frontend/src/features/auth/auth.slice.js`
  - stores `user`, `loading`, and `error`
- `Frontend/src/features/auth/hook/useAuth.js`
  - connects auth pages to the API layer and Redux
- `Frontend/src/features/auth/service/auth.api.js`
  - contains Axios calls for register, login, and get-me
- `Frontend/src/features/auth/components/Protected.jsx`
  - blocks unauthenticated users from opening `/`
- `Frontend/src/features/auth/layouts/AuthLayout.jsx`
  - shared auth route layout with theme toggle and outlet
- `Frontend/src/features/auth/pages/Login.jsx`
  - logs the user in and redirects to `/` on success
- `Frontend/src/features/auth/pages/Register.jsx`
  - creates an account and redirects to `/login` with a verification note
- `Frontend/src/features/chat/pages/Dashboard.jsx`
  - dashboard shell for authenticated users
  - starts chat socket lifecycle only when a user exists
- `Frontend/src/features/chat/hook/useChat.js`
  - keeps the socket connect/disconnect lifecycle in one small hook
- `Frontend/src/features/chat/service/chat.socket.js`
  - owns the Socket.IO client instance
  - exposes simple `connectSocket` and `disconnectSocket` helpers

### Backend Structure

- `Backend/server.js`
  - creates the shared HTTP server
  - attaches Socket.IO to that server
  - connects to MongoDB
  - starts listening with `httpServer.listen(...)`
- `Backend/src/app.js`
  - configures Express middleware, CORS, and API routes
- `Backend/src/routes/auth.routes.js`
  - auth endpoints
- `Backend/src/controllers/auth.controller.js`
  - register, verify-email, login, and get-me logic
- `Backend/src/models/user.model.js`
  - user schema and password hashing
- `Backend/src/services/mail.service.js`
  - email transport and helper logic
- `Backend/src/config/database.js`
  - MongoDB connection setup
- `Backend/src/sockets/server.socket.js`
  - initializes the Socket.IO server and listens for new connections

## Routing Flow

### Auth Routes

- `/login`
  - rendered inside `AuthLayout`
- `/register`
  - rendered inside `AuthLayout`

### Protected Route

- `/`
  - wrapped by `Protected`
  - opens the dashboard only when `state.auth.user` exists
  - redirects to `/login` when the user is missing

## Authentication Flow

### Register

1. User enters username, email, password, and confirm password.
2. Frontend checks terms acceptance and password confirmation.
3. Frontend sends `{ username, email, password }` to the backend.
4. Backend creates the user and sends a verification email.
5. Frontend redirects to `/login` with a success message in route state.

### Verify Email

1. User opens the email verification link.
2. Backend verifies the token.
3. Backend marks the account as verified.

### Login

1. User enters email and password.
2. Frontend sends `{ email, password }`.
3. Backend validates the credentials and verified status.
4. Backend sends the auth cookie and user payload.
5. Frontend stores the user in Redux.
6. Frontend redirects to `/`.

## Socket Flow

1. `Backend/server.js` creates `httpServer` from the Express app.
2. `initSocket(httpServer)` attaches Socket.IO to that same server.
3. The backend starts with `httpServer.listen(PORT)`.
4. `Dashboard.jsx` calls `useChat(Boolean(user))`.
5. `useChat` connects the socket when the dashboard is mounted for an authenticated user.
6. `useChat` disconnects the socket when the dashboard unmounts.

This setup avoids the earlier issue where Socket.IO returned `404` because the Express app and the Socket.IO server were not listening on the same HTTP server.

## Recent Cleanup

- login now redirects to `/` after a successful sign-in
- dashboard access is protected by `Protected.jsx`
- auth pages are now mounted through `AuthLayout`
- chat socket code was simplified into clear connect/disconnect helpers
- backend startup now correctly listens through the Socket.IO-enabled `httpServer`
- project documentation was refreshed to match the current codebase

## Important Notes

### Email Verification

- registration does not auto-login
- users must verify email before login succeeds

### Local Development URLs

- frontend socket and API calls currently target `http://localhost:5000`
- local frontend origins are allowed in the backend CORS config

### Current Tradeoffs

- frontend API and socket URLs are still hardcoded for local development
- logout flow has not been added yet
- the dashboard is still a shell page and does not yet render chat UI

## Quick Run Checklist

### Backend

1. Add env values in `Backend/.env`.
2. Run the backend server.
3. Confirm port `5000` is active.
4. Confirm the server logs both the Express startup and Socket.IO startup messages.

### Frontend

1. Run the Vite frontend.
2. Open `/register` and create an account.
3. Verify the account through email.
4. Open `/login` and sign in.
5. Confirm the app redirects to `/`.
6. Confirm the browser console shows `Connected to Socket.IO server`.

## Summary

The project currently has:

- a working auth flow with verification
- Redux-backed user state
- protected dashboard routing
- Socket.IO wired between frontend and backend
- a shared auth layout and reusable auth UI

This file is the current design snapshot for the project as of the latest routing and socket integration updates.
