"use client";

import { useState } from "react";

import { ConversationList } from "@/components/inbox/conversation-list";
import {
  ConversationPane,
  EmptyConversation,
} from "@/components/inbox/conversation-pane";
import { useConversations } from "@/components/inbox/use-inbox-queries";
import { useConversationRealtime } from "@/components/inbox/use-conversation-realtime";
import { useWorkspace } from "@/components/workspace-context";
import type { Conversation } from "@/lib/api";
import { cn } from "@/lib/utils";

const EMPTY_CONVERSATIONS: Conversation[] = [];

export function InboxScreen() {
  const { organization } = useWorkspace();
  useConversationRealtime(organization.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const conversations = useConversations(organization.id);
  const conversationItems = conversations.data?.items ?? EMPTY_CONVERSATIONS;
  const selectedConversation = selectedId
    ? conversationItems.find((conversation) => conversation.id === selectedId)
    : undefined;
  const hasActiveConversation = Boolean(selectedConversation);

  function selectConversation(conversationId: string) {
    setSelectedId(conversationId);
    if (window.matchMedia("(max-width: 767px)").matches) {
      requestAnimationFrame(() => {
        document
          .getElementById(`conversation-title-${conversationId}`)
          ?.focus();
      });
    }
  }

  function returnToConversationList() {
    const previousSelection = selectedId;
    setSelectedId(null);
    requestAnimationFrame(() => {
      if (previousSelection) {
        document.getElementById(`conversation-${previousSelection}`)?.focus();
      }
    });
  }

  return (
    <main className="flex min-h-0 min-w-0 flex-1 overflow-clip bg-muted/25 p-0 md:p-4 lg:p-6">
      <section className="mx-auto grid min-h-0 min-w-0 w-full max-w-[1500px] flex-1 overflow-clip border bg-background shadow-sm md:rounded-2xl md:grid-cols-[21rem_minmax(0,1fr)]">
        <aside
          className={cn(
            "min-h-0 flex-col border-r bg-card",
            hasActiveConversation ? "hidden md:flex" : "flex",
          )}
        >
          <ConversationList
            conversations={conversationItems}
            selectedId={selectedId}
            isPending={conversations.isPending}
            error={conversations.error}
            onRetry={() => void conversations.refetch()}
            onSelect={selectConversation}
          />
        </aside>

        <div
          className={cn(
            "min-h-0 min-w-0 flex-col overflow-clip",
            hasActiveConversation ? "flex" : "hidden md:flex",
          )}
        >
          {selectedConversation ? (
            <ConversationPane
              key={selectedConversation.id}
              conversation={selectedConversation}
              organizationId={organization.id}
              onBack={returnToConversationList}
            />
          ) : (
            <EmptyConversation />
          )}
        </div>
      </section>
    </main>
  );
}
