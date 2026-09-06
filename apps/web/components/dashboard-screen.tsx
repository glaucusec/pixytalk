"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRightIcon,
  CheckCircle2Icon,
  MessageSquareTextIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentOrganization } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

export function DashboardScreen() {
  const router = useRouter();
  const session = authClient.useSession();
  const activeOrganizationId = session.data?.session.activeOrganizationId;

  const organization = useQuery({
    queryKey: ["current-organization", activeOrganizationId],
    queryFn: getCurrentOrganization,
    enabled: Boolean(activeOrganizationId),
  });

  const memberRole = useQuery({
    queryKey: ["active-member-role", activeOrganizationId],
    queryFn: async () => {
      const result = await authClient.organization.getActiveMemberRole();
      if (result.error) {
        throw new Error(result.error.message ?? "We could not load your role.");
      }
      return result.data.role;
    },
    enabled: Boolean(activeOrganizationId),
  });

  useEffect(() => {
    if (session.isPending) return;
    if (!session.data) router.replace("/sign-in");
    else if (!activeOrganizationId) router.replace("/onboarding");
  }, [activeOrganizationId, router, session.data, session.isPending]);

  if (
    session.isPending ||
    !session.data ||
    !activeOrganizationId ||
    organization.isPending ||
    memberRole.isPending
  ) {
    return <DashboardLoading />;
  }

  if (organization.error || memberRole.error || !organization.data) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
        <Alert variant="destructive" className="max-w-lg">
          <AlertTitle>Workspace unavailable</AlertTitle>
          <AlertDescription className="space-y-4">
            <p>
              {organization.error?.message ??
                memberRole.error?.message ??
                "We could not load your workspace."}
            </p>
            <Button
              variant="outline"
              onClick={() => router.replace("/onboarding")}
            >
              Choose a workspace
            </Button>
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar
        user={session.data.user}
        organizationName={organization.data.name}
        role={memberRole.data ?? "member"}
      />
      <SidebarInset className="overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b px-4 md:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-5" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">Overview</p>
            <p className="truncate text-xs text-muted-foreground">
              {organization.data.name}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground">
            <span className="size-2 rounded-full bg-[var(--signal)]" />
            All systems ready
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-muted/35 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl space-y-8">
            <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div className="space-y-2">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Workspace ready
                </p>
                <h1 className="text-3xl font-semibold tracking-[-0.045em]">
                  Good to see you, {firstName(session.data.user.name)}.
                </h1>
                <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                  Your shared inbox foundation is in place. Connect WhatsApp
                  next to bring your first customer conversations into PixyTalk.
                </p>
              </div>
              <Button disabled>
                Connect WhatsApp
                <ArrowUpRightIcon />
              </Button>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              <StatusCard
                icon={MessageSquareTextIcon}
                label="Conversations"
                value="0"
                detail="Waiting for your first channel"
              />
              <StatusCard
                icon={UsersIcon}
                label="Team"
                value="1"
                detail={`${capitalize(memberRole.data)} access`}
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
                    2 of 4 ready
                  </span>
                </div>
              </CardHeader>
              <CardContent className="grid p-0 md:grid-cols-2">
                <ChecklistItem
                  complete
                  title="Create your account"
                  detail={session.data.user.email}
                />
                <ChecklistItem
                  complete
                  title="Create a workspace"
                  detail={organization.data.name}
                />
                <ChecklistItem
                  title="Connect WhatsApp"
                  detail="Add a business phone number"
                />
                <ChecklistItem
                  title="Invite your team"
                  detail="Bring agents into the inbox"
                />
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function DashboardLoading() {
  return (
    <main className="min-h-svh bg-muted/35 p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-full max-w-xl" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
        <Skeleton className="h-72" />
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
