import type { Metadata } from "next";

import { AgentSetupScreen } from "@/components/agent-setup-screen";

export const metadata: Metadata = { title: "Assistant setup" };

export default function KnowledgePage() {
  return <AgentSetupScreen />;
}
