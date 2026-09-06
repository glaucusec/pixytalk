"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRightIcon, Building2Icon, LoaderCircleIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AuthFormHeader } from "@/components/auth-form-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";

const organizationSchema = z.object({
  name: z.string().trim().min(2, "Enter a workspace name."),
  slug: z
    .string()
    .trim()
    .min(2, "Enter a workspace URL.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers, and single hyphens.",
    ),
});

type OrganizationValues = z.infer<typeof organizationSchema>;

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function OrganizationOnboarding() {
  const router = useRouter();
  const session = authClient.useSession();
  const organizations = authClient.useListOrganizations();
  const form = useForm<OrganizationValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: { name: "", slug: "" },
  });

  useEffect(() => {
    if (!session.isPending && !session.data) router.replace("/sign-in");
  }, [router, session.data, session.isPending]);

  async function activateOrganization(organizationId: string) {
    const result = await authClient.organization.setActive({ organizationId });

    if (result.error) {
      form.setError("root", {
        message: result.error.message ?? "We could not open this workspace.",
      });
      return;
    }

    await session.refetch();
    router.replace("/dashboard");
    router.refresh();
  }

  async function onSubmit(values: OrganizationValues) {
    form.clearErrors("root");
    const result = await authClient.organization.create(values);

    if (result.error) {
      form.setError("root", {
        message: result.error.message ?? "We could not create this workspace.",
      });
      return;
    }

    await session.refetch();
    router.replace("/dashboard");
    router.refresh();
  }

  if (session.isPending || organizations.isPending) {
    return (
      <div className="w-full space-y-7" aria-label="Loading workspace setup">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-4/5" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!session.data) return null;

  return (
    <div className="w-full space-y-8">
      <AuthFormHeader
        eyebrow="Your workspace"
        title="Where will your team work?"
        description="A workspace keeps conversations, teammates, and knowledge together."
      />

      {organizations.data && organizations.data.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Continue with a workspace</p>
          <div className="grid gap-2">
            {organizations.data.map((organization) => (
              <Button
                className="h-auto justify-between px-4 py-3"
                key={organization.id}
                variant="outline"
                onClick={() => activateOrganization(organization.id)}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Building2Icon />
                  </span>
                  <span className="truncate">{organization.name}</span>
                </span>
                <ArrowRightIcon />
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-3 py-2 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or create another
            <span className="h-px flex-1 bg-border" />
          </div>
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          {form.formState.errors.root && (
            <Alert variant="destructive">
              <AlertDescription>
                {form.formState.errors.root.message}
              </AlertDescription>
            </Alert>
          )}

          <Field data-invalid={Boolean(form.formState.errors.name)}>
            <FieldLabel htmlFor="workspace-name">Workspace name</FieldLabel>
            <Input
              id="workspace-name"
              placeholder="Kerala Tripist"
              aria-invalid={Boolean(form.formState.errors.name)}
              {...form.register("name", {
                onBlur: (event) => {
                  if (!form.getValues("slug")) {
                    form.setValue("slug", toSlug(event.target.value), {
                      shouldValidate: true,
                    });
                  }
                },
              })}
            />
            <FieldError errors={[form.formState.errors.name]} />
          </Field>

          <Field data-invalid={Boolean(form.formState.errors.slug)}>
            <FieldLabel htmlFor="workspace-slug">Workspace URL</FieldLabel>
            <div className="flex items-center rounded-lg border bg-background shadow-xs focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
              <span className="pl-3 text-sm text-muted-foreground">
                pixytalk.app/
              </span>
              <Input
                id="workspace-slug"
                className="border-0 pl-0 shadow-none focus-visible:ring-0"
                placeholder="kerala-tripist"
                aria-invalid={Boolean(form.formState.errors.slug)}
                {...form.register("slug")}
              />
            </div>
            <FieldDescription>You can change this later.</FieldDescription>
            <FieldError errors={[form.formState.errors.slug]} />
          </Field>

          <Field>
            <Button
              className="w-full"
              type="submit"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <ArrowRightIcon />
              )}
              Create workspace
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
