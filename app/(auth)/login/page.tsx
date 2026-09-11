import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Entrar — CRM SaaS" };

export default function LoginPage() {
  return (
    <>
      <h1 className="mb-6 text-xl font-semibold text-gray-900">Entrar</h1>
      <LoginForm />
    </>
  );
}
