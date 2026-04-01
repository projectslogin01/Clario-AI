import React, { useEffect, useRef } from 'react'
import { SparkleIcon } from '../../../../auth/components/AuthIcons'
import { COMPOSER_MODE } from '../constants'
import { ArrowRightIcon, FileIcon, ImageIcon, MicIcon, PaperclipIcon, SearchIcon } from './DashboardIcons'

function PromptComposer({
  canSubmit = false,
  chatModels = [],
  draft,
  isListening = false,
  isSending,
  isVoiceInputSupported = false,
  isVoiceTranscribing = false,
  mode,
  onChange,
  onFilesSelected,
  onModeChange,
  onModelChange,
  onRemoveFile,
  onSubmit,
  onVoiceInputToggle,
  selectedModel = '',
  selectedFiles = [],
  voiceStatus = '',
  docked = false,
}) {
  const formRef = useRef(null)
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)
  const maxTextareaHeight = 220
  const voiceStatusClassName = `dashboard-composer__voice-status${
    voiceStatus && !isListening && !isVoiceTranscribing ? ' dashboard-composer__voice-status--error' : ''
  }`

  const updateDockedHeight = () => {
    if (!docked || !formRef.current) {
      return
    }

    const scene = formRef.current.closest('.dashboard-scene')

    if (!scene) {
      return
    }

    scene.style.setProperty('--dashboard-docked-height', `${formRef.current.offsetHeight}px`)
  }

  const resizeTextarea = () => {
    const textarea = textareaRef.current

    if (!textarea) {
      return
    }

    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxTextareaHeight)}px`
    textarea.style.overflowY = textarea.scrollHeight > maxTextareaHeight ? 'auto' : 'hidden'

    updateDockedHeight()
  }

  useEffect(() => {
    resizeTextarea()
  }, [draft, mode, docked, selectedModel])

  useEffect(() => {
    if (!docked || !formRef.current) {
      return undefined
    }

    updateDockedHeight()

    if (typeof ResizeObserver === 'undefined') {
      return () => {
        const scene = formRef.current?.closest('.dashboard-scene')

        if (scene) {
          scene.style.removeProperty('--dashboard-docked-height')
        }
      }
    }

    const observer = new ResizeObserver(() => {
      updateDockedHeight()
    })

    observer.observe(formRef.current)

    return () => {
      observer.disconnect()

      const scene = formRef.current?.closest('.dashboard-scene')

      if (scene) {
        scene.style.removeProperty('--dashboard-docked-height')
      }
    }
  }, [docked])

  return (
    <form
      className={`dashboard-composer${docked ? ' dashboard-composer--dock' : ''}`}
      data-dashboard-intro={!docked ? true : undefined}
      onSubmit={onSubmit}
      ref={formRef}
    >
      <div className="dashboard-composer__toolbar">
        <div className="dashboard-mode-toggle" role="tablist" aria-label="Composer mode">
          <button
            aria-selected={mode === COMPOSER_MODE.CHAT}
            className={`dashboard-mode-toggle__button${
              mode === COMPOSER_MODE.CHAT ? ' dashboard-mode-toggle__button--active' : ''
            }`}
            onClick={() => onModeChange(COMPOSER_MODE.CHAT)}
            role="tab"
            type="button"
          >
            <SparkleIcon className="dashboard-mode-toggle__icon" />
            <span>Chat</span>
          </button>

          <button
            aria-selected={mode === COMPOSER_MODE.IMAGE}
            className={`dashboard-mode-toggle__button${
              mode === COMPOSER_MODE.IMAGE ? ' dashboard-mode-toggle__button--active' : ''
            }`}
            onClick={() => onModeChange(COMPOSER_MODE.IMAGE)}
            role="tab"
            type="button"
          >
            <ImageIcon className="dashboard-mode-toggle__icon" />
            <span>Free Image</span>
          </button>
        </div>

        {mode === COMPOSER_MODE.CHAT && chatModels.length > 0 ? (
          <div className="dashboard-composer__select-wrap">
            <label className="sr-only" htmlFor={docked ? 'dashboard-model-docked' : 'dashboard-model'}>
              Select chat model
            </label>
            <select
              className="dashboard-composer__select"
              id={docked ? 'dashboard-model-docked' : 'dashboard-model'}
              onChange={(event) => onModelChange?.(event.target.value)}
              value={selectedModel}
            >
              {chatModels.map((chatModel) => (
                <option key={chatModel.alias} value={chatModel.alias}>
                  {chatModel.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <div className="dashboard-composer__field">
        <SearchIcon className="dashboard-composer__search" />

        <label className="sr-only" htmlFor={docked ? 'dashboard-question-docked' : 'dashboard-question'}>
          Ask a question
        </label>
        <textarea
          className="dashboard-composer__input"
          enterKeyHint={mode === COMPOSER_MODE.IMAGE ? 'go' : 'send'}
          id={docked ? 'dashboard-question-docked' : 'dashboard-question'}
          onChange={(event) => onChange(event.target.value)}
          onInput={resizeTextarea}
          placeholder={mode === COMPOSER_MODE.IMAGE ? 'Describe the image you want to generate...' : 'Ask a question or search...'}
          ref={textareaRef}
          rows="1"
          value={draft}
        />
      </div>

      <div className="dashboard-composer__footer">
        <div className="dashboard-composer__controls">
          <button
            aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
            aria-pressed={isListening}
            className={`dashboard-composer__icon-button${
              isListening ? ' dashboard-composer__icon-button--active' : ''
            }`}
            disabled={(!isVoiceInputSupported && !isListening) || isVoiceTranscribing}
            onClick={onVoiceInputToggle}
            title={isVoiceInputSupported ? 'Voice input' : 'Voice input works in supported browsers like Chrome or Edge'}
            type="button"
          >
            <MicIcon className="dashboard-composer__icon" />
          </button>

          {mode === COMPOSER_MODE.CHAT ? (
            <>
              <button
                aria-label="Attach files"
                className="dashboard-composer__icon-button"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                <PaperclipIcon className="dashboard-composer__icon" />
              </button>

              <input
                accept="image/*,application/pdf,.pdf"
                className="sr-only"
                multiple
                onChange={(event) => {
                  onFilesSelected?.(Array.from(event.target.files || []))
                  event.target.value = ''
                }}
                ref={fileInputRef}
                type="file"
              />
            </>
          ) : null}

          <button
            aria-label={mode === COMPOSER_MODE.IMAGE ? 'Generate image' : 'Send question'}
            className="dashboard-composer__send"
            disabled={!canSubmit || isSending}
            type="submit"
          >
            <ArrowRightIcon className="dashboard-composer__send-icon" />
          </button>
        </div>
      </div>

      {mode === COMPOSER_MODE.CHAT && selectedFiles.length ? (
        <div className="dashboard-composer__attachments">
          {selectedFiles.map((selectedFile) => (
            <div className="dashboard-attachment-chip" key={selectedFile.id}>
              {selectedFile.previewUrl ? (
                <img alt={selectedFile.name} className="dashboard-attachment-chip__thumb" src={selectedFile.previewUrl} />
              ) : (
                <span className="dashboard-attachment-chip__thumb dashboard-attachment-chip__thumb--file">
                  <FileIcon className="dashboard-attachment-chip__thumb-icon" />
                </span>
              )}
              <span className="dashboard-attachment-chip__label">{selectedFile.name}</span>
              <button
                aria-label={`Remove ${selectedFile.name}`}
                className="dashboard-attachment-chip__remove"
                onClick={() => onRemoveFile?.(selectedFile.id)}
                type="button"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {voiceStatus ? (
        <p
          aria-live="polite"
          className={voiceStatusClassName}
          role={voiceStatusClassName.includes('--error') ? 'alert' : 'status'}
        >
          {voiceStatus}
        </p>
      ) : null}
    </form>
  )
}

export default PromptComposer
