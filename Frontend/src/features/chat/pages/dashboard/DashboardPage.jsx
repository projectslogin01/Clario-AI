import React from 'react'
import DashboardSidebar from './components/DashboardSidebar'
import ProfileModal from './components/ProfileModal'
import DashboardThread from './components/DashboardThread'
import DashboardWelcome from './components/DashboardWelcome'
import ThemeToggleButton from './components/ThemeToggleButton'
import { useDashboardPage } from './useDashboardPage'
import { useDashboardMotion } from './useDashboardMotion'

function DashboardPage() {
  const page = useDashboardPage()
  const motionScopeRef = useDashboardMotion({
    isSidebarOpen: page.isSidebarOpen,
    isThreadView: page.hasActiveThread,
    messageCount: page.visibleMessages.length,
  })
  const sceneClassName = `dashboard-scene${page.isThemeTransitioning ? ' dashboard-scene--theme-shift' : ''}${
    page.hasActiveThread ? ' dashboard-scene--thread' : ''
  }${page.isSidebarOpen ? ' dashboard-scene--sidebar-open' : ''}`

  return (
    <div className={sceneClassName} ref={motionScopeRef}>
      <span aria-hidden="true" className="theme-transition-layer" />

      {page.isSidebarOpen ? (
        <button
          aria-label="Close menu"
          className="dashboard-sidebar-backdrop"
          onClick={page.handleSidebarClose}
          type="button"
        />
      ) : null}

      <DashboardSidebar
        avatar={page.avatar}
        avatarLabel={page.avatarLabel}
        currentChatId={page.currentChatId}
        deletingChatId={page.deletingChatId}
        isDeleting={page.isDeleting}
        isLoggingOut={page.isLoggingOut}
        isLoading={page.isLoading}
        isSidebarOpen={page.isSidebarOpen}
        onClose={page.handleSidebarClose}
        onDeleteChat={page.handleDeleteChat}
        onLogout={page.handleLogoutClick}
        onNewThread={page.handleStartNewThread}
        onOpenProfile={page.handleProfileOpen}
        onSelectChat={page.handleThreadSelect}
        recentChats={page.recentChats}
        savedChats={page.savedChats}
        username={page.username}
      />

      {page.hasActiveThread ? (
        <DashboardThread
          avatar={page.avatar}
          avatarLabel={page.avatarLabel}
          canSubmit={page.canSubmit}
          chatModels={page.chatModels}
          conversationEndRef={page.conversationEndRef}
          draft={page.draft}
          isListeningToVoice={page.isListeningToVoice}
          isSidebarOpen={page.isSidebarOpen}
          isStreaming={page.isStreaming}
          isThreadSaved={page.isCurrentChatSaved}
          isVoiceInputSupported={page.isVoiceInputSupported}
          isVoiceTranscribing={page.isVoiceTranscribing}
          messages={page.visibleMessages}
          mode={page.composerMode}
          onChange={page.handleDraftChange}
          onFilesSelected={page.handleFilesSelected}
          onMenuToggle={page.handleMenuToggle}
          onModeChange={page.handleComposerModeChange}
          onModelChange={page.handleChatModelChange}
          onOpenProfile={page.handleProfileOpen}
          onRemoveFile={page.handleRemoveFile}
          onSaveChat={page.handleSaveChatToggle}
          onStartNewThread={page.handleStartNewThread}
          onSubmit={page.handleSubmit}
          onVoiceInputToggle={page.handleVoiceInputToggle}
          selectedModel={page.selectedChatModel}
          selectedFiles={page.selectedFiles}
          statusError={page.statusError}
          threadTitle={page.threadTitle}
          username={page.username}
          voiceStatus={page.voiceStatus}
        />
      ) : (
        <DashboardWelcome
          avatar={page.avatar}
          avatarLabel={page.avatarLabel}
          canSubmit={page.canSubmit}
          chatModels={page.chatModels}
          draft={page.draft}
          isListeningToVoice={page.isListeningToVoice}
          isSidebarOpen={page.isSidebarOpen}
          isStreaming={page.isStreaming}
          isVoiceInputSupported={page.isVoiceInputSupported}
          isVoiceTranscribing={page.isVoiceTranscribing}
          mode={page.composerMode}
          onChange={page.handleDraftChange}
          onFilesSelected={page.handleFilesSelected}
          onMenuToggle={page.handleMenuToggle}
          onModeChange={page.handleComposerModeChange}
          onModelChange={page.handleChatModelChange}
          onOpenProfile={page.handleProfileOpen}
          onRemoveFile={page.handleRemoveFile}
          onSubmit={page.handleSubmit}
          onSuggestionClick={page.handleSuggestionClick}
          onVoiceInputToggle={page.handleVoiceInputToggle}
          selectedModel={page.selectedChatModel}
          selectedFiles={page.selectedFiles}
          statusError={page.statusError}
          username={page.username}
          voiceStatus={page.voiceStatus}
        />
      )}

      <ProfileModal
        initialAvatar={page.avatar}
        initialUsername={page.username}
        isOpen={page.isProfileOpen}
        isSaving={page.isProfileSaving}
        onClose={page.handleProfileClose}
        onSubmit={page.handleProfileSave}
      />

      <ThemeToggleButton nextTheme={page.nextTheme} onToggle={page.handleThemeToggle} theme={page.theme} />
    </div>
  )
}

export default DashboardPage
