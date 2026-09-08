import type { Conversation, MessageStatus } from "@/lib/api";

export function conversationName(conversation: Conversation) {
  return conversation.contact.displayName || conversation.contact.waId;
}

export function filterConversations(
  conversations: Conversation[],
  search: string,
) {
  const needle = search.trim().toLowerCase();
  if (!needle) return conversations;

  return conversations.filter((conversation) =>
    [conversation.contact.displayName, conversation.contact.waId]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(needle)),
  );
}

export function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function shortTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function dayKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function dayLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  if (dayKey(value) === dayKey(today.toISOString())) return "Today";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  }).format(date);
}

export function startsNewDay(current: string, previous?: string) {
  return previous === undefined || dayKey(previous) !== dayKey(current);
}

export function messageTypeLabel(type?: string) {
  if (!type) return "No messages yet";
  return type === "TEXT" ? "Message" : `[${type.toLowerCase()}]`;
}

export function messageStatusLabel(status: MessageStatus) {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "RECEIVED":
      return "Received";
    case "SENT":
      return "Sent";
    case "DELIVERED":
      return "Delivered";
    case "READ":
      return "Read";
    case "FAILED":
      return "Failed";
  }
}
