"use client";

import { createContext, use, useMemo, type ReactNode } from "react";

import type { CurrentOrganization } from "@/lib/api";

export type WorkspaceUser = {
  name: string;
  email: string;
  image?: string | null;
};

type WorkspaceContextValue = {
  user: WorkspaceUser;
  organization: CurrentOrganization;
  role: string;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({
  children,
  user,
  organization,
  role,
}: WorkspaceContextValue & { children: ReactNode }) {
  const value = useMemo(
    () => ({ user, organization, role }),
    [organization, role, user],
  );

  return <WorkspaceContext value={value}>{children}</WorkspaceContext>;
}

export function useWorkspace() {
  const workspace = use(WorkspaceContext);
  if (!workspace) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider");
  }
  return workspace;
}
