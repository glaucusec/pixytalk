"use client";

import { useState, type FormEvent } from "react";
import {
  CheckCircle2Icon,
  LoaderCircleIcon,
  MessageCircleIcon,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useWorkspace } from "@/components/workspace-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { configureWhatsAppAccount, getWhatsAppAccount } from "@/lib/api";

type AccountDraft = {
  phoneNumberId: string;
  wabaId: string;
  displayPhoneNumber: string;
};

export function WorkspaceSettingsScreen() {
  const { organization, role } = useWorkspace();
  const canManage = ["owner", "admin"].includes(role.toLowerCase());
  const queryClient = useQueryClient();
  const queryKey = ["whatsapp-account", organization.id] as const;
  const account = useQuery({ queryKey, queryFn: getWhatsAppAccount });
  const [draftState, setDraftState] = useState<AccountDraft | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const draft = draftState ?? {
    phoneNumberId: account.data?.phoneNumberId ?? "",
    wabaId: account.data?.wabaId ?? "",
    displayPhoneNumber: account.data?.displayPhoneNumber ?? "",
  };

  const save = useMutation({
    mutationFn: () =>
      configureWhatsAppAccount({
        phoneNumberId: draft.phoneNumberId.trim(),
        wabaId: draft.wabaId.trim(),
        ...(draft.displayPhoneNumber.trim()
          ? { displayPhoneNumber: draft.displayPhoneNumber.trim() }
          : {}),
      }),
    onSuccess: async () => {
      setNotice("WhatsApp account saved for this workspace.");
      await queryClient.invalidateQueries({ queryKey });
      setDraftState(null);
      await queryClient.invalidateQueries({
        queryKey: ["current-organization"],
      });
    },
  });

  function updateDraft(key: keyof AccountDraft, value: string) {
    setDraftState((current) => ({ ...draft, ...current, [key]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    save.mutate();
  }

  if (account.isPending) {
    return (
      <main className="flex flex-1 items-center justify-center bg-muted/25 p-8">
        <LoaderCircleIcon
          className="size-5 animate-spin text-muted-foreground"
          aria-label="Loading workspace settings"
        />
      </main>
    );
  }

  if (account.error) {
    return (
      <main className="flex-1 bg-muted/25 p-5 sm:p-8">
        <Alert variant="destructive" className="mx-auto max-w-2xl">
          <AlertTitle>WhatsApp settings unavailable</AlertTitle>
          <AlertDescription className="mt-2 space-y-3">
            <p>{account.error.message}</p>
            <Button variant="outline" onClick={() => void account.refetch()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-auto bg-muted/25 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-7">
        <header className="max-w-2xl space-y-2 border-b pb-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
            Workspace / {organization.name}
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.045em]">
            Connect the number customers message.
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Add the identifiers for your WhatsApp Cloud API number. PixyTalk
            uses this mapping to route incoming messages to the right workspace.
          </p>
        </header>

        {notice && (
          <p
            role="status"
            className="flex items-center gap-2 text-sm text-[var(--signal-foreground)]"
          >
            <CheckCircle2Icon className="size-4" />
            {notice}
          </p>
        )}
        {save.error && (
          <Alert variant="destructive">
            <AlertTitle>Account not saved</AlertTitle>
            <AlertDescription>{save.error.message}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <Card className="h-fit">
            <CardHeader className="border-b">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--signal)_14%,transparent)] text-[var(--signal-foreground)]">
                  <MessageCircleIcon className="size-4" />
                </span>
                <div>
                  <CardTitle>WhatsApp Cloud API</CardTitle>
                  <CardDescription>
                    {account.data
                      ? "A number is mapped to this workspace."
                      : "No number is connected yet."}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <form className="space-y-5" onSubmit={submit}>
                <div className="space-y-2">
                  <Label htmlFor="phone-number-id">Phone number ID</Label>
                  <Input
                    id="phone-number-id"
                    inputMode="numeric"
                    pattern="[0-9]{5,64}"
                    maxLength={64}
                    value={draft.phoneNumberId}
                    onChange={(event) =>
                      updateDraft("phoneNumberId", event.target.value)
                    }
                    disabled={!canManage || save.isPending}
                    required
                  />
                  <p className="text-xs leading-5 text-muted-foreground">
                    Meta’s Phone Number ID, not the phone number shown to
                    customers.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="waba-id">WhatsApp Business Account ID</Label>
                  <Input
                    id="waba-id"
                    inputMode="numeric"
                    pattern="[0-9]{5,64}"
                    maxLength={64}
                    value={draft.wabaId}
                    onChange={(event) =>
                      updateDraft("wabaId", event.target.value)
                    }
                    disabled={!canManage || save.isPending}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display-phone-number">
                    Customer-facing number
                  </Label>
                  <Input
                    id="display-phone-number"
                    maxLength={40}
                    value={draft.displayPhoneNumber}
                    onChange={(event) =>
                      updateDraft("displayPhoneNumber", event.target.value)
                    }
                    disabled={!canManage || save.isPending}
                    placeholder="+1 555 010 0200"
                  />
                </div>
                {canManage ? (
                  <Button
                    type="submit"
                    disabled={
                      save.isPending ||
                      !draft.phoneNumberId.trim() ||
                      !draft.wabaId.trim()
                    }
                  >
                    {save.isPending
                      ? "Saving…"
                      : account.data
                        ? "Save WhatsApp account"
                        : "Connect WhatsApp account"}
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    An owner or admin can configure this connection.
                  </p>
                )}
              </form>
            </CardContent>
          </Card>

          <aside className="space-y-4">
            <Card size="sm">
              <CardHeader>
                <CardTitle>Before you connect</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs leading-5 text-muted-foreground">
                <p>
                  Configure the Meta system-user access token and webhook
                  signing secret in the API environment.
                </p>
                <p>
                  Set the webhook callback URL to your API’s{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-foreground">
                    /webhooks/whatsapp
                  </code>{" "}
                  endpoint and subscribe to messages and message status updates.
                </p>
                <p>
                  Keep credentials in your deployment secret store. This screen
                  stores account IDs only.
                </p>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardTitle>Webhook verification token</CardTitle>
              </CardHeader>
              <CardContent className="text-xs leading-5 text-muted-foreground">
                Use the same randomly generated token for the Meta app
                configuration and the API’s{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-foreground">
                  WHATSAPP_WEBHOOK_VERIFY_TOKEN
                </code>{" "}
                setting.
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}
