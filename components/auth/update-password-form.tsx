"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updatePasswordAction, type ActionState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, FormError } from "@/components/ui/input";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" isLoading={pending} className="w-full">
      Salvar nova senha
    </Button>
  );
}

export function UpdatePasswordForm() {
  const [state, formAction] = useFormState<ActionState, FormData>(
    updatePasswordAction,
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state?.error} />

      <div>
        <Label htmlFor="password">Nova senha</Label>
        <Input id="password" name="password" type="password" required minLength={8} />
      </div>

      <div>
        <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
        />
      </div>

      <SubmitButton />
    </form>
  );
}
