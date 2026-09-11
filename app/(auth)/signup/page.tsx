import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Criar conta — CRM SaaS" };

export default function SignUpPage() {
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold text-gray-900">Criar conta</h1>
      <p className="mb-6 text-sm text-gray-500">
        Isso cria a sua empresa no CRM e você entra como administrador dela.
      </p>
      <SignUpForm />
    </>
  );
}
