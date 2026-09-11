import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";

export default async function RootPage() {
  const session = await getSession();

  if (!session) redirect("/login");
  if (session.isPlatformAdmin) redirect("/agency-dashboard");
  redirect("/dashboard");
}
