"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { requestPasswordResetAction, type ActionState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, FormError } from "@/components/ui/input";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" isLoading={pending} className="w-full">
      Enviar link de recuperação
    </Button>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction] = useFormState<ActionState, FormData>(
    requestPasswordResetAction,
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state?.error} />

      <div>
        <Label htmlFor="email">E-mail cadastrado</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>

      <SubmitButton />

      <p className="text-center text-sm text-gray-500">
        <Link href="/login" className="font-medium text-brand hover:underline">
          Voltar para o login
        </Link>
      </p>
    </form>
  );
}
