import type { ReactNode } from "react";

export function AuthFormHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-primary/70">
        {eyebrow}
      </p>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-[-0.045em] sm:text-[2rem]">
          {title}
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
