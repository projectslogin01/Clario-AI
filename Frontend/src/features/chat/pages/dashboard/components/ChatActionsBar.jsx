import React, { useEffect, useMemo, useState } from 'react'
import { copyText, downloadConversationPdf, formatConversationText } from '../helpers'
import { CopyIcon, DownloadIcon, SaveIcon } from './DashboardIcons'

function ChatActionsBar({ isSaved, messages, onSaveToggle, threadTitle }) {
  const [status, setStatus] = useState('')
  const transcript = useMemo(() => formatConversationText(messages, threadTitle), [messages, threadTitle])

  useEffect(() => {
    setStatus('')
  }, [threadTitle])

  async function handleCopy() {
    try {
      await copyText(transcript)
      setStatus('Conversation copied.')
    } catch {
      setStatus('Copy failed. Please try again.')
    }
  }

  async function handleSave() {
    try {
      const didUpdate = await onSaveToggle?.()

      if (!didUpdate) {
        setStatus('Could not update saved chats right now.')
        return
      }

      setStatus(isSaved ? 'Chat removed from saved chats.' : 'Chat saved in the menu.')
    } catch {
      setStatus('Could not update saved chats right now.')
    }
  }

  function handleDownloadPdf() {
    downloadConversationPdf(threadTitle || 'clario-ai-chat', transcript)
    setStatus('PDF download started.')
  }

  return (
    <div className="dashboard-chat-actions" data-dashboard-intro>
      <div className="dashboard-chat-actions__buttons">
        <button className="dashboard-chat-actions__button" onClick={handleCopy} type="button">
          <CopyIcon className="dashboard-chat-actions__icon" />
          <span>Copy</span>
        </button>

        <button
          className={`dashboard-chat-actions__button${isSaved ? ' dashboard-chat-actions__button--active' : ''}`}
          onClick={handleSave}
          type="button"
        >
          <SaveIcon className="dashboard-chat-actions__icon" />
          <span>{isSaved ? 'Saved' : 'Save'}</span>
        </button>

        <button className="dashboard-chat-actions__button" onClick={handleDownloadPdf} type="button">
          <DownloadIcon className="dashboard-chat-actions__icon" />
          <span>Download PDF</span>
        </button>
      </div>

      {status ? (
        <p aria-live="polite" className="dashboard-chat-actions__status">
          {status}
        </p>
      ) : null}
    </div>
  )
}

export default ChatActionsBar
