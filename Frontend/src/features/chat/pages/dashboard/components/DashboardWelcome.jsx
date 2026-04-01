import React from 'react'
import { suggestionPrompts } from '../constants'
import DashboardTopbar from './DashboardTopbar'
import PromptComposer from './PromptComposer'
import SuggestionGrid from './SuggestionGrid'

function DashboardWelcome({
  avatar,
  avatarLabel,
  canSubmit,
  chatModels,
  draft,
  isListeningToVoice,
  isSidebarOpen,
  isStreaming,
  isVoiceInputSupported,
  isVoiceTranscribing,
  mode,
  onChange,
  onFilesSelected,
  onMenuToggle,
  onModeChange,
  onModelChange,
  onOpenProfile,
  onRemoveFile,
  onSubmit,
  onSuggestionClick,
  onVoiceInputToggle,
  selectedModel,
  selectedFiles,
  statusError,
  username,
  voiceStatus,
}) {
  return (
    <div className="dashboard-shell">
      <DashboardTopbar
        actionLabel="Chats"
        avatar={avatar}
        avatarLabel={avatarLabel}
        isSidebarOpen={isSidebarOpen}
        onAction={onMenuToggle}
        onMenuToggle={onMenuToggle}
        onProfileOpen={onOpenProfile}
        username={username}
      />

      <main className="dashboard-main">
        <section className="dashboard-hero" data-dashboard-intro>
          <h1 className="dashboard-hero__title">What do you want to know?</h1>
          <p className="dashboard-hero__copy">
            Ask anything. Your question will be sent to the backend AI service and the reply will appear here.
          </p>
        </section>

        {statusError ? <p className="dashboard-thread__status dashboard-thread__status--error">{statusError}</p> : null}

        <PromptComposer
          canSubmit={canSubmit}
          chatModels={chatModels}
          draft={draft}
          isListening={isListeningToVoice}
          isSending={isStreaming}
          isVoiceInputSupported={isVoiceInputSupported}
          isVoiceTranscribing={isVoiceTranscribing}
          mode={mode}
          onChange={onChange}
          onFilesSelected={onFilesSelected}
          onModeChange={onModeChange}
          onModelChange={onModelChange}
          onRemoveFile={onRemoveFile}
          onSubmit={onSubmit}
          onVoiceInputToggle={onVoiceInputToggle}
          selectedModel={selectedModel}
          selectedFiles={selectedFiles}
          voiceStatus={voiceStatus}
        />

        <SuggestionGrid onSuggestionClick={onSuggestionClick} suggestions={suggestionPrompts} />
      </main>
    </div>
  )
}

export default DashboardWelcome
