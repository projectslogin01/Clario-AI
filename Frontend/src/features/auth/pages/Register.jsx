import React from 'react'

import AuthCard from '../components/AuthCard'
import { LockIcon, MailIcon, UserIcon } from '../components/AuthIcons'

const registerFields = [
  {
    id: 'register-name',
    name: 'name',
    label: 'Full name',
    placeholder: 'Full name',
    type: 'text',
    autoComplete: 'name',
    icon: UserIcon,
  },
  {
    id: 'register-email',
    name: 'email',
    label: 'Email address',
    placeholder: 'Email address',
    type: 'email',
    autoComplete: 'email',
    icon: MailIcon,
  },
  {
    id: 'register-password',
    name: 'password',
    label: 'Password',
    placeholder: 'Password',
    type: 'password',
    autoComplete: 'new-password',
    icon: LockIcon,
  },
  {
    id: 'register-confirm-password',
    name: 'confirmPassword',
    label: 'Confirm password',
    placeholder: 'Confirm password',
    type: 'password',
    autoComplete: 'new-password',
    icon: LockIcon,
  },
]

const Register = () => {
  return (
    <AuthCard
      auxiliary={
        <label className="auth-check" htmlFor="accept-terms">
          <input className="auth-check__input" id="accept-terms" name="terms" type="checkbox" />
          <span>I agree to the Terms and Privacy Policy</span>
        </label>
      }
      fields={registerFields}
      footerLinkLabel="Sign in"
      footerLinkTo="/login"
      footerText="Already have an account?"
      submitLabel="Create account"
      subtitle="Create a secure profile and start your AI journey"
      title="Create account"
    />
  )
}

export default Register
