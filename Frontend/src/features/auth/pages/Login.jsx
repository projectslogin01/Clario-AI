import React from 'react'

import AuthCard from '../components/AuthCard'
import { LockIcon, MailIcon } from '../components/AuthIcons'

const loginFields = [
  {
    id: 'login-email',
    name: 'email',
    label: 'Email address',
    placeholder: 'Email address',
    type: 'email',
    autoComplete: 'email',
    icon: MailIcon,
  },
  {
    id: 'login-password',
    name: 'password',
    label: 'Password',
    placeholder: 'Password',
    type: 'password',
    autoComplete: 'current-password',
    icon: LockIcon,
  },
]

const Login = () => {
  return (
    <AuthCard
      auxiliary={
        <>
          <label className="auth-check" htmlFor="remember-login">
            <input className="auth-check__input" id="remember-login" name="remember" type="checkbox" />
            <span>Remember me</span>
          </label>

          <button className="auth-text-action" type="button">
            Forgot password?
          </button>
        </>
      }
      fields={loginFields}
      footerLinkLabel="Sign up"
      footerLinkTo="/register"
      footerText="Don't have an account?"
      submitLabel="Sign in to account"
      subtitle="Sign in to continue your AI journey"
      title="Welcome back"
    />
  )
}

export default Login
