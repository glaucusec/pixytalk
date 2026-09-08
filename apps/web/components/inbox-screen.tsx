"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  CheckCheckIcon,
  CheckIcon,
  Clock3Icon,
  InboxIcon,
  MessageCircleMoreIcon,
  RefreshCwIcon,
  SearchIcon,
  SendIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspace } from "@/components/workspace-context";
import {
  getConversationMessages,
  getConversations,
  sendConversationMessage,
  type Conversation,
  type Message,
  type MessageStatus,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const replySchema = z.object({
  text: z.string().trim().min(1, "Write a message first.").max(4096),
});

type ReplyForm = z.infer<typeof replySchema>;

export function InboxScreen() {
  const { organization } = useWorkspace();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const conversations = useQuery({
    queryKey: ["conversations", organization.id],
    queryFn: getConversations,
    refetchInterval: 5_000,
  });

  const filteredConversations = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return conversations.data?.items ?? [];

    return (conversations.data?.items ?? []).filter((conversation) =>
      [conversation.contact.displayName, conversation.contact.waId]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(needle)),
    );
  }, [conversations.data, search]);

  const selectedConversation = conversations.data?.items.find(
    (conversation) => conversation.id === selectedId,
  );

  return (
    <main className="flex min-h-0 flex-1 bg-muted/25 p-0 md:p-4 lg:p-6">
      <section className="mx-auto grid min-h-0 w-full max-w-[1500px] flex-1 overflow-hidden border bg-background shadow-sm md:rounded-2xl md:grid-cols-[21rem_minmax(0,1fr)]">
        <aside
          className={cn(
            "min-h-0 border-r bg-card",
            selectedId ? "hidden md:flex" : "flex",
            "flex-col",
          )}
        >
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
                <InboxIcon className="size-4" />
              </span>
            </div>
            <div className="relative mt-4">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search people or numbers"
                className="pl-9"
                aria-label="Search conversations"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {conversations.isPending ? (
              <ConversationListSkeleton />
            ) : conversations.error ? (
              <div className="p-4">
                <Alert variant="destructive">
                  <AlertTitle>Inbox unavailable</AlertTitle>
                  <AlertDescription>
                    {conversations.error.message}
                  </AlertDescription>
                </Alert>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-8 py-12 text-center">
                <MessageCircleMoreIcon className="size-8 text-muted-foreground/60" />
                <p className="mt-4 text-sm font-medium">
                  {search ? "No matching conversations" : "No conversations yet"}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {search
                    ? "Try a name or WhatsApp number."
                    : "New WhatsApp messages will appear here."}
                </p>
              </div>
            ) : (
              <div role="list" aria-label="Conversations">
                {filteredConversations.map((conversation) => (
                  <ConversationRow
                    key={conversation.id}
                    conversation={conversation}
                    selected={conversation.id === selectedId}
                    onSelect={() => setSelectedId(conversation.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </aside>

        <div
          className={cn(
            "min-h-0 min-w-0",
            selectedId ? "flex" : "hidden md:flex",
            "flex-col",
          )}
        >
          {selectedConversation ? (
            <ConversationPane
              conversation={selectedConversation}
              onBack={() => setSelectedId(null)}
            />
          ) : (
            <EmptyConversation />
          )}
        </div>
      </section>
    </main>
  );
}

function ConversationRow({
  conversation,
  selected,
  onSelect,
}: {
  conversation: Conversation;
  selected: boolean;
  onSelect: () => void;
}) {
  const name = conversation.contact.displayName || conversation.contact.waId;
  const lastMessage = conversation.lastMessage;

  return (
    <button
      type="button"
      role="listitem"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "group relative flex w-full gap-3 border-b px-4 py-4 text-left outline-none transition-colors hover:bg-muted/55 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        selected && "bg-primary/[0.055] hover:bg-primary/[0.07]",
      )}
    >
      <span
        className={cn(
          "absolute inset-y-3 left-0 w-0.5 rounded-r-full bg-transparent",
          selected && "bg-primary",
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
          {lastMessage?.direction === "OUTBOUND" && (
            <StatusIcon status={lastMessage.status} />
          )}
          <span className="truncate">
            {lastMessage?.text || messageTypeLabel(lastMessage?.type)}
          </span>
        </span>
      </span>
    </button>
  );
}

function ConversationPane({
  conversation,
  onBack,
}: {
  conversation: Conversation;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const messageEndRef = useRef<HTMLDivElement>(null);
  const messages = useQuery({
    queryKey: ["conversation-messages", conversation.id],
    queryFn: () => getConversationMessages(conversation.id),
    refetchInterval: 5_000,
  });
  const form = useForm<ReplyForm>({
    resolver: zodResolver(replySchema),
    defaultValues: { text: "" },
  });
  const sendMessage = useMutation({
    mutationFn: ({ text }: ReplyForm) =>
      sendConversationMessage(conversation.id, text),
    onSuccess: async () => {
      form.reset();
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["conversation-messages", conversation.id],
        }),
        queryClient.invalidateQueries({ queryKey: ["conversations"] }),
      ]);
    },
  });

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data?.items.length]);

  const name = conversation.contact.displayName || conversation.contact.waId;

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
          <ArrowLeftIcon />
        </Button>
        <Avatar className="size-9">
          <AvatarFallback className="bg-primary/8 font-medium text-primary">
            {initials(name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="truncate text-xs text-muted-foreground">
            +{conversation.contact.waId} · WhatsApp
          </p>
        </div>
        <span className="ml-auto rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          {conversation.status.toLowerCase()}
        </span>
      </header>

      <div className="inbox-message-field min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-end gap-3">
          {messages.isPending ? (
            <MessageListSkeleton />
          ) : messages.error ? (
            <Alert variant="destructive">
              <AlertTitle>Messages unavailable</AlertTitle>
              <AlertDescription>{messages.error.message}</AlertDescription>
            </Alert>
          ) : (
            messages.data?.items.map((message, index, allMessages) => (
              <MessageBubble
                key={message.id}
                message={message}
                showDay={
                  index === 0 ||
                  dayKey(allMessages[index - 1].providerTimestamp) !==
                    dayKey(message.providerTimestamp)
                }
              />
            ))
          )}
          <div ref={messageEndRef} />
        </div>
      </div>

      <form
        onSubmit={form.handleSubmit((values) => sendMessage.mutate(values))}
        className="shrink-0 border-t bg-background px-4 py-3 sm:px-6 sm:py-4"
      >
        <div className="mx-auto max-w-3xl">
          {sendMessage.error && (
            <p className="mb-2 flex items-center gap-1.5 text-xs text-destructive">
              <TriangleAlertIcon className="size-3.5" />
              {sendMessage.error.message}
            </p>
          )}
          <div className="flex items-end gap-2 rounded-2xl border bg-card p-2 shadow-sm focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
            <Textarea
              {...form.register("text")}
              rows={1}
              placeholder="Reply on WhatsApp…"
              aria-label="Message"
              className="max-h-36 min-h-10 flex-1 border-0 px-2 py-2.5 shadow-none focus-visible:ring-0"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void form.handleSubmit((values) =>
                    sendMessage.mutate(values),
                  )();
                }
              }}
            />
            <Button
              type="submit"
              size="icon-lg"
              disabled={sendMessage.isPending}
              aria-label="Send message"
              className="rounded-xl"
            >
              {sendMessage.isPending ? (
                <RefreshCwIcon className="animate-spin" />
              ) : (
                <SendIcon />
              )}
            </Button>
          </div>
          <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-muted-foreground">
            <span>{form.formState.errors.text?.message}</span>
            <span>Enter to send · Shift + Enter for a new line</span>
          </div>
        </div>
      </form>
    </>
  );
}

