import React from 'react'
import { Link } from 'react-router-dom'

import { ArrowRightIcon, GoogleIcon, SparkleIcon } from './AuthIcons'

/**
 * Shared auth card used by both login and register pages.
 * The parent page provides the fields and submit behavior.
 */
const AuthCard = ({
  auxiliary,
  disabled,
  fields,
  footerLinkLabel,
  footerLinkTo,
  footerText,
  onFieldChange,
  onSubmit,
  statusMessage,
  statusTone = 'info',
  submitLabel,
  subtitle,
  title,
}) => {
  // Prevent full page reload and let the page decide what happens on submit.
  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit?.(event)
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

        {statusMessage ? (
          <p className={`auth-card__status auth-card__status--${statusTone}`} role="status">
            {statusMessage}
          </p>
        ) : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-form__fields">
            {fields.map((field) => {
              const FieldIcon = field.icon
              const fieldClassName = field.disabled || disabled ? 'auth-field auth-field--disabled' : 'auth-field'

              return (
                <label className={fieldClassName} htmlFor={field.id} key={field.id}>
                  <span className="sr-only">{field.label}</span>
                  <span className="auth-field__icon" aria-hidden="true">
                    <FieldIcon className="auth-icon" />
                  </span>
                  <input
                    autoComplete={field.autoComplete}
                    className="auth-field__input"
                    disabled={field.disabled || disabled}
                    id={field.id}
                    name={field.name}
                    onChange={onFieldChange}
                    placeholder={field.placeholder}
                    required={field.required ?? true}
                    type={field.type}
                    value={field.value ?? ''}
                  />
                </label>
              )
            })}
          </div>

          <div className="auth-form__auxiliary">{auxiliary}</div>

          <button className="auth-form__submit" disabled={disabled} type="submit">
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
