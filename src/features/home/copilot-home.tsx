"use client";

import Image from "next/image";
import {
  ArrowUp,
  BookOpen,
  Bug,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Cloud,
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
  Palette,
  Paperclip,
  PanelRightOpen,
  Plus,
  Rocket,
  ScrollText,
  ServerCog,
  Settings2,
  ShieldCheck,
  Square,
  Target,
  type LucideIcon,
} from "lucide-react";
import { FormEvent, RefObject, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { ChatWorkspace } from "@/features/chat/chat-workspace";
import { SourcesSection } from "@/features/chat/sources-section";
import { getTextDirection } from "@/features/chat/text-direction";
import { useLiaraConversation } from "@/features/chat/use-liara-conversation";
import { ConversationHistory } from "@/features/history/conversation-history";
import { restoreChatEntries, type ConversationRecord } from "@/features/history/conversation-history-model";
import { useConversationHistory } from "@/features/history/use-conversation-history";
import { MAX_CHAT_MESSAGE_CHARACTERS, type UserContext } from "@/contracts";
import type { ConnectionMode } from "@/features/settings/copilot-preferences-model";
import { SettingsDialog } from "@/features/settings/settings-dialog";
import { useCopilotPreferences } from "@/features/settings/use-copilot-preferences";
import { useAccentTheme, type AccentTheme } from "@/features/settings/use-accent-theme";

import styles from "./copilot-home.module.css";
import { useApplicationHealth } from "./use-application-health";

type NavigationItem = {
  label: string;
  icon: LucideIcon;
};

type WorkspaceView = "Chat" | "Sources" | "History";

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

const accentThemes: Array<{ value: AccentTheme; label: string }> = [
  { value: "cyan", label: "Liara Cyan" },
  { value: "violet", label: "Liara Violet" },
  { value: "blue", label: "Liara Blue" },
  { value: "orange", label: "Liara Orange" },
  { value: "white", label: "Liara White" },
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

function SidebarTooltip({ id, label }: { id: string; label: string }) {
  return <span className={`${styles.controlTooltip} ${styles.sidebarTooltip}`} id={id} role="tooltip">{label}</span>;
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
  activeItem,
  onNavigate,
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
  activeItem: WorkspaceView;
  onNavigate: (view: WorkspaceView) => void;
}) {
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
            onNavigate("Chat");
            onNewConversation();
          }}
          data-active={(activeItem === "Chat" && activeConversationId === null) || undefined}
          aria-pressed={activeItem === "Chat" && activeConversationId === null}
          aria-label="New conversation"
          aria-describedby={collapsed ? "sidebar-new-chat-tooltip" : undefined}
        >
          <Plus size={23} strokeWidth={1.7} aria-hidden="true" />
          <span>New conversation</span>
          <SidebarTooltip id="sidebar-new-chat-tooltip" label="New conversation" />
        </button>

        <nav className={styles.navList}>
          {navigation.map(({ label, icon: Icon }) => {
            const tooltipId = `sidebar-${label.toLowerCase()}-tooltip`;

            return (
              <button
                key={label}
                type="button"
                className={`${styles.navItem} ${activeItem === label ? styles.navItemActive : ""}`}
                onClick={() => {
                  onNavigate(label as WorkspaceView);
                }}
                aria-current={activeItem === label ? "page" : undefined}
                aria-label={label}
                aria-describedby={collapsed ? tooltipId : undefined}
              >
                <Icon size={21} strokeWidth={1.75} />
                <span>{label}</span>
                <SidebarTooltip id={tooltipId} label={label} />
              </button>
            );
          })}
        </nav>

        <div className={styles.sidebarDivider} />
        <section className={styles.recentSection} id="conversation-history" aria-labelledby="recent-heading" tabIndex={-1}>
          <h2 id="recent-heading">Recent conversations</h2>
          <ConversationHistory
            conversations={conversations}
            activeConversationId={activeConversationId}
            loading={historyLoading}
            onSelect={(id) => {
              onSelectConversation(id);
            }}
            onRename={onRenameConversation}
            onDelete={onDeleteConversation}
            onToggleArchive={onToggleArchiveConversation}
            onTogglePin={onTogglePinConversation}
          />
        </section>

        <div className={styles.profileArea}>
          <button
            type="button"
            className={styles.profileButton}
            onClick={onOpenSettings}
            aria-haspopup="dialog"
            aria-describedby={collapsed ? "sidebar-settings-tooltip" : undefined}
          >
            <span className={styles.avatar}>L</span>
            <span className={styles.profileCopy}>
              <strong>Liara Developer</strong>
              <small>developer@liara.cloud</small>
            </span>
            <ChevronDown size={17} />
            <SidebarTooltip id="sidebar-settings-tooltip" label="Profile & settings" />
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
  onConnectionModeChange,
  accentTheme,
  onAccentThemeChange,
}: {
  onOpenInspector: () => void;
  onOpenMenu: () => void;
  onOpenSettings: () => void;
  connectionMode: ConnectionMode;
  onConnectionModeChange: (mode: ConnectionMode) => void;
  accentTheme: AccentTheme;
  onAccentThemeChange: (theme: AccentTheme) => void;
}) {
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!statusMenuOpen) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (!statusMenuRef.current?.contains(event.target as Node)) setStatusMenuOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setStatusMenuOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [statusMenuOpen]);

  useEffect(() => {
    if (!paletteOpen) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (!paletteRef.current?.contains(event.target as Node)) setPaletteOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setPaletteOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [paletteOpen]);

  return (
    <header className={styles.topbar}>
      <button className={styles.mobileMenu} type="button" onClick={onOpenMenu} aria-label="Open navigation">
        <Menu size={21} />
      </button>
      <div className={styles.statusMenu} ref={statusMenuRef}>
        <button className={styles.statusPill} type="button" onClick={() => setStatusMenuOpen((open) => !open)} aria-expanded={statusMenuOpen} aria-haspopup="menu">
          <span className={styles.statusDot} />
          <span>Official Liara Docs</span>
          <span className={styles.statusSeparator}>•</span>
          <span>{connectionMode === "live" ? "Live API" : "Interface preview"}</span>
          <ChevronDown size={15} />
        </button>
        {statusMenuOpen && (
          <div className={styles.statusDropdown} role="menu">
            <a href="https://docs.liara.ir/" target="_blank" rel="noreferrer" role="menuitem">Official Liara Docs</a>
            <button type="button" role="menuitemradio" aria-checked={connectionMode === "live"} onClick={() => { onConnectionModeChange("live"); setStatusMenuOpen(false); }}>Live API</button>
            <button type="button" role="menuitemradio" aria-checked={connectionMode === "preview"} onClick={() => { onConnectionModeChange("preview"); setStatusMenuOpen(false); }}>Interface preview</button>
          </div>
        )}
      </div>

      <div className={styles.topActions}>
        <a className={styles.iconButton} href="https://docs.liara.ir/" target="_blank" rel="noreferrer" aria-label="Open Liara help documentation"><CircleHelp size={20} /></a>
        <div className={styles.paletteMenu} ref={paletteRef}>
          <button type="button" className={styles.iconButton} onClick={() => setPaletteOpen((open) => !open)} aria-label="Change accent theme" title="Change accent theme" aria-haspopup="menu" aria-expanded={paletteOpen}><Palette size={20} /></button>
          {paletteOpen && (
            <div className={styles.paletteDropdown} role="menu" aria-label="Accent palette">
              {accentThemes.map((theme) => (
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={accentTheme === theme.value}
                  onClick={() => { onAccentThemeChange(theme.value); setPaletteOpen(false); }}
                  key={theme.value}
                >
                  <span className={styles.paletteSwatch} data-palette={theme.value} aria-hidden="true" />
                  <span>{theme.label}</span>
                  {accentTheme === theme.value && <Check size={14} aria-hidden="true" />}
                </button>
              ))}
            </div>
          )}
        </div>
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
  clarificationRequired = false,
  sendOnEnter = true,
  onCancel,
  textareaRef,
}: {
  mode?: "empty" | "chat";
  onSubmitPrompt?: (prompt: string) => void;
  showSuggestions?: boolean;
  busy?: boolean;
  clarificationRequired?: boolean;
  sendOnEnter?: boolean;
  onCancel?: () => void;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
}) {
  const [prompt, setPrompt] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const sendTooltipId = useId();

  const canSubmit = useMemo(() => prompt.trim().length > 0, [prompt]);

  function submitPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || busy || clarificationRequired) return;
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
            dir={getTextDirection(prompt)}
            ref={textareaRef}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              const shouldSend = event.key === "Enter" && (
                (sendOnEnter && !event.shiftKey) || (!sendOnEnter && (event.metaKey || event.ctrlKey))
              );
              if (shouldSend && !busy && !clarificationRequired) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder={clarificationRequired
              ? "Complete the clarification details above to continue."
              : "Ask about deployment, databases, domains, errors, or Liara services..."}
            aria-label="Ask Liara Copilot"
            disabled={clarificationRequired}
            maxLength={MAX_CHAT_MESSAGE_CHARACTERS}
            rows={3}
          />
          <div className={styles.composerActions}>
            <div className={styles.composerTools}>
              <button type="button" aria-label="File attachments are not available" title="File attachments are not available yet" disabled><Paperclip size={20} /></button>
            </div>
            <div className={styles.sendGroup}>
              <button
                type={busy ? "button" : "submit"}
                className={styles.sendButton}
                disabled={clarificationRequired || (!busy && !canSubmit)}
                onClick={busy ? onCancel : undefined}
                aria-label={busy ? "Stop generation" : "Send prompt"}
                aria-describedby={busy ? undefined : sendTooltipId}
              >
                {busy ? <Square size={16} fill="currentColor" /> : submitted ? <Check size={21} /> : <ArrowUp size={22} />}
              </button>
              {!busy && (
                <span className={`${styles.controlTooltip} ${styles.sendTooltip}`} id={sendTooltipId} role="tooltip">
                  Enter to send
                </span>
              )}
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
                    onClick={() => onSubmitPrompt?.(suggestionPrompt)}
                    disabled={busy || clarificationRequired}
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
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("Chat");
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const hydratedConversationRef = useRef<string | null>(null);
  const copilotPreferences = useCopilotPreferences();
  const accentTheme = useAccentTheme();
  const applicationHealth = useApplicationHealth();
  const {
    chatEntries,
    busy,
    addChatEntry,
    retryEntry,
    cancelGeneration,
    resetConversation,
    loadConversation,
  } = useLiaraConversation({
    mode: copilotPreferences.preferences.connectionMode,
    userContext: copilotPreferences.preferences.userContext,
  });
  const conversationHistory = useConversationHistory();
  const historyActiveConversationId = conversationHistory.activeConversationId;
  const historyConversations = conversationHistory.conversations;
  const historyIsLoading = conversationHistory.isLoading;
  const updateHistoryTranscript = conversationHistory.updateTranscript;
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const clarificationRequired = chatEntries.at(-1)?.agentState === "clarification_required";

  function submitPrompt(prompt: string) {
    const conversationId = conversationHistory.registerPrompt(prompt);
    hydratedConversationRef.current = conversationId;
    addChatEntry(prompt, conversationId);
  }

  function startNewConversation() {
    resetConversation();
    conversationHistory.startNewConversation();
    hydratedConversationRef.current = null;
    setWorkspaceView("Chat");
    setSidebarOpen(false);
  }

  function selectConversation(id: string) {
    const conversation = conversationHistory.conversations.find((item) => item.id === id);
    if (!conversation) return;
    conversationHistory.selectConversation(id);
    loadConversation(restoreChatEntries(conversation.entries));
    hydratedConversationRef.current = id;
    setWorkspaceView("Chat");
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
    hydratedConversationRef.current = null;
    copilotPreferences.setConnectionMode(mode);
    setWorkspaceView("Chat");
  }

  useEffect(() => {
    function handleKeyboardShortcut(event: KeyboardEvent) {
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

  function navigateTo(view: WorkspaceView) {
    setWorkspaceView(view);
    setSidebarOpen(false);
    if (view === "Chat") window.requestAnimationFrame(() => composerRef.current?.focus());
  }

  const selectedCitations = useMemo(() => chatEntries
    .flatMap((entry) => entry.citations ?? [])
    .filter((citation, index, items) => items.findIndex((item) => item.id === citation.id) === index), [chatEntries]);

  useEffect(() => {
    if (historyIsLoading) return;
    const conversationId = historyActiveConversationId;
    if (!conversationId || hydratedConversationRef.current === conversationId) return;
    const conversation = historyConversations.find((item) => item.id === conversationId);
    if (!conversation) return;
    hydratedConversationRef.current = conversationId;
    loadConversation(restoreChatEntries(conversation.entries));
  }, [historyActiveConversationId, historyConversations, historyIsLoading, loadConversation]);

  useEffect(() => {
    if (!historyActiveConversationId || historyIsLoading || busy) return;
    updateHistoryTranscript(historyActiveConversationId, chatEntries);
  }, [busy, chatEntries, historyActiveConversationId, historyIsLoading, updateHistoryTranscript]);

  return (
    <main
      className={`${styles.appShell} ${sidebarCollapsed ? styles.sidebarIsCollapsed : ""} ${rightPanelCollapsed ? styles.rightPanelIsCollapsed : ""}`}
      data-accent-theme={accentTheme.theme}
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
        activeItem={workspaceView}
        onNavigate={navigateTo}
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
          onConnectionModeChange={changeConnectionMode}
          accentTheme={accentTheme.theme}
          onAccentThemeChange={accentTheme.selectTheme}
        />

        <div className={styles.contentLayout}>
          {workspaceView === "Sources" ? (
            <section className={styles.sectionView} aria-labelledby="sources-view-title">
              <header><BookOpen size={20} aria-hidden="true" /><span><h1 id="sources-view-title">Sources</h1><p>Official evidence for the selected conversation.</p></span></header>
              <SourcesSection citations={selectedCitations} />
            </section>
          ) : workspaceView === "History" ? (
            <section className={styles.sectionView} aria-labelledby="history-view-title">
              <header><History size={20} aria-hidden="true" /><span><h1 id="history-view-title">Conversation history</h1><p>Open a saved conversation or manage its local record.</p></span></header>
              <ConversationHistory
                conversations={conversationHistory.conversations}
                activeConversationId={conversationHistory.activeConversationId}
                loading={conversationHistory.isLoading}
                onSelect={selectConversation}
                onRename={conversationHistory.renameConversation}
                onDelete={deleteConversation}
                onToggleArchive={toggleArchiveConversation}
                onTogglePin={conversationHistory.togglePinned}
              />
            </section>
          ) : chatEntries.length === 0 && conversationHistory.activeConversationId === null ? (
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
                clarificationRequired={clarificationRequired}
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
              onSubmitClarification={submitPrompt}
              composer={(
                <PromptComposer
                  mode="chat"
                  showSuggestions={false}
                  onSubmitPrompt={submitPrompt}
                  busy={busy}
                  clarificationRequired={clarificationRequired}
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
          <span data-health={applicationHealth}><i /> {applicationHealth === "checking" ? "Checking systems…" : applicationHealth === "ready" ? "Systems ready" : "Systems degraded"}</span>
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
