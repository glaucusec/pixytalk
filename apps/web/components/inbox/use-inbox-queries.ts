"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getConversationMessages,
  getConversations,
  sendConversationMessage,
  updateConversationMode,
  type ConversationMode,
} from "@/lib/api";
import { mutationKeys, queryKeys } from "@/lib/query-keys";

export function useConversations(organizationId: string) {
  return useQuery({
    queryKey: queryKeys.conversations.list(organizationId),
    queryFn: getConversations,
  });
}

export function useConversationMessages(conversationId: string) {
  return useQuery({
    queryKey: queryKeys.conversations.messages.detail(conversationId),
    queryFn: () => getConversationMessages(conversationId),
  });
}

export function useUpdateConversationMode({
  conversationId,
  organizationId,
}: {
  conversationId: string;
  organizationId: string;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.updateConversationMode(conversationId),
    mutationFn: (mode: ConversationMode) =>
      updateConversationMode(conversationId, mode),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.list(organizationId),
      });
    },
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
    mutationKey: mutationKeys.sendConversationMessage(conversationId),
    mutationFn: (text: string) =>
      sendConversationMessage(conversationId, text),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.messages.detail(conversationId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.list(organizationId),
        }),
      ]);
    },
  });
}
