import type { Metadata } from "next";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export const metadata: Metadata = { title: "Nova senha — CRM SaaS" };

export default function UpdatePasswordPage() {
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold text-gray-900">Defina sua nova senha</h1>
      <p className="mb-6 text-sm text-gray-500">
        Você chegou aqui por um link de recuperação. Escolha uma nova senha.
      </p>
      <UpdatePasswordForm />
    </>
  );
}
