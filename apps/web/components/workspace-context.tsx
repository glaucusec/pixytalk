"use client";

import { createContext, useContext } from "react";

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

export const WorkspaceProvider = WorkspaceContext.Provider;

export function useWorkspace() {
  const workspace = useContext(WorkspaceContext);
  if (!workspace) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider");
  }
  return workspace;
}
