import type { Metadata } from "next";

import { AuthShell } from "@/components/auth-shell";
import { OrganizationOnboarding } from "@/components/organization-onboarding";

export const metadata: Metadata = { title: "Set up your workspace" };

export default function OnboardingPage() {
  return (
    <AuthShell>
      <OrganizationOnboarding />
    </AuthShell>
  );
}
