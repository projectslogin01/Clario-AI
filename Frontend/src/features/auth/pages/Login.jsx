import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { useLocation } from 'react-router-dom'

import AuthCard from '../components/AuthCard'
import { LockIcon, MailIcon } from '../components/AuthIcons'
import { useAuth } from '../hook/useAuth'

// Login page owns only local form state. API and Redux details stay inside useAuth.
const Login = () => {
  const location = useLocation()
  const { handleLogin } = useAuth()
  const { error, loading, user } = useSelector((state) => state.auth)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [successMessage, setSuccessMessage] = useState(location.state?.successMessage || '')

  const loginFields = [
    {
      id: 'login-email',
      name: 'email',
      label: 'Email address',
      placeholder: 'Email address',
      type: 'email',
      autoComplete: 'email',
      icon: MailIcon,
      value: formData.email,
      disabled: loading,
    },
    {
      id: 'login-password',
      name: 'password',
      label: 'Password',
      placeholder: 'Password',
      type: 'password',
      autoComplete: 'current-password',
      icon: LockIcon,
      value: formData.password,
      disabled: loading,
    },
  ]

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData((currentFormData) => ({
      ...currentFormData,
      [name]: value,
    }))

    if (successMessage) {
      setSuccessMessage('')
    }
  }

  const handleSubmit = async () => {
    const data = await handleLogin({
      email: formData.email.trim(),
      password: formData.password,
    })

    // Successful register redirects also land here with a friendly message.
    if (data?.success) {
      setSuccessMessage(`Welcome back, ${data.user?.username ?? data.user?.userrname ?? 'user'}!`)
    }
  }

  const statusMessage = error || successMessage || (user ? 'You are logged in.' : '')
  const statusTone = error ? 'error' : 'success'

  return (
    <AuthCard
      auxiliary={
        <>
          <label className="auth-check" htmlFor="remember-login">
            <input className="auth-check__input" disabled={loading} id="remember-login" name="remember" type="checkbox" />
            <span>Remember me</span>
          </label>

          <button className="auth-text-action" disabled={loading} type="button">
            Forgot password?
          </button>
        </>
      }
      fields={loginFields}
      footerLinkLabel="Sign up"
      footerLinkTo="/register"
      footerText="Don't have an account?"
      onFieldChange={handleChange}
      onSubmit={handleSubmit}
      statusMessage={statusMessage}
      statusTone={statusTone}
      submitLabel={loading ? 'Signing in...' : 'Sign in to account'}
      subtitle="Sign in to continue your AI journey"
      title="Welcome back"
      disabled={loading}
    />
  )
}

export default Login
