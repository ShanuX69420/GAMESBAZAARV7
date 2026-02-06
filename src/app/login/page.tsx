import { auth } from "@/auth";
import { LoginForm } from "@/components/login-form";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}
