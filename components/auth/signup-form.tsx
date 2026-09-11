"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { signUpAction, type ActionState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, FormError } from "@/components/ui/input";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" isLoading={pending} className="w-full">
      Criar conta
    </Button>
  );
}

export function SignUpForm() {
  const [state, formAction] = useFormState<ActionState, FormData>(signUpAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state?.error} />

      <div>
        <Label htmlFor="name">Seu nome</Label>
        <Input id="name" name="name" type="text" required autoComplete="name" />
      </div>

      <div>
        <Label htmlFor="orgName">Nome da empresa</Label>
        <Input id="orgName" name="orgName" type="text" required placeholder="Ex.: Minha Empresa LTDA" />
      </div>

      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>

      <div>
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <p className="mt-1 text-xs text-gray-400">Mínimo de 8 caracteres.</p>
      </div>

      <SubmitButton />

      <p className="text-center text-sm text-gray-500">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
