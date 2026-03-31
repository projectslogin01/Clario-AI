import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'

import AuthCard from '../components/AuthCard'
import { LockIcon, MailIcon } from '../components/AuthIcons'
import { useAuth } from '../hook/useAuth'

// Login page owns only local form state. API and Redux details stay inside useAuth.
const Login = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { handleGoogleLogin, handleLogin, handleResendVerification, handleVerifyAccount } = useAuth()
  const { error, loading, user } = useSelector((state) => state.auth)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [successMessage, setSuccessMessage] = useState(location.state?.successMessage || '')
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState(location.state?.pendingVerificationEmail || '')
  const [googleError, setGoogleError] = useState(new URLSearchParams(location.search).get('googleError') || '')
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isResendingVerification, setIsResendingVerification] = useState(false)

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

    if (pendingVerificationEmail) {
      setPendingVerificationEmail('')
    }

    if (googleError) {
      setGoogleError('')
    }
  }

  const handleSubmit = async () => {
    const data = await handleLogin({
      email: formData.email.trim(),
      password: formData.password,
    })

    if (data?.success) {
      navigate('/', { replace: true })
    }
  }

  function handleGoogleClick() {
    setIsGoogleLoading(true)
    handleGoogleLogin('login')
  }

  async function handleResendClick() {
    const email = pendingVerificationEmail || formData.email.trim()

    if (!email) {
      setSuccessMessage('Enter your email address first so we can resend the verification link.')
      return
    }

    setIsResendingVerification(true)

    try {
      const data = await handleResendVerification({ email })

      if (data?.success) {
        setSuccessMessage(data.message || 'Verification email sent. Please check your inbox.')
      }
    } finally {
      setIsResendingVerification(false)
    }
  }

  async function handleVerifyNowClick() {
    const email = formData.email.trim()
    const password = formData.password

    if (!email || !password) {
      setSuccessMessage('Enter both email and password first, then tap Verify now.')
      return
    }

    const data = await handleVerifyAccount({ email, password })

    if (data?.success) {
      navigate('/', { replace: true })
    }
  }

  const statusMessage = error || googleError || successMessage || (user ? 'You are logged in.' : '')
  const statusTone = error || googleError ? 'error' : 'success'
  const canVerifyNow = Boolean(formData.email.trim() && formData.password)


  return (
    <AuthCard
      auxiliary={
        <>
          <label className="auth-check" htmlFor="remember-login">
            <input className="auth-check__input" disabled={loading} id="remember-login" name="remember" type="checkbox" />
            <span>Remember me</span>
          </label>

          <div className="auth-actions-stack">
            {canVerifyNow ? (
              <button className="auth-text-action auth-text-action--strong" disabled={loading} onClick={handleVerifyNowClick} type="button">
                Verify now
              </button>
            ) : null}

            {pendingVerificationEmail ? (
              <button className="auth-text-action" disabled={loading || isResendingVerification} onClick={handleResendClick} type="button">
                {isResendingVerification ? 'Sending link...' : 'Resend verification email'}
              </button>
            ) : null}

            <button className="auth-text-action" disabled={loading} type="button">
              Forgot password?
            </button>
          </div>
        </>
      }
      fields={loginFields}
      footerLinkLabel="Sign up"
      footerLinkTo="/register"
      footerText="Don't have an account?"
      onFieldChange={handleChange}
      onGoogleClick={handleGoogleClick}
      onSubmit={handleSubmit}
      statusMessage={statusMessage}
      statusTone={statusTone}
      submitLabel={loading ? 'Signing in...' : 'Sign in to account'}
      subtitle="Sign in to continue your AI journey"
      title="Welcome back"
      disabled={loading}
      googleLabel="Sign in with Google"
      googleLoadingLabel="Opening Google..."
      isGoogleLoading={isGoogleLoading}
    />
  )
}

export default Login
