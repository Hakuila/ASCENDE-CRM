import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Recuperar senha — CRM SaaS" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold text-gray-900">Recuperar senha</h1>
      <p className="mb-6 text-sm text-gray-500">
        Informe o e-mail da sua conta para receber o link de redefinição.
      </p>
      <ForgotPasswordForm />
    </>
  );
}
