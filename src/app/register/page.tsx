import { RegisterForm } from "@/components/register-form";
import { getCurrentUser } from "@/lib/current-user";
import { redirect } from "next/navigation";

export default async function RegisterPage() {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect("/");
  }

  return <RegisterForm />;
}
