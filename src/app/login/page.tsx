import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/current-user";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect("/");
  }

  return <LoginForm />;
}
