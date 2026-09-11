"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { signInAction, type ActionState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, FormError } from "@/components/ui/input";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" isLoading={pending} className="w-full">
      Entrar
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState<ActionState, FormData>(signInAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state?.error} />

      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Senha</Label>
          <Link href="/forgot-password" className="text-xs text-brand hover:underline">
            Esqueceu a senha?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>

      <SubmitButton />
    </form>
  );
}
