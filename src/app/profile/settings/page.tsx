import { ProfileForm } from "@/components/profile-form";
import { requireCurrentUser } from "@/lib/current-user";

export default async function ProfileSettingsPage() {
  const currentUser = await requireCurrentUser();

  return (
    <ProfileForm
      initialName={currentUser.name}
      initialImage={currentUser.image}
      email={currentUser.email}
    />
  );
}
