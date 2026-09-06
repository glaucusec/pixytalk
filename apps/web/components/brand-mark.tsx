import { MessageCircleMoreIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="relative flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_8px_24px_-10px_var(--primary)]">
        <MessageCircleMoreIcon className="size-5" strokeWidth={2.2} />
        <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-background bg-[var(--signal)]" />
      </span>
      <span className="text-[17px] font-semibold tracking-[-0.03em]">
        PixyTalk
      </span>
    </span>
  );
}