function MessageBubble({
  message,
  showDay,
}: {
  message: Message;
  showDay: boolean;
}) {
  const outbound = message.direction === "OUTBOUND";

  return (
    <>
      {showDay && (
        <div className="my-3 flex items-center gap-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          {dayLabel(message.providerTimestamp)}
          <span className="h-px flex-1 bg-border" />
        </div>
      )}
      <div className={cn("flex", outbound ? "justify-end" : "justify-start")}>
        <div
          className={cn(
            "max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-5 shadow-xs sm:max-w-[70%]",
            outbound
              ? "rounded-br-md bg-primary text-primary-foreground"
              : "rounded-bl-md border bg-background",
            message.status === "FAILED" && "border-destructive/30 bg-destructive/8 text-foreground",
          )}
        >
          <p className="whitespace-pre-wrap break-words">
            {message.text || messageTypeLabel(message.type)}
          </p>
          <span
            className={cn(
              "mt-1 flex items-center justify-end gap-1 font-mono text-[9px]",
              outbound ? "text-primary-foreground/65" : "text-muted-foreground",
            )}
          >
            {shortTime(message.providerTimestamp)}
            {outbound && <StatusIcon status={message.status} />}
          </span>
        </div>
      </div>
    </>
  );
}

function StatusIcon({ status }: { status: MessageStatus }) {
  if (status === "FAILED") return <TriangleAlertIcon className="size-3" />;
  if (status === "PENDING") return <Clock3Icon className="size-3" />;
  if (status === "READ" || status === "DELIVERED") {
    return <CheckCheckIcon className="size-3" />;
  }
  return <CheckIcon className="size-3" />;
}

function EmptyConversation() {
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center p-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl border bg-muted/50 text-muted-foreground">
        <MessageCircleMoreIcon className="size-5" />
      </span>
      <p className="mt-4 text-sm font-medium">Choose a conversation</p>
      <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
        Select someone from the shared queue to read their messages and reply.
      </p>
    </div>
  );
}

function ConversationListSkeleton() {
  return (
    <div className="space-y-1 p-3">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="flex items-center gap-3 p-2">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MessageListSkeleton() {
  return (
    <div className="space-y-4 py-6">
      <Skeleton className="h-14 w-2/3 rounded-2xl" />
      <Skeleton className="ml-auto h-20 w-3/5 rounded-2xl" />
      <Skeleton className="h-14 w-1/2 rounded-2xl" />
    </div>
  );
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function shortTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function dayKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  if (dayKey(value) === dayKey(today.toISOString())) return "Today";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  }).format(date);
}

function messageTypeLabel(type?: string) {
  if (!type) return "No messages yet";
  return type === "TEXT" ? "Message" : `[${type.toLowerCase()}]`;
}
