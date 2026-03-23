import React from 'react'
import { Link } from 'react-router-dom'

import { ArrowRightIcon, GoogleIcon, SparkleIcon } from './AuthIcons'

const AuthCard = ({
  auxiliary,
  fields,
  footerLinkLabel,
  footerLinkTo,
  footerText,
  submitLabel,
  subtitle,
  title,
}) => {
  const handleSubmit = (event) => {
    event.preventDefault()
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <div className="auth-card__badge" aria-hidden="true">
          <SparkleIcon className="auth-card__badge-icon" />
        </div>

        <header className="auth-card__header">
          <h1 className="auth-card__title">{title}</h1>
          <p className="auth-card__subtitle">{subtitle}</p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-form__fields">
            {fields.map((field) => {
              const FieldIcon = field.icon

              return (
                <label className="auth-field" htmlFor={field.id} key={field.id}>
                  <span className="sr-only">{field.label}</span>
                  <span className="auth-field__icon" aria-hidden="true">
                    <FieldIcon className="auth-icon" />
                  </span>
                  <input
                    autoComplete={field.autoComplete}
                    className="auth-field__input"
                    id={field.id}
                    name={field.name}
                    placeholder={field.placeholder}
                    type={field.type}
                  />
                </label>
              )
            })}
          </div>

          <div className="auth-form__auxiliary">{auxiliary}</div>

          <button className="auth-form__submit" type="submit">
            <span>{submitLabel}</span>
            <ArrowRightIcon className="auth-form__submit-icon" />
          </button>

          <div className="auth-divider">
            <span>Or continue with</span>
          </div>

          <button className="auth-social" type="button">
            <GoogleIcon className="auth-social__icon" />
            <span>Google</span>
          </button>
        </form>

        <p className="auth-card__footer">
          <span>{footerText} </span>
          <Link className="auth-link" to={footerLinkTo}>
            {footerLinkLabel}
          </Link>
        </p>
      </div>
    </section>
  )
}

export default AuthCard
