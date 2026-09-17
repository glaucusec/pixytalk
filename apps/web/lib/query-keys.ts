const conversationsRoot = ["conversations"] as const;
const conversationMessagesRoot = [
  ...conversationsRoot,
  "messages",
] as const;

export const queryKeys = {
  currentOrganization: (
    activeOrganizationId: string | null | undefined,
  ) =>
    ["current-organization", activeOrganizationId] as const,
  activeMemberRole: (
    activeOrganizationId: string | null | undefined,
  ) =>
    ["active-member-role", activeOrganizationId] as const,
  conversations: {
    all: conversationsRoot,
    list: (organizationId: string) =>
      [...conversationsRoot, "list", organizationId] as const,
    messages: {
      all: conversationMessagesRoot,
      detail: (conversationId: string) =>
        [...conversationMessagesRoot, conversationId] as const,
    },
  },
} as const;

export const mutationKeys = {
  updateConversationMode: (conversationId: string) =>
    ["update-conversation-mode", conversationId] as const,
  sendConversationMessage: (conversationId: string) =>
    ["send-conversation-message", conversationId] as const,
} as const;
