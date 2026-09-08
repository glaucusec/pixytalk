"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkspaceProvider } from "@/components/workspace-context";
import { getCurrentOrganization } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
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

  const role = memberRole.data ?? "member";
  const section = pathname.startsWith("/dashboard/inbox")
    ? "Inbox"
    : "Overview";

  return (
    <WorkspaceProvider
      user={session.data.user}
      organization={organization.data}
      role={role}
    >
      <SidebarProvider>
        <AppSidebar
          user={session.data.user}
          organizationName={organization.data.name}
          role={role}
        />
        <SidebarInset className="overflow-hidden">
          <header className="flex h-16 shrink-0 items-center gap-3 border-b px-4 md:px-6">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-5" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{section}</p>
              <p className="truncate text-xs text-muted-foreground">
                {organization.data.name}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground">
              <span className="size-2 rounded-full bg-[var(--signal)]" />
              WhatsApp connected
            </div>
          </header>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </WorkspaceProvider>
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
