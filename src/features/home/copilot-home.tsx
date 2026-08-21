"use client";

import Image from "next/image";
import {
  ArrowUp,
  Bell,
  BookOpen,
  Bug,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Cloud,
  Code2,
  Command,
  Database,
  FileCode2,
  Gauge,
  Globe2,
  History,
  Info,
  Menu,
  MessageCircle,
  MessageSquareText,
  Network,
  Paperclip,
  PanelRightOpen,
  Plus,
  Rocket,
  ScrollText,
  ServerCog,
  Settings2,
  ShieldCheck,
  Square,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";
import { FormEvent, RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChatWorkspace } from "@/features/chat/chat-workspace";
import { useLiaraConversation } from "@/features/chat/use-liara-conversation";
import { ConversationHistory } from "@/features/history/conversation-history";
import type { ConversationRecord } from "@/features/history/conversation-history-model";
import { useConversationHistory } from "@/features/history/use-conversation-history";
import { MAX_CHAT_MESSAGE_CHARACTERS, type UserContext } from "@/contracts";
import type { ConnectionMode } from "@/features/settings/copilot-preferences-model";
import { SettingsDialog } from "@/features/settings/settings-dialog";
import { useCopilotPreferences } from "@/features/settings/use-copilot-preferences";

import styles from "./copilot-home.module.css";

type NavigationItem = {
  label: string;
  icon: LucideIcon;
};

const navigation: NavigationItem[] = [
  { label: "Chat", icon: MessageCircle },
  { label: "Sources", icon: BookOpen },
  { label: "History", icon: History },
];

const suggestions = [
  { label: "Deploy Next.js", icon: Rocket, prompt: "How do I deploy a Next.js app on Liara?" },
  { label: "Debug a failed build", icon: Bug, prompt: "Help me debug a failed build on Liara." },
  { label: "Connect PostgreSQL", icon: Database, prompt: "How do I connect my app to PostgreSQL on Liara?" },
  { label: "Configure a domain", icon: Globe2, prompt: "How can I configure a custom domain on Liara?" },
  { label: "Setup environment variables", icon: Settings2, prompt: "How do I set up environment variables for my Liara app?" },
  { label: "Optimize deployment", icon: Gauge, prompt: "How can I optimize my deployment workflow on Liara?" },
  { label: "Configure CDN", icon: Network, prompt: "How do I configure a CDN for my application on Liara?" },
  { label: "Check application logs", icon: ScrollText, prompt: "Show me how to inspect application logs on Liara." },
  { label: "Scale application", icon: ServerCog, prompt: "How can I scale my application on Liara?" },
  { label: "Setup custom domain", icon: Globe2, prompt: "Guide me through setting up a custom domain on Liara." },
];

const benefits = [
  {
    title: "Official sources",
    description: "Answers grounded in official Liara documentation.",
    icon: FileCode2,
  },
  {
    title: "Context-aware",
    description: "Understands your stack and service context.",
    icon: Network,
  },
  {
    title: "Agentic guidance",
    description: "Proactive, step-by-step guidance to get things done.",
    icon: Target,
  },
  {
    title: "Developer-first",
    description: "Built for modern workflows and real-world problems.",
    icon: ShieldCheck,
  },
];

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? styles.compactBrandMark : styles.brandMark} aria-hidden="true">
      <span className={styles.brandHalo} />
      <Image src="/liara-logo.png" alt="" width={compact ? 40 : 76} height={compact ? 40 : 76} priority />
      {!compact && (
        <span className={styles.assistantBadge}>
          <MessageSquareText size={15} strokeWidth={1.8} />
        </span>
      )}
    </div>
  );
}

