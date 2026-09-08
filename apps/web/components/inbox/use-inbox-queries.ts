"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getConversationMessages,
  getConversations,
  sendConversationMessage,
} from "@/lib/api";

const POLL_INTERVAL = 5_000;

export const inboxQueryKeys = {
  conversations: (organizationId: string) =>
    ["conversations", organizationId] as const,
  messages: (conversationId: string) =>
    ["conversation-messages", conversationId] as const,
};

export function useConversations(organizationId: string) {
  return useQuery({
    queryKey: inboxQueryKeys.conversations(organizationId),
    queryFn: getConversations,
    refetchInterval: POLL_INTERVAL,
  });
}

export function useConversationMessages(conversationId: string) {
  return useQuery({
    queryKey: inboxQueryKeys.messages(conversationId),
    queryFn: () => getConversationMessages(conversationId),
    refetchInterval: POLL_INTERVAL,
  });
}

export function useSendConversationMessage({
  conversationId,
  organizationId,
}: {
  conversationId: string;
  organizationId: string;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["send-conversation-message", conversationId],
    mutationFn: (text: string) =>
      sendConversationMessage(conversationId, text),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: inboxQueryKeys.messages(conversationId),
        }),
        queryClient.invalidateQueries({
          queryKey: inboxQueryKeys.conversations(organizationId),
        }),
      ]);
    },
  });
}
