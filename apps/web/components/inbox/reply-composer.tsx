"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { RefreshCwIcon, SendIcon, TriangleAlertIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useSendConversationMessage } from "@/components/inbox/use-inbox-queries";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ConversationMode } from "@/lib/api";

const replySchema = z.object({
  text: z.string().trim().min(1, "Write a message first.").max(4096),
});

type ReplyForm = z.infer<typeof replySchema>;

export function ReplyComposer({
  conversationId,
  organizationId,
  mode,
}: {
  conversationId: string;
  organizationId: string;
  mode: ConversationMode;
}) {
  const form = useForm<ReplyForm>({
    resolver: zodResolver(replySchema),
    defaultValues: { text: "" },
  });
  const sendMessage = useSendConversationMessage({
    conversationId,
    organizationId,
  });
  const isHumanMode = mode === "HUMAN";

  async function onSubmit({ text }: ReplyForm) {
    if (!isHumanMode) return;

    try {
      await sendMessage.mutateAsync(text);
      form.reset();
    } catch {
      // The mutation error is rendered next to the composer.
    }
  }

  const submit = form.handleSubmit(onSubmit);
  const isSending = sendMessage.isPending || form.formState.isSubmitting;
  const validationError = form.formState.errors.text?.message;

  return (
    <form
      onSubmit={submit}
      aria-busy={isSending}
      className="shrink-0 border-t bg-background px-4 py-3 sm:px-6 sm:py-4"
    >
      <div className="mx-auto max-w-3xl">
        {sendMessage.error ? (
          <p
            id="send-message-error"
            role="alert"
            className="mb-2 flex items-center gap-1.5 text-xs text-destructive"
          >
            <TriangleAlertIcon className="size-3.5" aria-hidden="true" />
            {sendMessage.error.message}
          </p>
        ) : null}
        <div className="flex items-end gap-2 rounded-2xl border bg-card p-2 shadow-sm focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
          <Textarea
            {...form.register("text")}
            rows={1}
            disabled={!isHumanMode || isSending}
            placeholder={
              isHumanMode
                ? "Reply on WhatsApp…"
                : "Take over this conversation to reply"
            }
            aria-label="Message"
            aria-invalid={Boolean(validationError)}
            aria-describedby={
              sendMessage.error
                ? "send-message-error message-help message-validation"
                : "message-help message-validation"
            }
            className="max-h-36 min-h-10 flex-1 border-0 px-2 py-2.5 shadow-none focus-visible:ring-0"
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                if (isHumanMode && !isSending) void submit();
              }
            }}
          />
          <Button
            type="submit"
            size="icon-lg"
            disabled={!isHumanMode || isSending}
            aria-label="Send message"
            className="rounded-xl"
          >
            {isSending ? (
              <RefreshCwIcon className="animate-spin" aria-hidden="true" />
            ) : (
              <SendIcon aria-hidden="true" />
            )}
          </Button>
        </div>
        <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-muted-foreground">
          <span id="message-validation">{validationError}</span>
          <span id="message-help">
            {isHumanMode
              ? "Enter to send · Shift + Enter for a new line"
              : "AI is currently handling this conversation"}
          </span>
        </div>
      </div>
    </form>
  );
}
