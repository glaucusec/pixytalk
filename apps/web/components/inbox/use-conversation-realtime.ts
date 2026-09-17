"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { createConversationSocket } from "@/lib/conversation-socket";
import { queryKeys } from "@/lib/query-keys";

type ConversationChangedEvent = {
  conversationId: string;
  reason: "message-created" | "message-updated" | "mode-changed";
};

export function useConversationRealtime(organizationId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = createConversationSocket();

    function refreshConversation({
      conversationId,
    }: ConversationChangedEvent) {
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.list(organizationId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.messages.detail(conversationId),
        }),
      ]);
    }

    function refreshAfterConnect() {
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.list(organizationId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.messages.all,
        }),
      ]);
    }

    socket.on("conversation.changed", refreshConversation);
    socket.on("connect", refreshAfterConnect);
    socket.connect();

    return () => {
      socket.off("conversation.changed", refreshConversation);
      socket.off("connect", refreshAfterConnect);
      socket.disconnect();
    };
  }, [organizationId, queryClient]);
}
