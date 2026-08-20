"use client";

import Image from "next/image";
import {
  ArrowUp,
  Bell,
  BookOpen,
  Bug,
  Check,
  ChevronDown,
  CircleHelp,
  Cloud,
  Code2,
  Command,
  Database,
  FileCode2,
  Globe2,
  History,
  Info,
  Menu,
  MessageCircle,
  MessageSquareText,
  MoreHorizontal,
  Network,
  Paperclip,
  Plus,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  X,
  type LucideIcon,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

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

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [activeItem, setActiveItem] = useState("Chat");

  return (
    <>
      <button
        className={`${styles.sidebarBackdrop} ${open ? styles.sidebarBackdropVisible : ""}`}
        aria-label="Close navigation"
        onClick={onClose}
        type="button"
      />
      <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ""}`} aria-label="Primary navigation">
        <div className={styles.sidebarTop}>
          <a href="#" className={styles.wordmark} aria-label="Liara Copilot home">
            <BrandMark compact />
            <span>Liara <strong>Copilot</strong></span>
          </a>
          <button className={styles.mobileClose} type="button" onClick={onClose} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <button className={styles.newConversation} type="button">
          <Plus size={21} />
          <span>New Conversation</span>
        </button>

        <nav className={styles.navList}>
          {navigation.map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              className={`${styles.navItem} ${activeItem === label ? styles.navItemActive : ""}`}
              onClick={() => setActiveItem(label)}
              aria-current={activeItem === label ? "page" : undefined}
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

function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
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

function PromptComposer() {
  const [prompt, setPrompt] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = useMemo(() => prompt.trim().length > 0, [prompt]);

  function submitPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitted(true);
    window.setTimeout(() => setSubmitted(false), 1800);
  }

  return (
    <div className={styles.composerRegion}>
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

      <div className={styles.suggestionList} aria-label="Suggested prompts">
        {suggestions.map(({ label, prompt: suggestionPrompt, icon: Icon }) => (
          <button type="button" key={label} onClick={() => setPrompt(suggestionPrompt)}>
            <Icon size={19} strokeWidth={1.7} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function AmbientBackground() {
  return (
    <div className={styles.ambient} aria-hidden="true">
      <div className={styles.auroraOne} />
      <div className={styles.auroraTwo} />
      <div className={styles.waveGrid} />
      <div className={styles.dustLayer} />
    </div>
  );
}

export function CopilotHome() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <main className={styles.appShell}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <section className={styles.workspace}>
        <AmbientBackground />
        <Topbar onOpenMenu={() => setSidebarOpen(true)} />

        <div className={styles.contentLayout}>
          <section className={styles.hero} aria-labelledby="home-heading">
            <div className={styles.heroCopy}>
              <BrandMark />
              <h1 id="home-heading">Build, deploy, and debug with <span>Liara.</span></h1>
              <p>Grounded answers from official Liara documentation.</p>
            </div>
            <PromptComposer />
          </section>

          <aside className={styles.rightRail} aria-label="Copilot details">
            <ContextCard />
            <BenefitsCard />
          </aside>
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
