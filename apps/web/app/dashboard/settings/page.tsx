import type { Metadata } from "next";

import { WorkspaceSettingsScreen } from "@/components/workspace-settings-screen";

export const metadata: Metadata = { title: "Workspace settings" };

export default function SettingsPage() {
  return <WorkspaceSettingsScreen />;
}
