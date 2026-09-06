import type { ReactNode } from "react";

import { BrandMark } from "@/components/brand-mark";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-svh bg-background lg:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)]">
      <section className="flex min-h-svh flex-col px-6 py-6 sm:px-10 lg:px-14 lg:py-10">
        <BrandMark />
        <div className="mx-auto flex w-full max-w-[400px] flex-1 items-center py-12">
          {children}
        </div>
        <p className="text-xs text-muted-foreground">
          One inbox. Every customer conversation.
        </p>
      </section>

      <section className="auth-signal-panel relative hidden overflow-hidden border-l lg:flex lg:flex-col lg:justify-between">
        <div className="relative z-10 flex items-center justify-between p-10 text-sm text-white/70">
          <span className="font-mono text-[11px] uppercase tracking-[0.24em]">
            Shared inbox
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[var(--signal)] shadow-[0_0_0_5px_color-mix(in_oklab,var(--signal)_18%,transparent)]" />
            Teams online
          </span>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-xl px-12 pb-16">
          <div className="mb-8 space-y-3">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/50">
              The conversation desk
            </p>
            <h2 className="max-w-lg text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-white xl:text-5xl">
              Keep every reply human, even when the queue grows.
            </h2>
          </div>

          <div className="ml-auto grid max-w-md gap-3">
            <SignalMessage
              label="New enquiry"
              text="Hi, can you help us plan a weekend in Wayanad?"
              delay="0ms"
            />
            <SignalMessage
              outgoing
              label="Assigned to you"
              text="Absolutely — I’ll help you build the right itinerary."
              delay="140ms"
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function SignalMessage({
  label,
  text,
  outgoing = false,
  delay,
}: {
  label: string;
  text: string;
  outgoing?: boolean;
  delay: string;
}) {
  return (
    <div
      className={`auth-message w-[86%] rounded-2xl border border-white/10 bg-white/[0.08] p-4 text-white shadow-2xl backdrop-blur-md ${outgoing ? "ml-auto border-emerald-300/20 bg-emerald-300/10" : ""}`}
      style={{ animationDelay: delay }}
    >
      <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.15em] text-white/45">
        <span>{label}</span>
        <span>now</span>
      </div>
      <p className="text-sm leading-6 text-white/90">{text}</p>
    </div>
  );
}
