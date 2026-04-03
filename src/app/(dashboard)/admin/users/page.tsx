import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { CreateUserDialog } from "./create-user-dialog";
import { UsersTable } from "./users-table";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const { q = "", page = "1" } = await searchParams;
  const pageNum = Math.max(1, Number(page));
  const limit = 50;
  const skip = (pageNum - 1) * limit;

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [users, total, countries] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        country: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
    prisma.location.findMany({
      where: { type: "COUNTRY" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} user{total !== 1 ? "s" : ""}
          </p>
        </div>
        <CreateUserDialog countries={countries} currentUserId={session!.user.id} />
      </div>

      <UsersTable
        users={users}
        total={total}
        page={pageNum}
        limit={limit}
        query={q}
        currentUserId={session!.user.id}
      />
    </div>
  );
}
