import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { RoleBuilder } from "./role-builder";

export type RolePermissions = {
  assets: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    changeStatus: boolean;
    export: boolean;
    import: boolean;
  };
  admin: {
    users: boolean;
    lookups: boolean;
    workflows: boolean;
    settings: boolean;
    audit: boolean;
    roles: boolean;
  };
  scope: "own_country" | "all";
};

export default async function RolesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "GLOBAL_ADMIN") redirect("/assets");

  const roles = await prisma.roleTemplate.findMany({
    include: { _count: { select: { users: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Role Builder</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Define custom roles with granular permissions. Assign roles to users in User Management.
        </p>
      </div>
      <RoleBuilder initialRoles={roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
        userCount: r._count.users,
        permissions: r.permissions as RolePermissions,
        createdAt: r.createdAt.toISOString(),
      }))} />
    </div>
  );
}
