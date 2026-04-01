import React from 'react'
import ChatActionsBar from './ChatActionsBar'
import ConversationList from './ConversationList'
import DashboardTopbar from './DashboardTopbar'
import PromptComposer from './PromptComposer'

function DashboardThread({
  avatar,
  avatarLabel,
  canSubmit,
  chatModels,
  conversationEndRef,
  draft,
  isListeningToVoice,
  isSidebarOpen,
  isStreaming,
  isThreadSaved,
  isVoiceInputSupported,
  isVoiceTranscribing,
  messages,
  mode,
  onChange,
  onFilesSelected,
  onMenuToggle,
  onModeChange,
  onModelChange,
  onOpenProfile,
  onRemoveFile,
  onSaveChat,
  onStartNewThread,
  onSubmit,
  onVoiceInputToggle,
  selectedModel,
  selectedFiles,
  statusError,
  threadTitle,
  username,
  voiceStatus,
}) {
  return (
    <div className="dashboard-thread-page">
      <div className="dashboard-thread-page__header">
        <div className="dashboard-shell">
          <DashboardTopbar
            actionLabel="New chat"
            avatar={avatar}
            avatarLabel={avatarLabel}
            isSidebarOpen={isSidebarOpen}
            onAction={onStartNewThread}
            onMenuToggle={onMenuToggle}
            onProfileOpen={onOpenProfile}
            username={username}
          />
        </div>
      </div>

      <main className="dashboard-thread">
        <div className="dashboard-thread__scroll">
          <div className="dashboard-thread__inner">
            <div className="dashboard-thread__hero" data-dashboard-intro>
              <h1 className="dashboard-thread__title">{threadTitle}</h1>
              <p className="dashboard-thread__copy">
                Ask follow-up questions in the same thread and the backend will keep the conversation grouped.
              </p>
            </div>

            <ConversationList conversationEndRef={conversationEndRef} messages={messages} statusError={statusError} />

            {messages.length ? (
              <ChatActionsBar
                isSaved={isThreadSaved}
                messages={messages}
                onSaveToggle={onSaveChat}
                threadTitle={threadTitle}
              />
            ) : null}
          </div>
        </div>

        <PromptComposer
          canSubmit={canSubmit}
          chatModels={chatModels}
          docked
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
      </main>
    </div>
  )
}
export default DashboardThread
