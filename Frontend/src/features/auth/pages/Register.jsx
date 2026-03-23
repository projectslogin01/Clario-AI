import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

import AuthCard from '../components/AuthCard'
import { LockIcon, MailIcon, UserIcon } from '../components/AuthIcons'
import { useAuth } from '../hook/useAuth'

// Register page handles small UI-only checks before calling the shared auth hook.
const Register = () => {
  const navigate = useNavigate()
  const { handleRegister } = useAuth()
  const { error, loading } = useSelector((state) => state.auth)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    terms: false,
  })
  const [localMessage, setLocalMessage] = useState('')

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
          successMessage: 'Account created. Please verify your email before logging in.',
        },
      })
    }
  }

  const statusMessage = localMessage || error

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
      onSubmit={handleSubmit}
      statusMessage={statusMessage}
      statusTone="error"
      submitLabel={loading ? 'Creating account...' : 'Create account'}
      subtitle="Create a secure profile and start your AI journey"
      title="Create account"
      disabled={loading}
    />
  )
}

export default Register
