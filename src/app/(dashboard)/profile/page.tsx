import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      lastLogin: true,
      country: { select: { name: true } },
    },
  });

  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">My Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account information and password.</p>
      </div>

      <ProfileForm
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt.toISOString().slice(0, 10),
          lastLogin: user.lastLogin ? user.lastLogin.toISOString().slice(0, 16).replace("T", " ") : null,
          country: user.country?.name ?? null,
        }}
      />
    </div>
  );
}
