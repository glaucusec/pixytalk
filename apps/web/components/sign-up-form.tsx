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

const signUpSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name."),
    email: z.email("Enter a valid email address."),
    password: z.string().min(8, "Password must contain at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type SignUpValues = z.infer<typeof signUpSchema>;

export function SignUpForm() {
  const router = useRouter();
  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: SignUpValues) {
    form.clearErrors("root");

    const result = await authClient.signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
    });
    if (result.error) {
      form.setError("root", {
        message: result.error.message ?? "We could not create your account.",
      });
      return;
    }

    router.replace("/onboarding");
    router.refresh();
  }

  return (
    <form className="w-full space-y-8" onSubmit={form.handleSubmit(onSubmit)}>
      <AuthFormHeader
        eyebrow="Start together"
        title="Create your PixyTalk account"
        description="Set up your team’s shared inbox in a few minutes."
      />

      <FieldGroup>
        {form.formState.errors.root && (
          <Alert variant="destructive">
            <AlertDescription>
              {form.formState.errors.root.message}
            </AlertDescription>
          </Alert>
        )}

        <Field data-invalid={Boolean(form.formState.errors.name)}>
          <FieldLabel htmlFor="sign-up-name">Full name</FieldLabel>
          <Input
            id="sign-up-name"
            autoComplete="name"
            placeholder="Your name"
            aria-invalid={Boolean(form.formState.errors.name)}
            {...form.register("name")}
          />
          <FieldError errors={[form.formState.errors.name]} />
        </Field>

        <Field data-invalid={Boolean(form.formState.errors.email)}>
          <FieldLabel htmlFor="sign-up-email">Work email</FieldLabel>
          <Input
            id="sign-up-email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            aria-invalid={Boolean(form.formState.errors.email)}
            {...form.register("email")}
          />
          <FieldError errors={[form.formState.errors.email]} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(form.formState.errors.password)}>
            <FieldLabel htmlFor="sign-up-password">Password</FieldLabel>
            <Input
              id="sign-up-password"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(form.formState.errors.password)}
              {...form.register("password")}
            />
            <FieldError errors={[form.formState.errors.password]} />
          </Field>

          <Field data-invalid={Boolean(form.formState.errors.confirmPassword)}>
            <FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(form.formState.errors.confirmPassword)}
              {...form.register("confirmPassword")}
            />
            <FieldError errors={[form.formState.errors.confirmPassword]} />
          </Field>
        </div>

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
            Create account
          </Button>
        </Field>
      </FieldGroup>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          className="font-medium text-foreground underline-offset-4 hover:underline"
          href="/sign-in"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
