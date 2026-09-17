"use client";

import {
  ArrowLeftIcon,
  BotIcon,
  HandIcon,
  MessageCircleMoreIcon,
  RefreshCwIcon,
} from "lucide-react";
import { useEffect, useRef } from "react";

import {
  conversationName,
  dayLabel,
  initials,
  startsNewDay,
} from "@/components/inbox/inbox-utils";
import { MessageBubble } from "@/components/inbox/message-bubble";
import { ReplyComposer } from "@/components/inbox/reply-composer";
import { MessageListSkeleton } from "@/components/inbox/inbox-skeletons";
import {
  useConversationMessages,
  useUpdateConversationMode,
} from "@/components/inbox/use-inbox-queries";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { Conversation } from "@/lib/api";

export function ConversationPane({
  conversation,
  organizationId,
  onBack,
}: {
  conversation: Conversation;
  organizationId: string;
  onBack: () => void;
}) {
  const messageListRef = useRef<HTMLDivElement>(null);
  const previousMessageCountRef = useRef<number | null>(null);
  const messages = useConversationMessages(conversation.id);
  const updateMode = useUpdateConversationMode({
    conversationId: conversation.id,
    organizationId,
  });
  const messageItems = messages.data?.items ?? [];
  const messageCount = messageItems.length;
  const name = conversationName(conversation);

  useEffect(() => {
    if (messages.isPending || messages.error) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const isInitialScroll = previousMessageCountRef.current === null;
    const messageList = messageListRef.current;
    if (!messageList) return;

    messageList.scrollTo({
      top: messageList.scrollHeight,
      behavior: reduceMotion || isInitialScroll ? "auto" : "smooth",
    });
    previousMessageCountRef.current = messageCount;
  }, [messageCount, messages.error, messages.isPending]);

  return (
    <>
      <header className="flex h-[4.75rem] shrink-0 items-center gap-3 border-b px-4 sm:px-5">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onBack}
          aria-label="Back to conversations"
        >
          <ArrowLeftIcon aria-hidden="true" />
        </Button>
        <Avatar className="size-9">
          <AvatarFallback className="bg-primary/8 font-medium text-primary">
            {initials(name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h2
            id={`conversation-title-${conversation.id}`}
            className="truncate text-sm font-semibold"
            tabIndex={-1}
          >
            {name}
          </h2>
          <p className="truncate text-xs text-muted-foreground">
            +{conversation.contact.waId} · WhatsApp
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground sm:inline-flex">
            {conversation.mode === "AI" ? "AI active" : "Human control"}
          </span>
          {conversation.mode === "AI" ? (
            <Button
              size="sm"
              variant="outline"
              disabled={updateMode.isPending}
              onClick={() => updateMode.mutate("HUMAN")}
            >
              <HandIcon aria-hidden="true" />
              Take Over
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={updateMode.isPending}
              onClick={() => updateMode.mutate("AI")}
            >
              <BotIcon aria-hidden="true" />
              Resume AI
            </Button>
          )}
        </div>
      </header>

      {updateMode.error ? (
        <p role="alert" className="border-b px-5 py-2 text-xs text-destructive">
          {updateMode.error.message}
        </p>
      ) : null}

      <div
        ref={messageListRef}
        className="inbox-message-field min-h-0 min-w-0 flex-1 overscroll-contain overflow-x-hidden overflow-y-auto px-4 py-6 sm:px-8"
      >
        <div
          className="mx-auto flex min-h-full max-w-3xl flex-col justify-end gap-3"
          role="log"
          aria-label={`Messages with ${name}`}
          aria-live="polite"
          aria-relevant="additions text"
          aria-busy={messages.isPending}
        >
          {messages.isPending ? (
            <MessageListSkeleton />
          ) : messages.error ? (
            <Alert variant="destructive">
              <AlertTitle>Messages unavailable</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>{messages.error.message}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void messages.refetch()}
                >
                  <RefreshCwIcon aria-hidden="true" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : messageItems.length === 0 ? (
            <EmptyMessageThread />
          ) : (
            messageItems.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                day={
                  startsNewDay(
                    message.providerTimestamp,
                    messageItems[index - 1]?.providerTimestamp,
                  )
                    ? dayLabel(message.providerTimestamp)
                    : null
                }
              />
            ))
          )}
        </div>
      </div>

      <ReplyComposer
        conversationId={conversation.id}
        organizationId={organizationId}
        mode={conversation.mode}
      />
    </>
  );
}

export function EmptyConversation() {
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center p-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl border bg-muted/50 text-muted-foreground">
        <MessageCircleMoreIcon className="size-5" aria-hidden="true" />
      </span>
      <p className="mt-4 text-sm font-medium">Choose a conversation</p>
      <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
        Select someone from the shared queue to read their messages and reply.
      </p>
    </div>
  );
}

function EmptyMessageThread() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
      <MessageCircleMoreIcon
        className="size-7 text-muted-foreground/60"
        aria-hidden="true"
      />
      <p className="mt-3 text-sm font-medium">No messages yet</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Send a reply to start this conversation.
      </p>
    </div>
  );
}
