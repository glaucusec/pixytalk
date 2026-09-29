"use client";

import { useState, type FormEvent } from "react";
import {
  BookOpenTextIcon,
  CheckIcon,
  LoaderCircleIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
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
import { Textarea } from "@/components/ui/textarea";
import {
  configureAgentTool,
  createKnowledgeEntry,
  deleteKnowledgeEntry,
  getAgentSettings,
  updateAgentSettings,
} from "@/lib/api";

const queryKey = ["agent-settings"] as const;
const writableRoles = new Set(["owner", "admin"]);

type AssistantDraft = {
  name: string;
  instructions: string;
  enabled: boolean;
  currency: string;
  basePrice: string;
  includedGuests: string;
  additionalPrice: string;
  toolEnabled: boolean;
};

function toDraft(
  agent: Awaited<ReturnType<typeof getAgentSettings>>,
): AssistantDraft {
  const priceTool = agent.tools.find((tool) => tool.name === "calculate_price");
  return {
    name: agent.name,
    instructions: agent.instructions,
    enabled: agent.isEnabled,
    currency: String(priceTool?.configuration.currency ?? "INR"),
    basePrice: String(
      Number(priceTool?.configuration.basePriceMinor ?? 0) / 100,
    ),
    includedGuests: String(priceTool?.configuration.includedGuests ?? 0),
    additionalPrice: String(
      Number(priceTool?.configuration.pricePerAdditionalGuestMinor ?? 0) / 100,
    ),
    toolEnabled: priceTool?.isEnabled ?? false,
  };
}

export function AgentSetupScreen() {
  const { organization, role } = useWorkspace();
  const canManage = writableRoles.has(role.toLowerCase());
  const client = useQueryClient();
  const settings = useQuery({ queryKey, queryFn: getAgentSettings });
  const [draftState, setDraftState] = useState<AssistantDraft | null>(null);
  const [category, setCategory] = useState("Business information");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const draft = settings.data ? (draftState ?? toDraft(settings.data)) : null;

  function updateDraft<K extends keyof AssistantDraft>(
    key: K,
    value: AssistantDraft[K],
  ) {
    if (!settings.data) return;
    setDraftState((current) => ({
      ...(current ?? toDraft(settings.data)),
      [key]: value,
    }));
  }

  const saveSettings = useMutation({
    mutationFn: () =>
      updateAgentSettings({
        name: draft?.name ?? "",
        instructions: draft?.instructions ?? "",
        isEnabled: draft?.enabled ?? false,
      }),
    onSuccess: async () => {
      setNotice("Assistant settings saved.");
      await client.invalidateQueries({ queryKey });
      setDraftState(null);
    },
  });
  const addKnowledge = useMutation({
    mutationFn: () => createKnowledgeEntry({ category, title, content }),
    onSuccess: async () => {
      setTitle("");
      setContent("");
      setNotice("Knowledge added to this workspace.");
      await client.invalidateQueries({ queryKey });
    },
  });
  const removeKnowledge = useMutation({
    mutationFn: deleteKnowledgeEntry,
    onSuccess: async () => {
      setNotice("Knowledge entry removed.");
      await client.invalidateQueries({ queryKey });
    },
  });
  const saveTool = useMutation({
    mutationFn: () =>
      configureAgentTool({
        name: "calculate_price",
        isEnabled: draft?.toolEnabled ?? false,
        configuration: {
          currency: (draft?.currency ?? "INR").trim().toUpperCase(),
          basePriceMinor: toMinorUnits(draft?.basePrice ?? "0"),
          includedGuests: Number(draft?.includedGuests ?? 0),
          pricePerAdditionalGuestMinor: toMinorUnits(
            draft?.additionalPrice ?? "0",
          ),
        },
      }),
    onSuccess: async () => {
      setNotice("Trusted pricing tool saved.");
      await client.invalidateQueries({ queryKey });
      setDraftState(null);
    },
  });

  function submit(event: FormEvent<HTMLFormElement>, action: () => void) {
    event.preventDefault();
    setNotice(null);
    action();
  }

  if (settings.isPending) {
    return (
      <main className="flex flex-1 items-center justify-center bg-muted/25 p-8">
        <LoaderCircleIcon
          className="size-5 animate-spin text-muted-foreground"
          aria-label="Loading assistant settings"
        />
      </main>
    );
  }

  if (settings.error || !settings.data) {
    return (
      <main className="flex-1 bg-muted/25 p-5 sm:p-8">
        <Alert variant="destructive" className="mx-auto max-w-2xl">
          <AlertTitle>Assistant settings unavailable</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              {settings.error?.message ??
                "We could not load this workspace's assistant."}
            </p>
            <Button variant="outline" onClick={() => void settings.refetch()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  const agent = settings.data;
  const form = draft ?? toDraft(agent);
  const error =
    saveSettings.error ??
    addKnowledge.error ??
    removeKnowledge.error ??
    saveTool.error;

  return (
    <main className="flex-1 overflow-auto bg-muted/25 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-7">
        <header className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
              Assistant / {organization.name}
            </p>
            <h1 className="text-3xl font-semibold tracking-[-0.045em]">
              Give every answer a source.
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Set the assistant’s voice, add facts your team trusts, and choose
              when it can use a price calculator.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2 text-xs text-muted-foreground">
            <span
              className={`size-2 rounded-full ${form.enabled ? "bg-[var(--signal)]" : "bg-muted-foreground/40"}`}
            />
            {form.enabled ? "Assistant enabled" : "Assistant paused"}
          </div>
        </header>

        {notice && (
          <p
            role="status"
            className="flex items-center gap-2 text-sm text-[var(--signal-foreground)]"
          >
            <CheckIcon className="size-4" />
            {notice}
          </p>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Changes not saved</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}
        {!canManage && (
          <Alert>
            <AlertTitle>Read-only access</AlertTitle>
            <AlertDescription>
              An owner or admin can change assistant settings and knowledge.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(19rem,0.85fr)]">
          <div className="space-y-5">
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-primary/8 text-primary">
                    <SparklesIcon className="size-4" />
                  </span>
                  <div>
                    <CardTitle>Assistant voice</CardTitle>
                    <CardDescription>
                      These instructions apply to this workspace only.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <form
                  className="space-y-5"
                  onSubmit={(event) =>
                    submit(event, () => saveSettings.mutate())
                  }
                >
                  <div className="space-y-2">
                    <Label htmlFor="assistant-name">Assistant name</Label>
                    <Input
                      id="assistant-name"
                      value={form.name}
                      maxLength={120}
                      onChange={(event) =>
                        updateDraft("name", event.target.value)
                      }
                      disabled={!canManage}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assistant-instructions">
                      Response instructions
                    </Label>
                    <Textarea
                      id="assistant-instructions"
                      className="min-h-36 resize-y"
                      value={form.instructions}
                      maxLength={8000}
                      onChange={(event) =>
                        updateDraft("instructions", event.target.value)
                      }
                      disabled={!canManage}
                      placeholder="Describe how the assistant should help customers. Add only rules that apply to your business."
                    />
                    <p className="text-xs text-muted-foreground">
                      Facts such as prices should live in knowledge or a trusted
                      tool, not instructions.
                    </p>
                  </div>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 has-checked:border-primary/40 has-checked:bg-primary/4 has-disabled:cursor-not-allowed">
                    <input
                      type="checkbox"
                      checked={form.enabled}
                      onChange={(event) =>
                        updateDraft("enabled", event.target.checked)
                      }
                      disabled={!canManage}
                      className="mt-0.5 size-4 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    />
                    <span>
                      <span className="block text-sm font-medium">
                        Enable automatic replies
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                        The global AI reply switch and this setting must both be
                        on.
                      </span>
                    </span>
                  </label>
                  {canManage && (
                    <Button
                      type="submit"
                      disabled={saveSettings.isPending || !form.name.trim()}
                    >
                      {saveSettings.isPending ? "Saving…" : "Save assistant"}
                    </Button>
                  )}
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--signal)_14%,transparent)] text-[var(--signal-foreground)]">
                    <BookOpenTextIcon className="size-4" />
                  </span>
                  <div>
                    <CardTitle>Business knowledge</CardTitle>
                    <CardDescription>
                      {agent.knowledgeEntries.length} entries available to the
                      assistant.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-5">
                {agent.knowledgeEntries.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-5 text-center">
                    <p className="text-sm font-medium">No business facts yet</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Add services, policies, and FAQs. Keep each entry focused
                      on one answer.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y rounded-xl border">
                    {agent.knowledgeEntries.map((entry) => (
                      <li
                        className="flex items-start justify-between gap-3 p-4"
                        key={entry.id}
                      >
                        <div className="min-w-0">
                          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-primary">
                            {entry.category}
                          </p>
                          <p className="mt-1 text-sm font-medium">
                            {entry.title}
                          </p>
                          <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
                            {entry.content}
                          </p>
                        </div>
                        {canManage && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Remove ${entry.title}`}
                            disabled={removeKnowledge.isPending}
                            onClick={() => removeKnowledge.mutate(entry.id)}
                          >
                            <Trash2Icon className="size-4" />
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {canManage && (
                  <form
                    className="grid gap-3 rounded-xl bg-muted/45 p-4"
                    onSubmit={(event) =>
                      submit(event, () => addKnowledge.mutate())
                    }
                  >
                    <p className="text-sm font-medium">Add a knowledge entry</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="knowledge-category">Category</Label>
                        <Input
                          id="knowledge-category"
                          value={category}
                          maxLength={80}
                          onChange={(event) => setCategory(event.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="knowledge-title">Title</Label>
                        <Input
                          id="knowledge-title"
                          value={title}
                          maxLength={200}
                          onChange={(event) => setTitle(event.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="knowledge-content">
                        Answer or business fact
                      </Label>
                      <Textarea
                        id="knowledge-content"
                        className="min-h-24 resize-y"
                        value={content}
                        maxLength={10000}
                        onChange={(event) => setContent(event.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Button
                        type="submit"
                        variant="outline"
                        disabled={
                          addKnowledge.isPending ||
                          !title.trim() ||
                          !content.trim()
                        }
                      >
                        <PlusIcon />
                        {addKnowledge.isPending ? "Adding…" : "Add knowledge"}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit">
            <CardHeader className="border-b">
              <CardTitle>Trusted pricing tool</CardTitle>
              <CardDescription>
                Let application code calculate totals from your settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <p className="text-xs leading-5 text-muted-foreground">
                The assistant can request a guest count. PixyTalk calculates the
                amount; the model does not invent the price.
              </p>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 has-checked:border-primary/40 has-checked:bg-primary/4 has-disabled:cursor-not-allowed">
                <input
                  type="checkbox"
                  checked={form.toolEnabled}
                  onChange={(event) =>
                    updateDraft("toolEnabled", event.target.checked)
                  }
                  disabled={!canManage}
                  className="size-4 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                />
                <span className="text-sm font-medium">
                  Allow this assistant to calculate prices
                </span>
              </label>
              <form
                className="space-y-4"
                onSubmit={(event) => submit(event, () => saveTool.mutate())}
              >
                <div className="space-y-2">
                  <Label htmlFor="price-currency">Currency code</Label>
                  <Input
                    id="price-currency"
                    value={form.currency}
                    maxLength={3}
                    onChange={(event) =>
                      updateDraft("currency", event.target.value.toUpperCase())
                    }
                    disabled={!canManage}
                    required
                    pattern="[A-Z]{3}"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="base-price">Starting price</Label>
                  <Input
                    id="base-price"
                    inputMode="decimal"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.basePrice}
                    onChange={(event) =>
                      updateDraft("basePrice", event.target.value)
                    }
                    disabled={!canManage}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="included-guests">Guests included</Label>
                  <Input
                    id="included-guests"
                    type="number"
                    min="0"
                    max="1000"
                    step="1"
                    value={form.includedGuests}
                    onChange={(event) =>
                      updateDraft("includedGuests", event.target.value)
                    }
                    disabled={!canManage}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="additional-price">
                    Price per extra guest
                  </Label>
                  <Input
                    id="additional-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.additionalPrice}
                    onChange={(event) =>
                      updateDraft("additionalPrice", event.target.value)
                    }
                    disabled={!canManage}
                    required
                  />
                </div>
                {canManage && (
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={saveTool.isPending}
                  >
                    {saveTool.isPending ? "Saving…" : "Save pricing tool"}
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

function toMinorUnits(value: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return -1;
  return Math.round(amount * 100);
}
