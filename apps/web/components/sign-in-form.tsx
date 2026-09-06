"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRightIcon, LoaderCircleIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AuthFormHeader } from "@/components/auth-form-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

const signInSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Password must contain at least 8 characters."),
});

type SignInValues = z.infer<typeof signInSchema>;

export function SignInForm() {
  const router = useRouter();
  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: SignInValues) {
    form.clearErrors("root");

    const result = await authClient.signIn.email(values);
    if (result.error) {
      form.setError("root", {
        message: result.error.message ?? "Email or password is incorrect.",
      });
      return;
    }

    const organizations = await authClient.organization.list();
    router.replace(organizations.data?.length ? "/dashboard" : "/onboarding");
    router.refresh();
  }

  return (
    <form className="w-full space-y-8" onSubmit={form.handleSubmit(onSubmit)}>
      <AuthFormHeader
        eyebrow="Welcome back"
        title="Sign in to your workspace"
        description="Pick up every customer conversation with your team."
      />

      <FieldGroup>
        {form.formState.errors.root && (
          <Alert variant="destructive">
            <AlertDescription>
              {form.formState.errors.root.message}
            </AlertDescription>
          </Alert>
        )}

        <Field data-invalid={Boolean(form.formState.errors.email)}>
          <FieldLabel htmlFor="sign-in-email">Email address</FieldLabel>
          <Input
            id="sign-in-email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            aria-invalid={Boolean(form.formState.errors.email)}
            {...form.register("email")}
          />
          <FieldError errors={[form.formState.errors.email]} />
        </Field>

        <Field data-invalid={Boolean(form.formState.errors.password)}>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="sign-in-password">Password</FieldLabel>
            <span className="text-xs text-muted-foreground">8+ characters</span>
          </div>
          <Input
            id="sign-in-password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(form.formState.errors.password)}
            {...form.register("password")}
          />
          <FieldError errors={[form.formState.errors.password]} />
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
            Sign in
          </Button>
        </Field>
      </FieldGroup>

      <p className="text-center text-sm text-muted-foreground">
        New to PixyTalk?{" "}
        <Link
          className="font-medium text-foreground underline-offset-4 hover:underline"
          href="/sign-up"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
