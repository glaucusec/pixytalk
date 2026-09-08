import {
  CheckCheckIcon,
  CheckIcon,
  Clock3Icon,
  TriangleAlertIcon,
} from "lucide-react";

import {
  messageStatusLabel,
  messageTypeLabel,
  shortTime,
} from "@/components/inbox/inbox-utils";
import type { Message, MessageStatus } from "@/lib/api";
import { cn } from "@/lib/utils";

export function MessageBubble({
  message,
  day,
}: {
  message: Message;
  day: string | null;
}) {
  const outbound = message.direction === "OUTBOUND";

  return (
    <>
      {day ? (
        <div
          className="my-3 flex items-center gap-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
          role="separator"
          aria-label={day}
        >
          <span className="h-px flex-1 bg-border" />
          {day}
          <span className="h-px flex-1 bg-border" />
        </div>
      ) : null}
      <div className={cn("flex", outbound ? "justify-end" : "justify-start")}>
        <div
          className={cn(
            "max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-5 shadow-xs sm:max-w-[70%]",
            outbound
              ? "rounded-br-md bg-primary text-primary-foreground"
              : "rounded-bl-md border bg-background",
            message.status === "FAILED"
              ? "border-destructive/30 bg-destructive/8 text-foreground"
              : null,
          )}
        >
          <p className="whitespace-pre-wrap break-words">
            {message.text || messageTypeLabel(message.type)}
          </p>
          <span
            className={cn(
              "mt-1 flex items-center justify-end gap-1 font-mono text-[9px]",
              outbound
                ? "text-primary-foreground/65"
                : "text-muted-foreground",
            )}
          >
            {shortTime(message.providerTimestamp)}
            {outbound ? (
              <>
                <MessageStatusIcon status={message.status} />
                <span className="sr-only">
                  {messageStatusLabel(message.status)}
                </span>
              </>
            ) : null}
          </span>
        </div>
      </div>
    </>
  );
}

export function MessageStatusIcon({ status }: { status: MessageStatus }) {
  if (status === "FAILED") {
    return <TriangleAlertIcon className="size-3" aria-hidden="true" />;
  }
  if (status === "PENDING") {
    return <Clock3Icon className="size-3" aria-hidden="true" />;
  }
  if (status === "READ" || status === "DELIVERED") {
    return <CheckCheckIcon className="size-3" aria-hidden="true" />;
  }
  return <CheckIcon className="size-3" aria-hidden="true" />;
}