function Sidebar({
  collapsed,
  open,
  conversations,
  activeConversationId,
  historyLoading,
  onClose,
  onNewConversation,
  onSelectConversation,
  onRenameConversation,
  onDeleteConversation,
  onToggleArchiveConversation,
  onTogglePinConversation,
  onToggleCollapsed,
  onOpenSettings,
}: {
  collapsed: boolean;
  open: boolean;
  conversations: ConversationRecord[];
  activeConversationId: string | null;
  historyLoading: boolean;
  onClose: () => void;
  onNewConversation: () => void;
  onSelectConversation: (id: string) => void;
  onRenameConversation: (id: string, title: string) => void;
  onDeleteConversation: (id: string) => void;
  onToggleArchiveConversation: (id: string) => void;
  onTogglePinConversation: (id: string) => void;
  onToggleCollapsed: () => void;
  onOpenSettings: () => void;
}) {
  const [activeItem, setActiveItem] = useState("Chat");

  return (
    <>
      <button
        className={`${styles.sidebarBackdrop} ${open ? styles.sidebarBackdropVisible : ""}`}
        aria-label="Close navigation"
        onClick={onClose}
        type="button"
      />
      <aside
        id="primary-sidebar"
        className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ""} ${open ? styles.sidebarOpen : ""}`}
        aria-label="Primary navigation"
      >
        <div className={styles.sidebarTop}>
          <button
            className={styles.brandTrigger}
            type="button"
            onClick={onToggleCollapsed}
            aria-expanded={!collapsed}
            aria-controls="primary-sidebar"
            aria-label={collapsed ? "Open Liara Copilot sidebar" : "Collapse Liara Copilot sidebar"}
          >
            <BrandMark compact />
            <span className={styles.wordmark}>Liara <strong>Copilot</strong></span>
            <span className={styles.logoHoverPill} aria-hidden="true">
              {collapsed ? "Open sidebar" : "Collapse sidebar"}
            </span>
          </button>
          <button className={styles.mobileClose} type="button" onClick={onClose} aria-label="Close menu">
            <ChevronLeft size={20} />
          </button>
        </div>

        <button
          className={styles.newConversation}
          type="button"
          onClick={() => {
            setActiveItem("Chat");
            onNewConversation();
          }}
          data-active={(activeItem === "Chat" && activeConversationId === null) || undefined}
          aria-pressed={activeItem === "Chat" && activeConversationId === null}
          aria-label="New Chat"
          title={collapsed ? "New Chat" : undefined}
        >
          <Plus size={23} strokeWidth={1.7} aria-hidden="true" />
          <span>New Chat</span>
        </button>

        <nav className={styles.navList}>
          {navigation.map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              className={`${styles.navItem} ${activeItem === label ? styles.navItemActive : ""}`}
              onClick={() => setActiveItem(label)}
              aria-current={activeItem === label ? "page" : undefined}
              aria-label={label}
              title={collapsed ? label : undefined}
            >
              <Icon size={21} strokeWidth={1.75} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className={styles.sidebarDivider} />
        <section className={styles.recentSection} aria-labelledby="recent-heading">
          <h2 id="recent-heading">Recent conversations</h2>
          <ConversationHistory
            conversations={conversations}
            activeConversationId={activeConversationId}
            loading={historyLoading}
            onSelect={(id) => {
              setActiveItem("Chat");
              onSelectConversation(id);
            }}
            onRename={onRenameConversation}
            onDelete={onDeleteConversation}
            onToggleArchive={onToggleArchiveConversation}
            onTogglePin={onTogglePinConversation}
          />
        </section>

        <div className={styles.profileArea}>
          <button type="button" className={styles.profileButton} onClick={onOpenSettings} aria-haspopup="dialog">
            <span className={styles.avatar}>L</span>
            <span className={styles.profileCopy}>
              <strong>Liara Developer</strong>
              <small>developer@liara.cloud</small>
            </span>
            <ChevronDown size={17} />
          </button>
        </div>
      </aside>
    </>
  );
}

function Topbar({
  onOpenInspector,
  onOpenMenu,
  onOpenSettings,
  connectionMode,
  searchInputRef,
}: {
  onOpenInspector: () => void;
  onOpenMenu: () => void;
  onOpenSettings: () => void;
  connectionMode: ConnectionMode;
  searchInputRef: RefObject<HTMLInputElement | null>;
}) {
  const [searchValue, setSearchValue] = useState("");

  return (
    <header className={styles.topbar}>
      <button className={styles.mobileMenu} type="button" onClick={onOpenMenu} aria-label="Open navigation">
        <Menu size={21} />
      </button>
      <button className={styles.statusPill} type="button">
        <span className={styles.statusDot} />
        <span>Official Liara Docs</span>
        <span className={styles.statusSeparator}>•</span>
        <span>{connectionMode === "live" ? "Live API" : "Interface preview"}</span>
        <ChevronDown size={15} />
      </button>

      <label className={styles.searchBox}>
        <Command size={19} className={styles.commandIcon} />
        <input
          value={searchValue}
          ref={searchInputRef}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search or run a command..."
          aria-label="Search or run a command"
        />
        <span className={styles.searchShortcut}>⌘ K</span>
      </label>

      <div className={styles.topActions}>
        <button type="button" className={styles.iconButton} aria-label="Copilot updates"><Sparkles size={21} /></button>
        <button type="button" className={styles.iconButton} aria-label="Notifications"><Bell size={20} /></button>
        <button type="button" className={styles.iconButton} aria-label="Help"><CircleHelp size={20} /></button>
        <button type="button" className={styles.topAvatar} onClick={onOpenSettings} aria-label="Open Copilot preferences" aria-haspopup="dialog">L</button>
        <button type="button" className={styles.profileChevron} onClick={onOpenSettings} aria-label="Open Copilot preferences" aria-haspopup="dialog"><ChevronDown size={17} /></button>
      </div>
      <button
        className={styles.mobileInspector}
        type="button"
        onClick={onOpenInspector}
        aria-label="Open session inspector"
      >
        <PanelRightOpen size={20} />
      </button>
    </header>
  );
}

function ContextCard({
  userContext,
  onUpdateUserContext,
}: {
  userContext: UserContext;
  onUpdateUserContext: (patch: Partial<UserContext>) => void;
}) {

  return (
    <section className={styles.glassCard} aria-labelledby="context-title">
      <div className={styles.cardHeader}>
        <h2 id="context-title">Session context</h2>
        <Info size={18} />
      </div>
      <dl className={styles.contextList}>
        <div><dt>Framework</dt><dd>{userContext.framework ?? "Not set"}</dd></div>
        <div><dt>Runtime</dt><dd>{userContext.runtime ?? "Not set"}</dd></div>
        <div><dt>Service</dt><dd>{userContext.liaraService ?? "Not set"}</dd></div>
      </dl>
      <div className={styles.contextDivider} />
      <label className={styles.answerDepth}>
        <span>Answer depth</span>
        <select value={userContext.answerDepth ?? "balanced"} onChange={(event) => onUpdateUserContext({ answerDepth: event.target.value as UserContext["answerDepth"] })}>
          <option value="concise">Concise</option>
          <option value="balanced">Balanced</option>
          <option value="detailed">Detailed</option>
        </select>
        <ChevronDown size={15} aria-hidden="true" />
      </label>
    </section>
  );
}

function BenefitsCard() {
  return (
    <section className={`${styles.glassCard} ${styles.benefitsCard}`} aria-labelledby="benefits-title">
      <div className={styles.cardHeader}>
        <h2 id="benefits-title">Why Liara Copilot</h2>
      </div>
      <div className={styles.benefitList}>
        {benefits.map(({ title, description, icon: Icon }) => (
          <div className={styles.benefitItem} key={title}>
            <span className={styles.benefitIcon}><Icon size={20} strokeWidth={1.7} /></span>
            <div><h3>{title}</h3><p>{description}</p></div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HeroBenefits() {
  return (
    <div className={styles.heroBenefits} aria-label="Liara Copilot benefits">
      {benefits.map(({ title, icon: Icon }) => (
        <span className={styles.heroBenefit} key={title}>
          <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
          <span>{title}</span>
        </span>
      ))}
    </div>
  );
}

function PromptComposer({
  mode = "empty",
  onSubmitPrompt,
  showSuggestions = true,
  busy = false,
  sendOnEnter = true,
  onCancel,
  textareaRef,
}: {
  mode?: "empty" | "chat";
  onSubmitPrompt?: (prompt: string) => void;
  showSuggestions?: boolean;
  busy?: boolean;
  sendOnEnter?: boolean;
  onCancel?: () => void;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
}) {
  const [prompt, setPrompt] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = useMemo(() => prompt.trim().length > 0, [prompt]);

  function submitPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || busy) return;
    const nextPrompt = prompt.trim();
    setSubmitted(true);
    onSubmitPrompt?.(nextPrompt);
    setPrompt("");
    window.setTimeout(() => setSubmitted(false), 1800);
  }

  return (
    <div className={styles.composerRegion} data-chat-composer={mode === "chat" ? "" : undefined}>
      <form className={styles.promptShell} onSubmit={submitPrompt}>
        <div className={styles.promptInner}>
          <textarea
            value={prompt}
            ref={textareaRef}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              const shouldSend = event.key === "Enter" && (
                (sendOnEnter && !event.shiftKey) || (!sendOnEnter && (event.metaKey || event.ctrlKey))
              );
              if (shouldSend && !busy) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Ask about deployment, databases, domains, errors, or Liara services..."
            aria-label="Ask Liara Copilot"
            maxLength={MAX_CHAT_MESSAGE_CHARACTERS}
            rows={3}
          />
          <div className={styles.composerActions}>
            <div className={styles.composerTools}>
              <button type="button" aria-label="Attach file"><Paperclip size={20} /></button>
              <button type="button" aria-label="Add code snippet"><Code2 size={20} /></button>
            </div>
            <div className={styles.sendGroup}>
              <span>{busy ? "Generating — stop anytime" : submitted ? "Ready for your conversation" : sendOnEnter ? "Enter to send" : "Ctrl + Enter to send"}</span>
              <button
                type={busy ? "button" : "submit"}
                className={styles.sendButton}
                disabled={!busy && !canSubmit}
                onClick={busy ? onCancel : undefined}
                aria-label={busy ? "Stop generation" : "Send prompt"}
              >
                {busy ? <Square size={16} fill="currentColor" /> : submitted ? <Check size={21} /> : <ArrowUp size={22} />}
              </button>
            </div>
          </div>
        </div>
      </form>

      {showSuggestions && (
        <div className={styles.suggestionViewport} aria-label="Suggested prompts">
          <div className={styles.suggestionTrack}>
            {[false, true].map((isDuplicate) => (
              <div
                className={styles.suggestionGroup}
                aria-hidden={isDuplicate || undefined}
                key={isDuplicate ? "duplicate" : "primary"}
              >
                {suggestions.map(({ label, prompt: suggestionPrompt, icon: Icon }) => (
                  <button
                    className={styles.suggestionCard}
                    type="button"
                    key={label}
                    onClick={() => setPrompt(suggestionPrompt)}
                    tabIndex={isDuplicate ? -1 : 0}
                  >
                    <Icon size={19} strokeWidth={1.7} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AmbientBackground() {
  return (
    <div className={styles.ambient} aria-hidden="true">
      <div className={styles.auroraOne} />
      <div className={styles.auroraTwo} />
      <div className={styles.waveGrid} />
      <div className={styles.lightTrails} />
      <div className={styles.dustLayer} />
    </div>
  );
}

export function CopilotHome() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(true);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const copilotPreferences = useCopilotPreferences();
  const {
    chatEntries,
    busy,
    addChatEntry,
    retryEntry,
    cancelGeneration,
    resetConversation,
  } = useLiaraConversation({
    mode: copilotPreferences.preferences.connectionMode,
    userContext: copilotPreferences.preferences.userContext,
  });
  const conversationHistory = useConversationHistory();
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  function submitPrompt(prompt: string) {
    const conversationId = conversationHistory.registerPrompt(prompt);
    addChatEntry(prompt, conversationId);
  }

  function startNewConversation() {
    resetConversation();
    conversationHistory.startNewConversation();
    setSidebarOpen(false);
  }

  function selectConversation(id: string) {
    conversationHistory.selectConversation(id);
    if (window.matchMedia("(max-width: 1020px)").matches) setSidebarOpen(false);
  }

  function deleteConversation(id: string) {
    if (conversationHistory.activeConversationId === id) resetConversation();
    conversationHistory.deleteConversation(id);
  }

  function toggleArchiveConversation(id: string) {
    if (conversationHistory.activeConversationId === id) resetConversation();
    conversationHistory.toggleArchived(id);
  }

  function openMobileNavigation() {
    setMobileInspectorOpen(false);
    setSidebarCollapsed(false);
    setSidebarOpen(true);
  }

  function openSettings() {
    setSidebarOpen(false);
    setMobileInspectorOpen(false);
    setSettingsOpen(true);
  }

  function changeConnectionMode(mode: ConnectionMode) {
    resetConversation();
    conversationHistory.startNewConversation();
    copilotPreferences.setConnectionMode(mode);
  }

  useEffect(() => {
    function handleKeyboardShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      const target = event.target as HTMLElement | null;
      const editing = target?.matches("input, textarea, select, [contenteditable='true']");
      if (event.key === "/" && !editing && !settingsOpen) {
        event.preventDefault();
        composerRef.current?.focus();
      }

      if (event.key === "Escape" && !settingsOpen) {
        setSidebarOpen(false);
        setMobileInspectorOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyboardShortcut);
    return () => document.removeEventListener("keydown", handleKeyboardShortcut);
  }, [settingsOpen]);

  function openMobileInspector() {
    setSidebarOpen(false);
    setRightPanelCollapsed(false);
    setMobileInspectorOpen(true);
  }

  function toggleRightPanel() {
    if (window.matchMedia("(max-width: 1020px)").matches) {
      setMobileInspectorOpen(false);
      return;
    }

    setRightPanelCollapsed((collapsed) => !collapsed);
  }

  return (
    <main
      className={`${styles.appShell} ${sidebarCollapsed ? styles.sidebarIsCollapsed : ""} ${rightPanelCollapsed ? styles.rightPanelIsCollapsed : ""}`}
    >
      <Sidebar
        collapsed={sidebarCollapsed}
        open={sidebarOpen}
        conversations={conversationHistory.conversations}
        activeConversationId={conversationHistory.activeConversationId}
        historyLoading={conversationHistory.isLoading}
        onClose={() => setSidebarOpen(false)}
        onNewConversation={startNewConversation}
        onSelectConversation={selectConversation}
        onRenameConversation={conversationHistory.renameConversation}
        onDeleteConversation={deleteConversation}
        onToggleArchiveConversation={toggleArchiveConversation}
        onTogglePinConversation={conversationHistory.togglePinned}
        onToggleCollapsed={() => setSidebarCollapsed((collapsed) => !collapsed)}
        onOpenSettings={openSettings}
      />
      <button
        className={`${styles.rightDrawerBackdrop} ${mobileInspectorOpen ? styles.rightDrawerBackdropVisible : ""}`}
        type="button"
        aria-label="Close session inspector"
        onClick={() => setMobileInspectorOpen(false)}
      />
      <section className={styles.workspace}>
        <AmbientBackground />
        <Topbar
          onOpenMenu={openMobileNavigation}
          onOpenInspector={openMobileInspector}
          onOpenSettings={openSettings}
          connectionMode={copilotPreferences.preferences.connectionMode}
          searchInputRef={searchInputRef}
        />

        <div className={styles.contentLayout}>
          {chatEntries.length === 0 ? (
            <section className={styles.hero} aria-labelledby="home-heading">
              <div className={styles.heroCopy}>
                <BrandMark />
                <h1 id="home-heading">Build, deploy, and debug with <span>Liara</span></h1>
                <p>Your AI copilot for modern development.</p>
                <HeroBenefits />
              </div>
              <PromptComposer
                onSubmitPrompt={submitPrompt}
                busy={busy}
                onCancel={cancelGeneration}
                sendOnEnter={copilotPreferences.preferences.sendOnEnter}
                textareaRef={composerRef}
              />
            </section>
          ) : (
            <ChatWorkspace
              entries={chatEntries}
              onSuggestedPrompt={submitPrompt}
              onRetryEntry={retryEntry}
              composer={(
                <PromptComposer
                  mode="chat"
                  showSuggestions={false}
                  onSubmitPrompt={submitPrompt}
                  busy={busy}
                  onCancel={cancelGeneration}
                  sendOnEnter={copilotPreferences.preferences.sendOnEnter}
                  textareaRef={composerRef}
                />
              )}
            />
          )}

          <div className={`${styles.rightRailDock} ${mobileInspectorOpen ? styles.rightRailDockMobileOpen : ""}`}>
            <button
              className={styles.rightRailToggle}
              type="button"
              onClick={toggleRightPanel}
              aria-expanded={!rightPanelCollapsed}
              aria-label={rightPanelCollapsed ? "Expand session inspector" : "Collapse session inspector"}
              title={rightPanelCollapsed ? "Expand inspector" : "Collapse inspector"}
            >
              {mobileInspectorOpen || !rightPanelCollapsed ? (
                <ChevronRight size={18} strokeWidth={1.8} />
              ) : (
                <ChevronLeft size={18} strokeWidth={1.8} />
              )}
            </button>
            <aside className={styles.rightRail} aria-label="Copilot details">
              <ContextCard
                userContext={copilotPreferences.preferences.userContext}
                onUpdateUserContext={copilotPreferences.updateUserContext}
              />
              <BenefitsCard />
            </aside>
          </div>
        </div>

        <footer className={styles.footerStatus}>
          <span><Cloud size={19} /> Liara Cloud</span>
          <span className={styles.footerDivider} />
          <span><i /> All systems operational</span>
        </footer>
      </section>
      <SettingsDialog
        open={settingsOpen}
        preferences={copilotPreferences.preferences}
        onClose={closeSettings}
        onUpdateUserContext={copilotPreferences.updateUserContext}
        onConnectionModeChange={changeConnectionMode}
        onSendOnEnterChange={copilotPreferences.setSendOnEnter}
        onReset={copilotPreferences.resetPreferences}
      />
    </main>
  );
}
