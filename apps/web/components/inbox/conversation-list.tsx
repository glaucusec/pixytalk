"use client";

import {
  InboxIcon,
  MessageCircleMoreIcon,
  RefreshCwIcon,
  SearchIcon,
} from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import { ConversationListSkeleton } from "@/components/inbox/inbox-skeletons";
import {
  conversationName,
  filterConversations,
  initials,
  messageStatusLabel,
  messageTypeLabel,
  shortTime,
} from "@/components/inbox/inbox-utils";
import { MessageStatusIcon } from "@/components/inbox/message-bubble";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Conversation } from "@/lib/api";
import { cn } from "@/lib/utils";

export function ConversationList({
  conversations,
  selectedId,
  isPending,
  error,
  onRetry,
  onSelect,
}: {
  conversations: Conversation[];
  selectedId: string | null;
  isPending: boolean;
  error: Error | null;
  onRetry: () => void;
  onSelect: (conversationId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const filteredConversations = useMemo(
    () => filterConversations(conversations, deferredSearch),
    [conversations, deferredSearch],
  );

  return (
    <>
      <div className="border-b px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
              Shared queue
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.04em]">
              Conversations
            </h1>
          </div>
          <span className="flex size-9 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--signal)_14%,transparent)] text-[var(--signal-foreground)]">
            <InboxIcon className="size-4" aria-hidden="true" />
          </span>
        </div>
        <div className="relative mt-4">
          <SearchIcon
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search people or numbers"
            className="pl-9"
            aria-label="Search conversations"
          />
        </div>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overscroll-contain overflow-x-hidden overflow-y-auto">
        {isPending ? (
          <ConversationListSkeleton />
        ) : error ? (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertTitle>Inbox unavailable</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>{error.message}</p>
                <Button size="sm" variant="outline" onClick={onRetry}>
                  <RefreshCwIcon aria-hidden="true" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        ) : filteredConversations.length === 0 ? (
          <ConversationListEmptyState hasSearch={Boolean(deferredSearch)} />
        ) : (
          <ul aria-label="Conversations">
            {filteredConversations.map((conversation) => (
              <ConversationRow
                key={conversation.id}
                conversation={conversation}
                selected={conversation.id === selectedId}
                onSelect={onSelect}
              />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function ConversationRow({
  conversation,
  selected,
  onSelect,
}: {
  conversation: Conversation;
  selected: boolean;
  onSelect: (conversationId: string) => void;
}) {
  const name = conversationName(conversation);
  const lastMessage = conversation.lastMessage;

  return (
    <li>
      <button
        id={`conversation-${conversation.id}`}
        type="button"
        onClick={() => onSelect(conversation.id)}
        aria-current={selected ? "true" : undefined}
        className={cn(
          "group relative flex w-full gap-3 border-b px-4 py-4 text-left outline-none transition-colors hover:bg-muted/55 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          selected ? "bg-primary/[0.055] hover:bg-primary/[0.07]" : null,
        )}
      >
        <span
          className={cn(
            "absolute inset-y-3 left-0 w-0.5 rounded-r-full bg-transparent",
            selected ? "bg-primary" : null,
          )}
        />
        <Avatar className="mt-0.5 size-10">
          <AvatarFallback className="bg-primary/8 font-medium text-primary">
            {initials(name)}
          </AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-medium">{name}</span>
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
              {conversation.lastMessageAt
                ? shortTime(conversation.lastMessageAt)
                : "New"}
            </span>
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            {lastMessage?.direction === "OUTBOUND" ? (
              <>
                <MessageStatusIcon status={lastMessage.status} />
                <span className="sr-only">
                  {messageStatusLabel(lastMessage.status)}:
                </span>
              </>
            ) : null}
            <span className="truncate">
              {lastMessage?.text || messageTypeLabel(lastMessage?.type)}
            </span>
          </span>
        </span>
      </button>
    </li>
  );
}

function ConversationListEmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 py-12 text-center">
      <MessageCircleMoreIcon
        className="size-8 text-muted-foreground/60"
        aria-hidden="true"
      />
      <p className="mt-4 text-sm font-medium">
        {hasSearch ? "No matching conversations" : "No conversations yet"}
      </p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {hasSearch
          ? "Try a name or WhatsApp number."
          : "New WhatsApp messages will appear here."}
      </p>
    </div>
  );
}
