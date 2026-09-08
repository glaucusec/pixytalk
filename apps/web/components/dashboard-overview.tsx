"use client";

import {
  ArrowUpRightIcon,
  CheckCircle2Icon,
  MessageSquareTextIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useWorkspace } from "@/components/workspace-context";

export function DashboardOverview() {
  const { user, organization, role } = useWorkspace();

  return (
    <main className="flex-1 overflow-auto bg-muted/35 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Workspace ready
            </p>
            <h1 className="text-3xl font-semibold tracking-[-0.045em]">
              Good to see you, {firstName(user.name)}.
            </h1>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              WhatsApp is connected. Open the inbox to read customer messages
              and reply from your shared workspace.
            </p>
          </div>
          <Button render={<Link href="/dashboard/inbox" />}>
            Open inbox
            <ArrowUpRightIcon />
          </Button>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <StatusCard
            icon={MessageSquareTextIcon}
            label="Conversations"
            value="Live"
            detail="WhatsApp inbox connected"
          />
          <StatusCard
            icon={UsersIcon}
            label="Team"
            value="1"
            detail={`${capitalize(role)} access`}
          />
          <StatusCard
            icon={SparklesIcon}
            label="AI assistance"
            value="Next"
            detail="Knowledge setup follows"
          />
        </section>

        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Workspace checklist</CardTitle>
                <CardDescription>
                  The essentials for opening your shared inbox.
                </CardDescription>
              </div>
              <span className="rounded-full bg-primary/8 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
                3 of 4 ready
              </span>
            </div>
          </CardHeader>
          <CardContent className="grid p-0 md:grid-cols-2">
            <ChecklistItem
              complete
              title="Create your account"
              detail={user.email}
            />
            <ChecklistItem
              complete
              title="Create a workspace"
              detail={organization.name}
            />
            <ChecklistItem
              complete
              title="Connect WhatsApp"
              detail="Messages are reaching PixyTalk"
            />
            <ChecklistItem
              title="Invite your team"
              detail="Bring agents into the inbox"
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function StatusCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof MessageSquareTextIcon;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardDescription>{label}</CardDescription>
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/7 text-primary">
          <Icon className="size-4" />
        </span>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-[-0.04em]">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function ChecklistItem({
  complete = false,
  title,
  detail,
}: {
  complete?: boolean;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex gap-3 border-b p-5 last:border-b-0 md:odd:border-r md:nth-last-[-n+2]:border-b-0">
      <span
        className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${complete ? "bg-[color-mix(in_oklab,var(--signal)_14%,transparent)] text-[var(--signal-foreground)]" : "border border-dashed text-muted-foreground"}`}
      >
        {complete ? (
          <CheckCircle2Icon className="size-4" />
        ) : (
          <span className="size-1.5 rounded-full bg-current" />
        )}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "there";
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
