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
  MoreHorizontal,
  Network,
  Paperclip,
  PanelRightOpen,
  Plus,
  Rocket,
  ScrollText,
  ServerCog,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

import { ChatWorkspace, type ChatEntry } from "@/features/chat/chat-workspace";

import styles from "./copilot-home.module.css";

type NavigationItem = {
  label: string;
  icon: LucideIcon;
};

type Conversation = {
  title: string;
  time: string;
};

const navigation: NavigationItem[] = [
  { label: "Chat", icon: MessageCircle },
  { label: "Sources", icon: BookOpen },
  { label: "History", icon: History },
];

const conversations: Conversation[] = [
  { title: "Fix build error on Liara", time: "2m ago" },
  { title: "Connect PostgreSQL", time: "1h ago" },
  { title: "Configure custom domain", time: "Yesterday" },
  { title: "Debug API timeout", time: "2 days ago" },
  { title: "Environment variables setup", time: "3 days ago" },
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
  onClose,
  onToggleCollapsed,
}: {
  collapsed: boolean;
  open: boolean;
  onClose: () => void;
  onToggleCollapsed: () => void;
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
          onClick={() => setActiveItem("Chat")}
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
          <div className={styles.conversationList}>
            {conversations.map((conversation) => (
              <button className={styles.conversationItem} type="button" key={conversation.title}>
                <MessageSquareText size={15} strokeWidth={1.7} />
                <span className={styles.conversationCopy}>
                  <span>{conversation.title}</span>
                  <small>{conversation.time}</small>
                </span>
                <MoreHorizontal size={16} className={styles.moreIcon} />
              </button>
            ))}
          </div>
        </section>

        <div className={styles.profileArea}>
          <button type="button" className={styles.profileButton}>
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
}: {
  onOpenInspector: () => void;
  onOpenMenu: () => void;
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
        <span>Connected</span>
        <ChevronDown size={15} />
      </button>

      <label className={styles.searchBox}>
        <Command size={19} className={styles.commandIcon} />
        <input
          value={searchValue}
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
        <button type="button" className={styles.topAvatar} aria-label="Open profile">L</button>
        <button type="button" className={styles.profileChevron} aria-label="Profile menu"><ChevronDown size={17} /></button>
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

function ContextCard() {
  const [answerDepth, setAnswerDepth] = useState("Detailed");

  return (
    <section className={styles.glassCard} aria-labelledby="context-title">
      <div className={styles.cardHeader}>
        <h2 id="context-title">Session context</h2>
        <Info size={18} />
      </div>
      <dl className={styles.contextList}>
        <div><dt>Framework</dt><dd>Not set</dd></div>
        <div><dt>Runtime</dt><dd>Not set</dd></div>
        <div><dt>Service</dt><dd>Not set</dd></div>
      </dl>
      <div className={styles.contextDivider} />
      <label className={styles.answerDepth}>
        <span>Answer depth</span>
        <select value={answerDepth} onChange={(event) => setAnswerDepth(event.target.value)}>
          <option>Concise</option>
          <option>Balanced</option>
          <option>Detailed</option>
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
}: {
  mode?: "empty" | "chat";
  onSubmitPrompt?: (prompt: string) => void;
  showSuggestions?: boolean;
}) {
  const [prompt, setPrompt] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = useMemo(() => prompt.trim().length > 0, [prompt]);

  function submitPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
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
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Ask about deployment, databases, domains, errors, or Liara services..."
            aria-label="Ask Liara Copilot"
            rows={3}
          />
          <div className={styles.composerActions}>
            <div className={styles.composerTools}>
              <button type="button" aria-label="Attach file"><Paperclip size={20} /></button>
              <button type="button" aria-label="Add code snippet"><Code2 size={20} /></button>
            </div>
            <div className={styles.sendGroup}>
              <span>{submitted ? "Ready for your conversation" : "Enter to send"}</span>
              <button type="submit" className={styles.sendButton} disabled={!canSubmit} aria-label="Send prompt">
                {submitted ? <Check size={21} /> : <ArrowUp size={22} />}
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
  const [chatEntries, setChatEntries] = useState<ChatEntry[]>([]);

  function addChatEntry(prompt: string) {
    setChatEntries((entries) => [
      ...entries,
      {
        id: `message-${Date.now()}-${entries.length + 1}`,
        prompt,
        sentAt: new Date().toISOString(),
      },
    ]);
  }

  function openMobileNavigation() {
    setMobileInspectorOpen(false);
    setSidebarCollapsed(false);
    setSidebarOpen(true);
  }

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
        onClose={() => setSidebarOpen(false)}
        onToggleCollapsed={() => setSidebarCollapsed((collapsed) => !collapsed)}
      />
      <button
        className={`${styles.rightDrawerBackdrop} ${mobileInspectorOpen ? styles.rightDrawerBackdropVisible : ""}`}
        type="button"
        aria-label="Close session inspector"
        onClick={() => setMobileInspectorOpen(false)}
      />
      <section className={styles.workspace}>
        <AmbientBackground />
        <Topbar onOpenMenu={openMobileNavigation} onOpenInspector={openMobileInspector} />

        <div className={styles.contentLayout}>
          {chatEntries.length === 0 ? (
            <section className={styles.hero} aria-labelledby="home-heading">
              <div className={styles.heroCopy}>
                <BrandMark />
                <h1 id="home-heading">Build, deploy, and debug with <span>Liara</span></h1>
                <p>Your AI copilot for modern development.</p>
                <HeroBenefits />
              </div>
              <PromptComposer onSubmitPrompt={addChatEntry} />
            </section>
          ) : (
            <ChatWorkspace
              entries={chatEntries}
              onSuggestedPrompt={addChatEntry}
              composer={(
                <PromptComposer
                  mode="chat"
                  showSuggestions={false}
                  onSubmitPrompt={addChatEntry}
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
              <ContextCard />
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
    </main>
  );
}
