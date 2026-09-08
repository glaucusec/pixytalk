export type CurrentOrganization = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  metadata: string | null;
  createdAt: string;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type MessageStatus =
  | "PENDING"
  | "RECEIVED"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED";

export type Message = {
  id: string;
  conversationId: string;
  direction: "INBOUND" | "OUTBOUND";
  type: string;
  status: MessageStatus;
  text: string | null;
  content: unknown;
  providerTimestamp: string;
  createdAt: string;
};

export type Conversation = {
  id: string;
  status: "OPEN" | "CLOSED";
  lastMessageAt: string | null;
  createdAt: string;
  contact: {
    id: string;
    waId: string;
    displayName: string | null;
  };
  WhatsAppAccount: {
    id: string;
    displayPhoneNumber: string | null;
  };
  lastMessage: Pick<
    Message,
    "id" | "direction" | "status" | "text" | "type" | "providerTimestamp"
  > | null;
};

export type Paginated<T> = {
  items: T[];
  nextCursor: string | null;
};

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = Array.isArray(body?.message)
      ? body.message.join(" ")
      : body?.message;
    throw new Error(
      message ??
        (response.status === 401
          ? "Your session has expired. Sign in again."
          : "PixyTalk could not complete this request."),
    );
  }

  return response.json() as Promise<T>;
}

export async function getCurrentOrganization(): Promise<CurrentOrganization> {
  return apiRequest<CurrentOrganization>("/organizations/current");
}

export function getConversations() {
  return apiRequest<Paginated<Conversation>>("/conversations?limit=100");
}

export function getConversationMessages(conversationId: string) {
  return apiRequest<Paginated<Message>>(
    `/conversations/${conversationId}/messages?limit=100`,
  );
}

export function sendConversationMessage(conversationId: string, text: string) {
  return apiRequest<Message>(`/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}
