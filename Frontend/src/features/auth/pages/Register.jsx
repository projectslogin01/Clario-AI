import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'

import AuthCard from '../components/AuthCard'
import { LockIcon, MailIcon, UserIcon } from '../components/AuthIcons'
import { useAuth } from '../hook/useAuth'

// Register page handles small UI-only checks before calling the shared auth hook.
const Register = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { handleGoogleLogin, handleRegister } = useAuth()
  const { error, loading } = useSelector((state) => state.auth)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    terms: false,
  })
  const [localMessage, setLocalMessage] = useState('')
  const [googleError, setGoogleError] = useState(new URLSearchParams(location.search).get('googleError') || '')
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const registerFields = [
    {
      id: 'register-username',
      name: 'username',
      label: 'Username',
      placeholder: 'Username',
      type: 'text',
      autoComplete: 'username',
      icon: UserIcon,
      value: formData.username,
      disabled: loading,
    },
    {
      id: 'register-email',
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
      id: 'register-password',
      name: 'password',
      label: 'Password',
      placeholder: 'Password',
      type: 'password',
      autoComplete: 'new-password',
      icon: LockIcon,
      value: formData.password,
      disabled: loading,
    },
    {
      id: 'register-confirm-password',
      name: 'confirmPassword',
      label: 'Confirm password',
      placeholder: 'Confirm password',
      type: 'password',
      autoComplete: 'new-password',
      icon: LockIcon,
      value: formData.confirmPassword,
      disabled: loading,
    },
  ]

  const handleChange = (event) => {
    const { checked, name, type, value } = event.target

    setFormData((currentFormData) => ({
      ...currentFormData,
      [name]: type === 'checkbox' ? checked : value,
    }))

    if (localMessage) {
      setLocalMessage('')
    }

    if (googleError) {
      setGoogleError('')
    }
  }

  const handleSubmit = async () => {
    if (!formData.terms) {
      setLocalMessage('Please accept the Terms and Privacy Policy.')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setLocalMessage('Passwords do not match.')
      return
    }

    const data = await handleRegister({
      username: formData.username.trim(),
      email: formData.email.trim(),
      password: formData.password,
    })

    // Backend requires email verification before login, so redirect with a helper note.
    if (data?.success) {
      navigate('/login', {
        replace: true,
        state: {
          pendingVerificationEmail: formData.email.trim(),
          successMessage: data.emailSent
            ? 'Account created. Please verify your email before logging in.'
            : 'Account created, but the verification email is delayed. You can resend it from the login page.',
        },
      })
    }
  }

  function handleGoogleClick() {
    setIsGoogleLoading(true)
    handleGoogleLogin('register')
  }

  const statusMessage = localMessage || error || googleError
  const statusTone = statusMessage ? 'error' : 'info'

  return (
    <AuthCard
      auxiliary={
        <label className="auth-check" htmlFor="accept-terms">
          <input
            checked={formData.terms}
            className="auth-check__input"
            disabled={loading}
            id="accept-terms"
            name="terms"
            onChange={handleChange}
            type="checkbox"
          />
          <span>I agree to the Terms and Privacy Policy</span>
        </label>
      }
      fields={registerFields}
      footerLinkLabel="Sign in"
      footerLinkTo="/login"
      footerText="Already have an account?"
      onFieldChange={handleChange}
      onGoogleClick={handleGoogleClick}
      onSubmit={handleSubmit}
      statusMessage={statusMessage}
      statusTone={statusTone}
      submitLabel={loading ? 'Creating account...' : 'Create account'}
      subtitle="Create a secure profile and start your AI journey"
      title="Create account"
      disabled={loading}
      googleLabel="Continue with Google"
      googleLoadingLabel="Opening Google..."
      isGoogleLoading={isGoogleLoading}
    />
  )
}

export default Register
