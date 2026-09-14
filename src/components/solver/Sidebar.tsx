"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import {
  BookOpen,
  CalendarRange,
  ListChecks,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import type { Conversation } from "@/lib/client/conversation";
import { cn } from "@/lib/utils/cn";
import { CapacityIndicator } from "./CapacityIndicator";

interface SidebarProps {
  conversations: Conversation[];
  activeId?: string;
  open: boolean;
  disabled: boolean;
  capacityRefreshKey: number;
  isAdmin: boolean;
  onClose: () => void;
  onNew: () => void;
  onSelect: (conversation: Conversation) => void;
  onToggleBookmark: (conversation: Conversation) => void;
  onDelete: (conversation: Conversation) => void;
}

type ItemHandlers = Pick<SidebarProps, "onSelect" | "onToggleBookmark" | "onDelete" | "disabled">;

function HistoryItem({
  conversation,
  active,
  onSelect,
  onToggleBookmark,
  onDelete,
  disabled,
}: ItemHandlers & { conversation: Conversation; active: boolean }) {
  return (
    <li
      className={cn(
        "group flex items-center rounded-lg transition-colors",
        active ? "bg-subtle" : "hover:bg-subtle/70",
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(conversation)}
        disabled={disabled}
        className="min-w-0 flex-1 px-2.5 py-2 text-left"
      >
        <span className="block truncate text-sm text-ink">{conversation.title}</span>
        {conversation.subject && (
          <span className="block truncate text-xs text-ink-muted">
            {conversation.subject}
            {conversation.topic && ` · ${conversation.topic}`}
          </span>
        )}
      </button>
      <div
        className={cn(
          "flex shrink-0 pr-1 transition-opacity",
          // Touch screens can't hover, so actions stay visible there.
          conversation.bookmarked
            ? "opacity-100"
            : "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100",
        )}
      >
        <button
          type="button"
          onClick={() => onToggleBookmark(conversation)}
          aria-label={conversation.bookmarked ? "Remove bookmark" : "Bookmark"}
          className="grid size-7 place-items-center rounded-md text-ink-muted hover:text-accent"
        >
          <Star className={cn("size-3.5", conversation.bookmarked && "fill-accent text-accent")} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(conversation)}
          aria-label="Delete"
          className="grid size-7 place-items-center rounded-md text-ink-muted hover:text-warning [@media(hover:hover)]:hidden [@media(hover:hover)]:group-hover:grid"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </li>
  );
}

function HistorySection({
  title,
  items,
  activeId,
  emptyText,
  ...handlers
}: ItemHandlers & {
  title: string;
  items: Conversation[];
  activeId?: string;
  emptyText?: string;
}) {
  if (items.length === 0 && !emptyText) return null;
  return (
    <section className="mb-4">
      <h2 className="px-2.5 pb-1 text-xs font-medium text-ink-muted">{title}</h2>
      {items.length === 0 ? (
        <p className="px-2.5 py-2 text-sm text-ink-muted/80">{emptyText}</p>
      ) : (
        <ul className="space-y-0.5">
          {items.map((conversation) => (
            <HistoryItem
              key={conversation.id}
              conversation={conversation}
              active={conversation.id === activeId}
              {...handlers}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export function Sidebar({
  conversations,
  activeId,
  open,
  disabled,
  capacityRefreshKey,
  isAdmin,
  onClose,
  onNew,
  ...handlers
}: SidebarProps) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const matches = needle
    ? conversations.filter((conversation) =>
        [conversation.title, conversation.subject, conversation.topic].some((field) =>
          field?.toLowerCase().includes(needle),
        ),
      )
    : conversations;

  return (
    <>
      {open && (
        <div aria-hidden className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-line bg-sidebar transition-transform duration-200 md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <Link href="/" aria-label="Home">
            <Logo />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-subtle md:hidden"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-3 pt-2">
          <button
            type="button"
            onClick={onNew}
            disabled={disabled}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-subtle disabled:opacity-50"
          >
            <span className="grid size-6 place-items-center rounded-full bg-accent text-canvas">
              <Plus className="size-3.5" strokeWidth={2.5} />
            </span>
            New question
          </button>
        </div>

        <div className="px-3 pt-3">
          <label className="relative block">
            <span className="sr-only">Search history</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search history"
              className="w-full rounded-lg border border-line bg-surface/70 py-2 pr-3 pl-9 text-sm text-ink outline-none placeholder:text-ink-muted/70 focus:border-accent/50"
            />
          </label>
        </div>

        <nav className="mt-4 flex-1 overflow-y-auto px-2 pb-3" aria-label="History">
          <HistorySection
            title="Bookmarked"
            items={matches.filter((conversation) => conversation.bookmarked)}
            activeId={activeId}
            disabled={disabled}
            {...handlers}
          />
          <HistorySection
            title="Recent"
            items={matches.filter((conversation) => !conversation.bookmarked)}
            activeId={activeId}
            emptyText={needle ? "No matches." : "No questions yet."}
            disabled={disabled}
            {...handlers}
          />
        </nav>

        <div className="space-y-1 border-t border-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Link
            href="/plan"
            prefetch={false}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
          >
            <CalendarRange className="size-4" />
            Study plan
          </Link>
          <Link
            href="/viva"
            prefetch={false}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
          >
            <ListChecks className="size-4" />
            Viva questions
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              prefetch={false}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
            >
              <SlidersHorizontal className="size-4" />
              Admin
            </Link>
          )}
          <Link
            href="/syllabus"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
          >
            <BookOpen className="size-4" />
            Syllabus
          </Link>
          <CapacityIndicator refreshKey={capacityRefreshKey} />
          <div className="flex items-center gap-2.5 px-2 pt-2">
            <UserButton />
            <span className="text-sm text-ink-muted">Account</span>
          </div>
        </div>
      </aside>
    </>
  );
}
